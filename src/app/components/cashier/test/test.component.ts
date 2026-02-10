import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  shareReplay,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { PrintInvoiceService } from 'src/app/services/print-invoice.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';




type InvoiceLineUi = {
  lineId: number;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
};

/** status: 1 = Unpaid, 2 = Paid, 3 = Cancelled */
type InvoiceUi = {
  id: string; // invoiceNumber للعرض (مثل for-2026-110)
  invoiceId: number; // للـ API (payInvoiceCash)
  customerName: string;
  phone: string;
  paymentMethod: number; // 1 = cash, 2 = visa
  status: 1 | 2 | 3; // 1 غير مدفوعة، 2 مدفوعة، 3 ملغاة
  date: string; // YYYY-MM-DD
  createdAt: string;

  subTotal: number;
  discount: number;
  total: number;

  itemsText: string;
  lines: InvoiceLineUi[];
};

@Component({
  selector: 'app-test',
    standalone: true,
    imports: [CommonModule, FormsModule],
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent {
  selectedInvoice: InvoiceUi | null = null;

  branchId = 1;
  get cashierId(): number {
    return this.auth.getEmployeeId() ?? 5;
  }

  totalInvoicesCount = 0;
  totalDailyAmount = 0;

  private todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // filters (قيم معروضة في الـ UI ومربوطة بـ ngModel) - من ويوم انهارده افتراضياً
  filterSearch = '';
  filterFrom = this.todayStr;
  filterTo = this.todayStr;
  filterMethod = 'all';
  filterStatus = '';

  private searchTerm$ = new BehaviorSubject<string>('');
  private from$ = new BehaviorSubject<string>(this.todayStr);
  private to$ = new BehaviorSubject<string>(this.todayStr);
  private paymentMethod$ = new BehaviorSubject<string>('all');
  private statusFilter$ = new BehaviorSubject<string>(''); // "" | "unpaid" | "paid" | "cancelled"

  private page$ = new BehaviorSubject<number>(1);
  private pageSize$ = new BehaviorSubject<number>(10);

  // pagination observables
  currentPage$ = this.page$.asObservable();
  pageSizeObservable$ = this.pageSize$.asObservable();

  // keep last summary
  private lastSummary: { totalCount: number; totalRevenue: number } | null =
    null;

  // pagination computed values
  get currentPage(): number {
    return (this.page$ as any).value || 1;
  }

  get pageSize(): number {
    return (this.pageSize$ as any).value || 20;
  }

  get totalPages(): number {
    if (this.totalInvoicesCount === 0) return 1;
    return Math.ceil(this.totalInvoicesCount / this.pageSize);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    const end = this.currentPage * this.pageSize;
    return Math.min(end, this.totalInvoicesCount);
  }

  invoices$: Observable<InvoiceUi[]> = combineLatest([
    this.searchTerm$,
    this.from$,
    this.to$,
    this.paymentMethod$,
    this.statusFilter$,
    this.page$,
    this.pageSize$,
  ]).pipe(
    switchMap(([term, from, to, method, statusVal, page, pageSize]) => {
      const status = statusVal === '' ? undefined : statusVal;
      const paymentMethod = (method && method.trim()) || 'all';
      return this.api.getInvoicesList({
        branchId: this.branchId,
        from: from || undefined,
        to: to || undefined,
        paymentMethod,
        status,
        q: term || undefined,
        page,
        pageSize,
      });
    }),
    tap((res: any) => {
      this.lastSummary = res?.data?.summary ?? null;
    }),
    map((res: any) => this.mapApiToUi(res)),
    tap((list) => {
      this.totalInvoicesCount = this.lastSummary?.totalCount ?? list.length;
      this.totalDailyAmount =
        this.lastSummary?.totalRevenue ??
        list.reduce((acc, inv) => acc + (inv.total || 0), 0);
    }),
    shareReplay(1),
  );

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private printInvoice: PrintInvoiceService
  ) {}

  // ---------- UI Handlers (تحديث الـ Subject وإرجاع الصفحة لـ 1) ----------
  onSearch(val: string): void {
    this.searchTerm$.next((val || '').trim());
    this.page$.next(1);
  }

  onFromChange(val: string): void {
    this.from$.next((val || '').trim());
    this.page$.next(1);
  }

  onToChange(val: string): void {
    this.to$.next((val || '').trim());
    this.page$.next(1);
  }

  onMethodChange(val: string): void {
    this.paymentMethod$.next((val || '').trim());
    this.page$.next(1);
  }

  onStatusFilterChange(val: string): void {
    this.statusFilter$.next((val || '').trim());
    this.page$.next(1);
  }

  resetFilters(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.filterSearch = '';
    this.filterFrom = today;
    this.filterTo = today;
    this.filterMethod = 'all';
    this.filterStatus = '';
    this.searchTerm$.next('');
    this.from$.next(today);
    this.to$.next(today);
    this.paymentMethod$.next('all');
    this.statusFilter$.next('');
    this.page$.next(1);
  }

  // ---------- Pagination Handlers ----------
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.page$.next(page);
      // Scroll to top of table
      const tableElement = document.querySelector('.table-responsive');
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  changePageSize(size: number): void {
    this.pageSize$.next(size);
    this.page$.next(1); // Reset to first page
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      // Show last page
      pages.push(total);
    }

    return pages;
  }

  // ---------- Mapping ----------
  private mapApiToUi(res: any): InvoiceUi[] {
    const items = res?.data?.items ?? [];

    return (items as any[]).map((x: any) => {
      const linesRaw = x.lines ?? [];
      const linesArr = Array.isArray(linesRaw) ? linesRaw : [];

      const lines: InvoiceLineUi[] = linesArr.map((l: any) => ({
        lineId: Number(l.lineId ?? 0),
        description: String(l.description ?? ''),
        qty: Number(l.qty ?? 0),
        unitPrice: Number(l.unitPrice ?? 0),
        total: Number(l.total ?? 0),
      }));

      const dateStr = String(x.date ?? '');
      const onlyDate = dateStr ? dateStr.slice(0, 10) : '';

      // status: 1 = Unpaid, 2 = Paid, 3 = Cancelled
      const rawStatus = Number(x.status ?? 1);
      const status: 1 | 2 | 3 = (rawStatus === 1 || rawStatus === 2 || rawStatus === 3) ? rawStatus : 1;

      return {
        id: String(x.invoiceNumber ?? ''),
        invoiceId: Number(x.invoiceId ?? 0),
        date: onlyDate,
        createdAt: dateStr,
        paymentMethod: Number(x.paymentMethod ?? 0),
        status,

        subTotal: Number(x.subTotal ?? 0),
        discount: Number(x.discount ?? 0),
        total: Number(x.total ?? 0),

        customerName: String(x.customerName ?? ''),
        phone: String(x.customerPhone ?? ''),
        itemsText: String(x.itemsText ?? ''),
        lines,
      } as InvoiceUi;
    });
  }

  // ---------- Payment label ----------
  paymentLabel(method: number): string {
    return method === 1 ? 'كاش' : method === 2 ? 'فيزا' : 'مخصص';
  }

  paymentIcon(method: number): string {
    return method === 1 ? 'bi bi-cash' : method === 2 ? 'bi bi-credit-card' : 'bi bi-cash-stack';
  }

  /** 1 = Unpaid, 2 = Paid, 3 = Cancelled */
  statusLabel(status: 1 | 2 | 3): string {
    return status === 1 ? 'غير مدفوعة' : status === 2 ? 'مدفوعة' : 'ملغاة';
  }

  // ---------- دفع فاتورة (status = 1 غير مدفوعة) ----------
  payingInvoiceId: number | null = null;
  invoiceToPay: InvoiceUi | null = null;
  payMethod: 'cash' | 'visa' | 'custom' = 'cash';
  payCustomCashAmount = 0;

  get payModalTotal(): number {
    return Number(this.invoiceToPay?.total ?? 0);
  }
  get payModalVisaAmount(): number {
    if (this.payMethod !== 'custom') return 0;
    const cash = Number(this.payCustomCashAmount) || 0;
    return Math.max(0, this.payModalTotal - cash);
  }

  openPayModal(invoice: InvoiceUi): void {
    if (invoice.status !== 1) return;
    this.invoiceToPay = invoice;
    this.payMethod = 'cash';
    this.payCustomCashAmount = 0;
    const el = document.getElementById('testPayMethodModal');
    if (el) {
      const modal = new (window as any).bootstrap.Modal(el);
      modal.show();
    }
  }

  closePayModal(): void {
    this.invoiceToPay = null;
    const el = document.getElementById('testPayMethodModal');
    if (el) {
      const inst = (window as any).bootstrap?.Modal?.getInstance(el);
      if (inst) inst.hide();
    }
  }

  confirmPay(): void {
    const inv = this.invoiceToPay;
    if (!inv || inv.status !== 1) return;
    const id = inv.invoiceId;
    if (!id) return;

    const total = this.payModalTotal;
    const cashAmt = this.payMethod === 'cash' ? total
      : this.payMethod === 'visa' ? 0
      : (Number(this.payCustomCashAmount) || 0);
    const visaAmt = this.payMethod === 'visa' ? total
      : this.payMethod === 'cash' ? 0
      : this.payModalVisaAmount;
    const paymentMethod = this.payMethod === 'cash' ? 1 : this.payMethod === 'visa' ? 2 : 3;

    if (this.payMethod === 'custom' && (cashAmt <= 0 || cashAmt > total)) {
      alert('أدخل مبلغ كاش صحيح (أقل من أو يساوي الإجمالي).');
      return;
    }

    this.payingInvoiceId = id;
    this.api.payInvoiceCash(id, {
      cashierId: this.cashierId,
      paymentMethod,
      cashAmount: cashAmt,
      visaAmount: visaAmt,
    }).subscribe({
      next: () => {
        this.payingInvoiceId = null;
        this.closePayModal();
        this.page$.next(this.currentPage);
      },
      error: (err) => {
        this.payingInvoiceId = null;
        console.error(err);
        alert(err?.error?.message || 'فشل تنفيذ الدفع');
      },
    });
  }

  payInvoice(invoice: InvoiceUi): void {
    this.openPayModal(invoice);
  }

  // ---------- Excel ----------
  exportToExcel(invoice: InvoiceUi): void {
    const dataToExport = [
      {
        'رقم الفاتورة': invoice.id,
        'اسم العميل': invoice.customerName || 'Walk-in',
        'رقم الهاتف': invoice.phone || '-',
        البنود: invoice.lines
          .map((l) => `${l.description} x${l.qty}`)
          .join(' | '),
        'طريقة الدفع': this.paymentLabel(invoice.paymentMethod),
        'حالة الدفع': this.statusLabel(invoice.status),
        الإجمالي: invoice.total.toFixed(2),
        التاريخ: invoice.date,
      },
    ];

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
    XLSX.writeFile(wb, `Invoice_${invoice.id}.xlsx`);
  }

  openInvoice(invoice: InvoiceUi): void {
    this.selectedInvoice = invoice;
  }

  // totals in modal (use API values directly)
  get subTotal(): number {
    return Number(this.selectedInvoice?.subTotal ?? 0);
  }
  get taxAmount(): number {
    // لو عندكم الضريبة فعلاً 14% وتُحسب على subTotal:
    return this.subTotal * 0.14;
    // لو الـ total عندكم بالفعل نهائي شامل، قولّي وأخلي tax = total - subTotal
  }
  get finalTotal(): number {
    // لو total من السيرفر هو النهائي:
    return Number(this.selectedInvoice?.total ?? 0);
  }

  downloadInvoice(): void {
    setTimeout(() => this.printInvoice.print(), 100);
  }

  exportFilteredToExcel(): void {
    this.invoices$.pipe(take(1)).subscribe((list) => {
      if (!list || list.length === 0) return;

      const rows = list.map((inv) => ({
        'رقم الفاتورة': inv.id,
        التاريخ: inv.date,
        'اسم العميل': inv.customerName || 'Walk-in',
        الهاتف: inv.phone || '-',
        'طريقة الدفع': this.paymentLabel(inv.paymentMethod),
        'حالة الدفع': this.statusLabel(inv.status),
        البنود:
          inv.itemsText ||
          inv.lines?.map((l) => l.description).join(' | ') ||
          '',
        الإجمالي: inv.total,
      }));

      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

      // filename includes filters (optional)
      const from = (this.from$ as any).value || '';
      const to = (this.to$ as any).value || '';
      const fileName = `Invoices_${from || 'all'}_to_${to || 'all'}.xlsx`;

      XLSX.writeFile(wb, fileName);
    });
  }

  exportToPDF(): void {
  const data = document.getElementById('printableInvoice');
  if (!data) return;


  html2canvas(data, { scale: 2 }).then(canvas => {
    const imgWidth = 208;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const contentDataURL = canvas.toDataURL('image/png');


    const pdf = new jsPDF('p', 'mm', 'a4');
    const position = 0;

    pdf.addImage(contentDataURL, 'PNG', 0, position, imgWidth, imgHeight);
    pdf.save(`Invoice_${this.selectedInvoice?.id}.pdf`);
  });
}

exportTableToPDF(): void {

  this.invoices$.pipe(take(1)).subscribe(list => {
    if (!list || list.length === 0) {
      alert('لا توجد بيانات لتصديرها');
      return;
    }


    const printContainer = document.createElement('div');
    printContainer.dir = 'rtl';
    printContainer.style.padding = '20px';
    printContainer.style.fontFamily = 'Arial, sans-serif';

    let tableHtml = `
      <h2 style="text-align:center; color:#fd7e14;">تقرير الفواتير - فورتو</h2>
      <p style="text-align:center;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p>
      <table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
        <thead>
          <tr style="background-color:#f8f9fa;">
            <th style="padding:10px;">رقم الفاتورة</th>
            <th>العميل</th>
            <th>البنود</th>
            <th>المبلغ</th>
            <th>الحالة</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
    `;

    list.forEach(inv => {
      tableHtml += `
        <tr>
          <td style="padding:8px;">${inv.id}</td>
          <td>${inv.customerName || 'Walk-in'}</td>
          <td style="font-size:10px;">${inv.itemsText}</td>
          <td style="font-weight:bold;">${inv.total} ج.م</td>
          <td>${this.statusLabel(inv.status)}</td>
          <td>${inv.date}</td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table>`;
    printContainer.innerHTML = tableHtml;
    document.body.appendChild(printContainer);


    html2canvas(printContainer, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Forto_Report_${new Date().getTime()}.pdf`);


      document.body.removeChild(printContainer);
    });
  });
}

exportDailySummaryPDF(): void {
  this.invoices$.pipe(take(1)).subscribe(list => {
    if (!list || list.length === 0) return;


    const currentCashier = localStorage.getItem('userName') || 'كاشير مسؤؤل';
    const ohdaAmount = 600;
    const shiftNumber = '399';


    const totalSales = list.reduce((acc, inv) => acc + (inv.total || 0), 0);
    const cashPayments = list.filter(inv => inv.paymentMethod === 1).reduce((acc, inv) => acc + (inv.total || 0), 0);
    const visaPayments = list.filter(inv => inv.paymentMethod !== 1).reduce((acc, inv) => acc + (inv.total || 0), 0);
    const totalDiscounts = list.reduce((acc, inv) => acc + (inv.discount || 0), 0);


    const cashInHand = ohdaAmount + cashPayments;

    const summaryContainer = document.createElement('div');
    summaryContainer.style.width = '350px';
    summaryContainer.style.padding = '20px';
    summaryContainer.style.fontFamily = 'Arial, sans-serif';
    summaryContainer.dir = 'rtl';

    summaryContainer.innerHTML = `
      <div style="text-align: right; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px;">
        <h2 style="text-align: center; margin-bottom: 15px;">يرجى مراجعة المعاملات والمدفوعات</h2>
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${currentCashier}</div>
        <div style="font-size: 16px; margin-bottom: 5px;">${shiftNumber} :وردية رقم</div>
        <div style="font-size: 16px;">${this.filterFrom || new Date().toLocaleDateString('ar-EG')}</div>
      </div>

      <table style="width:100%; border-collapse: collapse; font-size: 16px;">
        <tr style="background-color: #eee;">
          <td style="padding: 10px; border: 1px solid #000; text-align: right; font-weight: bold;">نقد في اليد (عهدة + كاش)</td>
          <td style="padding: 10px; border: 1px solid #000; text-align: left; font-weight: bold;">${cashInHand.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000; text-align: right;">إجمالي مبيعات اليوم</td>
          <td style="padding: 10px; border: 1px solid #000; text-align: left;">${totalSales.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000; text-align: right;">دفع نقداً (Cash)</td>
          <td style="padding: 10px; border: 1px solid #000; text-align: left;">${cashPayments.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000; text-align: right;">العهدة المستلمة</td>
          <td style="padding: 10px; border: 1px solid #000; text-align: left;">${ohdaAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000; text-align: right;">طرق دفع أخرى (Visa)</td>
          <td style="padding: 10px; border: 1px solid #000; text-align: left;">${visaPayments.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000; text-align: right;">إجمالي الخصومات</td>
          <td style="padding: 10px; border: 1px solid #000; text-align: left;">${totalDiscounts.toFixed(2)}</td>
        </tr>
      </table>

      <div style="text-align:center; margin-top:30px; font-size:12px; border-top: 1px dashed #000; padding-top: 10px;">
        نظام فورتو - مراجعة الخزينة
      </div>
    `;

    document.body.appendChild(summaryContainer);

    html2canvas(summaryContainer, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', [100, 250]);
      pdf.addImage(imgData, 'PNG', 0, 0, 100, (canvas.height * 100) / canvas.width);
      pdf.save(`Final_Settlement_${shiftNumber}.pdf`);
      document.body.removeChild(summaryContainer);
    });
  });
}
}

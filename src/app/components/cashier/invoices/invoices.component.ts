import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  forkJoin,
  map,
  Observable,
  shareReplay,
  Subscription,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { PrintInvoiceService } from 'src/app/services/print-invoice.service';
import { InvoiceDeletionHubService } from 'src/app/services/invoice-deletion-hub.service';
import { InvoicesRefreshService } from 'src/app/services/invoices-refresh.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type InvoiceLineUi = {
  lineId: number;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
};

/** status: 1 = Unpaid, 2 = Paid, 3 = Cancelled, 4 = Pending deletion, 5 = Deleted */
type InvoiceUi = {
  id: string;
  invoiceId: number;
  customerName: string;
  phone: string;
  plateNumber?: string;
  paymentMethod: number;
  status: 1 | 2 | 3 | 4 | 5;
  date: string;
  createdAt: string;
  paidAt: string;
  subTotal: number;
  discount: number;
  total: number;
  cost?: number;
  profit?: number;
  itemsText: string;
  lines: InvoiceLineUi[];
};

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss'],
})
export class InvoicesComponent implements OnInit, OnDestroy {
  selectedInvoice: InvoiceUi | null = null;

  private deletionHubSub: Subscription | null = null;
  private refreshSub: Subscription | null = null;

  branchId = 1;
  get cashierId(): number {
    return this.auth.getEmployeeId() ?? 0;
  }

  totalInvoicesCount = 0;
  totalDailyAmount = 0;

  /** تاريخ اليوم حسب التوقيت المحلي (ليس UTC) بصيغة YYYY-MM-DD */
  private static getLocalDateString(d?: Date): string {
    const date = d ?? new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private todayStr = InvoicesComponent.getLocalDateString();

  filterSearch = '';
  filterFrom = this.todayStr;
  filterTo = this.todayStr;
  filterMethod = 'all';
  filterStatus = '';

  private searchTerm$ = new BehaviorSubject<string>('');
  private from$ = new BehaviorSubject<string>(this.todayStr);
  private to$ = new BehaviorSubject<string>(this.todayStr);
  private paymentMethod$ = new BehaviorSubject<string>('all');
  private statusFilter$ = new BehaviorSubject<string>('');

  private page$ = new BehaviorSubject<number>(1);
  private pageSize$ = new BehaviorSubject<number>(10);

  currentPage$ = this.page$.asObservable();
  pageSizeObservable$ = this.pageSize$.asObservable();

  private lastSummary: {
    totalCount?: number;
    totalRevenue?: number;
    totalCashAmount?: number;
    totalVisaAmount?: number;
    totalTips?: number;
    totalAmountIncludingTips?: number;
  } | null = null;

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

  get totalCashAmount(): number {
    return this.lastSummary?.totalCashAmount ?? 0;
  }

  get totalVisaAmount(): number {
    return this.lastSummary?.totalVisaAmount ?? 0;
  }

  /** إجمالي مبالغ أخرى (Tips) - من الـ API إن وُجد، وإلا 0 */
  get totalOtherAmounts(): number {
    return (this.lastSummary as any)?.totalTips ?? 0;
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
        this.lastSummary?.totalAmountIncludingTips ??
        this.lastSummary?.totalRevenue ??
        list.reduce((acc, inv) => acc + (inv.total || 0), 0);
    }),
    shareReplay(1),
  );

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private printInvoice: PrintInvoiceService,
    private invoiceDeletionHub: InvoiceDeletionHubService,
    private invoicesRefresh: InvoicesRefreshService
  ) {}

  ngOnInit(): void {
    this.invoiceDeletionHub.startConnection();
    this.deletionHubSub = this.invoiceDeletionHub.onDeletionProcessed.subscribe(() => {
      this.refreshInvoiceList();
    });
    this.refreshSub = this.invoicesRefresh.onRefreshRequested.subscribe(() => {
      this.refreshInvoiceList();
    });
  }

  ngOnDestroy(): void {
    this.deletionHubSub?.unsubscribe();
    this.refreshSub?.unsubscribe();
    this.invoiceDeletionHub.stopConnection();
  }

  refreshInvoiceList(): void {
    this.page$.next(this.currentPage);
  }

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
    const today = InvoicesComponent.getLocalDateString();
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

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.page$.next(page);
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
    this.page$.next(1);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1);
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push(-1);
      pages.push(total);
    }
    return pages;
  }

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

      const rawStatus = Number(x.status ?? 1);
      const status: 1 | 2 | 3 | 4 | 5 =
        rawStatus === 1 || rawStatus === 2 || rawStatus === 3 || rawStatus === 4 || rawStatus === 5
          ? rawStatus
          : 1;

      const total = Number(x.total ?? 0);
      const cost = Number(x.totalCost ?? x.cost ?? 0);
      const profit = Number(x.profit ?? (total - cost));

      return {
        id: String(x.invoiceNumber ?? ''),
        invoiceId: Number(x.invoiceId ?? 0),
        date: onlyDate,
        createdAt: dateStr,
        paidAt: x.paidAt ?? '',
        paymentMethod: Number(x.paymentMethod ?? 0),
        status,
        subTotal: Number(x.subTotal ?? 0),
        discount: Number(x.discount ?? 0),
        total,
        cost,
        profit,
        customerName: String(x.customerName ?? ''),
        phone: String(x.customerPhone ?? ''),
        plateNumber: x.plateNumber != null ? String(x.plateNumber) : undefined,
        itemsText: String(x.itemsText ?? ''),
        lines,
      } as InvoiceUi;
    });
  }

  paymentLabel(method: number): string {
    return method === 1 ? 'كاش' : method === 2 ? 'فيزا' : 'مخصص';
  }

  paymentIcon(method: number): string {
    return method === 1 ? 'bi bi-cash' : method === 2 ? 'bi bi-credit-card' : 'bi bi-cash-stack';
  }

  statusLabel(status: 1 | 2 | 3 | 4 | 5): string {
    if (status === 1) return 'غير مدفوعة';
    if (status === 2) return 'مدفوعة';
    if (status === 4) return 'منتظر تأكيد الحذف';
    if (status === 5) return 'محذوفة';
    return 'ملغاة';
  }

  payingInvoiceId: number | null = null;
  invoiceToAdjust: InvoiceUi | null = null;
  adjustTotalValue = 0;
  isSavingAdjust = false;
  invoiceToDelete: InvoiceUi | null = null;
  deletionReason = '';
  deletingInvoiceId: number | null = null;
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
    const el = document.getElementById('adminPayMethodModal');
    if (el) {
      const modal = new (window as any).bootstrap.Modal(el);
      modal.show();
    }
  }

  closePayModal(): void {
    this.invoiceToPay = null;
    const el = document.getElementById('adminPayMethodModal');
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

  openAdjustPriceModal(invoice: InvoiceUi): void {
    this.invoiceToAdjust = invoice;
    this.adjustTotalValue = Number(invoice.total ?? 0);
    const el = document.getElementById('adminAdjustPriceModal');
    if (el) {
      const modal = new (window as any).bootstrap.Modal(el);
      modal.show();
    }
  }

  closeAdjustPriceModal(): void {
    this.invoiceToAdjust = null;
    this.adjustTotalValue = 0;
    const el = document.getElementById('adminAdjustPriceModal');
    if (el) {
      const inst = (window as any).bootstrap.Modal.getInstance(el);
      if (inst) inst.hide();
    }
  }

  confirmAdjustPrice(): void {
    const inv = this.invoiceToAdjust;
    if (!inv?.invoiceId) return;
    const value = Number(this.adjustTotalValue);
    if (value < 0) {
      alert('أدخل مبلغاً صحيحاً.');
      return;
    }
    this.isSavingAdjust = true;
    this.api.patchInvoiceAdjustedTotal(inv.invoiceId, value).subscribe({
      next: () => {
        this.isSavingAdjust = false;
        this.closeAdjustPriceModal();
        this.page$.next(this.currentPage);
      },
      error: (err) => {
        this.isSavingAdjust = false;
        console.error(err);
        alert(err?.error?.message ?? 'فشل تحديث المبلغ');
      },
    });
  }

  openDeleteModal(invoice: InvoiceUi): void {
    this.invoiceToDelete = invoice;
    this.deletionReason = '';
    const el = document.getElementById('adminDeleteInvoiceModal');
    if (el) {
      const modal = new (window as any).bootstrap.Modal(el);
      modal.show();
    }
  }

  closeDeleteModal(): void {
    this.invoiceToDelete = null;
    this.deletionReason = '';
    const el = document.getElementById('adminDeleteInvoiceModal');
    if (el) {
      const inst = (window as any).bootstrap?.Modal?.getInstance(el);
      if (inst) inst.hide();
    }
  }

  confirmRequestDeletion(): void {
    const inv = this.invoiceToDelete;
    if (!inv?.invoiceId) return;
    const reason = (this.deletionReason || '').trim();
    if (!reason) {
      alert('يرجى إدخال سبب طلب الحذف.');
      return;
    }
    this.deletingInvoiceId = inv.invoiceId;
    this.api.requestInvoiceDeletion(inv.invoiceId, {
      reason,
      cashierEmployeeId: this.cashierId,
    }).subscribe({
      next: () => {
        this.deletingInvoiceId = null;
        this.closeDeleteModal();
        this.page$.next(this.currentPage);
      },
      error: (err) => {
        this.deletingInvoiceId = null;
        console.error(err);
        alert(err?.error?.message || 'فشل طلب حذف الفاتورة');
      },
    });
  }

  openInvoice(invoice: InvoiceUi): void {
    this.selectedInvoice = invoice;
  }

  // تفاصيل اليوم PDF
  dailySummaryForPdf: any = null;
  isLoadingDailyPdf = false;

  // فواتير البابل (Bubble Hope)
  isLoadingBubbleExport = false;

  downloadDailyDetailsPdf(): void {
    const dateStr = (this.from$ as any).value || this.filterFrom || InvoicesComponent.getLocalDateString();
    if (!dateStr) {
      alert('اختر تاريخ "من" أولاً');
      return;
    }
    this.isLoadingDailyPdf = true;
    const summary$ = this.api.getCashierShiftsSummary(dateStr);
    const paidInvoices$ = this.api.getInvoicesList({
      branchId: this.branchId,
      from: dateStr,
      to: dateStr,
      status: 'paid',
      page: 1,
      pageSize: 9999,
    });
    forkJoin({ summary: summary$, invoices: paidInvoices$ }).subscribe({
      next: ({ summary: summaryRes, invoices: invoicesRes }: any) => {
        const data = summaryRes?.data;
        if (!data) {
          this.isLoadingDailyPdf = false;
          alert('لا توجد بيانات لهذا التاريخ');
          return;
        }
        const items = invoicesRes?.data?.items ?? [];
        const paidInvoices = (items as any[]).map((x: any) => ({
          invoiceNumber: x.invoiceNumber ?? x.invoiceId ?? '-',
          plateNumber: x.plateNumber != null ? String(x.plateNumber) : '-',
          total: Number(x.total ?? 0),
        }));
        // أرقام الفاتورة من نفس مصدر صفحة الفواتير (ملخص الـ API) وليس من ورديات الشيفت
        const invSummary = invoicesRes?.data?.summary ?? {};
        this.dailySummaryForPdf = {
          ...data,
          paidInvoices,
          totalSalesForDay: invSummary.totalRevenue ?? data.totalSalesForDay ?? 0,
          totalCashForDay: invSummary.totalCashAmount ?? data.totalCashForDay ?? 0,
          totalVisaForDay: invSummary.totalVisaAmount ?? data.totalVisaForDay ?? 0,
          totalTipsForDay: invSummary.totalTips ?? 0,
          totalAmountIncludingTips: invSummary.totalAmountIncludingTips ?? (invSummary.totalRevenue ?? 0) + (invSummary.totalTips ?? 0),
          totalDiscountsForDay: data.totalDiscountsForDay ?? 0,
        };
        setTimeout(() => {
          const el = document.getElementById('dailySummaryPdfContent');
          if (!el) {
            this.dailySummaryForPdf = null;
            this.isLoadingDailyPdf = false;
            return;
          }
          html2canvas(el, { scale: 4, useCORS: true }).then((canvas) => {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfPageW = pdf.internal.pageSize.getWidth();
            const pdfPageH = pdf.internal.pageSize.getHeight();
            // نفس الحجم دايماً: عرض الصفحة كامل، والطول يحدد عدد الصفحات (ورقة الطباعة تزيد)
            const imgW = pdfPageW;
            const imgH = (canvas.height * pdfPageW) / canvas.width;
            if (imgH <= pdfPageH) {
              const imgData = canvas.toDataURL('image/png', 1.0);
              pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH, undefined, 'NONE');
            } else {
              // محتوى طويل: تقطيع إلى صفحات متعددة بنفس حجم الخط والشكل
              const pageHeightPx = (canvas.width * pdfPageH) / pdfPageW;
              let srcY = 0;
              let pageIndex = 0;
              while (srcY < canvas.height) {
                const sliceH = Math.min(pageHeightPx, canvas.height - srcY);
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = Math.ceil(sliceH);
                const ctx = pageCanvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
                  if (pageIndex > 0) pdf.addPage();
                  const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
                  const pageImgH = (pageCanvas.height * pdfPageW) / pageCanvas.width;
                  pdf.addImage(pageImgData, 'PNG', 0, 0, pdfPageW, pageImgH, undefined, 'NONE');
                }
                srcY += sliceH;
                pageIndex++;
              }
            }
            const fileName = `تفاصيل_اليوم_${dateStr}.pdf`;
            pdf.save(fileName);
            this.dailySummaryForPdf = null;
            this.isLoadingDailyPdf = false;
          }).catch(() => {
            this.dailySummaryForPdf = null;
            this.isLoadingDailyPdf = false;
          });
        }, 400);
      },
      error: (err) => {
        this.isLoadingDailyPdf = false;
        alert(err?.error?.message || 'فشل تحميل بيانات اليوم');
      },
    });
  }

  get subTotal(): number {
    return Number(this.selectedInvoice?.subTotal ?? 0);
  }
  get taxAmount(): number {
    return this.subTotal * 0.14;
  }
  get finalTotal(): number {
    return Number(this.selectedInvoice?.total ?? 0);
  }

  downloadInvoice(): void {
    setTimeout(() => this.printInvoice.print('adminPrintableInvoice'), 100);
  }

  exportFilteredToExcel(): void {
    this.invoices$.pipe(take(1)).subscribe((list) => {
      if (!list || list.length === 0) return;

      let totalPaid = 0;
      let totalCost = 0;
      let totalSelling = 0;
      let totalProfit = 0;

      const rows1 = list.map((inv) => {
        const paid = inv.status === 2 ? Number(inv.total ?? 0) : 0;
        totalPaid += paid;
        return {
          'رقم الفاتورة': inv.id,
          'اسم العميل': inv.customerName || 'Walk-in',
          التاريخ: inv.date,
          'رقم السيارة': inv.plateNumber ?? '-',
          'رقم التليفون': inv.phone || '-',
          'المبلغ المدفوع': paid,
        };
      });

      const rows2 = list.map((inv) => {
        const cost = Number(inv.cost ?? 0);
        const selling = Number(inv.total ?? 0);
        const profit = Number(inv.profit ?? (selling - cost));
        totalCost += cost;
        totalSelling += selling;
        totalProfit += profit;
        return {
          التكلفة: cost,
          'سعر البيع': selling,
          الربح: profit,
          'رقم الفاتورة': inv.id,
        };
      });

      // صف الإجمالي في شيت الفواتير
      rows1.push({
        'رقم الفاتورة': 'الإجمالي',
        'اسم العميل': '',
        التاريخ: '',
        'رقم السيارة': '',
        'رقم التليفون': '',
        'المبلغ المدفوع': totalPaid,
      });

      // صف الإجمالي في شيت التكلفة والربح
      rows2.push({
        التكلفة: totalCost,
        'سعر البيع': totalSelling,
        الربح: totalProfit,
        'رقم الفاتورة': 'الإجمالي',
      });

      const ws1: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows1);
      const ws2: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows2);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'الفواتير');
      XLSX.utils.book_append_sheet(wb, ws2, 'التكلفة والربح');

      const from = (this.from$ as any).value || '';
      const to = (this.to$ as any).value || '';
      const baseName = `Invoices_${from || 'all'}_to_${to || 'all'}`;
      XLSX.writeFile(wb, `${baseName}.xlsx`);

      // تنزيل نفس المحتوى كـ PDF (بخط عربي)
      this.exportFilteredToPdf(rows1, rows2, baseName);
    });
  }

  /** تصدير نفس بيانات الفواتير إلى PDF — بجدول HTML وخط عربي (Amiri) عبر html2canvas */
  private exportFilteredToPdf(
    rows1: Array<Record<string, string | number>>,
    rows2: Array<Record<string, string | number>>,
    baseFileName: string
  ): void {
    const col1 = ['رقم الفاتورة', 'اسم العميل', 'التاريخ', 'رقم السيارة', 'رقم التليفون', 'المبلغ المدفوع'];
    const col2 = ['التكلفة', 'سعر البيع', 'الربح', 'رقم الفاتورة'];

    const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const head1 = col1.map((c) => `<th style="padding:6px 8px;border:1px solid #ddd;background:#428bca;color:#fff;font-size:11px;">${esc(c)}</th>`).join('');
    const head2 = col2.map((c) => `<th style="padding:6px 8px;border:1px solid #ddd;background:#5cb85c;color:#fff;font-size:11px;">${esc(c)}</th>`).join('');

    const rows1Html = rows1.map((r) => '<tr>' + col1.map((c) => `<td style="padding:5px 8px;border:1px solid #ddd;font-size:10px;">${esc(String(r[c] ?? ''))}</td>`).join('') + '</tr>').join('');
    const rows2Html = rows2.map((r) => '<tr>' + col2.map((c) => `<td style="padding:5px 8px;border:1px solid #ddd;font-size:10px;">${esc(String(r[c] ?? ''))}</td>`).join('') + '</tr>').join('');

    const html = `
      <div dir="rtl" style="font-family:'Amiri',serif;width:190mm;padding:15px;background:#fff;box-sizing:border-box;">
        <h3 style="margin:0 0 12px 0;font-size:16px;">الفواتير</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead><tr>${head1}</tr></thead>
          <tbody>${rows1Html}</tbody>
        </table>
        <h3 style="margin:0 0 12px 0;font-size:16px;">التكلفة والربح</h3>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>${head2}</tr></thead>
          <tbody>${rows2Html}</tbody>
        </table>
      </div>`;

    const wrap = document.createElement('div');
    wrap.id = 'invoices-pdf-export-wrap';
    wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:190mm;z-index:-1;';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    wait(350)
      .then(() => html2canvas(wrap, { scale: 4, useCORS: true, logging: false }))
      .then((canvas) => {
        document.body.removeChild(wrap);
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = (canvas.height * pdfW) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'NONE');
        pdf.save(`${baseFileName}.pdf`);
      })
      .catch((e) => {
        if (document.body.contains(wrap)) document.body.removeChild(wrap);
        console.error('تصدير PDF:', e);
      });
  }

  /** تصدير فواتير البابل (Bubble Hope): جلب كل الصفحات ثم Excel + PDF */
  exportBubbleHopeInvoices(): void {
    const from = (this.from$ as any).value || this.filterFrom || InvoicesComponent.getLocalDateString();
    const to = (this.to$ as any).value || this.filterTo || InvoicesComponent.getLocalDateString();
    this.isLoadingBubbleExport = true;
    const pageSize = 500;
    const allItems: any[] = [];
    let page = 1;
    let grandTotal = 0;

    const fetchNext = () => {
      this.api.getSoldProductsReport(from, to, undefined, page, pageSize).subscribe({
        next: (res: any) => {
          const data = res?.data;
          const items = data?.items ?? [];
          allItems.push(...items);
          const lastTotal = Number(data?.grandTotal ?? 0);
          if (items.length >= pageSize) {
            page++;
            fetchNext();
            return;
          }
          grandTotal = data?.grandTotal != null ? Number(data.grandTotal) : allItems.reduce((sum, it) => sum + Number(it.lineTotal ?? 0), 0);
          if (allItems.length > 0 && grandTotal === 0) {
            grandTotal = allItems.reduce((sum, it) => sum + Number(it.lineTotal ?? 0), 0);
          }
          const baseName = `BubbleHope_Invoices_${from}_to_${to}`;
          const excelRows: Record<string, string | number>[] = allItems.map((it: any) => ({
            'المنتج': this.stripProductPrefix(it.productDescription ?? ''),
            'السعر': Number(it.unitPrice ?? 0),
            'الكمية': Number(it.qty ?? 0),
            'إجمالي السطر': Number(it.lineTotal ?? 0),
            'رقم الفاتورة': it.invoiceNumber ?? '',
          }));
          excelRows.push({
            'المنتج': 'الإجمالي',
            'السعر': '',
            'الكمية': '',
            'إجمالي السطر': grandTotal,
            'رقم الفاتورة': '',
          });
          const ws = XLSX.utils.json_to_sheet(excelRows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'فواتير البابل');
          XLSX.writeFile(wb, `${baseName}.xlsx`);
          this.exportBubbleHopePdf(allItems, grandTotal, baseName);
          this.isLoadingBubbleExport = false;
        },
        error: (err) => {
          this.isLoadingBubbleExport = false;
          alert(err?.error?.message ?? 'فشل تحميل بيانات فواتير البابل');
        },
      });
    };
    fetchNext();
  }

  /** إزالة بادئة "Product:" أو "منتج:" من وصف المنتج */
  private stripProductPrefix(desc: string): string {
    return String(desc ?? '').replace(/^Product:\s*/i, '').replace(/^منتج:\s*/, '').trim();
  }

  /** PDF فاتورة البابل — شكل يطبع: عنوان، ثم سطر منتج وسعر ورقم فاتورة، ثم الإجمالي */
  private exportBubbleHopePdf(
    items: Array<{ productDescription: string; unitPrice: number; qty: number; lineTotal: number; invoiceNumber: string }>,
    grandTotal: number,
    baseFileName: string
  ): void {
    const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    // شكل: اسم المنتج --- xالكمية => الإجمالي ثم (رقم الفاتورة) في سطر تحته
    const linesHtml = items
      .map((it) => {
        const name = this.stripProductPrefix(it.productDescription);
        const nameLower = name.toLowerCase();
        return `<tr><td style="padding:8px 0;border-bottom:1px solid #333;font-size:17px;line-height:1.6;color:#000;font-weight:600;">
          ${esc(nameLower)} --- x${it.qty} => ${it.lineTotal}<br/>
          <span style="font-size:15px;color:#222;font-weight:600;">(${esc(it.invoiceNumber)})</span>
        </td></tr>`;
      })
      .join('');
    const html = `
      <div dir="ltr" style="font-family:'Amiri',serif;width:90mm;max-width:320px;padding:24px;background:#fff;box-sizing:border-box;color:#000;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:22px;font-weight:bold;margin-bottom:8px;color:#000;">Forto Car Care Center</div>
          <div style="font-size:18px;color:#222;font-weight:600;">مشاريب Bubble Hope</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${linesHtml}
        </table>
        <div style="margin-top:18px;padding-top:12px;border-top:2px solid #000;font-size:20px;font-weight:bold;color:#000;">الإجمالي: ${grandTotal} ج.م</div>
      </div>`;

    const wrap = document.createElement('div');
    wrap.id = 'bubble-hop-pdf-wrap';
    wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;z-index:-1;';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    wait(350)
      .then(() => html2canvas(wrap, { scale: 4, useCORS: true, logging: false }))
      .then((canvas) => {
        document.body.removeChild(wrap);
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfHPage = pdf.internal.pageSize.getHeight();
        const imgH = (canvas.height * pdfW) / canvas.width;
        const numPages = Math.ceil(imgH / pdfHPage) || 1;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, imgH, undefined, 'NONE');
        for (let p = 1; p < numPages; p++) {
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -p * pdfHPage, pdfW, imgH, undefined, 'NONE');
        }
        pdf.save(`${baseFileName}.pdf`);
      })
      .catch((e) => {
        if (document.body.contains(wrap)) document.body.removeChild(wrap);
        console.error('تصدير فواتير البابل PDF:', e);
      });
  }
}

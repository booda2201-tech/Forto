import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
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
import * as XLSX from 'xlsx';

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
  selector: 'app-admin-invoices',
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss'],
})
export class AdminInvoicesComponent implements OnInit, OnDestroy {
  selectedInvoice: InvoiceUi | null = null;

  private deletionHubSub: Subscription | null = null;

  branchId = 1;
  get cashierId(): number {
    return this.auth.getEmployeeId() ?? 0;
  }

  totalInvoicesCount = 0;
  totalDailyAmount = 0;

  private todayStr = new Date().toISOString().slice(0, 10);

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
    private printInvoice: PrintInvoiceService,
    private invoiceDeletionHub: InvoiceDeletionHubService
  ) {}

  ngOnInit(): void {
    this.invoiceDeletionHub.startConnection();
    this.deletionHubSub = this.invoiceDeletionHub.onDeletionProcessed.subscribe(() => {
      this.refreshInvoiceList();
    });
  }

  ngOnDestroy(): void {
    this.deletionHubSub?.unsubscribe();
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
      const fileName = `Invoices_${from || 'all'}_to_${to || 'all'}.xlsx`;
      XLSX.writeFile(wb, fileName);
    });
  }
}

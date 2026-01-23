import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, Observable, switchMap, tap } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import * as XLSX from 'xlsx';

type InvoiceLineUi = {
  lineId: number;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
};

type InvoiceUi = {
  id: number; // invoiceId
  customerName: string;
  phone: string;
  paymentMethod: number; // 1 = cash
  date: string;          // YYYY-MM-DD
  createdAt: string;     // full date string

  subTotal: number;
  discount: number;
  total: number;

  itemsText: string;
  lines: InvoiceLineUi[];
};

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss']
})
export class InvoicesComponent {
  selectedInvoice: InvoiceUi | null = null;

  branchId = 1;

  totalInvoicesCount = 0;
  totalDailyAmount = 0;

  // filters
  private searchTerm$ = new BehaviorSubject<string>('');
  private from$ = new BehaviorSubject<string>(''); // YYYY-MM-DD
  private to$ = new BehaviorSubject<string>('');   // YYYY-MM-DD
  private paymentMethod$ = new BehaviorSubject<string>(''); // "1" cash / "2" visa ... (string from select)

  private page$ = new BehaviorSubject<number>(1);
  private pageSize$ = new BehaviorSubject<number>(20);

  // keep last summary
  private lastSummary: { totalCount: number; totalRevenue: number } | null = null;

  invoices$: Observable<InvoiceUi[]> = combineLatest([
    this.searchTerm$,
    this.from$,
    this.to$,
    this.paymentMethod$,
    this.page$,
    this.pageSize$
  ]).pipe(
    switchMap(([term, from, to, method, page, pageSize]) => {
      return this.api.getInvoicesList({
        branchId: this.branchId,
        from: from || undefined,
        to: to || undefined,
        paymentMethod: method || undefined,
        q: term || undefined,
        page,
        pageSize
      });
    }),
    tap((res: any) => {
      this.lastSummary = res?.data?.summary ?? null;
    }),
    map((res: any) => this.mapApiToUi(res)),
    tap((list) => {
      this.totalInvoicesCount = this.lastSummary?.totalCount ?? list.length;
      this.totalDailyAmount = this.lastSummary?.totalRevenue ?? list.reduce((acc, inv) => acc + (inv.total || 0), 0);
    })
  );

  constructor(private api: ApiService) {}

  // ---------- UI Handlers ----------
  onSearch(event: any): void {
    this.searchTerm$.next((event.target.value || '').trim());
    this.page$.next(1);
  }

  onFromChange(event: any): void {
    this.from$.next((event.target.value || '').trim());
    this.page$.next(1);
  }

  onToChange(event: any): void {
    this.to$.next((event.target.value || '').trim());
    this.page$.next(1);
  }

  onMethodChange(event: any): void {
    this.paymentMethod$.next((event.target.value || '').trim());
    this.page$.next(1);
  }

  resetFilters(): void {
    this.searchTerm$.next('');
    this.from$.next('');
    this.to$.next('');
    this.paymentMethod$.next('');
    this.page$.next(1);

    (document.getElementById('searchInput') as HTMLInputElement).value = '';
    (document.getElementById('fromInput') as HTMLInputElement).value = '';
    (document.getElementById('toInput') as HTMLInputElement).value = '';
    (document.getElementById('methodInput') as HTMLSelectElement).value = '';
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

      return {
        id: Number(x.invoiceId ?? 0),
        date: onlyDate,
        createdAt: dateStr,
        paymentMethod: Number(x.paymentMethod ?? 0),

        subTotal: Number(x.subTotal ?? 0),
        discount: Number(x.discount ?? 0),
        total: Number(x.total ?? 0),

        customerName: String(x.customerName ?? ''),
        phone: String(x.customerPhone ?? ''),
        itemsText: String(x.itemsText ?? ''),
        lines
      } as InvoiceUi;
    });
  }

  // ---------- Payment label ----------
  paymentLabel(method: number): string {
    // you told me: 1 = cash
    return method === 1 ? 'كاش' : 'فيزا';
  }

  paymentIcon(method: number): string {
    return method === 1 ? 'bi bi-cash' : 'bi bi-credit-card';
  }

  // ---------- Excel ----------
  exportToExcel(invoice: InvoiceUi): void {
    const dataToExport = [{
      'رقم الفاتورة': invoice.id,
      'اسم العميل': invoice.customerName || 'Walk-in',
      'رقم الهاتف': invoice.phone || '-',
      'البنود': invoice.lines.map(l => `${l.description} x${l.qty}`).join(' | '),
      'طريقة الدفع': this.paymentLabel(invoice.paymentMethod),
      'الإجمالي': invoice.total.toFixed(2),
      'التاريخ': invoice.date
    }];

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
    setTimeout(() => window.print(), 300);
  }
}

// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { ServiceCatalogService, Customer } from 'src/app/services/service-catalog.service';
// import { map, Observable, tap } from 'rxjs';
// import * as XLSX from 'xlsx';

// @Component({
//   selector: 'app-invoices',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './invoices.component.html',
//   styleUrls: ['./invoices.component.scss']
// })
// export class InvoicesComponent {
//   selectedInvoice: any;
//   invoices$: Observable<Customer[]>;
//   totalInvoicesCount: number = 0;
//   totalDailyAmount: number = 0;



// constructor(private serviceCatalog: ServiceCatalogService) {
//     const today = new Date().toISOString().split('T')[0];

//     this.invoices$ = this.serviceCatalog.getCustomers().pipe(
//       map(customers => customers.filter(c => c.status === 'completed')),
//       tap(completedInvoices => {

//         this.totalInvoicesCount = completedInvoices.length;


//         this.totalDailyAmount = completedInvoices.reduce((acc, inv) => {
//           return acc + this.calculateFinalTotal(inv);
//         }, 0);
//       })
//     );
//   }

//   calculateFinalTotal(invoice: any): number {
//     const subTotal = invoice.serviceItem?.reduce((acc: number, item: any) => acc + item.price, 0) || 0;
//     const tax = subTotal * 0.14;
//     return subTotal + tax;
//   }

//   exportToExcel(invoice: any) {
//     const finalAmount = this.calculateFinalTotal(invoice);


//     const dataToExport = [{
//       'رقم الفاتورة': invoice.id,
//       'اسم العميل': invoice.customerName,
//       'رقم الهاتف': invoice.phone,
//       'السيارة': invoice.cars[0]?.carModel,
//       'لوحة السيارة': invoice.cars[0]?.plateNumber,
//       'الخدمات': invoice.serviceItem?.map((s: any) => s.name).join(' - '),
//       'السعر الفرعي': (finalAmount / 1.14).toFixed(2),
//       'ضريبة (14%)': (finalAmount - (finalAmount / 1.14)).toFixed(2),
//       'الإجمالي النهائي المدفوع': finalAmount.toFixed(2),
//       'تاريخ الفاتورة': invoice.appointmentDate
//     }];

//     const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
//     const wb: XLSX.WorkBook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, 'فاتورة');
//     XLSX.writeFile(wb, `فاتورة_عميل_${invoice.customerName}.xlsx`);
//   }


// openInvoice(invoice: any) {
//   this.selectedInvoice = invoice;
// }


// get subTotal(): number {
//   if (!this.selectedInvoice?.serviceItem) return 0;
//   return this.selectedInvoice.serviceItem.reduce((acc: number, item: any) => acc + item.price, 0);
// }

// get taxAmount(): number {
//   return this.subTotal * 0.14;
// }

// get finalTotal(): number {
//   return this.subTotal + this.taxAmount;
// }


// downloadInvoice() {

//   setTimeout(() => {
//     window.print();
//   }, 300);
// }



// }







import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceCatalogService, Customer } from 'src/app/services/service-catalog.service';
import { map, Observable, tap, BehaviorSubject, combineLatest } from 'rxjs';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss']
})
export class InvoicesComponent {
  selectedInvoice: any;
  invoices$: Observable<Customer[]>;
  totalInvoicesCount: number = 0;
  totalDailyAmount: number = 0;


  private searchTerm$ = new BehaviorSubject<string>('');
  private filterDate$ = new BehaviorSubject<string>('');
  private paymentMethod$ = new BehaviorSubject<string>('');

  constructor(private serviceCatalog: ServiceCatalogService) {
    this.invoices$ = combineLatest([
      this.serviceCatalog.getCustomers(),
      this.searchTerm$,
      this.filterDate$,
      this.paymentMethod$
    ]).pipe(
      map(([customers, term, date, method]) => {
        let filtered = customers.filter(c => c.status === 'completed');

        if (term) {
          const lowerTerm = term.toLowerCase();
          filtered = filtered.filter(c =>
            c.customerName.toLowerCase().includes(lowerTerm) ||
            c.phone.includes(lowerTerm) ||
            c.id?.toString().includes(lowerTerm)
          );
        }
        if (date) {filtered = filtered.filter(c => c.appointmentDate === date);}

        if (method) {  filtered = filtered.filter(c => c.paymentMode === method);}
        return filtered;
      }),
      tap(filteredInvoices => {

        this.totalInvoicesCount = filteredInvoices.length;
        this.totalDailyAmount = filteredInvoices.reduce((acc, inv) => {
          return acc + this.calculateFinalTotal(inv);
        }, 0);
      })
    );
  }


  calculateFinalTotal(invoice: any): number {
    const subTotal = invoice.serviceItem?.reduce((acc: number, item: any) => acc + item.price, 0) || 0;
    const tax = subTotal * 0.14;
    return subTotal + tax;
  }


  onSearch(event: any): void {
    this.searchTerm$.next(event.target.value);
  }

  onDateChange(event: any): void {
    this.filterDate$.next(event.target.value);
  }

  onMethodChange(event: any): void {
    this.paymentMethod$.next(event.target.value);
  }


  resetFilters(): void {
    this.searchTerm$.next('');
    this.filterDate$.next('');
    this.paymentMethod$.next('');


    (document.getElementById('searchInput') as HTMLInputElement).value = '';
    (document.getElementById('dateInput') as HTMLInputElement).value = '';
    (document.getElementById('methodInput') as HTMLSelectElement).value = '';
  }


  exportToExcel(invoice: any): void {
    const finalAmount = this.calculateFinalTotal(invoice);
    const dataToExport = [{
      'رقم الفاتورة': invoice.id,
      'اسم العميل': invoice.customerName,
      'رقم الهاتف': invoice.phone,
      'السيارة': invoice.cars?.[0]?.carModel || 'N/A',
      'لوحة السيارة': invoice.cars?.[0]?.plateNumber || 'N/A',
      'الخدمات': invoice.serviceItem?.map((s: any) => s.name).join(' - '),
      'طريقة الدفع': invoice.paymentMode === 'cash' ? 'كاش' : 'فيزا',
      'الإجمالي (شامل الضريبة)': finalAmount.toFixed(2),
      'التاريخ': invoice.appointmentDate
    }];

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تفاصيل الفاتورة');
    XLSX.writeFile(wb, `فاتورة_${invoice.customerName}_${invoice.id}.xlsx`);
  }


  openInvoice(invoice: any): void {
    this.selectedInvoice = invoice;
  }


  get subTotal(): number {if (!this.selectedInvoice?.serviceItem) return 0;
    return this.selectedInvoice.serviceItem.reduce((acc: number, item: any) => acc + item.price, 0);
  }
  get taxAmount(): number {return this.subTotal * 0.14;}
  get finalTotal(): number {return this.subTotal + this.taxAmount;}


  downloadInvoice(): void {setTimeout(() => {
      window.print();
    }, 300);
  }
}

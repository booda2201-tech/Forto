import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceCatalogService, Customer } from 'src/app/services/service-catalog.service';
import { map, Observable, tap } from 'rxjs';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss']
})
export class InvoicesComponent {
  selectedInvoice: any;
  invoices$: Observable<Customer[]>;

  totalInvoicesCount: number = 0;
  totalDailyAmount: number = 0;



constructor(private serviceCatalog: ServiceCatalogService) {
    const today = new Date().toISOString().split('T')[0];

    this.invoices$ = this.serviceCatalog.getCustomers().pipe(
      map(customers => customers.filter(c => c.status === 'completed')),
      tap(completedInvoices => {

        this.totalInvoicesCount = completedInvoices.length;


        this.totalDailyAmount = completedInvoices.reduce((acc, inv) => {
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

  exportToExcel(invoice: any) {
    const finalAmount = this.calculateFinalTotal(invoice);


    const dataToExport = [{
      'رقم الفاتورة': invoice.id,
      'اسم العميل': invoice.customerName,
      'رقم الهاتف': invoice.phone,
      'السيارة': invoice.cars[0]?.carModel,
      'لوحة السيارة': invoice.cars[0]?.plateNumber,
      'الخدمات': invoice.serviceItem?.map((s: any) => s.name).join(' - '),
      'السعر الفرعي': (finalAmount / 1.14).toFixed(2),
      'ضريبة (14%)': (finalAmount - (finalAmount / 1.14)).toFixed(2),
      'الإجمالي النهائي المدفوع': finalAmount.toFixed(2),
      'تاريخ الفاتورة': invoice.appointmentDate
    }];

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'فاتورة');
    XLSX.writeFile(wb, `فاتورة_عميل_${invoice.customerName}.xlsx`);
  }


openInvoice(invoice: any) {
  this.selectedInvoice = invoice;
}


get subTotal(): number {
  if (!this.selectedInvoice?.serviceItem) return 0;
  return this.selectedInvoice.serviceItem.reduce((acc: number, item: any) => acc + item.price, 0);
}

get taxAmount(): number {
  return this.subTotal * 0.14;
}

get finalTotal(): number {
  return this.subTotal + this.taxAmount;
}


downloadInvoice() {

  setTimeout(() => {
    window.print();
  }, 300);
}



}

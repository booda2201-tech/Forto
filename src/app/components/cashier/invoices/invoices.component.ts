import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceCatalogService, Customer } from 'src/app/services/service-catalog.service';
import { map, Observable } from 'rxjs';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss']
})
export class InvoicesComponent {
  invoices$: Observable<Customer[]>;

  constructor(private serviceCatalog: ServiceCatalogService) {
    this.invoices$ = this.serviceCatalog.getCustomers().pipe(
      map(customers => customers.filter(c => c.status === 'completed'))
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
}

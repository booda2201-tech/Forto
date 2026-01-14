import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceCatalogService, Customer } from 'src/app/services/service-catalog.service';
import { map, Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { FilterStatusPipe } from 'src/app/pipes/filter-status.pipe';
import Swal from 'sweetalert2';




@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FilterStatusPipe],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss']
})


// export class ReservationsComponent implements OnInit {
//   // تعريف التبويب الافتراضي
//   currentTab: 'waiting' | 'active' | 'completed' | 'canceled' = 'waiting';

//   constructor(private serviceCatalog: ServiceCatalogService) {}

//   ngOnInit(): void {}

//   // دالة الفلترة: تعتمد على التبويب الحالي
//   get filteredCustomers$(): Observable<Customer[]> {
//     return this.serviceCatalog.getCustomers().pipe(
//       map(customers => customers.filter(c => c.status === this.currentTab))
//     );
//   }

//   setTab(tab: 'waiting' | 'active' | 'completed' | 'canceled') {
//     this.currentTab = tab;
//   }


//   onActivate(id: number) {
//     this.serviceCatalog.updateCustomerStatus(id, 'active');
//   }

//   onComplete(id: number) {
//     this.serviceCatalog.updateCustomerStatus(id, 'completed');
//   }

//   onCancel(id: number) {
//     if(confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
//       this.serviceCatalog.updateCustomerStatus(id, 'canceled');
//     }
//   }

//   getRoleDisplayNamee(role: string | null): string {
//     const roles: any = { 'admin': 'المدير', 'cashier': 'الكاشير', 'worker': 'العامل' };
//     return role ? (roles[role] || 'العميل') : 'غير محدد';
//   }


// getCountByStatus(status: string): number {
//   let count = 0;

//   this.serviceCatalog.getCustomers().subscribe(customers => {
//     count = customers.filter(c => c.status === status).length;
//   }).unsubscribe();

//   return count;
// }




// }


export class ReservationsComponent implements OnInit {

  customers$: Observable<Customer[]>;
  currentTab: 'waiting' | 'active' | 'completed' | 'canceled' = 'waiting';
  workers: Worker[] = [];
  selectedInvoice: any;
  customer:any;
  selectedCustomerId: any;
  cancelReason: string = '';

  constructor(private serviceCatalog: ServiceCatalogService) {

    this.customers$ = this.serviceCatalog.getCustomers();

  }

  ngOnInit() {
  // this.serviceCatalog.getWorkers().subscribe(data => {
  //   this.workers = data;
  // });


}

  get filteredCustomers$(): Observable<Customer[]> {
    return this.serviceCatalog.getCustomers().pipe(
      map(customers => customers.filter(c => c.status === this.currentTab))

    );
  }

  setTab(tab: 'waiting' | 'active' | 'completed' | 'canceled') {
    this.currentTab = tab;
  }

  onActivate(id: number) {
    this.serviceCatalog.updateCustomerStatus(id, 'active');
  }

  onComplete(id: number) {
    this.serviceCatalog.updateCustomerStatus(id, 'completed');
  }



// ... داخل الـ Class
onCancel(customerId: any) {
  Swal.fire({
    title: 'سبب إلغاء الطلب',
    input: 'textarea',
    inputPlaceholder: 'اكتب هنا سبب الإلغاء...',
    showCancelButton: true,
    confirmButtonText: 'تأكيد الإلغاء',
    cancelButtonText: 'تراجع',
    confirmButtonColor: '#dc3545',
    preConfirm: (reason) => {
      if (!reason) {
        Swal.showValidationMessage('من فضلك ادخل سبب الإلغاء');
      }
      return reason;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      // هنا يتم إرسال الـ ID والسبب للـ Service
      console.log('ID:', customerId, 'Reason:', result.value);
      this.cancelOrder(customerId, result.value);
    }
  });
}


cancelOrder(id: string, reason: string) {
  console.log('جاري إلغاء الطلب رقم:', id, 'بسبب:', reason);

}

confirmCancel() {
  if (this.cancelReason) {

    console.log('Canceling ID:', this.selectedCustomerId, 'for reason:', this.cancelReason);

    this.cancelReason = '';
  }
}






getStatusDisplayName(status: string): string {
  switch (status) {
    case 'waiting': return 'قيد الانتظار';
    case 'active': return 'نشط (قيد التنفيذ)';
    case 'completed': return 'مكتمل';
    case 'canceled': return 'حجز ملغي';
    default: return 'غير معروف';
  }
}



  getRoleDisplayNamee(role: string | null): string {
    const roles: any = { 'admin': 'المدير', 'cashier': 'الكاشير', 'worker': 'العامل' };
    return role ? (roles[role] || 'العميل') : 'غير محدد';
  }



  openInvoice(customer: any) {
  this.selectedInvoice = customer;
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

document.body.classList.add('printing-mode');
  window.print();


  window.onafterprint = () => {
    document.body.classList.remove('printing-mode');
  };
}




}

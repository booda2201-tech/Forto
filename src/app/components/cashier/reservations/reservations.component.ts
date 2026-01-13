import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceCatalogService, Customer } from 'src/app/services/service-catalog.service';
import { map, Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { FilterStatusPipe } from 'src/app/pipes/filter-status.pipe';

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

  constructor(private serviceCatalog: ServiceCatalogService) {

    this.customers$ = this.serviceCatalog.getCustomers();
  }

  ngOnInit(): void {}


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

  onCancel(id: number) {
    if(confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
      this.serviceCatalog.updateCustomerStatus(id, 'canceled');
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




}

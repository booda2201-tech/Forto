import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ServiceCatalogService,
  Customer,
} from 'src/app/services/service-catalog.service';
import { map, Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { FilterStatusPipe } from 'src/app/pipes/filter-status.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FilterStatusPipe],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss'],
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
  customer: any;
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
    return this.serviceCatalog
      .getCustomers()
      .pipe(
        map((customers) =>
          customers.filter((c) => c.status === this.currentTab)
        )
      );
  }

  setTab(tab: 'waiting' | 'active' | 'completed' | 'canceled') {
    this.currentTab = tab;
  }

  onActivate(id: number) {
    // 1. جلب قائمة العمال من الـ Service
    this.serviceCatalog.getWorkers().subscribe((workers) => {
      // 2. تحويل قائمة العمال لشكل يفهمه SweetAlert (Map)
      const workersOptions: any = {};
      workers.forEach((w) => {
        workersOptions[w.name] = w.name; // نستخدم الاسم كـ Key و Value
      });

      // 3. إظهار نافذة الاختيار
      Swal.fire({
        title: 'اختيار عامل التنفيذ',
        input: 'select',
        inputOptions: workersOptions,
        inputPlaceholder: 'اختر العامل المسئول...',
        showCancelButton: true,
        confirmButtonText: 'تفعيل وتعيين العامل',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#28a745',
        inputValidator: (value) => {
          if (!value) {
            return 'يجب اختيار عامل لتفعيل الحجز!';
          }
          return null;
        },
      }).then((result) => {
        if (result.isConfirmed) {
          // 4. إرسال اسم العامل المختار مع الـ ID لتحديث البيانات
          const selectedWorkerName = result.value;
          this.serviceCatalog.updateCustomerStatus(
            id,
            'active',
            selectedWorkerName
          );

          Swal.fire({
            icon: 'success',
            title: 'تم التفعيل',
            text: `تم تعيين العامل: ${selectedWorkerName}`,
            timer: 1500,
            showConfirmButton: false,
          });
        }
      });
    });
  }

  onEdit(customer: Customer) {
    this.serviceCatalog.getServices().subscribe((allServices) => {
      // تحويل الخدمات لنظام اختيارات (checkboxes) داخل النافذة
      const servicesHtml = allServices
        .map(
          (s) => `
      <div class="form-check text-start mb-2">
        <input class="form-check-input" type="checkbox" value="${
          s.id
        }" id="svc${s.id}"
                ${
                  customer.serviceItem?.some((cs) => cs.id === s.id)
                    ? 'checked'
                    : ''
                }>
        <label class="form-check-label" for="svc${s.id}">
          ${s.name} (${s.price} ج.م)
        </label>
      </div>
    `
        )
        .join('');

      Swal.fire({
        title: 'تعديل بيانات الحجز',
        html: `
        <div class="p-2">
          <input id="editCarModel" class="form-control mb-3" placeholder="نوع السيارة" value="${customer.cars[0]?.carModel}">
          <input id="editPlateNumber" class="form-control mb-3" placeholder="رقم اللوحة" value="${customer.cars[0]?.plateNumber}">
          <hr>
          <h6 class="text-start mb-3">تعديل الخدمات:</h6>
          <div id="servicesList" style="max-height: 200px; overflow-y: auto;">
            ${servicesHtml}
          </div>
        </div>
      `,
        showCancelButton: true,
        confirmButtonText: 'حفظ التعديلات',
        cancelButtonText: 'تراجع',
        confirmButtonColor: '#e67e22',
        preConfirm: () => {
          // جمع الخدمات المختارة الجديدة
          const selectedServiceIds = Array.from(
            document.querySelectorAll('#servicesList input:checked')
          ).map((el: any) => +el.value);
          const newServices = allServices.filter((s) =>
            selectedServiceIds.includes(s.id)
          );

          return {
            carModel: (
              document.getElementById('editCarModel') as HTMLInputElement
            ).value,
            plateNumber: (
              document.getElementById('editPlateNumber') as HTMLInputElement
            ).value,
            services: newServices,
          };
        },
      }).then((result) => {
        if (result.isConfirmed) {
          // إرسال البيانات للخدمة للتحديث
          this.serviceCatalog.updateCustomerDetails(customer.id, result.value);

          Swal.fire({
            icon: 'success',
            title: 'تم التحديث',
            text: 'تم تعديل بيانات الحجز بنجاح',
            timer: 1500,
            showConfirmButton: false,
          });
        }
      });
    });
  }

  onComplete(id: number) {
    this.serviceCatalog.updateCustomerStatus(id, 'completed');
  }

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
      },
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
      console.log(
        'Canceling ID:',
        this.selectedCustomerId,
        'for reason:',
        this.cancelReason
      );

      this.cancelReason = '';
    }
  }

  getStatusDisplayName(status: string): string {
    switch (status) {
      case 'waiting':
        return 'قيد الانتظار';
      case 'active':
        return 'نشط (قيد التنفيذ)';
      case 'completed':
        return 'مكتمل';
      case 'canceled':
        return 'حجز ملغي';
      default:
        return 'غير معروف';
    }
  }

  getRoleDisplayNamee(role: string | null): string {
    const roles: any = {
      admin: 'المدير',
      cashier: 'الكاشير',
      worker: 'العامل',
    };
    return role ? roles[role] || 'العميل' : 'غير محدد';
  }

  openInvoice(customer: any) {
    this.selectedInvoice = customer;
  }

  get subTotal(): number {
    if (!this.selectedInvoice?.serviceItem) return 0;
    return this.selectedInvoice.serviceItem.reduce(
      (acc: number, item: any) => acc + item.price,
      0
    );
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

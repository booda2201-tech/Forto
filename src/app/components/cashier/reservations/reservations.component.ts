import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {ServiceCatalogService,Customer,} from 'src/app/services/service-catalog.service';
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


export class ReservationsComponent implements OnInit {
  customers$: Observable<Customer[]>;
  currentTab: 'waiting' | 'active' | 'completed' | 'canceled' = 'waiting';
  workers: Worker[] = [];
  selectedInvoice: any;
  customer: any;
  selectedCustomerId: any;
  cancelReason: string = '';
  workersWithStatus: any[] = [];
  selectedReservationId: any;

  private modalInstance: any | null = null;
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


onActivate(reservationId: number) {
  this.selectedReservationId = reservationId;


  import('rxjs').then(({ forkJoin, take }) => {
    forkJoin({
      allCustomers: this.serviceCatalog.getCustomers().pipe(take(1)),
      workers: this.serviceCatalog.getWorkers().pipe(take(1))
    }).subscribe(({ allCustomers, workers }) => {

      const busyWorkers = allCustomers
        .filter(c => c.status === 'active' && c.worker)
        .map(c => c.worker);
      this.workersWithStatus = workers.map(w => ({
        ...w,
        isBusy: busyWorkers.includes(w.name)
      }));

      const modalElement = document.getElementById('workerModal');
      if (this.modalInstance) {
        this.modalInstance.hide();
      }

      this.modalInstance = new (window as any).bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
      });
      this.modalInstance.show();
    });
  });
}

selectWorkerAndActivate(worker: any) {
  if (worker.isBusy) return;

  this.serviceCatalog.updateCustomerStatus(this.selectedReservationId, 'active', worker.name);

  if (this.modalInstance) {
    this.modalInstance.hide();
  }


  setTimeout(() => {

    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(el => el.remove());


    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    });

    Toast.fire({
      icon: 'success',
      title: 'تم تفعيل الحجز بنجاح',
      text: `العامل المسؤول: ${worker.name}`
    });
  }, 100);
}
onEdit(customer: Customer) {
    this.serviceCatalog.getServices().subscribe((allServices) => {
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

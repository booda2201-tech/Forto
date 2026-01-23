import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  shareReplay,
  switchMap,
  take,
} from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';

type BookingStatusUi = 'waiting' | 'active' | 'completed' | 'canceled';

type BookingServiceItem = {
  bookingItemId: number;
  serviceId: number;
  name: string;
  price: number;
  durationMinutes?: number;
  assignedEmployeeId?: number | null;
};

type BookingCard = {
  id: number;
  customerName: string;
  phone: string;
  totalAmount: number;

  appointmentDate: string;
  appointmentTime: string;
  createdAt: string;

  status: 'waiting' | 'active' | 'completed' | 'canceled';
  statusText?: string;

  cars: { carModel?: string; plateNumber?: string }[];
  serviceItem: BookingServiceItem[];

  worker?: string | null;   // ✅ add this
  role?: string | null;     // ✅ add this

  raw?: any;
};

type EmployeeDto = {
  id: number;
  name: string;
  phoneNumber: string;
  isActive: boolean;
  role: number;
};

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss'],
})
export class ReservationsComponent implements OnInit {
  branchId = 1;

  // ✅ لازم تظبطه لقيمة الكاشير الحقيقي
  cashierId = 5;
  selectedCancelBookingId: number | null = null;
  usedOverride: { materialId: number; actualQty: number }[] = [];

  // refresh trigger
  private refresh$ = new BehaviorSubject<void>(undefined);

  // date
  private date$ = new BehaviorSubject<string>(this.todayYYYYMMDD());

  // current tab
  private currentTab$ = new BehaviorSubject<BookingStatusUi>('waiting');
  currentTab: BookingStatusUi = 'waiting';

  // invoice
  selectedInvoice: any;

  // ===== Worker modal state =====
  selectedReservationId: number | null = null; // bookingId
  selectedServiceItem: BookingServiceItem | null = null; // selected booking item
  selectedReservationServices: BookingServiceItem[] = []; // services in this booking
  employeesForService: EmployeeDto[] = [];
  isEmployeesLoading = false;

  // cancel modal (if you keep it)
  cancelReason?: string = '';

  bookings$: Observable<BookingCard[]> = combineLatest([this.refresh$, this.date$]).pipe(
    switchMap(([_, date]) => this.api.getBookingsToday(this.branchId, date)),
    map((res: any) => this.mapTodayResponseToCards(res?.data)),
    shareReplay(1)
  );

  waitingCount$ = this.bookings$.pipe(map(list => list.filter(x => x.status === 'waiting').length));
  activeCount$ = this.bookings$.pipe(map(list => list.filter(x => x.status === 'active').length));
  completedCount$ = this.bookings$.pipe(map(list => list.filter(x => x.status === 'completed').length));
  canceledCount$ = this.bookings$.pipe(map(list => list.filter(x => x.status === 'canceled').length));

  filteredBookings$: Observable<BookingCard[]> = combineLatest([this.bookings$, this.currentTab$]).pipe(
    map(([items, tab]) => items.filter(x => x.status === tab))
  );

  private modalInstance: any | null = null;

  constructor(private api: ApiService) { }

  ngOnInit(): void { }

  setTab(tab: BookingStatusUi) {
    this.currentTab = tab;
    this.currentTab$.next(tab);
  }

  refresh() {
    this.refresh$.next();
  }

  // ===== Activate: open modal + load booking services =====
  onActivate(bookingId: number) {
    this.bookings$.pipe(take(1)).subscribe(list => {
      const booking = list.find(b => b.id === bookingId);
      if (!booking) return;

      this.selectedReservationId = bookingId;
      this.selectedServiceItem = null;
      this.employeesForService = [];
      this.isEmployeesLoading = false;

      // ✅ services inside booking (contains bookingItemId + serviceId)
      this.selectedReservationServices = booking.serviceItem || [];

      // open modal
      const modalElement = document.getElementById('workerModal');
      this.modalInstance = new (window as any).bootstrap.Modal(modalElement);
      this.modalInstance.show();
    });
  }

  // user clicks on a service badge inside modal
  selectServiceItem(item: BookingServiceItem) {
    this.selectedServiceItem = item;
    this.loadEmployeesForService(item.serviceId);
  }

  private loadEmployeesForService(serviceId: number) {
    this.isEmployeesLoading = true;
    this.employeesForService = [];

    this.api.getServiceEmployees(serviceId).subscribe({
      next: (res: any) => {
        this.employeesForService = res?.data ?? [];
        this.isEmployeesLoading = false;
      },
      error: (err) => {
        this.isEmployeesLoading = false;
        console.error(err);
        Swal.fire('خطأ', err?.error?.message || 'فشل تحميل العمال', 'error');
      }
    });
  }

  // click worker -> assign
  selectWorkerAndActivate(worker: EmployeeDto) {
    if (!this.selectedReservationId || !this.selectedServiceItem) return;

    const payload = {
      cashierId: this.cashierId,
      assignments: [
        {
          bookingItemId: this.selectedServiceItem.bookingItemId,
          employeeId: worker.id
        }
      ]
    };

    this.api.assignBooking(this.selectedReservationId, payload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'تم تعيين العامل بنجاح',
          text: `تم تعيين ${worker.name} لخدمة ${this.selectedServiceItem?.name}`,
          timer: 1500,
          showConfirmButton: false
        });

        if (this.modalInstance) this.modalInstance.hide();

        // refresh list
        this.refresh();
      },
      error: (err) => {
        console.error(err);
        Swal.fire('خطأ', err?.error?.message || 'فشل تعيين العامل', 'error');
      }
    });
  }

  // // ===== placeholders for now (until endpoints provided) =====
  // onComplete(bookingId: number) {
  //   Swal.fire('Info', 'Complete endpoint not wired yet.', 'info');
  // }

onCancel(customer: any) {
  this.selectedCancelBookingId = customer.id; // bookingId
  this.cancelReason = '';

  const modalElement = document.getElementById('cancelModal');
  const modalInstance = new (window as any).bootstrap.Modal(modalElement);
  modalInstance.show();
}


confirmCancel() {
  if (!this.selectedCancelBookingId) return;

  const payload = {
    cashierId: this.cashierId,
    reason: this.cancelReason || '',
    usedOverride: [] as { materialId: number; actualQty: number }[],
  };

  this.api.cancelBooking(this.selectedCancelBookingId, payload).subscribe({
    next: () => {
      Swal.fire({
        icon: 'success',
        title: 'تم إلغاء الحجز',
        timer: 1200,
        showConfirmButton: false,
      });

      this.selectedCancelBookingId = null;
      this.cancelReason = '';
      this.refresh();
    },
    error: (err) => {
      console.error(err);
      Swal.fire('خطأ', err?.error?.message || 'فشل إلغاء الحجز', 'error');
    },
  });
}




onComplete(bookingId: number) {
  Swal.fire({
    title: 'إنهاء الحجز',
    text: 'هل تريد إنهاء الحجز؟',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'نعم',
    cancelButtonText: 'لا',
    confirmButtonColor: '#198754'
  }).then((result) => {
    if (!result.isConfirmed) return;

    const payload = {
      cashierId: this.cashierId,
      reason: '',
      usedOverride: [] as { materialId: number; actualQty: number }[],
    };

    this.api.completeBooking(bookingId, payload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'تم إنهاء الحجز',
          timer: 1200,
          showConfirmButton: false,
        });
        this.refresh();
      },
      error: (err) => {
        console.error(err);
        Swal.fire('خطأ', err?.error?.message || 'فشل إنهاء الحجز', 'error');
      },
    });
  });
}


  onEdit(customer: BookingCard) {
    Swal.fire('Info', 'Edit endpoint not wired yet.', 'info');
  }

  openInvoice(customer: any) {
    this.selectedInvoice = customer;
  }

  get subTotal(): number {
    if (!this.selectedInvoice?.serviceItem) return 0;
    return this.selectedInvoice.serviceItem.reduce(
      (acc: number, item: any) => acc + (item.price || 0),
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
    window.onafterprint = () => document.body.classList.remove('printing-mode');
  }

  // ===== Mapping =====
  private mapTodayResponseToCards(data: any): BookingCard[] {
    if (!data) return [];

    const toCard = (b: any, status: BookingStatusUi): BookingCard => {
      const scheduled = String(b.scheduledStart || '');
      const { date, time } = this.splitDateTime(scheduled);

      const serviceItem: BookingServiceItem[] = (b.services ?? []).map((s: any) => ({
        bookingItemId: s.bookingItemId,
        serviceId: s.serviceId,
        name: s.serviceName,
        price: Number(s.unitPrice ?? 0),
        durationMinutes: s.durationMinutes,
        assignedEmployeeId: s.assignedEmployeeId
      }));

      return {
        id: b.bookingId,
        customerName: b.clientName,
        phone: b.phoneNumber,
        totalAmount: Number(b.totalPrice ?? 0),
        appointmentDate: date,
        appointmentTime: time,
        createdAt: scheduled,
        status,
        statusText: this.getStatusDisplayName(status),
        cars: [{ plateNumber: b.plateNumber, carModel: b.carModel || '' }],
        serviceItem,
        raw: b
      };
    };

    const pending = (data.pending ?? []).map((b: any) => toCard(b, 'waiting'));
    const active = (data.active ?? []).map((b: any) => toCard(b, 'active'));
    const completed = (data.completed ?? []).map((b: any) => toCard(b, 'completed'));
    const cancelled = (data.cancelled ?? []).map((b: any) => toCard(b, 'canceled'));

    return [...pending, ...active, ...completed, ...cancelled];
  }

  private splitDateTime(iso: string): { date: string; time: string } {
    if (!iso || !iso.includes('T')) return { date: '', time: '' };
    const [d, t] = iso.split('T');
    return { date: d, time: (t || '').slice(0, 5) };
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

  private todayYYYYMMDD(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    console.log(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // confirmCancel() {
  //   if (!this.selectedCancelBookingId) return;

  //   // if (!this.cancelReason || this.cancelReason.trim().length < 2) {
  //   //   Swal.fire('تنبيه', 'من فضلك اكتب سبب الإلغاء', 'warning');
  //   //   return;
  //   // }

  //   const payload = {
  //     cashierId: this.cashierId,
  //     reason: this.cancelReason?.trim(),
  //     usedOverride: this.usedOverride // فاضية حالياً
  //   };

  //   this.api.cancelBooking(this.selectedCancelBookingId, payload).subscribe({
  //     next: () => {
  //       Swal.fire({
  //         icon: 'success',
  //         title: 'تم إلغاء الحجز',
  //         timer: 1200,
  //         showConfirmButton: false,
  //       });

  //       // refresh list
  //       this.refresh();

  //       // reset
  //       this.selectedCancelBookingId = null;
  //       this.cancelReason = '';
  //       this.usedOverride = [];
  //     },
  //     error: (err) => {
  //       console.error(err);
  //       Swal.fire('خطأ', err?.error?.message || 'فشل إلغاء الحجز', 'error');
  //     }
  //   });
  // }

getRoleDisplayName(role: string | null | undefined): string {
  const roles: Record<string, string> = {
    admin: 'المدير',
    cashier: 'الكاشير',
    worker: 'العامل',
    client: 'العميل',
  };

  if (!role) return 'المدير';
  return roles[role] || role;
}




}

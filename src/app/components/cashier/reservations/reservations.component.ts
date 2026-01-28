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
import { NgbAccordionModule } from "@ng-bootstrap/ng-bootstrap";

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

  worker?: string | null; // ✅ add this
  role?: string | null; // ✅ add this

  raw?: any;
};

type EmployeeDto = {
  employeeId: number;
  name: string;
  phoneNumber: string;
  isActive: boolean;
  role: number;
};

type BookingItemUi = {
  bookingItemId: number;
  serviceId: number;
  serviceName: string;
  status: number;
  assignedEmployeeId?: number | null;
};

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbAccordionModule],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss'],
})
export class ReservationsComponent implements OnInit {
  branchId = 1;
  editingBookingId: number | null = null;
  editingBookingServices: any[] = [];
  allAvailableServices: any[] = [];
  editingBookingPlateNumber: string = '';
  // ✅ لازم تظبطه لقيمة الكاشير الحقيقي
  cashierId = 5;
  selectedCancelBookingId: number | null = null;
  usedOverride: { materialId: number; actualQty: number }[] = [];
  assignments: {
    [bookingItemId: number]: { workerId: number; workerName: string };
  } = {};

  selectedBookingId: number | null = null;
  bookingItems: BookingItemUi[] = [];              // existing services in booking
  addSelection = new Set<number>();                // selected serviceIds to add
  serviceEmployees: Record<number, any[]> = {};    // serviceId -> employees list
  serviceEmployeeMap: Record<number, number> = {}; // serviceId -> selected employeeId
  isSavingEdit = false;
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
  bookings$: Observable<BookingCard[]> = combineLatest([
    this.refresh$,
    this.date$,
  ]).pipe(
    switchMap(([_, date]) => this.api.getBookingsToday(this.branchId, date)),
    map((res: any) => this.mapTodayResponseToCards(res?.data)),
    shareReplay(1),
  );
  waitingCount$ = this.bookings$.pipe(
    map((list) => list.filter((x) => x.status === 'waiting').length),
  );
  activeCount$ = this.bookings$.pipe(
    map((list) => list.filter((x) => x.status === 'active').length),
  );
  completedCount$ = this.bookings$.pipe(
    map((list) => list.filter((x) => x.status === 'completed').length),
  );
  canceledCount$ = this.bookings$.pipe(
    map((list) => list.filter((x) => x.status === 'canceled').length),
  );
  filteredBookings$: Observable<BookingCard[]> = combineLatest([
    this.bookings$,
    this.currentTab$,
  ]).pipe(map(([items, tab]) => items.filter((x) => x.status === tab)));
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

  onActivate(bookingId: number) {
    this.bookings$.pipe(take(1)).subscribe((list) => {
      const booking = list.find((b) => b.id === bookingId);
      if (!booking) return;

      this.selectedReservationId = bookingId;

      // ✅ لازم يكون عندك scheduledStart في booking (من API today)
      this.selectedBookingScheduledStart = booking.createdAt || booking.raw?.scheduledStart || null;

      this.assignments = {};
      this.selectedReservationServices = booking.serviceItem || [];

      if (this.selectedReservationServices.length > 0) {
        this.selectServiceItem(this.selectedReservationServices[0]);
      }

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



  selectWorkerAndStore(worker: any) {
    if (!this.selectedServiceItem) return;

    this.assignments[this.selectedServiceItem.bookingItemId] = {
      workerId: worker.employeeId,
      workerName: worker.name,
    };

    // optional auto-jump to next service
    const nextService = this.selectedReservationServices.find(
      (s) => !this.assignments[s.bookingItemId]
    );

    if (nextService) {
      this.selectServiceItem(nextService);
    } else {
      this.selectedServiceItem = null;
    }
  }

  confirmAllAssignments() {
    if (this.selectedReservationId == null) {
      Swal.fire('خطأ', 'رقم الحجز غير موجود', 'error');
      return;
    }

    const bookingId = this.selectedReservationId;

    const totalRequired = this.selectedReservationServices.length;
    const totalAssigned = Object.keys(this.assignments).length;

    if (totalAssigned < totalRequired) {
      Swal.fire(
        'تنبيه',
        `يرجى تعيين عمال لجميع الخدمات (${totalAssigned} من ${totalRequired})`,
        'warning'
      );
      return;
    }

    // ✅ لازم يتعرف هنا
    const assignPayload = {
      cashierId: this.cashierId,
      assignments: Object.keys(this.assignments).map((itemId) => ({
        bookingItemId: Number(itemId),
        employeeId: this.assignments[Number(itemId)].workerId,
      })),
    };

    console.log(assignPayload);

    Swal.showLoading();

    this.api.assignBooking(bookingId, assignPayload).subscribe({
      next: () => {
        this.api.startBookingCashier(bookingId, { cashierId: this.cashierId }).subscribe({
          next: (res) => {
            console.log(res);

            Swal.fire({
              icon: 'success',
              title: 'تم تفعيل الحجز بنجاح',
              timer: 1500,
              showConfirmButton: false,
            });

            if (this.modalInstance) this.modalInstance.hide();
            this.refresh();
          },
          error: (err) => {
            console.error(err);
            Swal.fire('خطأ', err?.error?.message || 'فشل تفعيل الحجز', 'error');
          }
        });
      },
      error: (err) => {
        console.log(err);
        Swal.fire('خطأ', err?.error?.message || 'فشل تعيين العمال للخدمات', 'error');
      }
    });

  }

  get assignedCount(): number {
    return Object.keys(this.assignments).length;
  }

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


  selectedReservationStatus: string | null = null;


  get isPendingBooking(): boolean {
    return this.selectedReservationStatus === 'waiting' || this.selectedReservationStatus === 'pending';
  }




  onComplete(bookingId: number) {
    Swal.fire({
      title: 'إنهاء الحجز',
      text: 'هل تريد إنهاء الحجز؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم',
      cancelButtonText: 'لا',
      confirmButtonColor: '#198754',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload = {
        cashierId: this.cashierId
      };

      this.api.completeBookingCashier(bookingId, payload).subscribe({
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
          Swal.fire(
            'خطأ',
            err?.error?.message || 'فشل إنهاء الحجز',
            'error'
          );
        },
      });
    });
  }


  
  get subTotal(): number {
    if (!this.selectedInvoice?.serviceItem) return 0;
    return this.selectedInvoice.serviceItem.reduce(
      (acc: number, item: any) => acc + (item.price || 0),
      0,
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

      const serviceItem: BookingServiceItem[] = (b.services ?? []).map(
        (s: any) => ({
          bookingItemId: s.bookingItemId,
          serviceId: s.serviceId,
          name: s.serviceName,
          price: Number(s.unitPrice ?? 0),
          durationMinutes: s.durationMinutes,
          assignedEmployeeId: s.assignedEmployeeId,
        }),
      );

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
        raw: b,
      };
    };

    const pending = (data.pending ?? []).map((b: any) => toCard(b, 'waiting'));
    const active = (data.active ?? []).map((b: any) => toCard(b, 'active'));
    const completed = (data.completed ?? []).map((b: any) =>
      toCard(b, 'completed'),
    );
    const cancelled = (data.cancelled ?? []).map((b: any) =>
      toCard(b, 'canceled'),
    );

    return [...pending, ...active, ...completed, ...cancelled];
  }

  private splitDateTime(iso: string): { date: string; time: string } {
    if (!iso || !iso.includes('T')) return { date: '', time: '' };
    const [d, t] = iso.split('T');
    return { date: d, time: (t || '').slice(0, 5) };
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

  private todayYYYYMMDD(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    console.log(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    );

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }


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

  inBooking: any[] = [];      // from API
  notInBooking: any[] = [];   // from API

  isLoadingOptions = false;

  toggleServiceSelection(svc: any) {
    const id = svc.serviceId;
    console.log(id);

    if (this.addSelection.has(id)) {
      this.addSelection.delete(id);
      delete this.serviceEmployeeMap[id];
      return;
    }

    this.addSelection.add(id);

    // ✅ هنا نشغل تحميل العمال للخدمة المختارة
    this.loadEmployeesForService(id);
  }


  isServiceSelected(serviceId: number): boolean {
    return this.addSelection.has(serviceId);
  }

  selectedBookingScheduledStart: string | null = null;

  getEmployeesForServiceInEditModal(serviceId: number): any[] {
    const bookingId = this.selectedReservationId;
    const scheduledStart = this.selectedBookingScheduledStart;
    if (!bookingId || !scheduledStart) return [];

    const cacheKey = `${bookingId}_${serviceId}_${scheduledStart}`;
    return (this.serviceEmployees as any)[cacheKey] ?? [];
  }


  loadEmployeesForService(serviceId: number) {

    const bookingId = this.selectedReservationId;
    console.log(bookingId);

    const scheduledStart = this.selectedBookingScheduledStart;

    if (!bookingId || !scheduledStart) {
      console.warn('Missing bookingId or scheduledStart', { bookingId, scheduledStart });
      this.employeesForService = [];
      return;
    }

    const cacheKey = `${bookingId}_${serviceId}_${scheduledStart}`;

    // لو cached
    if ((this.serviceEmployees as any)[cacheKey]) {
      this.employeesForService = (this.serviceEmployees as any)[cacheKey];
      this.isEmployeesLoading = false;
      return;
    }


    this.isEmployeesLoading = true;

    this.api.getServiceEmployees(serviceId, bookingId, scheduledStart).subscribe({
      next: (res: any) => {
        console.log(res);

        // ✅ الصح: العمال في availableEmployees
        const list = res?.data?.availableEmployees ?? [];

        (this.serviceEmployees as any)[cacheKey] = list;
        this.employeesForService = list;

        this.isEmployeesLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        (this.serviceEmployees as any)[cacheKey] = [];
        this.employeesForService = [];
        this.isEmployeesLoading = false;
      }
    });
  }


  cancelExistingItem(item: any) {
    const bookingItemId = item.bookingItemId;

    if (!confirm(`إلغاء خدمة: ${item.serviceName}?`)) return;

    const payload = { cashierId: this.cashierId, reason: '', usedOverride: [] };

    this.api.cancelBookingItemCashier(bookingItemId, payload).subscribe({
      next: () => {
        this.inBooking = this.inBooking.filter(x => x.bookingItemId !== bookingItemId);
        const svcId = item.serviceId;
        const exists = this.notInBooking.some(x => x.serviceId === svcId);
        if (!exists) {
          this.notInBooking.unshift({
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            unitPrice: item.unitPrice ?? null
          });
        }

        // ✅ reload options from server to ensure correct lists
        this.reloadEditServicesOptions();

        // ✅ update main bookings UI instantly too (see section below)
        this.removeServiceFromBookingCardUI(bookingItemId);

        alert('تم إلغاء الخدمة');
      },
      error: (err: any) => {
        console.error(err);
        alert(err?.error?.message || 'فشل إلغاء الخدمة');
      }
    });
  }


  removeServiceFromBookingCardUI(bookingItemId: number) {
    // لو عندك snapshot list cached
    this.bookings$.pipe(take(1)).subscribe(list => {
      const booking = list.find(b => b.id === this.selectedBookingId);
      if (!booking) return;

      // booking.raw.services هي اللي عندك غالباً
      if (booking.raw?.services) {
        booking.raw.services = booking.raw.services.filter((s: any) => s.bookingItemId !== bookingItemId);
      }

      // لو بتعرض serviceItem في UI كمان
      if (booking.serviceItem) {
        booking.serviceItem = booking.serviceItem.filter((s: any) => (s.bookingItemId ?? s.id) !== bookingItemId);
      }
    });
  }

  confirmEditServices() {
    console.log('confirmEditServices fired', {
      selectedBookingId: this.selectedBookingId,
      addSelectionSize: this.addSelection?.size,
      addSelectionValues: Array.from(this.addSelection || []),
      serviceEmployeeMap: this.serviceEmployeeMap
    });

    if (this.selectedBookingId == null) return;

    if (this.addSelection.size === 0) {
      alert('اختاري خدمة واحدة على الأقل للإضافة');
      return;
    }
    const bookingId = this.selectedBookingId;

    const missingEmp = Array.from(this.addSelection).filter(sid => !this.serviceEmployeeMap[sid]);
    if (missingEmp.length > 0 && !this.isPendingBooking) {
      alert('اختاري عامل لكل خدمة جديدة قبل الحفظ');
      return;
    }

    this.isSavingEdit = true;

    const calls = Array.from(this.addSelection).map(serviceId =>
      this.api.addServiceToBookingCashier(bookingId, {
        cashierId: this.cashierId,
        serviceId,
        assignedEmployeeId: this.isPendingBooking ? null : this.serviceEmployeeMap[serviceId]
      })
    );

    import('rxjs').then(({ forkJoin }) => {
      console.log('calling addServiceToBookingCashier with:', {
        bookingId,
        calls: Array.from(this.addSelection).map(serviceId => ({
          serviceId,
          assignedEmployeeId: this.serviceEmployeeMap[serviceId]
        }))
      });

      forkJoin(calls).subscribe({
        next: () => {
          this.isSavingEdit = false;
          alert('تم إضافة الخدمات');

          // close modal
          const el = document.getElementById('editServicesModal');
          const modal = (window as any).bootstrap.Modal.getInstance(el);
          modal?.hide();

          this.refresh();
        },
        error: (err: any) => {
          console.error(err);
          this.isSavingEdit = false;
          alert(err?.error?.message || 'فشل إضافة الخدمات');
        }
      });
    });
  }




  openEditServicesModal(booking: any) {
    this.selectedReservationStatus = booking.status; // أو booking.raw?.status
    // ✅ دي أهم 3 سطور
    this.selectedBookingId = booking.id;
    this.selectedReservationId = booking.id;

    this.selectedBookingScheduledStart =
      booking.raw?.scheduledStart ??
      booking.scheduledStart ??
      booking.raw?.slotHourStart ??
      booking.slotHourStart ??
      null;

    console.log('OPEN EDIT MODAL', {
      selectedBookingId: this.selectedBookingId,
      selectedReservationId: this.selectedReservationId,
      selectedBookingScheduledStart: this.selectedBookingScheduledStart
    });

    // reset selections
    this.addSelection.clear();
    this.serviceEmployeeMap = {};

    // load options API
    this.isLoadingOptions = true;
    this.api.getBookingServiceOptions(booking.id).subscribe({
      next: (res: any) => {
        this.inBooking = res?.data?.inBooking ?? [];
        this.notInBooking = res?.data?.notInBooking ?? [];
        this.isLoadingOptions = false;

        const el = document.getElementById('editServicesModal');
        const modal = new (window as any).bootstrap.Modal(el);
        modal.show();
      },
      error: (err: any) => {
        console.error(err);
        this.isLoadingOptions = false;
        alert(err?.error?.message || 'فشل تحميل خدمات الحجز');
      }
    });
  }

  reloadEditServicesOptions() {
    if (this.selectedBookingId == null) {
      console.warn('reloadEditServicesOptions: selectedBookingId is null');
      return;
    }

    this.isLoadingOptions = true;

    this.api.getBookingServiceOptions(this.selectedBookingId).subscribe({
      next: (res: any) => {
        this.inBooking = res?.data?.inBooking ?? [];
        this.notInBooking = res?.data?.notInBooking ?? [];
        this.isLoadingOptions = false;

        // ✅ reset add selection لأن القوائم اتغيرت
        this.addSelection.clear();
        this.serviceEmployeeMap = {};
      },
      error: (err: any) => {
        console.error(err);
        this.isLoadingOptions = false;
        alert(err?.error?.message || 'فشل إعادة تحميل خدمات الحجز');
      }
    });
  }








  // selectedReservationStatus: number | null = null;

  // get isPendingBooking(): boolean {
  //   return this.selectedReservationStatus === Pending;
  // }





}

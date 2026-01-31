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

  cars: { carModel?: string; plateNumber?: string; bodyType?: number }[];
  serviceItem: BookingServiceItem[];
  bodyType?: number; // فئة السيارة من الـ API

  worker?: string | null;
  role?: string | null;
  invoiceId?: number | null;

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

type MaterialDto = {
  id: number;
  name: string;
  unit: number;
  costPerUnit: number;
  chargePerUnit: number;
  isActive: boolean;
};

type UsedMaterial = {
  materialId: number;
  actualQty: number;
  materialName?: string;
};

type RecipeMaterialDto = {
  materialId: number;
  materialName: string;
  unit: string;
  defaultQty: number;
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
  // selected date for display
  selectedDate: string = this.todayYYYYMMDD();
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

  onDateChange(event: any) {
    const dateStr = event.target.value;
    if (dateStr) {
      this.selectedDate = dateStr;
      this.date$.next(dateStr);
    }
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

  /** من الحجوزات المكتملة: تأكيد الدفع ثم عرض الفاتورة للطباعة */
  openInvoiceAndPay(booking: BookingCard) {
    const invoiceId = booking.invoiceId ?? (booking.raw as any)?.invoiceId ?? (booking.raw as any)?.invoice?.id;
    if (!invoiceId) {
      Swal.fire({
        icon: 'warning',
        title: 'لا توجد فاتورة',
        text: 'هذا الحجز لا يحتوي على رقم فاتورة. تأكد من أن الـ API يرجع invoiceId للحجوزات المكتملة.'
      });
      return;
    }
    Swal.fire({ title: 'جاري تأكيد الدفع...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    this.api.payInvoiceCash(invoiceId, this.cashierId).subscribe({
      next: (res: any) => {
        const invoiceFromApi = res?.data;
        this.selectedInvoice = invoiceFromApi ? {
          id: invoiceFromApi.invoiceId ?? invoiceFromApi.id ?? invoiceId,
          customerName: invoiceFromApi.customerName ?? booking.customerName,
          phone: invoiceFromApi.phone ?? booking.phone,
          cars: invoiceFromApi.cars ?? booking.cars,
          appointmentDate: invoiceFromApi.date ?? booking.appointmentDate,
          serviceItem: invoiceFromApi.lines?.map((l: any) => ({ name: l.description, price: l.unitPrice ?? l.total ?? 0 })) ?? booking.serviceItem
        } : {
          id: invoiceId,
          customerName: booking.customerName,
          phone: booking.phone,
          cars: booking.cars,
          appointmentDate: booking.appointmentDate,
          serviceItem: booking.serviceItem ?? []
        };
        Swal.close();
        const modalEl = document.getElementById('invoiceModal');
        const modal = new (window as any).bootstrap.Modal(modalEl);
        modal.show();
      },
      error: (err: any) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'فشل تأكيد الدفع',
          text: err?.error?.message ?? 'تعذر تأكيد دفع الفاتورة.'
        });
      }
    });
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

      const bodyType = Number(b.bodyType ?? b.car?.bodyType ?? b.carBodyType ?? b.vehicleType ?? 1);
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
        cars: [{ plateNumber: b.plateNumber, carModel: b.carModel || '', bodyType }],
        serviceItem,
        bodyType,
        invoiceId: b.invoiceId ?? b.invoice?.id ?? null,
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
  
  // Materials for cancel service
  allMaterials: (MaterialDto | RecipeMaterialDto)[] = [];
  isLoadingMaterials = false;
  selectedItemForCancel: any = null;
  usedMaterials: UsedMaterial[] = [];
  cancelServiceReason: string = '';
  bookingBodyType: number = 1; // من الحجز عند فتح modal التعديل

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
    this.selectedItemForCancel = item;
    this.usedMaterials = [];
    this.cancelServiceReason = '';
    
    // لو الحجز في قائمة الانتظار: إلغاء مباشر بدون modal المواد
    if (this.selectedReservationStatus === 'waiting') {
      const bookingItemId = item.bookingItemId;
      const payload = {
        cashierId: this.cashierId,
        reason: this.cancelServiceReason || '',
        usedOverride: [] as { materialId: number; actualQty: number }[]
      };
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
          this.reloadEditServicesOptions();
          this.removeServiceFromBookingCardUI(bookingItemId);
          this.selectedItemForCancel = null;
          Swal.fire({ icon: 'success', title: 'تم إلغاء الخدمة', timer: 1500, showConfirmButton: false });
        },
        error: (err: any) => {
          console.error(err);
          Swal.fire('خطأ', err?.error?.message || 'فشل إلغاء الخدمة', 'error');
        }
      });
      return;
    }
    
    // لو الحجز نشط: فتح modal وتحميل مواد الخدمة فقط
    this.loadServiceMaterials(item.serviceId, this.bookingBodyType);
    
    const modalElement = document.getElementById('cancelServiceModal');
    const modalInstance = new (window as any).bootstrap.Modal(modalElement);
    modalInstance.show();
  }
  
  /** قيم bodyType للمحاولة بالترتيب (لو الحجز مافيهاش bodyType أو الوصفة فاضية) */
  private readonly bodyTypesToTry = [2, 1, 3, 4, 5, 6, 7, 99];

  loadServiceMaterials(serviceId: number, bodyType: number) {
    this.isLoadingMaterials = true;
    this.allMaterials = [];
    const orderedTypes = [bodyType, ...this.bodyTypesToTry.filter(bt => bt !== bodyType)];
    let attempt = 0;

    const tryNext = () => {
      if (attempt >= orderedTypes.length) {
        this.isLoadingMaterials = false;
        this.allMaterials = [];
        this.usedMaterials = [];
        Swal.fire({
          icon: 'info',
          title: 'لا توجد وصفة',
          text: 'لم يتم العثور على مواد لهذه الخدمة. تأكد من وجود recipe للخدمة في الكتالوج.'
        });
        return;
      }
      const bt = orderedTypes[attempt++];
      this.api.getServiceRecipes(serviceId, bt).subscribe({
        next: (res: any) => {
          const materials = res?.data?.materials ?? [];
          if (materials.length > 0) {
            this.allMaterials = materials;
            this.isLoadingMaterials = false;
            if (this.usedMaterials.length === 0) {
              this.usedMaterials = materials.map((m: RecipeMaterialDto) => ({
                materialId: m.materialId,
                actualQty: m.defaultQty ?? 0
              }));
            }
            return;
          }
          tryNext();
        },
        error: () => tryNext()
      });
    };

    tryNext();
  }
  
  addMaterialRow() {
    this.usedMaterials.push({
      materialId: 0,
      actualQty: 0
    });
  }
  
  removeMaterialRow(index: number) {
    this.usedMaterials.splice(index, 1);
  }
  
  getMaterialName(materialId: number): string {
    const material = this.allMaterials.find(m => (m as any).materialId === materialId || (m as any).id === materialId);
    return (material as any)?.materialName || (material as any)?.name || '';
  }
  
  confirmCancelService() {
    if (!this.selectedItemForCancel) return;
    
    const bookingItemId = this.selectedItemForCancel.bookingItemId;
    
    // Filter out materials with no selection or zero quantity
    const validMaterials = this.usedMaterials.filter(
      m => m.materialId > 0 && m.actualQty > 0
    );
    
    const payload = {
      cashierId: this.cashierId,
      reason: this.cancelServiceReason || '',
      usedOverride: validMaterials.map(m => ({
        materialId: m.materialId,
        actualQty: m.actualQty
      }))
    };

    this.api.cancelBookingItemCashier(bookingItemId, payload).subscribe({
      next: () => {
        this.inBooking = this.inBooking.filter(x => x.bookingItemId !== bookingItemId);
        const svcId = this.selectedItemForCancel.serviceId;
        const exists = this.notInBooking.some(x => x.serviceId === svcId);
        if (!exists) {
          this.notInBooking.unshift({
            serviceId: this.selectedItemForCancel.serviceId,
            serviceName: this.selectedItemForCancel.serviceName,
            unitPrice: this.selectedItemForCancel.unitPrice ?? null
          });
        }

        // ✅ reload options from server to ensure correct lists
        this.reloadEditServicesOptions();

        // ✅ update main bookings UI instantly too
        this.removeServiceFromBookingCardUI(bookingItemId);

        // Close modal
        const modalElement = document.getElementById('cancelServiceModal');
        const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
        modalInstance?.hide();
        
        // Reset
        this.selectedItemForCancel = null;
        this.usedMaterials = [];
        this.cancelServiceReason = '';

        Swal.fire({
          icon: 'success',
          title: 'تم إلغاء الخدمة',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err: any) => {
        console.error(err);
        Swal.fire('خطأ', err?.error?.message || 'فشل إلغاء الخدمة', 'error');
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
    this.selectedReservationStatus = booking.status;
    this.selectedBookingId = booking.id;
    this.selectedReservationId = booking.id;
    this.bookingBodyType = Number(
      booking.bodyType ??
      booking.raw?.bodyType ??
      booking.raw?.car?.bodyType ??
      booking.cars?.[0]?.bodyType ??
      1
    );

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

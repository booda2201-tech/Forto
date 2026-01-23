import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';

type ServiceRateDto = {
  id: number;
  bodyType: number;
  price: number;
  durationMinutes: number;
};

type ServiceApiDto = {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  rates: ServiceRateDto[];
};

type ServiceCardVm = {
  id: number; // serviceId
  name: string;
  price: number;
  durationMinutes: number;
};

type SlotDto = {
  hour: string;     // "08:00"
  booked: number;
  available: number;
};

@Component({
  selector: 'app-new-reservation',
  templateUrl: './new-reservation.component.html',
  styleUrls: ['./new-reservation.component.scss'],
})
export class NewReservationComponent implements OnInit {
  // ===== Config =====
  branchId = 1;            // ✅ set correct branchId
  createdByType = 1;
  createdByEmployeeId = 5;

  // ===== Services =====
  servicesRaw: ServiceApiDto[] = [];
  services: ServiceCardVm[] = []; // rendered cards
  selectedServices: ServiceCardVm[] = [];
  totalPrice = 0;

  // ===== Slots =====
  availableSlots: SlotDto[] = [];
  selectedSlotHour: string | null = null;
  isSlotsLoading = false;

  carCategories = [
    { id: 1, nameAr: 'سيدان (Sedan)' },
    { id: 2, nameAr: 'دفع رباعي (SUV)' },
    { id: 3, nameAr: 'هاتشباك (Hatchback)' },
    { id: 4, nameAr: 'كوبيه (Coupe)' },
    { id: 5, nameAr: 'بيك أب (Pickup)' },
    { id: 6, nameAr: 'فان (Van)' },
    { id: 7, nameAr: 'شاحنة (Truck)' },
    { id: 99, nameAr: 'أخرى (Other)' },
  ];

  customerForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required]),
    email: new FormControl(''),

    carType: new FormControl('', [Validators.required]),
    carNumber: new FormControl('', [Validators.required]),
    carCategory: new FormControl<number | null>(null, [Validators.required]),

    appointmentDate: new FormControl('', [Validators.required]),
    // ⛔ appointmentTime removed from logic (time comes from available slots dropdown)
    // keep it in form only if you want, but we won't use it
    appointmentTime: new FormControl(''),
  });

  constructor(
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    // 1) Load services (IMPORTANT: pass categoryId if your ApiService supports it)
    this.api.getServices().subscribe({
      next: (res: any) => {
        this.servicesRaw = res?.data ?? [];
        this.rebuildServicesForBodyType();
      },
      error: (err) => {
        this.toastr.error('فشل تحميل الخدمات', 'خطأ');
        console.error(err);
      },
    });

    // 2) When car category changes -> rebuild services, clear selections & slots
this.customerForm.get('carCategory')!.valueChanges.subscribe(() => {
  this.selectedServices = [];
  this.totalPrice = 0;

  this.availableSlots = [];
  this.selectedSlotHour = null;

  // ✅ ensure value is settled
  queueMicrotask(() => {
    this.rebuildServicesForBodyType();
    this.loadAvailableSlots();
  });
});


    // 3) When date changes -> reload slots (if services selected)
    this.customerForm.get('appointmentDate')!.valueChanges.subscribe(() => {
      this.selectedSlotHour = null;
      this.loadAvailableSlots();
    });
  }

  private rebuildServicesForBodyType(): void {
    const bodyType = Number(this.customerForm.value.carCategory);

    if (!this.servicesRaw.length || Number.isNaN(bodyType) || bodyType <= 0) {
      this.services = [];
      return;
    }

    this.services = this.servicesRaw
      .map((s) => {
        const rate = (s.rates ?? []).find((r) => r.bodyType === bodyType);
        if (!rate) return null;

        return {
          id: s.id,
          name: s.name,
          price: rate.price,
          durationMinutes: rate.durationMinutes,
        } as ServiceCardVm;
      })
      .filter(Boolean) as ServiceCardVm[];

    if (this.services.length === 0) {
      this.toastr.warning(
        `لا توجد أسعار خدمات لهذا النوع (bodyType=${bodyType}).`,
        'تنبيه'
      );
    }
  }

  toggleService(service: ServiceCardVm, event: any) {
    const checked = !!event.target.checked;

    if (checked) {
      if (!this.selectedServices.some((s) => s.id === service.id)) {
        this.selectedServices.push(service);
      }
    } else {
      this.selectedServices = this.selectedServices.filter(
        (s) => s.id !== service.id
      );
    }

    this.calculateTotal();

    // refresh slots when services change
    this.selectedSlotHour = null;
    this.loadAvailableSlots();
  }

  calculateTotal() {
    this.totalPrice = this.selectedServices.reduce((sum, s) => sum + s.price, 0);
  }

  isServiceSelected(service: ServiceCardVm): boolean {
    return this.selectedServices.some((s) => s.id === service.id);
  }

  // ======================
  // Available Slots
  // ======================
  loadAvailableSlots(): void {
    const date = this.customerForm.value.appointmentDate;
    const serviceIds = this.selectedServices.map((s) => s.id);

    console.log('[Slots] date =', date, 'serviceIds =', serviceIds);

    if (!date) {
      console.log('[Slots] return: no date');
      this.availableSlots = [];
      return;
    }

    if (serviceIds.length === 0) {
      console.log('[Slots] return: no selected services');
      this.availableSlots = [];
      return;
    }

    this.isSlotsLoading = true;

    this.api.getAvailableSlots(this.branchId, String(date), serviceIds).subscribe({
      next: (res: any) => {
        console.log('[Slots] API response:', res);
        this.availableSlots = res?.data?.slots ?? [];
        this.isSlotsLoading = false;
      },
      error: (err) => {
        console.log('[Slots] API error:', err);
        this.isSlotsLoading = false;
        this.availableSlots = [];
        this.toastr.error(err?.error?.message || 'فشل تحميل المواعيد', 'خطأ');
      },
    });
  }

  // ======================
  // Submit quick-create
  // ======================
  onSubmit() {
    if (this.customerForm.invalid) {
      this.toastr.error('يرجى التأكد من البيانات المدخلة', 'خطأ');
      return;
    }
    if (this.selectedServices.length === 0) {
      this.toastr.warning('يرجى اختيار خدمة واحدة على الأقل', 'تنبيه');
      return;
    }
    if (!this.selectedSlotHour) {
      this.toastr.warning('يرجى اختيار وقت من المواعيد المتاحة', 'تنبيه');
      return;
    }

    const v = this.customerForm.value;

    const scheduledStart = this.toLocalIsoNoZ(String(v.appointmentDate), this.selectedSlotHour);

    const bodyType = Number(v.carCategory);
    const { brand, model, year } = this.parseBrandModelYear(String(v.carType ?? ''));

    const payload = {
      branchId: this.branchId,
      car: {
        bodyType,
        plateNumber: String(v.carNumber ?? '').trim(),
        brand: brand || 'Unknown',
        model: model || '',
        color: '',
        year: year ?? 0,
        isDefault: true,
      },
      client: {
        phoneNumber: String(v.phone ?? '').trim(),
        fullName: String(v.name ?? '').trim(),
        email: String(v.email ?? '').trim() || null,
      },
      scheduledStart,
      serviceIds: this.selectedServices.map((s) => s.id),
      serviceAssignments: [],
      createdByType: this.createdByType,
      createdByEmployeeId: this.createdByEmployeeId,
      notes: '',
    };


    this.api.quickCreateBooking(payload).subscribe({
      next: (res: any) => {
        console.log("1 : ", payload);

        console.log(res);

        if (res?.success === false) {
          this.toastr.error(res?.message || 'فشل إنشاء الحجز', 'خطأ');
          return;
        }

        this.toastr.success('تم إنشاء الحجز بنجاح!', 'عملية ناجحة');
        this.router.navigate(['/cashier/cashier-page']);
      },
      error: (err) => {
        console.log("2 : ", payload);

        console.log(err);

        if (err?.status === 409) {
          this.toastr.error(
            err?.error?.message || 'الموعد غير متاح، اختر موعدًا آخر',
            'تعارض'
          );
          // refresh slots after conflict
          this.loadAvailableSlots();
          return;
        }

        this.toastr.error(err?.error?.message || 'فشل إنشاء الحجز', 'خطأ');
        console.error(err);
      },
    });
  }

  private toLocalIsoNoZ(dateStr: string, hourStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = hourStr.split(':').map(Number);

    // local date
    const dt = new Date(y, m - 1, d, hh, mm, 0, 0);

    const pad = (n: number) => String(n).padStart(2, '0');

    // "YYYY-MM-DDTHH:mm:ss"
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
  }


  private parseBrandModelYear(carTypeText: string): { brand: string; model: string; year?: number } {
    const text = carTypeText.trim();
    const parts = text.split(/\s+/).filter(Boolean);

    let year: number | undefined = undefined;
    const last = parts[parts.length - 1];
    if (last && /^\d{4}$/.test(last)) {
      year = Number(last);
      parts.pop();
    }

    const brand = parts[0] ?? '';
    const model = parts.slice(1).join(' ');

    return { brand, model, year };
  }
}

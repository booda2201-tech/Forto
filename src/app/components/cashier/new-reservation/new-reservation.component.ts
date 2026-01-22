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

@Component({
  selector: 'app-new-reservation',
  templateUrl: './new-reservation.component.html',
  styleUrls: ['./new-reservation.component.scss'],
})
export class NewReservationComponent implements OnInit {
  // ===== Config (set correct values) =====
  branchId = 6713; // ✅ quick-create branchId (from your latest API)
  categoryId = 2396; // services GetAll?categoryId=2396 (adjust if needed)
  createdByType = 0; // ✅ from quick-create example
  createdByEmployeeId = 314; // ✅ from quick-create example
  createdByClientId = 3237; // ✅ from quick-create example (change if needed)

  // ===== Services =====
  servicesRaw: ServiceApiDto[] = [];
  services: ServiceCardVm[] = []; // cards rendered in UI
  selectedServices: ServiceCardVm[] = [];
  totalPrice = 0;

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
    appointmentTime: new FormControl('', [Validators.required]),
  });

  constructor(
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // 1) load services once (raw)
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

    // 2) whenever carCategory changes -> rebuild service cards & clear selections
    this.customerForm.get('carCategory')!.valueChanges.subscribe(() => {
      this.selectedServices = [];
      this.totalPrice = 0;
      this.rebuildServicesForBodyType();
    });
  }

  private rebuildServicesForBodyType(): void {
    const bodyType = this.customerForm.value.carCategory;

    if (!bodyType || !this.servicesRaw.length) {
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
  }

  calculateTotal() {
    this.totalPrice = this.selectedServices.reduce((sum, s) => sum + s.price, 0);
  }

  isServiceSelected(service: ServiceCardVm): boolean {
    return this.selectedServices.some((s) => s.id === service.id);
  }

  onSubmit() {
    if (this.customerForm.invalid) {
      this.toastr.error('يرجى التأكد من البيانات المدخلة', 'خطأ');
      return;
    }
    if (this.selectedServices.length === 0) {
      this.toastr.warning('يرجى اختيار خدمة واحدة على الأقل', 'تنبيه');
      return;
    }

    const v = this.customerForm.value;

    const scheduledStart = this.toIsoFromDateAndTime(
      String(v.appointmentDate),
      String(v.appointmentTime)
    );

    const bodyType = Number(v.carCategory);

    const { brand, model, year } = this.parseBrandModelYear(
      String(v.carType ?? '')
    );

    const payload = {
      branchId: this.branchId,
      car: {
        bodyType: bodyType,
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
      scheduledStart: scheduledStart,
      serviceIds: this.selectedServices.map((s) => s.id),
      serviceAssignments: [], // optional now
      createdByType: this.createdByType,
      createdByEmployeeId: this.createdByEmployeeId,
      createdByClientId: this.createdByClientId,
      notes: '',
    };

    this.api.quickCreateBooking(payload).subscribe({
      next: (res: any) => {
        if (res?.success === false) {
          this.toastr.error(res?.message || 'فشل إنشاء الحجز', 'خطأ');
          return;
        }

        this.toastr.success('تم إنشاء الحجز بنجاح!', 'عملية ناجحة');
        this.router.navigate(['/cashier/cashier-page']);
      },
      error: (err) => {
        if (err?.status === 409) {
          this.toastr.error(
            err?.error?.message || 'الموعد غير متاح، اختر موعدًا آخر',
            'تعارض'
          );
          return;
        }

        this.toastr.error(err?.error?.message || 'فشل إنشاء الحجز', 'خطأ');
        console.error(err);
      },
    });
  }

  private toIsoFromDateAndTime(dateStr: string, timeStr: string): string {
    // date: "2026-01-20", time: "11:30"
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    const local = new Date(y, m - 1, d, hh, mm, 0, 0);
    return local.toISOString();
  }

  private parseBrandModelYear(carTypeText: string): {
    brand: string;
    model: string;
    year?: number;
  } {
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

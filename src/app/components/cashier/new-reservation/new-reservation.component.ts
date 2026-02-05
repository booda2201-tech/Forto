import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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

  // Client lookup
  foundClients: any[] = [];
  isLookingUpClient = false;
  showCarSelectionModal = false;
  selectedClient: any = null;
  /** عميل مميز - من الـ API */
  currentClientIsPremium = false;

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

    // 4) When phone number changes -> lookup client (with debounce)
    this.customerForm.get('phone')!.valueChanges.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged() // Only trigger if value actually changed
    ).subscribe((phone) => {
      const phoneStr = String(phone || '').trim();
      console.log('[Phone Lookup] Phone entered:', phoneStr, 'Length:', phoneStr.length);
      if (phoneStr.length >= 10) {
        this.lookupClient(phoneStr);
      } else {
        this.foundClients = [];
        this.isLookingUpClient = false;
      }
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
        if (res?.success === false) {
          this.toastr.error(res?.message || 'فشل إنشاء الحجز', 'خطأ');
          return;
        }
        this.toastr.success('تم إنشاء الحجز بنجاح!', 'عملية ناجحة');

        this.router.navigate(['/cashier/reservations']);
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

  // أضف هذه الدالة داخل الكلاس
  onlyNumbers(event: any) {
    const pattern = /[0-9]/; // يسمح فقط بالأرقام من 0 إلى 9
    const inputChar = String.fromCharCode(event.charCode);

    if (!pattern.test(inputChar)) {
      // إذا لم يكن المدخل رقماً، يتم إلغاء الحدث ومنع الكتابة
      event.preventDefault();
    }
  }

  // ======================
  // Client Lookup
  // ======================
  lookupClient(phoneNumber: string) {
    if (!phoneNumber || phoneNumber.length < 10) {
      this.foundClients = [];
      this.currentClientIsPremium = false;
      return;
    }

    console.log('[Phone Lookup] Looking up client with phone:', phoneNumber);
    this.isLookingUpClient = true;

    this.api.lookupClientByPhone(phoneNumber).subscribe({
      next: (res: any) => {
        console.log('[Phone Lookup] API Response:', res);
        this.foundClients = res?.data ?? [];
        this.isLookingUpClient = false;
        console.log('[Phone Lookup] Found clients:', this.foundClients.length);

        if (this.foundClients.length === 0) {
          this.currentClientIsPremium = false;
          return;
        }

        if (this.foundClients.length === 1) {
          // Single client found
          const client = this.foundClients[0];
          console.log('[Phone Lookup] Single client found:', client.fullName);
          this.handleClientFound(client);
        } else {
          // Multiple clients found - show selection modal
          console.log('[Phone Lookup] Multiple clients found:', this.foundClients.length);
          this.showCarSelectionModal = true;
          setTimeout(() => {
            const modalElement = document.getElementById('carSelectionModal');
            if (modalElement) {
              const modalInstance = new (window as any).bootstrap.Modal(modalElement);
              modalInstance.show();
            }
          }, 100);
        }
      },
      error: (err) => {
        console.error('[Phone Lookup] API Error:', err);
        this.isLookingUpClient = false;
        this.foundClients = [];
        this.currentClientIsPremium = false;
      }
    });
  }

  handleClientFound(client: any) {
    this.currentClientIsPremium = client?.isPremiumCustomer ?? false;
    this.customerForm.patchValue({
      name: client.fullName || '',
      email: client.email || ''
    });
    console.log('[Phone Lookup] Filled name:', client.fullName, 'email:', client.email);

    // Handle cars
    const cars = client.cars || [];
    console.log('[Phone Lookup] Client has', cars.length, 'cars');
    
    if (cars.length === 0) {
      // No cars, do nothing
      console.log('[Phone Lookup] No cars found for client');
      return;
    }

    if (cars.length === 1) {
      // Single car - fill automatically
      console.log('[Phone Lookup] Single car found, filling data automatically');
      this.fillCarData(cars[0]);
    } else {
      // Multiple cars - show selection modal
      console.log('[Phone Lookup] Multiple cars found, showing selection modal');
      this.selectedClient = client;
      this.showCarSelectionModal = true;
      setTimeout(() => {
        const modalElement = document.getElementById('carSelectionModal');
        if (modalElement) {
          const modalInstance = new (window as any).bootstrap.Modal(modalElement);
          modalInstance.show();
        }
      }, 100);
    }
  }

  fillCarData(car: any) {
    console.log('[Phone Lookup] Filling car data:', car);
    const carType = [car.brand, car.model, car.year].filter(Boolean).join(' ') || '';
    
    this.customerForm.patchValue({
      carType: carType,
      carNumber: car.plateNumber || '',
      carCategory: car.bodyType || null
    });
    console.log('[Phone Lookup] Filled car data - Type:', carType, 'Number:', car.plateNumber, 'Category:', car.bodyType);
  }

  selectCar(car: any) {
    if (car?.clientIsPremium != null) this.currentClientIsPremium = car.clientIsPremium;
    this.fillCarData(car);
    this.closeCarSelectionModal();
  }

  closeCarSelectionModal() {
    this.showCarSelectionModal = false;
    this.selectedClient = null;
    // Close Bootstrap modal if open
    const modalElement = document.getElementById('carSelectionModal');
    if (modalElement) {
      const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
    }
  }

  getCarsToDisplay(): any[] {
    if (this.selectedClient) {
      return (this.selectedClient.cars || []).map((car: any) => ({
        ...car,
        clientIsPremium: this.selectedClient?.isPremiumCustomer
      }));
    }
    return this.foundClients.flatMap(client => 
      (client.cars || []).map((car: any) => ({
        ...car,
        clientName: client.fullName,
        clientPhone: client.phoneNumber,
        clientIsPremium: client.isPremiumCustomer
      }))
    );
  }

  getCarCategoryName(bodyType: number): string {
    const category = this.carCategories.find(cat => cat.id === bodyType);
    return category?.nameAr || `فئة ${bodyType}`;
  }








}

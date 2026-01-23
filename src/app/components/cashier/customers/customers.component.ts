import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';

type ServiceDto = {
  id: number;
  name: string;
  price: number;
};

type SlotDto = {
  hour: string; // "08:00"
  booked: number;
  available: number;
};

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

type ServiceViewModel = {
  id: number; // serviceId
  name: string;
  price: number;
  durationMinutes: number;
  selected: boolean;
};


@Component({
  selector: 'app-customers',
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
})
export class CustomersComponent implements OnInit {
  // raw services from API (contains rates)
  servicesRaw: ServiceApiDto[] = [];

  // services prepared for dropdown (price depends on selectedCar.bodyType)
  allServices: ServiceViewModel[] = [];


  // selected item from dropdown
  selectedService: {
    id: number;
    name: string;
    price: number;
    durationMinutes: number;
  } | null = null;

  // ===== Clients list =====
  carRequests: any[] = [];
  filteredCarRequests: any[] = [];

  // ===== Services & Booking modal state =====
  // allServices: ServiceDto[] = [];
  // selectedService: ServiceDto | null = null;

  selectedCar: any = null; // selected car object from UI
  currentCustomer: any = null; // selected customer from UI

  selectedDate: string = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  availableSlots: SlotDto[] = [];
  selectedSlotHour: string | null = null;

  isSlotsLoading = false;
  isBookingLoading = false;

  // ===== Add car modal =====
  currentCustomerForCar: any = null; // optional separation (you can use currentCustomer too)
  bodyTypes = [
    { label: 'سيدان (Sedan)', value: 1 },
    { label: 'دفع رباعي (SUV)', value: 2 },
    { label: 'هاتشباك (Hatchback)', value: 4 },
    { label: 'كوبيه (Coupe)', value: 3 },
    { label: 'بيك أب (Pickup)', value: 5 },
    { label: 'فان (Van)', value: 6 },
    { label: 'شاحنة (Truck)', value: 7 },
    { label: 'أخرى (Other)', value: 99 }
  ];

  newCarData = {
    bodyType: 4,
    plateNumber: '',
    brand: '',
    model: '',
    color: '',
    year: null as number | null,
    isDefault: true,
  };

  // ===== Config =====
  // ⚠️ Confirm these IDs with your backend:
  branchId = 1; // available-slots?branchId=2396

  // These are in booking payload
  createdByType = 1;
  createdByEmployeeId = 681; // replace with real logged-in employee id later

  constructor(private api: ApiService, private toastr: ToastrService) { }

  ngOnInit() {
    this.loadClients();
    this.loadServices();
  }

  // ======================
  // Clients
  // ======================
  loadClients() {
    this.api.getAllClients().subscribe({
      next: (res: any) => {
        const clients = res?.data ?? [];
        this.carRequests = clients.map((c: any) => ({
          id: c.id,
          customerName: c.fullName,
          phone: c.phoneNumber,
          // لو السيرفر بيرجع cars ضمن العميل هتشتغل، غير كده هتبقى فاضية
          cars: c.cars || [],
        }));
        this.filteredCarRequests = [...this.carRequests];
      },
      error: (err) => {
        this.toastr.error('فشل تحميل العملاء', 'خطأ');
        console.error(err);
      },
    });
  }

  onSearchChange(event: any) {
    const term = (event.target.value || '').trim().toLowerCase();

    if (!term) {
      this.filteredCarRequests = [...this.carRequests];
      return;
    }

    this.filteredCarRequests = this.carRequests.filter((c) => {
      const matchPhone = (c.phone ?? '').toLowerCase().includes(term);
      const matchName = (c.customerName ?? '').toLowerCase().includes(term);
      const matchPlate = c.cars?.some((car: any) =>
        (car.plateNumber ?? '').toLowerCase().includes(term)
      );
      return matchPhone || matchName || matchPlate;
    });
  }

  // ======================
  // Services
  // ======================
  loadServices() {
    this.api.getServices().subscribe({
      next: (res: any) => {
        this.servicesRaw = res?.data ?? [];

        // ✅ لو المودال مفتوح وعندك عربية مختارة، ابنِ الخدمات فورًا
        if (this.selectedCar?.bodyType != null) {
          this.buildServicesForSelectedCar();
        }

        console.log('servicesRaw loaded:', this.servicesRaw.length);
      },
      error: (err) => {
        this.toastr.error('فشل تحميل الخدمات', 'خطأ');
        console.error(err);
      },
    });
  }



  // ======================
  // Booking modal flow
  // ======================
  selectCar(carDetail: any, customer: any) {
    this.selectedCar = carDetail;
    this.currentCustomer = customer;

    this.selectedSlotHour = null;
    this.availableSlots = [];
    this.selectedDate = new Date().toISOString().slice(0, 10);

    this.buildServicesForSelectedCar();
  }



  private buildServicesForSelectedCar() {
    const bodyType = this.selectedCar?.bodyType;

    if (bodyType == null) {
      this.allServices = [];
      this.toastr.error('نوع هيكل العربية (bodyType) غير موجود في بيانات السيارة', 'خطأ');
      return;
    }

    const built = (this.servicesRaw ?? [])
      .map((s) => {
        const rate = (s.rates ?? []).find((r) => r.bodyType === bodyType);
        if (!rate) return null;

        return {
          id: s.id,
          name: s.name,
          price: rate.price,
          durationMinutes: rate.durationMinutes,
          selected: false
        } as ServiceViewModel;
      })
      .filter(Boolean) as ServiceViewModel[];

    this.allServices = built;

    if (this.allServices.length === 0) {
      this.toastr.warning('لا توجد خدمات متاحة لنوع هيكل هذه السيارة', 'تنبيه');
    }
  }



  onServiceSelected() {
    this.selectedSlotHour = null;
    this.availableSlots = [];
    this.loadAvailableSlots();
  }

  loadAvailableSlots() {
    const serviceIds = this.getSelectedServiceIds();
    if (!serviceIds.length || !this.selectedDate) return;

    this.isSlotsLoading = true;

    this.api.getAvailableSlots(this.branchId, this.selectedDate, serviceIds).subscribe({
      next: (res: any) => {
        this.availableSlots = res?.data?.slots ?? [];
        this.isSlotsLoading = false;
      },
      error: (err) => {
        this.isSlotsLoading = false;
        this.toastr.error(err?.error?.message || 'فشل تحميل المواعيد المتاحة', 'خطأ');
        console.error(err);
      },
    });
  }


  saveChanges(): void {
    if (!this.currentCustomer?.id) {
      this.toastr.error('clientId غير موجود', 'خطأ');
      return;
    }
    const carId = this.selectedCar?.id ?? this.selectedCar?.carId;
    if (!carId) {
      this.toastr.error('carId غير موجود في بيانات السيارة', 'خطأ');
      return;
    }

    const serviceIds = this.getSelectedServiceIds();
    if (!serviceIds.length) {
      this.toastr.error('اختر خدمة واحدة على الأقل', 'خطأ');
      return;
    }

    if (!this.selectedDate || !this.selectedSlotHour) {
      this.toastr.error('اختر التاريخ والساعة', 'خطأ');
      return;
    }

    const scheduledStart = this.toLocalIsoNoZ(this.selectedDate, this.selectedSlotHour);

    const payload = {
      branchId: this.branchId,
      carId,
      clientId: this.currentCustomer.id,
      scheduledStart,
      serviceIds, // ✅ متعدد
      createdByType: this.createdByType,
      createdByEmployeeId: this.createdByEmployeeId,
      createdByClientId: this.currentCustomer.id,
      notes: ''
    };

    this.isBookingLoading = true;

    this.api.createBooking(payload).subscribe({
      next: () => {
        this.isBookingLoading = false;
        this.toastr.success('تم إنشاء الحجز بنجاح', 'نجاح');
      },
      error: (err) => {
        this.isBookingLoading = false;

        // ✅ handle 409 conflict nicely
        if (err?.status === 409) {
          this.loadAvailableSlots();

          const msg = err?.error?.message || 'هذا الموعد غير متاح (Conflict). اختر موعدًا آخر.';
          this.toastr.error(msg, 'تعارض في الحجز');
          return;
        }

        this.toastr.error(err?.error?.message || 'فشل إنشاء الحجز', 'خطأ');
        console.error(err);
      }
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


  toggleService(svc: ServiceViewModel): void {
    svc.selected = !svc.selected;
    this.selectedSlotHour = null;
    this.availableSlots = [];

    // لو فيه تاريخ مختار، اعمل refresh للـ slots فورًا
    if (this.selectedDate) {
      this.loadAvailableSlots();
    }
  }

  hasSelectedServices(): boolean {
    return this.allServices.some(s => s.selected);
  }

  private getSelectedServiceIds(): number[] {
    return this.allServices.filter(s => s.selected).map(s => s.id);
  }


  // ======================
  // Add car flow (optional here)
  // ======================
  prepareNewCar(customer: any) {
    this.currentCustomer = customer;
    this.newCarData = {
      bodyType: 4,
      plateNumber: '',
      brand: '',
      model: '',
      color: '',
      year: null,
      isDefault: true,
    };
  }

  confirmAddNewCar() {
    if (!this.currentCustomer?.id) return;

    if (!this.newCarData.plateNumber || !this.newCarData.brand) {
      this.toastr.error('رقم اللوحة و Brand مطلوبين', 'تنبيه');
      return;
    }

    this.api
      .addCarToClient(this.currentCustomer.id, this.newCarData)
      .subscribe({
        next: (res: any) => {
          this.toastr.success('تم إضافة السيارة بنجاح', 'نجاح');

          // If API returns created car in res.data -> update UI
          const createdCar = res?.data;
          if (createdCar) {
            const cust = this.carRequests.find(
              (x) => x.id === this.currentCustomer.id
            );
            if (cust) {
              cust.cars = cust.cars || [];
              cust.cars.push(createdCar);
              this.filteredCarRequests = [...this.carRequests];
            }
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'فشل إضافة السيارة', 'خطأ');
          console.error(err);
        },
      });
  }

  deleteCarFromCustomer(customer: any, carIndex: number) {
    const car = customer?.cars?.[carIndex];
    const carId = car?.id || car?.carId;

    if (!carId) {
      this.toastr.error('لا يوجد carId من السيرفر لحذف السيارة', 'خطأ');
      return;
    }

    if (!confirm('هل أنت متأكد من حذف السيارة؟')) return;

    this.api.deleteCar(carId).subscribe({
      next: () => {
        customer.cars.splice(carIndex, 1);
        this.filteredCarRequests = [...this.carRequests];
        this.toastr.success('تم حذف السيارة', 'نجاح');
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'فشل حذف السيارة', 'خطأ');
        console.error(err);
      },
    });
  }
}

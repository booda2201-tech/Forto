import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';

// --- Types Definitions ---
type ProductVm = { id: number; name: string; price: number; isActive: boolean; };
type CartItemVm = { product: ProductVm; qty: number; };
type ServiceCardVm = { id: number; name: string; price: number; durationMinutes: number; };

@Component({
  selector: 'app-payment-point',
  templateUrl: './payment-point.component.html',
  styleUrls: ['./payment-point.component.scss']
})
export class PaymentPointComponent implements OnInit {
  // Config
  activeTab: 'new-order' | 'quick-booking' = 'new-order';
  branchId = 1;
  cashierId = 5;
  isSubmitting = false;

  // Products & Cart Logic
  products: ProductVm[] = [];
  cart: CartItemVm[] = [];

  // Services & Slots Logic
  servicesRaw: any[] = [];
  services: ServiceCardVm[] = [];
  selectedServices: ServiceCardVm[] = [];
  availableSlots: any[] = [];
  selectedSlotHour: string | null = null;
  isSlotsLoading = false;

  // Pricing & Invoice Data
  totalPrice = 0; // عرض السعر المباشر
  subTotal = 0;
  taxAmount = 0;
  finalTotal = 0;
  selectedInvoice: any = null;

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

  // Forms
  orderForm = new FormGroup({
    fullName: new FormControl('', [Validators.required]),
    phoneNumber: new FormControl('', [Validators.required]),
    notes: new FormControl(''),
  });

  customerForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required]),
    carType: new FormControl('', [Validators.required]),
    carNumber: new FormControl('', [Validators.required]),
    carCategory: new FormControl<number | null>(null, [Validators.required]),
    appointmentDate: new FormControl('', [Validators.required]),
  });

  constructor(private api: ApiService, private router: Router, private toastr: ToastrService) { }

  ngOnInit(): void {

    const today = this.todayYYYYMMDD();
    this.customerForm.patchValue({ appointmentDate: today });
    this.selectedSlotHour = this.nextHourHHMM();

    this.loadAvailableSlots();

    this.loadProducts();
    this.loadServices();
    this.setupFormListeners();
  }

  // --- Core Data Loading ---
  private loadProducts() {
    this.api.getProducts().subscribe({
      next: (res: any) => {
        const data = res?.data ?? [];
        this.products = data.filter((p: any) => p.isActive).map((p: any) => ({
          id: p.id, name: p.name, price: Number(p.salePrice ?? 0), isActive: p.isActive
        }));
      },
      error: () => this.toastr.error('فشل تحميل المنتجات')
    });
  }

  private loadServices() {
    this.api.getServices().subscribe({
      next: (res: any) => {
        this.servicesRaw = res?.data ?? [];
        this.rebuildServicesForBodyType(Number(this.customerForm.value.carCategory));
      },
      error: () => this.toastr.error('فشل تحميل الخدمات')
    });
  }

  private setupFormListeners() {
this.customerForm.get('carCategory')!.valueChanges.subscribe((val) => {
  const bodyType = Number(val);

  this.selectedServices = [];
  this.totalPrice = 0;

  this.availableSlots = [];
  this.selectedSlotHour = null;

  if (!bodyType || Number.isNaN(bodyType)) {
    this.services = [];
    return;
  }

  this.rebuildServicesForBodyType(bodyType);
  this.loadAvailableSlots();
});

    this.customerForm.get('appointmentDate')!.valueChanges.subscribe(() => {
      this.selectedSlotHour = null;
      this.loadAvailableSlots();
    });
  }

  // --- Cart Helpers ---
  getItem(productId: number) { return this.cart.find(x => x.product.id === productId); }
  isProductSelected(productId: number) { return !!this.getItem(productId); }

  toggleProduct(product: ProductVm) {
    const item = this.getItem(product.id);
    item ? this.cart = this.cart.filter(x => x.product.id !== product.id) : this.cart.push({ product, qty: 1 });
    this.calculateBookingTotal();
  }

  increaseQty(p: ProductVm) { this.getItem(p.id) ? this.getItem(p.id)!.qty++ : this.cart.push({ product: p, qty: 1 }); this.calculateBookingTotal(); }
  decreaseQty(p: ProductVm) {
    const item = this.getItem(p.id);
    if (item) { item.qty--; if (item.qty <= 0) this.cart = this.cart.filter(x => x.product.id !== p.id); }
    this.calculateBookingTotal();
  }

  setQty(p: ProductVm, val: any) {
    const qty = Number(val);
    if (qty <= 0) this.cart = this.cart.filter(x => x.product.id !== p.id);
    else { const item = this.getItem(p.id); item ? item.qty = qty : this.cart.push({ product: p, qty }); }
    this.calculateBookingTotal();
  }

  // --- Booking Logic ---
private rebuildServicesForBodyType(bodyType: number): void {
  if (!this.servicesRaw.length || bodyType <= 0) {
    this.services = [];
    return;
  }

  this.services = this.servicesRaw
    .map((s) => {
      const rate = (s.rates ?? []).find((r:any) => r.bodyType === bodyType);
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
    this.toastr.warning(`لا توجد أسعار خدمات لهذا النوع (bodyType=${bodyType}).`, 'تنبيه');
  }
}


  // toggleService(service: ServiceCardVm, event: any) {
  //   event.target.checked ? this.selectedServices.push(service) : this.selectedServices = this.selectedServices.filter(s => s.id !== service.id);
  //   this.calculateBookingTotal();
  //   this.loadAvailableSlots();
  // }













toggleService(service: ServiceCardVm, event: any) {
  const checked = !!event.target.checked;

  if (checked) {
    if (!this.selectedServices.some(s => s.id === service.id)) {
      this.selectedServices.push(service);
      this.loadEmployeesForService(service.id);
    }
  } else {
    this.selectedServices = this.selectedServices.filter(s => s.id !== service.id);
    delete this.serviceEmployeeMap[service.id];
  }

  this.calculateTotal();
  this.selectedSlotHour = null;
  this.loadAvailableSlots();
}









calculateTotal() {
  // if you have services + products:
  const servicesTotal = (this.selectedServices ?? []).reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0);

  const productsTotal = (this.cart ?? []).reduce(
    (sum: number, x: any) => sum + (Number(x.product?.price ?? 0) * Number(x.qty ?? 0)),
    0
  );

  this.totalPrice = servicesTotal + productsTotal;
}













loadEmployeesForService(serviceId: number) {
  if (this.serviceEmployees[serviceId]) return;

  this.api.getServiceEmployees(serviceId).subscribe({
    next: (res: any) => {
      this.serviceEmployees[serviceId] = res?.data ?? [];
    },
    error: (err) => {
      console.error(err);
      this.serviceEmployees[serviceId] = [];
      this.toastr.error('فشل تحميل العمال لهذه الخدمة', 'خطأ');
    }
  });
}


submitBooking() {
  if (this.customerForm.invalid) {
    this.toastr.error('يرجى التأكد من البيانات المدخلة', 'خطأ');
    return;
  }

  if (this.selectedServices.length === 0 && this.cart.length === 0) {
    this.toastr.warning('اختر خدمة أو منتج على الأقل', 'تنبيه');
    return;
  }

  if (!this.selectedSlotHour) {
    this.toastr.warning('اختر وقت من المواعيد المتاحة', 'تنبيه');
    return;
  }

  // ✅ if services exist, require employee for each service
  if (this.selectedServices.length > 0) {
    const missing = this.selectedServices.filter(s => !this.serviceEmployeeMap[s.id]);
    if (missing.length > 0) {
      this.toastr.warning('اختار عامل لكل خدمة قبل التأكيد', 'تنبيه');
      return;
    }
  }

  const v = this.customerForm.value;

  const scheduledStart = this.toLocalIsoNoZ(
    String(v.appointmentDate),
    String(this.selectedSlotHour)
  );

  const bodyType = Number(v.carCategory);
  const { brand, model, year } = this.parseBrandModelYear(String(v.carType ?? ''));

  const payload = {
    branchId: this.branchId,
    cashierId: this.cashierId,
    scheduledStart,

    client: {
      phoneNumber: String(v.phone ?? '').trim(),
      fullName: String(v.name ?? '').trim(),
    },

    car: {
      plateNumber: String(v.carNumber ?? '').trim(),
      bodyType,
      brand: brand || 'Unknown',
      model: model || '',
      color: '',
      year: year ?? 0,
      isDefault: true
    },

    serviceIds: this.selectedServices.map(s => s.id),

    serviceAssignments: this.selectedServices.map(s => ({
      serviceId: s.id,
      employeeId: this.serviceEmployeeMap[s.id]
    })),

    products: this.cart.map(c => ({
      productId: c.product.id,
      qty: c.qty
    })),

    notes: ''
  };

  this.api.cashierCheckout(payload).subscribe({
    next: (res: any) => {
      if (res?.success === false) {
        this.toastr.error(res?.message || 'فشل تنفيذ العملية', 'خطأ');
        return;
      }

      this.toastr.success('تم تنفيذ Checkout بنجاح', 'نجاح');

      // optional: show invoice modal if returned
      this.invoiceData = res?.data;
      this.openInvoiceModal?.();

      // reset
      this.cart = [];
      this.selectedServices = [];
      this.serviceEmployeeMap = {};
      this.customerForm.reset({ appointmentDate: this.todayYYYYMMDD() });
      this.selectedSlotHour = this.nextHourHHMM();

      this.loadAvailableSlots();
    },
    error: (err) => {
      console.error(err);
      this.toastr.error(err?.error?.message || 'فشل تنفيذ Checkout', 'خطأ');
    }
  });
}









  isServiceSelected(service: ServiceCardVm) { return this.selectedServices.some(s => s.id === service.id); }

  calculateBookingTotal() {
    const servicesSum = this.selectedServices.reduce((sum, s) => sum + s.price, 0);
    const productsSum = this.cart.reduce((sum, x) => sum + (x.product.price * x.qty), 0);
    this.totalPrice = servicesSum + productsSum;
  }

  get totalAmount() { return this.totalPrice; } // لتوحيد العرض في الـ HTML

  loadAvailableSlots() {
    const date = this.customerForm.value.appointmentDate;
    const serviceIds = this.selectedServices.map(s => s.id);
    if (!date || serviceIds.length === 0) { this.availableSlots = []; return; }
    this.isSlotsLoading = true;
    this.api.getAvailableSlots(this.branchId, String(date), serviceIds).subscribe({
      next: (res: any) => { this.availableSlots = res?.data?.slots ?? []; this.isSlotsLoading = false; },
      error: () => { this.isSlotsLoading = false; this.availableSlots = []; }
    });
  }

  // --- Submit & Invoicing ---
  onSubmit() {
    if (this.activeTab === 'new-order') this.submitOrder();
    else this.submitBooking();
  }


  invoiceData: any = null;

  private submitOrder() {
    if (this.orderForm.invalid || this.cart.length === 0) {
      this.toastr.error('يرجى إكمال البيانات واختيار المنتجات');
      return;
    }

    const payload = {
      branchId: this.branchId,
      cashierId: this.cashierId,
      items: this.cart.map(item => ({
        productId: item.product.id,
        qty: item.qty
      })),
      occurredAt: new Date().toISOString(),
      notes: '',
      customer: {
        fullName: this.orderForm.value.fullName,
        phoneNumber: this.orderForm.value.phoneNumber
      }
    };

    this.api.createPosInvoice(payload).subscribe({
      next: (res: any) => {
        this.toastr.success('تم تسجيل الطلب بنجاح');

        // ✅ use server invoice data
        this.invoiceData = res?.data;

        this.openInvoiceModal();

        // reset AFTER opening modal
        this.cart = [];
        this.orderForm.reset();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error(err?.error?.message || 'فشل تسجيل الطلب');
      }
    });
  }

  get invoiceVat(): number {
    if (!this.invoiceData) return 0;
    const sub = Number(this.invoiceData.subTotal ?? 0);
    const total = Number(this.invoiceData.total ?? 0);
    return Math.max(0, total - sub);
  }


  openInvoiceModal() {
    const el = document.getElementById('invoiceModal');
    const modal = new (window as any).bootstrap.Modal(el);
    modal.show();
  }


  downloadInvoice() {
    window.print();
  }

  onlyNumbers(event: any) {
    if (!/[0-9]/.test(String.fromCharCode(event.charCode))) event.preventDefault();
  }


  printInvoice() {
    window.print();
  }


  // private todayYYYYMMDD(): string {
  //   const d = new Date();
  //   const pad = (n: number) => String(n).padStart(2, '0');
  //   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // }















  // private nextHourHHMM(): string {
  //   const d = new Date();
  //   d.setMinutes(0, 0, 0);
  //   d.setHours(d.getHours() + 1); // next top of hour
  //   const pad = (n: number) => String(n).padStart(2, '0');
  //   return `${pad(d.getHours())}:${pad(d.getMinutes())}`; // "HH:00"
  // }

  // // combine to ISO without Z
  // private toLocalIsoNoZ(dateStr: string, timeStr: string): string {
  //   const [y, m, d] = dateStr.split('-').map(Number);
  //   const [hh, mm] = timeStr.split(':').map(Number);

  //   const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  //   const pad = (n: number) => String(n).padStart(2, '0');

  //   return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
  // }






















  private todayYYYYMMDD(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private nextHourHHMM(): string {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:00`;
  }

  private toLocalIsoNoZ(dateStr: string, hourStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = hourStr.split(':').map(Number);

    const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
  }

















  // serviceId -> employees list
  serviceEmployees: Record<number, any[]> = {};

  // serviceId -> selected employeeId
  serviceEmployeeMap: Record<number, number> = {};

  // private submitBooking() {
  //   if (this.customerForm.invalid || (this.selectedServices.length === 0 && this.cart.length === 0)) {
  //     this.toastr.error('بيانات ناقصة');
  //     return;
  //   }

  //   if (!this.selectedSlotHour) {
  //     this.toastr.warning('اختار وقت من المواعيد المتاحة');
  //     return;
  //   }

  //   // ✅ if services are selected, ensure each has employee assigned
  //   const missingEmp = this.selectedServices.filter(s => !this.serviceEmployeeMap[s.id]);
  //   if (missingEmp.length > 0) {
  //     this.toastr.warning('اختار عامل لكل خدمة قبل التأكيد');
  //     return;
  //   }

  //   const v = this.customerForm.value;

  //   // scheduledStart = date + selectedSlotHour
  //   const scheduledStart = this.toLocalIsoNoZ(String(v.appointmentDate), String(this.selectedSlotHour));

  //   const bodyType = Number(v.carCategory);
  //   const { brand, model, year } = this.parseBrandModelYear(String(v.carType ?? ''));

  //   const payload = {
  //     branchId: this.branchId,
  //     cashierId: this.cashierId,
  //     scheduledStart,

  //     client: {
  //       phoneNumber: String(v.phone ?? '').trim(),
  //       fullName: String(v.name ?? '').trim(),
  //     },

  //     car: {
  //       plateNumber: String(v.carNumber ?? '').trim(),
  //       bodyType,
  //       brand: brand || 'Unknown',
  //       model: model || '',
  //       color: '',
  //       year: year ?? 0,
  //       isDefault: true
  //     },

  //     serviceIds: this.selectedServices.map(s => s.id),

  //     serviceAssignments: this.selectedServices.map(s => ({
  //       serviceId: s.id,
  //       employeeId: this.serviceEmployeeMap[s.id]
  //     })),

  //     products: this.cart.map(c => ({
  //       productId: c.product.id,
  //       qty: c.qty
  //     })),

  //     notes: ''
  //   };

  //   this.api.cashierCheckout(payload).subscribe({
  //     next: (res: any) => {
  //       if (res?.success === false) {
  //         this.toastr.error(res?.message || 'فشل تنفيذ العملية');
  //         return;
  //       }

  //       this.toastr.success('تم تنفيذ Checkout بنجاح');

  //       // If server returns invoice data -> show invoice
  //       this.invoiceData = res?.data;
  //       this.openInvoiceModal();

  //       // reset
  //       this.cart = [];
  //       this.selectedServices = [];
  //       this.serviceEmployeeMap = {};
  //       this.customerForm.reset({
  //         appointmentDate: this.todayYYYYMMDD()
  //       });
  //       this.selectedSlotHour = this.nextHourHHMM();
  //     },
  //     error: (err) => {
  //       console.error(err);
  //       this.toastr.error(err?.error?.message || 'فشل تنفيذ Checkout');
  //     }
  //   });
  // }


  private parseBrandModelYear(carTypeText: string): { brand: string; model: string; year?: number } {
    const text = (carTypeText || '').trim();
    const parts = text.split(/\s+/).filter(Boolean);

    let year: number | undefined;
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

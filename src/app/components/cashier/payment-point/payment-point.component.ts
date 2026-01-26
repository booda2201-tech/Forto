// import { Component, OnInit } from '@angular/core';
// import { FormControl, FormGroup, Validators } from '@angular/forms';
// import { Router } from '@angular/router';
// import { ToastrService } from 'ngx-toastr';
// import { ApiService } from 'src/app/services/api.service';


// type ServiceRateDto = {
//   id: number;
//   bodyType: number;
//   price: number;
//   durationMinutes: number;
// };


// type ServiceApiDto = {
//   id: number;
//   categoryId: number;
//   name: string;
//   description: string;
//   rates: ServiceRateDto[];
// };

// type ServiceCardVm = {
//   id: number; // serviceId
//   name: string;
//   price: number;
//   durationMinutes: number;
// };

// type SlotDto = {
//   hour: string;     // "08:00"
//   booked: number;
//   available: number;
// };


// type ProductApiDto = {
//   id: number;
//   name: string;
//   sku?: string;
//   salePrice: number;
//   costPerUnit?: number;
//   isActive: boolean;
// };

// type ProductVm = {
//   id: number;        // productId
//   name: string;
//   price: number;     // salePrice
//   sku?: string;
//   isActive: boolean;
// };

// type CartItemVm = {
//   product: ProductVm;
//   qty: number;
// };

// @Component({
//   selector: 'app-payment-point',
//   templateUrl: './payment-point.component.html',
//   styleUrls: ['./payment-point.component.scss']
// })

// export class PaymentPointComponent implements OnInit {
//   // ===== Config =====
//   branchId = 1;            // ✅ set correct branchId
//   createdByType = 1;
//   createdByEmployeeId = 5;

//   // ===== Services =====
//   servicesRaw: ServiceApiDto[] = [];
//   services: ServiceCardVm[] = []; // rendered cards
//   selectedServices: ServiceCardVm[] = [];
//   totalPrice = 0;

//   // ===== Slots =====
//   availableSlots: SlotDto[] = [];
//   selectedSlotHour: string | null = null;
//   isSlotsLoading = false;

//   carCategories = [
//     { id: 1, nameAr: 'سيدان (Sedan)' },
//     { id: 2, nameAr: 'دفع رباعي (SUV)' },
//     { id: 3, nameAr: 'هاتشباك (Hatchback)' },
//     { id: 4, nameAr: 'كوبيه (Coupe)' },
//     { id: 5, nameAr: 'بيك أب (Pickup)' },
//     { id: 6, nameAr: 'فان (Van)' },
//     { id: 7, nameAr: 'شاحنة (Truck)' },
//     { id: 99, nameAr: 'أخرى (Other)' },
//   ];

//   customerForm = new FormGroup({
//     name: new FormControl('', [Validators.required]),
//     phone: new FormControl('', [Validators.required]),
//     email: new FormControl(''),

//     carType: new FormControl('', [Validators.required]),
//     carNumber: new FormControl('', [Validators.required]),
//     carCategory: new FormControl<number | null>(null, [Validators.required]),

//     appointmentDate: new FormControl('', [Validators.required]),
//     // ⛔ appointmentTime removed from logic (time comes from available slots dropdown)
//     // keep it in form only if you want, but we won't use it
//     appointmentTime: new FormControl(''),
//   });

//   constructor(
//     private api: ApiService,
//     private router: Router,
//     private toastr: ToastrService
//   ) { }

//   ngOnInit(): void {
//     // 1) Load services (IMPORTANT: pass categoryId if your ApiService supports it)
//     this.api.getServices().subscribe({
//       next: (res: any) => {
//         this.servicesRaw = res?.data ?? [];
//         this.rebuildServicesForBodyType();
//       },
//       error: (err) => {
//         this.toastr.error('فشل تحميل الخدمات', 'خطأ');
//         console.error(err);
//       },
//     });

//     // 2) When car category changes -> rebuild services, clear selections & slots
// this.customerForm.get('carCategory')!.valueChanges.subscribe(() => {
//   this.selectedServices = [];
//   this.totalPrice = 0;

//   this.availableSlots = [];
//   this.selectedSlotHour = null;

//   // ✅ ensure value is settled
//   queueMicrotask(() => {
//     this.rebuildServicesForBodyType();
//     this.loadAvailableSlots();
//   });
// });


//     // 3) When date changes -> reload slots (if services selected)
//     this.customerForm.get('appointmentDate')!.valueChanges.subscribe(() => {
//       this.selectedSlotHour = null;
//       this.loadAvailableSlots();
//     });
//   }

//   private rebuildServicesForBodyType(): void {
//     const bodyType = Number(this.customerForm.value.carCategory);

//     if (!this.servicesRaw.length || Number.isNaN(bodyType) || bodyType <= 0) {
//       this.services = [];
//       return;
//     }

//     this.services = this.servicesRaw
//       .map((s) => {
//         const rate = (s.rates ?? []).find((r) => r.bodyType === bodyType);
//         if (!rate) return null;

//         return {
//           id: s.id,
//           name: s.name,
//           price: rate.price,
//           durationMinutes: rate.durationMinutes,
//         } as ServiceCardVm;
//       })
//       .filter(Boolean) as ServiceCardVm[];

//     if (this.services.length === 0) {
//       this.toastr.warning(
//         `لا توجد أسعار خدمات لهذا النوع (bodyType=${bodyType}).`,
//         'تنبيه'
//       );
//     }
//   }

//   toggleService(service: ServiceCardVm, event: any) {
//     const checked = !!event.target.checked;

//     if (checked) {
//       if (!this.selectedServices.some((s) => s.id === service.id)) {
//         this.selectedServices.push(service);
//       }
//     } else {
//       this.selectedServices = this.selectedServices.filter(
//         (s) => s.id !== service.id
//       );
//     }

//     this.calculateTotal();

//     // refresh slots when services change
//     this.selectedSlotHour = null;
//     this.loadAvailableSlots();
//   }

//   calculateTotal() {
//     this.totalPrice = this.selectedServices.reduce((sum, s) => sum + s.price, 0);
//   }

//   isServiceSelected(service: ServiceCardVm): boolean {
//     return this.selectedServices.some((s) => s.id === service.id);
//   }

//   // ======================
//   // Available Slots
//   // ======================
//   loadAvailableSlots(): void {
//     const date = this.customerForm.value.appointmentDate;
//     const serviceIds = this.selectedServices.map((s) => s.id);

//     console.log('[Slots] date =', date, 'serviceIds =', serviceIds);

//     if (!date) {
//       console.log('[Slots] return: no date');
//       this.availableSlots = [];
//       return;
//     }

//     if (serviceIds.length === 0) {
//       console.log('[Slots] return: no selected services');
//       this.availableSlots = [];
//       return;
//     }

//     this.isSlotsLoading = true;

//     this.api.getAvailableSlots(this.branchId, String(date), serviceIds).subscribe({
//       next: (res: any) => {
//         console.log('[Slots] API response:', res);
//         this.availableSlots = res?.data?.slots ?? [];
//         this.isSlotsLoading = false;
//       },
//       error: (err) => {
//         console.log('[Slots] API error:', err);
//         this.isSlotsLoading = false;
//         this.availableSlots = [];
//         this.toastr.error(err?.error?.message || 'فشل تحميل المواعيد', 'خطأ');
//       },
//     });
//   }

//   // ======================
//   // Submit quick-create
//   // ======================
//   onSubmit() {
//     if (this.customerForm.invalid) {
//       this.toastr.error('يرجى التأكد من البيانات المدخلة', 'خطأ');
//       return;
//     }
//     if (this.selectedServices.length === 0) {
//       this.toastr.warning('يرجى اختيار خدمة واحدة على الأقل', 'تنبيه');
//       return;
//     }
//     if (!this.selectedSlotHour) {
//       this.toastr.warning('يرجى اختيار وقت من المواعيد المتاحة', 'تنبيه');
//       return;
//     }

//     const v = this.customerForm.value;

//     const scheduledStart = this.toLocalIsoNoZ(String(v.appointmentDate), this.selectedSlotHour);

//     const bodyType = Number(v.carCategory);
//     const { brand, model, year } = this.parseBrandModelYear(String(v.carType ?? ''));

//     const payload = {
//       branchId: this.branchId,
//       car: {
//         bodyType,
//         plateNumber: String(v.carNumber ?? '').trim(),
//         brand: brand || 'Unknown',
//         model: model || '',
//         color: '',
//         year: year ?? 0,
//         isDefault: true,
//       },
//       client: {
//         phoneNumber: String(v.phone ?? '').trim(),
//         fullName: String(v.name ?? '').trim(),
//         email: String(v.email ?? '').trim() || null,
//       },
//       scheduledStart,
//       serviceIds: this.selectedServices.map((s) => s.id),
//       serviceAssignments: [],
//       createdByType: this.createdByType,
//       createdByEmployeeId: this.createdByEmployeeId,
//       notes: '',
//     };


//         this.api.quickCreateBooking(payload).subscribe({
//           next: (res: any) => {
//             if (res?.success === false) {
//               this.toastr.error(res?.message || 'فشل إنشاء الحجز', 'خطأ');
//               return;
//             }
//             this.toastr.success('تم إنشاء الحجز بنجاح!', 'عملية ناجحة');

//             this.router.navigate(['/cashier/reservations']);
//           },
//       error: (err) => {
//         console.log("2 : ", payload);

//         console.log(err);

//         if (err?.status === 409) {
//           this.toastr.error(
//             err?.error?.message || 'الموعد غير متاح، اختر موعدًا آخر',
//             'تعارض'
//           );
//           // refresh slots after conflict
//           this.loadAvailableSlots();
//           return;
//         }

//         this.toastr.error(err?.error?.message || 'فشل إنشاء الحجز', 'خطأ');
//         console.error(err);
//       },
//     });
//   }

//   private toLocalIsoNoZ(dateStr: string, hourStr: string): string {
//     const [y, m, d] = dateStr.split('-').map(Number);
//     const [hh, mm] = hourStr.split(':').map(Number);

//     // local date
//     const dt = new Date(y, m - 1, d, hh, mm, 0, 0);

//     const pad = (n: number) => String(n).padStart(2, '0');

//     // "YYYY-MM-DDTHH:mm:ss"
//     return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
//   }


//   private parseBrandModelYear(carTypeText: string): { brand: string; model: string; year?: number } {
//     const text = carTypeText.trim();
//     const parts = text.split(/\s+/).filter(Boolean);

//     let year: number | undefined = undefined;
//     const last = parts[parts.length - 1];
//     if (last && /^\d{4}$/.test(last)) {
//       year = Number(last);
//       parts.pop();
//     }

//     const brand = parts[0] ?? '';
//     const model = parts.slice(1).join(' ');

//     return { brand, model, year };
//   }

// // أضف هذه الدالة داخل الكلاس
// onlyNumbers(event: any) {
//   const pattern = /[0-9]/; // يسمح فقط بالأرقام من 0 إلى 9
//   const inputChar = String.fromCharCode(event.charCode);

//   if (!pattern.test(inputChar)) {
//     // إذا لم يكن المدخل رقماً، يتم إلغاء الحدث ومنع الكتابة
//     event.preventDefault();
//   }
// }








// }




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

  constructor(private api: ApiService, private router: Router, private toastr: ToastrService) {}

  ngOnInit(): void {
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
        this.rebuildServicesForBodyType();
      },
      error: () => this.toastr.error('فشل تحميل الخدمات')
    });
  }

  private setupFormListeners() {
    this.customerForm.get('carCategory')!.valueChanges.subscribe(() => {
      this.selectedServices = [];
      this.rebuildServicesForBodyType();
      this.calculateBookingTotal();
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

  increaseQty(p: ProductVm) { this.getItem(p.id) ? this.getItem(p.id)!.qty++ : this.cart.push({product:p, qty:1}); this.calculateBookingTotal(); }
  decreaseQty(p: ProductVm) {
    const item = this.getItem(p.id);
    if(item) { item.qty--; if(item.qty <= 0) this.cart = this.cart.filter(x => x.product.id !== p.id); }
    this.calculateBookingTotal();
  }

  setQty(p: ProductVm, val: any) {
    const qty = Number(val);
    if (qty <= 0) this.cart = this.cart.filter(x => x.product.id !== p.id);
    else { const item = this.getItem(p.id); item ? item.qty = qty : this.cart.push({product:p, qty}); }
    this.calculateBookingTotal();
  }

  // --- Booking Logic ---
  private rebuildServicesForBodyType() {
    const bodyType = Number(this.customerForm.value.carCategory);
    if (!bodyType) return;
    this.services = this.servicesRaw.map(s => {
      const rate = (s.rates ?? []).find((r: any) => r.bodyType === bodyType);
      return rate ? { id: s.id, name: s.name, price: rate.price, durationMinutes: rate.durationMinutes } : null;
    }).filter(Boolean) as ServiceCardVm[];
  }

  toggleService(service: ServiceCardVm, event: any) {
    event.target.checked ? this.selectedServices.push(service) : this.selectedServices = this.selectedServices.filter(s => s.id !== service.id);
    this.calculateBookingTotal();
    this.loadAvailableSlots();
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

  private submitOrder() {
    if (this.orderForm.invalid || this.cart.length === 0) {
      this.toastr.error('يرجى إكمال البيانات واختيار المنتجات');
      return;
    }
    this.prepareInvoiceData(this.orderForm.value.fullName, this.orderForm.value.phoneNumber);
    this.toastr.success('تم تسجيل طلب المشروبات');
    this.showInvoiceModal();
  }

  private submitBooking() {
    if (this.customerForm.invalid || (this.selectedServices.length === 0 && this.cart.length === 0)) {
      this.toastr.error('بيانات ناقصة'); return;
    }
    this.prepareInvoiceData(this.customerForm.value.name, this.customerForm.value.phone);
    this.toastr.success('تم تسجيل حجز المغسلة');
    this.showInvoiceModal();
  }

  private prepareInvoiceData(name: any, phone: any) {
    this.subTotal = this.totalPrice;
    this.taxAmount = this.subTotal * 0.14;
    this.finalTotal = this.subTotal + this.taxAmount;

    const lines = [
      ...this.selectedServices.map(s => ({ description: s.name, qty: 1, unitPrice: s.price, total: s.price })),
      ...this.cart.map(c => ({ description: c.product.name, qty: c.qty, unitPrice: c.product.price, total: c.qty * c.product.price }))
    ];

    this.selectedInvoice = {
      id: Math.floor(1000 + Math.random() * 9000),
      customerName: name,
      phone: phone,
      date: new Date().toLocaleString('ar-EG'),
      lines: lines
    };
  }

  private showInvoiceModal() {
    const modal = new (window as any).bootstrap.Modal(document.getElementById('invoiceModal'));
    modal.show();
  }

  downloadInvoice() {
    window.print();
  }

  onlyNumbers(event: any) {
    if (!/[0-9]/.test(String.fromCharCode(event.charCode))) event.preventDefault();
  }
}


































// export class PaymentPointComponent implements OnInit {
//   activeTab: 'new-order' | 'quick-booking' = 'new-order';
//   branchId = 1;
//   cashierId = 5;
//   isSubmitting = false;
//   products: ProductVm[] = [];
//   cart: CartItemVm[] = [];
//   orderForm = new FormGroup({
//     fullName: new FormControl('', [Validators.required]),
//     phoneNumber: new FormControl('', [Validators.required]),
//     notes: new FormControl(''),
//   });

//   customerForm = new FormGroup({
//     name: new FormControl('', [Validators.required]),
//     phone: new FormControl('', [Validators.required]),
//     carType: new FormControl(''),
//     carNumber: new FormControl(''),
//     carCategory: new FormControl(null, [Validators.required]),
//     appointmentDate: new FormControl('', [Validators.required])
//   });

//   services: any[] = [];
//   selectedServices: any[] = [];
//   carCategories: any[] = [];
//   availableSlots: any[] = [];
//   selectedSlotHour: any = null;
//   isSlotsLoading = false;
//   totalPrice = 0;

//   selectedInvoice: any = null;
//   subTotal = 0;
//   taxAmount = 0;
//   finalTotal = 0;





//   constructor(
//     private api: ApiService,
//     private toastr: ToastrService
//   ) { }

//   ngOnInit(): void {
//     this.loadProducts();
//     this.loadInitialBookingData();
//   }

//   private loadProducts(): void {
//     this.api.getProducts().subscribe({
//       next: (res: any) => {
//         const data: ProductApiDto[] = res?.data ?? [];

//         // ✅ map + keep only active products
//         this.products = data
//           .filter(p => p.isActive)
//           .map(p => ({
//             id: p.id,
//             name: p.name,
//             price: Number(p.salePrice ?? 0),
//             sku: p.sku,
//             isActive: p.isActive
//           }));

//         // optional: sort by name
//         this.products.sort((a, b) => a.name.localeCompare(b.name));
//       },
//       error: (err) => {
//         console.error(err);
//         this.toastr.error('فشل تحميل المنتجات', 'خطأ');
//       }
//     });
//   }

//   loadInitialBookingData() {

//     this.carCategories = [
//       { id: 1, nameAr: 'سيدان صغير' },
//       { id: 2, nameAr: 'دفع رباعي / SUV' }
//     ];
//     this.services = [
//       { id: 101, name: 'غسيل خارجي', price: 100 },
//       { id: 102, name: 'تلميع داخلي', price: 250 }
//     ];
//   }


//   loadAvailableSlots() {
//     const date = this.customerForm.value.appointmentDate;
//     if (!date) return;

//     this.isSlotsLoading = true;
//     // هنا يتم استدعاء الـ API الخاص بالمواعيد المتاحة
//     setTimeout(() => {
//       this.availableSlots = [
//         { hour: '10:00 AM', available: 2 },
//         { hour: '11:00 AM', available: 1 }
//       ];
//       this.isSlotsLoading = false;
//     }, 1000);
//   }

//   toggleService(service: any, event: any) {
//     if (event.target.checked) {
//       this.selectedServices.push(service);
//     } else {
//       this.selectedServices = this.selectedServices.filter(s => s.id !== service.id);
//     }
//     this.calculateBookingTotal();
//   }

//   isServiceSelected(service: any): boolean {
//     return this.selectedServices.some(s => s.id === service.id);
//   }

//   calculateBookingTotal() {
//     this.totalPrice = this.selectedServices.reduce((sum, s) => sum + s.price, 0);
//     this.totalPrice = this.bookingCombinedTotal;
//   }









//   onBookingSubmit() {
//     if (this.customerForm.invalid || this.selectedServices.length === 0) {
//       this.toastr.error('يرجى استكمال بيانات الحجز');
//       return;
//     }
//     // تنفيذ عملية الحجز هنا
//     this.toastr.success('تم تسجيل الحجز بنجاح');
//   }










//   // ===== Cart helpers =====
//   getItem(productId: number): CartItemVm | undefined {
//     return this.cart.find(x => x.product.id === productId);
//   }

//   isProductSelected(productId: number): boolean {
//     return !!this.getItem(productId);
//   }

//   toggleProduct(product: ProductVm) {
//     const item = this.getItem(product.id);
//     if (item) {
//       this.cart = this.cart.filter(x => x.product.id !== product.id);
//     } else {
//       this.cart.push({ product, qty: 1 });
//     }
//   }



//   setQty(product: ProductVm, value: any) {
//     const qty = Number(value);
//     if (Number.isNaN(qty)) return;

//     if (qty <= 0) {
//       this.cart = this.cart.filter(x => x.product.id !== product.id);
//       return;
//     }

//     const item = this.getItem(product.id);
//     if (!item) {
//       this.cart.push({ product, qty });
//     } else {
//       item.qty = qty;
//     }
//   }

//   get totalItemsCount(): number {
//     return this.cart.reduce((sum, x) => sum + x.qty, 0);
//   }

//   // ✅ Total = sum(qty * salePrice)
//   get totalAmount(): number {
//     return this.cart.reduce((sum, x) => sum + (x.product.price * x.qty), 0);
//   }

//   // ===== Submit POS invoice =====
//   // onSubmit() {
//   //   if (this.orderForm.invalid) {
//   //     this.toastr.error('يرجى إدخال بيانات العميل', 'خطأ');
//   //     return;
//   //   }

//   //   if (this.cart.length === 0) {
//   //     this.toastr.warning('اختر منتج واحد على الأقل', 'تنبيه');
//   //     return;
//   //   }



//   //   const v = this.orderForm.value;

//   //   const payload = {
//   //     branchId: this.branchId,
//   //     cashierId: this.cashierId,
//   //     items: this.cart.map(x => ({
//   //       productId: x.product.id,
//   //       qty: x.qty
//   //     })),
//   //     occurredAt: new Date().toISOString(),
//   //     notes: String(v.notes || ''),
//   //     customer: {
//   //       phoneNumber: String(v.phoneNumber || ''),
//   //       fullName: String(v.fullName || '')
//   //     }
//   //   };

//   //   this.isSubmitting = true;

//   //   this.api.createPosInvoice(payload).subscribe({
//   //     next: (res: any) => {
//   //       this.isSubmitting = false;
//   //       console.log(payload);

//   //       if (res?.success === false) {
//   //         this.toastr.error(res?.message || 'فشل إنشاء الفاتورة', 'خطأ');
//   //         return;
//   //       }

//   //       this.toastr.success('تم إنشاء الفاتورة بنجاح', 'نجاح');

//   //       // reset
//   //       this.cart = [];
//   //       this.orderForm.reset({ fullName: '', phoneNumber: '', notes: '' });
//   //     },
//   //     error: (err) => {
//   //       this.isSubmitting = false;
//   //       console.error(err);
//   //       this.toastr.error(err?.error?.message || 'فشل إنشاء الفاتورة', 'خطأ');
//   //     }
//   //   });
//   // }

//   prepareInvoiceData() {
//   const v = this.orderForm.value;
//   this.subTotal = this.totalAmount;
//   this.taxAmount = this.subTotal * 0.14;
//   this.finalTotal = this.subTotal + this.taxAmount;

//   this.selectedInvoice = {
//     id: Math.floor(1000 + Math.random() * 9000),
//     customerName: v.fullName,
//     phone: v.phoneNumber,
//     date: new Date().toLocaleString('ar-EG'),
//     lines: this.cart.map(item => ({
//       description: item.product.name,
//       qty: item.qty,
//       unitPrice: item.product.price,
//       total: item.product.price * item.qty
//     }))
//   };
// }

// prepareBookingInvoice() {
//     const v = this.customerForm.value;
//     this.subTotal = this.bookingCombinedTotal;
//     this.taxAmount = this.subTotal * 0.14; // ضريبة 14% كمثال
//     this.finalTotal = this.subTotal + this.taxAmount;

//     // تجميع الخدمات والمنتجات في مصفوفة واحدة للفاتورة
//     const invoiceLines = [
//       ...this.selectedServices.map(s => ({
//         description: s.name + ' (خدمة - ' + (v.carType || '') + ')',
//         qty: 1,
//         unitPrice: s.price,
//         total: s.price
//       })),
//       ...this.cart.map(item => ({
//         description: item.product.name + ' (منتج)',
//         qty: item.qty,
//         unitPrice: item.product.price,
//         total: item.product.price * item.qty
//       }))
//     ];

//     this.selectedInvoice = {
//       id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
//       customerName: v.name,
//       phone: v.phone,
//       date: v.appointmentDate,
//       lines: invoiceLines
//     };
//   }


// downloadInvoice() {
//   const printContents = document.getElementById('printableInvoice')?.innerHTML;
//   const originalContents = document.body.innerHTML;

//   if (printContents) {
//     document.body.innerHTML = printContents;
//     window.print();
//     document.body.innerHTML = originalContents;
//     window.location.reload(); // لإعادة تهيئة الصفحة بعد الطباعة
//   }
// }



//   onSubmit() {
//     if (this.activeTab === 'new-order') {
//       this.submitOrder(); // تنفيذ وظيفة البيع المباشر
//     } else if (this.activeTab === 'quick-booking') {
//       this.submitBooking(); // تنفيذ وظيفة الحجز الفوري
//     }
//   }

//   // أولاً: وظيفة البيع المباشر (POS)
//   private submitOrder() {
//     if (this.orderForm.invalid) {
//       this.toastr.error('يرجى إدخال بيانات العميل', 'خطأ');
//       return;
//     }

//     if (this.cart.length === 0) {
//       this.toastr.warning('اختر منتج واحد على الأقل', 'تنبيه');
//       return;
//     }

//     const v = this.orderForm.value;
//     const payload = {
//       branchId: this.branchId,
//       cashierId: this.cashierId,
//       items: this.cart.map(x => ({ productId: x.product.id, qty: x.qty })),
//       occurredAt: new Date().toISOString(),
//       notes: String(v.notes || ''),
//       customer: {
//         phoneNumber: String(v.phoneNumber || ''),
//         fullName: String(v.fullName || '')
//       }
//     };

//     this.isSubmitting = true;
//     this.api.createPosInvoice(payload).subscribe({
//       next: (res: any) => {
//         this.isSubmitting = false;
//         this.toastr.success('تم إنشاء الفاتورة بنجاح');

//         // تحضير بيانات الفاتورة للمودال الخاص بالمنتجات
//         this.prepareInvoiceData();
//         this.showInvoiceModal();

//         // إعادة التعيين
//         this.cart = [];
//         this.orderForm.reset({ fullName: '', phoneNumber: '', notes: '' });
//       },
//       error: (err) => {
//         this.isSubmitting = false;
//         this.toastr.error('فشل إنشاء الفاتورة');
//       }
//     });
//   }

//   // ثانياً: وظيفة الحجز الفوري (Booking)
// private submitBooking() {
//     // التحقق من وجود خدمة واحدة على الأقل أو منتج واحد
//     if (this.customerForm.invalid || (this.selectedServices.length === 0 && this.cart.length === 0)) {
//       this.toastr.error('يرجى استكمال البيانات واختيار خدمة أو منتج واحد على الأقل');
//       return;
//     }

//     if (!this.selectedSlotHour) {
//       this.toastr.warning('يرجى اختيار وقت الحجز');
//       return;
//     }

//     this.isSubmitting = true;

//     // محاكاة طلب الـ API
//     setTimeout(() => {
//       this.isSubmitting = false;
//       this.toastr.success('تم تسجيل الحجز والطلبات بنجاح');

//       this.prepareBookingInvoice();
//       this.showInvoiceModal();

//       // إعادة التعيين (Reset)
//       this.customerForm.reset();
//       this.selectedServices = [];
//       this.cart = []; // تفريغ السلة أيضاً بعد الحجز
//       this.selectedSlotHour = null;
//       this.totalPrice = 0;
//     }, 1500);
//   }
//   // دالة مساعدة لفتح المودال
//   private showInvoiceModal() {
//     const modalElement = document.getElementById('invoiceModal');
//     if (modalElement) {
//       const bootstrapModal = new (window as any).bootstrap.Modal(modalElement);
//       bootstrapModal.show();
//     }
//   }



// get bookingCombinedTotal(): number {
//   const servicesTotal = this.selectedServices.reduce((sum, s) => sum + s.price, 0);
//   const productsTotal = this.cart.reduce((sum, x) => sum + (x.product.price * x.qty), 0);
//   return servicesTotal + productsTotal;
// }

// increaseQty(product: ProductVm) {
//     const item = this.getItem(product.id);
//     if (!item) {
//       this.cart.push({ product, qty: 1 });
//     } else {
//       item.qty += 1;
//     }
//     this.calculateBookingTotal(); // تحديث السعر
//   }

//   decreaseQty(product: ProductVm) {
//     const item = this.getItem(product.id);
//     if (!item) return;

//     item.qty -= 1;
//     if (item.qty <= 0) {
//       this.cart = this.cart.filter(x => x.product.id !== product.id);
//     }
//     this.calculateBookingTotal(); // تحديث السعر
//   }

//   // نفس الشيء في toggleProduct و setQty




// onlyNumbers(event: any) {
//   const pattern = /[0-9]/; // يسمح فقط بالأرقام من 0 إلى 9
//   const inputChar = String.fromCharCode(event.charCode);

//   if (!pattern.test(inputChar)) {
//     // إذا لم يكن المدخل رقماً، يتم إلغاء الحدث ومنع الكتابة
//     event.preventDefault();
//   }
// }






// }




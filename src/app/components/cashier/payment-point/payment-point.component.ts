import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { PrintInvoiceService } from 'src/app/services/print-invoice.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  get cashierId(): number {
    return this.auth.getEmployeeId() ?? 5;
  }
  supervisors: { id: number; name: string }[] = [];
  selectedSupervisorId: number | null = null;
  showSupervisorError = false; // يظهر عند محاولة التأكيد بدون اختيار المشرف
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

  constructor(
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService,
    private auth: AuthService,
    private printInvoiceSvc: PrintInvoiceService
  ) { }

  ngOnInit(): void {

    const today = this.todayYYYYMMDD();
    this.customerForm.patchValue({ appointmentDate: today });

    this.loadProducts();
    this.loadServices();
    this.loadSupervisors();
    this.setupFormListeners();
  }

  private loadSupervisors() {
    this.api.getSupervisors().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? [];
        this.supervisors = (Array.isArray(data) ? data : []).map((s: any) => ({
          id: s.id,
          name: s.name ?? ''
        }));
      },
      error: () => this.supervisors = []
    });
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
      this.serviceEmployeeMap = {};
      this.serviceEmployees = {};

      if (!bodyType || Number.isNaN(bodyType)) {
        this.services = [];
        return;
      }

      this.rebuildServicesForBodyType(bodyType);
    });

    // Client lookup when phone changes
    this.customerForm.get('phone')!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((phone) => {
      const phoneStr = String(phone || '').trim();
      if (phoneStr.length >= 10) {
        this.lookupClient(phoneStr);
      } else {
        this.foundClients = [];
        this.isLookingUpClient = false;
      }
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
    delete this.serviceEmployees[service.id];
  }

  this.calculateTotal();
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




selectedReservationId: number | null = null;
selectedBookingScheduledStart: string | null = null;

employeesForService: any[] = [];
serviceEmployees: Record<number, any[]> = {}; // Key is serviceId (number)
isEmployeesLoading = false;






loadEmployeesForService(serviceId: number) {
  // For new bookings, use getServiceEmployees2 (no bookingId needed)
  if (this.serviceEmployees[serviceId]) {
    return; // Already loaded
  }

  this.isEmployeesLoading = true;

  // Use getServiceEmployees2 for new bookings (no bookingId needed)
  this.api.getServiceEmployees2(serviceId).subscribe({
    next: (res: any) => {
      // API returns data as array directly: { data: [{ id, name, ... }] }
      const list = Array.isArray(res?.data) ? res.data : [];
      this.serviceEmployees[serviceId] = list;
      this.isEmployeesLoading = false;
    },
    error: (err) => {
      console.error(err);
      this.serviceEmployees[serviceId] = [];
      this.isEmployeesLoading = false;
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

  // ✅ if services exist, require employee for each service
  if (this.selectedServices.length > 0) {
    const missing = this.selectedServices.filter(s => !this.serviceEmployeeMap[s.id]);
    if (missing.length > 0) {
      this.toastr.warning('اختار عامل لكل خدمة قبل التأكيد', 'تنبيه');
      return;
    }
  }

  if (!this.selectedSupervisorId) {
    this.showSupervisorError = true;
    this.toastr.warning('يجب اختيار المشرف قبل التأكيد', 'تنبيه');
    return;
  }

  this.showSupervisorError = false;
  const v = this.customerForm.value;

  // Use current time rounded to the hour (e.g., 9:30 -> 9:00:00)
  const now = new Date();
  now.setMinutes(0, 0, 0); // Round to hour
  const pad = (n: number) => String(n).padStart(2, '0');
  const scheduledStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00:00`;

  const bodyType = Number(v.carCategory);
  const { brand, model, year } = this.parseBrandModelYear(String(v.carType ?? ''));

  const payload: any = {
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
  payload.supervisorId = this.selectedSupervisorId;

  // Save customer data before submitting
  this.customerFormData = {
    name: String(v.name ?? '').trim(),
    phone: String(v.phone ?? '').trim()
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
      // Ensure customer data is included in invoice data
      if (this.invoiceData && this.customerFormData) {
        this.invoiceData.clientName = this.invoiceData.clientName || this.invoiceData.customerName || this.customerFormData.name;
        this.invoiceData.clientNumber = this.invoiceData.clientNumber || this.invoiceData.phoneNumber || this.invoiceData.phone || this.customerFormData.phone;
      }
      this.openInvoiceModal?.();

      // reset
      this.cart = [];
      this.selectedServices = [];
      this.serviceEmployeeMap = {};
      this.serviceEmployees = {};
      this.selectedSupervisorId = null;
      this.showSupervisorError = false;
      this.customerForm.reset({ appointmentDate: this.todayYYYYMMDD() });
      this.customerFormData = null;
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
  customerFormData: { name: string; phone: string } | null = null;

  private submitOrder() {
    if (this.orderForm.invalid || this.cart.length === 0) {
      this.toastr.error('يرجى إكمال البيانات واختيار المنتجات');
      return;
    }

    // Save customer data before submitting
    this.customerFormData = {
      name: String(this.orderForm.value.fullName ?? '').trim(),
      phone: String(this.orderForm.value.phoneNumber ?? '').trim()
    };

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
        // Ensure customer data is included in invoice data
        if (this.invoiceData && this.customerFormData) {
          this.invoiceData.clientName = this.invoiceData.clientName || this.invoiceData.customerName || this.customerFormData.name;
          this.invoiceData.clientNumber = this.invoiceData.clientNumber || this.invoiceData.phoneNumber || this.invoiceData.phone || this.customerFormData.phone;
        }

        this.openInvoiceModal();

        // reset AFTER opening modal
        this.cart = [];
        this.orderForm.reset();
        this.customerFormData = null;
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
    this.printInvoiceSvc.print();
  }

  onlyNumbers(event: any) {
    if (!/[0-9]/.test(String.fromCharCode(event.charCode))) event.preventDefault();
  }


  printInvoice() {
    this.printInvoiceSvc.print();
  }


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
    // Use current time but round to the hour (00 minutes)
    const now = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh] = hourStr.split(':').map(Number);

    // Create date with selected date and hour, but set minutes to 00
    const dt = new Date(y, m - 1, d, hh, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:00:00`;
  }

  serviceEmployeeMap: Record<number, number> = {};


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

  // ======================
  // Client Lookup
  // ======================
  foundClients: any[] = [];
  isLookingUpClient = false;
  showCarSelectionModal = false;
  selectedClient: any = null;

  lookupClient(phoneNumber: string) {
    if (!phoneNumber || phoneNumber.length < 10) {
      this.foundClients = [];
      return;
    }

    this.isLookingUpClient = true;

    this.api.lookupClientByPhone(phoneNumber).subscribe({
      next: (res: any) => {
        this.foundClients = res?.data ?? [];
        this.isLookingUpClient = false;

        if (this.foundClients.length === 0) {
          return;
        }

        if (this.foundClients.length === 1) {
          const client = this.foundClients[0];
          this.handleClientFound(client);
        } else {
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
        console.error(err);
        this.isLookingUpClient = false;
        this.foundClients = [];
      }
    });
  }

  handleClientFound(client: any) {
    // Fill name
    this.customerForm.patchValue({
      name: client.fullName || ''
    });

    // Handle cars
    const cars = client.cars || [];
    
    if (cars.length === 0) {
      return;
    }

    if (cars.length === 1) {
      this.fillCarData(cars[0]);
    } else {
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
    const carType = [car.brand, car.model, car.year].filter(Boolean).join(' ') || '';
    
    this.customerForm.patchValue({
      carType: carType,
      carNumber: car.plateNumber || '',
      carCategory: car.bodyType || null
    });
  }

  selectCar(car: any) {
    this.fillCarData(car);
    this.closeCarSelectionModal();
  }

  closeCarSelectionModal() {
    this.showCarSelectionModal = false;
    this.selectedClient = null;
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
      return this.selectedClient.cars || [];
    }
    return this.foundClients.flatMap(client => 
      (client.cars || []).map((car: any) => ({
        ...car,
        clientName: client.fullName,
        clientPhone: client.phoneNumber
      }))
    );
  }

  getCarCategoryName(bodyType: number): string {
    const category = this.carCategories.find(cat => cat.id === bodyType);
    return category?.nameAr || `فئة ${bodyType}`;
  }

}

import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';

type ProductApiDto = {
  id: number;
  name: string;
  sku?: string;
  salePrice: number;
  costPerUnit?: number;
  isActive: boolean;
};

type ProductVm = {
  id: number;        // productId
  name: string;
  price: number;     // salePrice
  sku?: string;
  isActive: boolean;
};

type CartItemVm = {
  product: ProductVm;
  qty: number;
};

@Component({
  selector: 'app-payment-point',
  templateUrl: './payment-point.component.html',
  styleUrls: ['./payment-point.component.scss']
})
export class PaymentPointComponent implements OnInit {
  activeTab: 'new-order' | 'quick-booking' = 'new-order';
  branchId = 1;
  cashierId = 5;
  isSubmitting = false;
  products: ProductVm[] = [];
  cart: CartItemVm[] = [];
  orderForm = new FormGroup({
    fullName: new FormControl('', [Validators.required]),
    phoneNumber: new FormControl('', [Validators.required]),
    notes: new FormControl(''),
  });

  customerForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required]),
    carType: new FormControl(''),
    carNumber: new FormControl(''),
    carCategory: new FormControl(null, [Validators.required]),
    appointmentDate: new FormControl('', [Validators.required])
  });

  services: any[] = [];
  selectedServices: any[] = [];
  carCategories: any[] = [];
  availableSlots: any[] = [];
  selectedSlotHour: any = null;
  isSlotsLoading = false;
  totalPrice = 0;

  selectedInvoice: any = null;
  subTotal = 0;
  taxAmount = 0;
  finalTotal = 0;





  constructor(
    private api: ApiService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadProducts();
    this.loadInitialBookingData();
  }

  private loadProducts(): void {
    this.api.getProducts().subscribe({
      next: (res: any) => {
        const data: ProductApiDto[] = res?.data ?? [];

        // ✅ map + keep only active products
        this.products = data
          .filter(p => p.isActive)
          .map(p => ({
            id: p.id,
            name: p.name,
            price: Number(p.salePrice ?? 0),
            sku: p.sku,
            isActive: p.isActive
          }));

        // optional: sort by name
        this.products.sort((a, b) => a.name.localeCompare(b.name));
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('فشل تحميل المنتجات', 'خطأ');
      }
    });
  }

  loadInitialBookingData() {

    this.carCategories = [
      { id: 1, nameAr: 'سيدان صغير' },
      { id: 2, nameAr: 'دفع رباعي / SUV' }
    ];
    this.services = [
      { id: 101, name: 'غسيل خارجي', price: 100 },
      { id: 102, name: 'تلميع داخلي', price: 250 }
    ];
  }


  loadAvailableSlots() {
    const date = this.customerForm.value.appointmentDate;
    if (!date) return;

    this.isSlotsLoading = true;
    // هنا يتم استدعاء الـ API الخاص بالمواعيد المتاحة
    setTimeout(() => {
      this.availableSlots = [
        { hour: '10:00 AM', available: 2 },
        { hour: '11:00 AM', available: 1 }
      ];
      this.isSlotsLoading = false;
    }, 1000);
  }

  toggleService(service: any, event: any) {
    if (event.target.checked) {
      this.selectedServices.push(service);
    } else {
      this.selectedServices = this.selectedServices.filter(s => s.id !== service.id);
    }
    this.calculateBookingTotal();
  }

  isServiceSelected(service: any): boolean {
    return this.selectedServices.some(s => s.id === service.id);
  }

  calculateBookingTotal() {
    this.totalPrice = this.selectedServices.reduce((sum, s) => sum + s.price, 0);
  }

  onBookingSubmit() {
    if (this.customerForm.invalid || this.selectedServices.length === 0) {
      this.toastr.error('يرجى استكمال بيانات الحجز');
      return;
    }
    // تنفيذ عملية الحجز هنا
    this.toastr.success('تم تسجيل الحجز بنجاح');
  }










  // ===== Cart helpers =====
  getItem(productId: number): CartItemVm | undefined {
    return this.cart.find(x => x.product.id === productId);
  }

  isProductSelected(productId: number): boolean {
    return !!this.getItem(productId);
  }

  toggleProduct(product: ProductVm) {
    const item = this.getItem(product.id);
    if (item) {
      this.cart = this.cart.filter(x => x.product.id !== product.id);
    } else {
      this.cart.push({ product, qty: 1 });
    }
  }

  increaseQty(product: ProductVm) {
    const item = this.getItem(product.id);
    if (!item) {
      this.cart.push({ product, qty: 1 });
      return;
    }
    item.qty += 1;
  }

  decreaseQty(product: ProductVm) {
    const item = this.getItem(product.id);
    if (!item) return;

    item.qty -= 1;
    if (item.qty <= 0) {
      this.cart = this.cart.filter(x => x.product.id !== product.id);
    }
  }

  setQty(product: ProductVm, value: any) {
    const qty = Number(value);
    if (Number.isNaN(qty)) return;

    if (qty <= 0) {
      this.cart = this.cart.filter(x => x.product.id !== product.id);
      return;
    }

    const item = this.getItem(product.id);
    if (!item) {
      this.cart.push({ product, qty });
    } else {
      item.qty = qty;
    }
  }

  get totalItemsCount(): number {
    return this.cart.reduce((sum, x) => sum + x.qty, 0);
  }

  // ✅ Total = sum(qty * salePrice)
  get totalAmount(): number {
    return this.cart.reduce((sum, x) => sum + (x.product.price * x.qty), 0);
  }

  // ===== Submit POS invoice =====
  // onSubmit() {
  //   if (this.orderForm.invalid) {
  //     this.toastr.error('يرجى إدخال بيانات العميل', 'خطأ');
  //     return;
  //   }

  //   if (this.cart.length === 0) {
  //     this.toastr.warning('اختر منتج واحد على الأقل', 'تنبيه');
  //     return;
  //   }



  //   const v = this.orderForm.value;

  //   const payload = {
  //     branchId: this.branchId,
  //     cashierId: this.cashierId,
  //     items: this.cart.map(x => ({
  //       productId: x.product.id,
  //       qty: x.qty
  //     })),
  //     occurredAt: new Date().toISOString(),
  //     notes: String(v.notes || ''),
  //     customer: {
  //       phoneNumber: String(v.phoneNumber || ''),
  //       fullName: String(v.fullName || '')
  //     }
  //   };

  //   this.isSubmitting = true;

  //   this.api.createPosInvoice(payload).subscribe({
  //     next: (res: any) => {
  //       this.isSubmitting = false;
  //       console.log(payload);

  //       if (res?.success === false) {
  //         this.toastr.error(res?.message || 'فشل إنشاء الفاتورة', 'خطأ');
  //         return;
  //       }

  //       this.toastr.success('تم إنشاء الفاتورة بنجاح', 'نجاح');

  //       // reset
  //       this.cart = [];
  //       this.orderForm.reset({ fullName: '', phoneNumber: '', notes: '' });
  //     },
  //     error: (err) => {
  //       this.isSubmitting = false;
  //       console.error(err);
  //       this.toastr.error(err?.error?.message || 'فشل إنشاء الفاتورة', 'خطأ');
  //     }
  //   });
  // }

  prepareInvoiceData() {
  const v = this.orderForm.value;
  this.subTotal = this.totalAmount;
  this.taxAmount = this.subTotal * 0.14;
  this.finalTotal = this.subTotal + this.taxAmount;

  this.selectedInvoice = {
    id: Math.floor(1000 + Math.random() * 9000),
    customerName: v.fullName,
    phone: v.phoneNumber,
    date: new Date().toLocaleString('ar-EG'),
    lines: this.cart.map(item => ({
      description: item.product.name,
      qty: item.qty,
      unitPrice: item.product.price,
      total: item.product.price * item.qty
    }))
  };
}

  prepareBookingInvoice() {
  const v = this.customerForm.value;
  this.subTotal = this.totalPrice;
  this.taxAmount = this.subTotal * 0.14;
  this.finalTotal = this.subTotal + this.taxAmount;

  this.selectedInvoice = {
    id: 'R-' + Math.floor(Math.random() * 1000),
    customerName: v.name,
    phone: v.phone,
    date: v.appointmentDate,
    lines: this.selectedServices.map(s => ({
      description: s.name + ' (' + v.carType + ')',
      qty: 1,
      unitPrice: s.price,
      total: s.price
    }))
  };
}


downloadInvoice() {
  const printContents = document.getElementById('printableInvoice')?.innerHTML;
  const originalContents = document.body.innerHTML;

  if (printContents) {
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // لإعادة تهيئة الصفحة بعد الطباعة
  }
}



  onSubmit() {
    if (this.activeTab === 'new-order') {
      this.submitOrder(); // تنفيذ وظيفة البيع المباشر
    } else if (this.activeTab === 'quick-booking') {
      this.submitBooking(); // تنفيذ وظيفة الحجز الفوري
    }
  }

  // أولاً: وظيفة البيع المباشر (POS)
  private submitOrder() {
    if (this.orderForm.invalid) {
      this.toastr.error('يرجى إدخال بيانات العميل', 'خطأ');
      return;
    }

    if (this.cart.length === 0) {
      this.toastr.warning('اختر منتج واحد على الأقل', 'تنبيه');
      return;
    }

    const v = this.orderForm.value;
    const payload = {
      branchId: this.branchId,
      cashierId: this.cashierId,
      items: this.cart.map(x => ({ productId: x.product.id, qty: x.qty })),
      occurredAt: new Date().toISOString(),
      notes: String(v.notes || ''),
      customer: {
        phoneNumber: String(v.phoneNumber || ''),
        fullName: String(v.fullName || '')
      }
    };

    this.isSubmitting = true;
    this.api.createPosInvoice(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.toastr.success('تم إنشاء الفاتورة بنجاح');

        // تحضير بيانات الفاتورة للمودال الخاص بالمنتجات
        this.prepareInvoiceData();
        this.showInvoiceModal();

        // إعادة التعيين
        this.cart = [];
        this.orderForm.reset({ fullName: '', phoneNumber: '', notes: '' });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toastr.error('فشل إنشاء الفاتورة');
      }
    });
  }

  // ثانياً: وظيفة الحجز الفوري (Booking)
  private submitBooking() {
    if (this.customerForm.invalid || this.selectedServices.length === 0) {
      this.toastr.error('يرجى استكمال بيانات الحجز والخدمات');
      return;
    }

    // هنا يتم استدعاء API الحجز (افترضنا أن لديك API مختلف للحجز)
    this.isSubmitting = true;

    // محاكاة استدعاء API النجاح للحجز
    setTimeout(() => {
      this.isSubmitting = false;
      this.toastr.success('تم تسجيل الحجز بنجاح');

      // تحضير بيانات الفاتورة الخاصة بالحجز للمودال
      this.prepareBookingInvoice();
      this.showInvoiceModal();

      // إعادة تعيين فورم الحجز
      this.customerForm.reset();
      this.selectedServices = [];
      this.totalPrice = 0;
    }, 1000);
  }

  // دالة مساعدة لفتح المودال
  private showInvoiceModal() {
    const modalElement = document.getElementById('invoiceModal');
    if (modalElement) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modalElement);
      bootstrapModal.show();
    }
  }


onlyNumbers(event: any) {
  const pattern = /[0-9]/; // يسمح فقط بالأرقام من 0 إلى 9
  const inputChar = String.fromCharCode(event.charCode);

  if (!pattern.test(inputChar)) {
    // إذا لم يكن المدخل رقماً، يتم إلغاء الحدث ومنع الكتابة
    event.preventDefault();
  }
}






}

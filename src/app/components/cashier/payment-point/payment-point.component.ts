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

  constructor(
    private api: ApiService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadProducts();
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
  onSubmit() {
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
      items: this.cart.map(x => ({
        productId: x.product.id,
        qty: x.qty
      })),
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
        console.log(payload);

        if (res?.success === false) {
          this.toastr.error(res?.message || 'فشل إنشاء الفاتورة', 'خطأ');
          return;
        }

        this.toastr.success('تم إنشاء الفاتورة بنجاح', 'نجاح');

        // reset
        this.cart = [];
        this.orderForm.reset({ fullName: '', phoneNumber: '', notes: '' });
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(err);
        this.toastr.error(err?.error?.message || 'فشل إنشاء الفاتورة', 'خطأ');
      }
    });
  }
}

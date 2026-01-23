import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

type ProductApiDto = {
  id: number;
  name: string;
  sku: string;
  salePrice: number;
  costPerUnit: number;
  isActive: boolean;
};

type ProductUi = {
  id: number;
  name: string;
  sku: string;
  price: number; // UI price = salePrice
  costPerUnit: number;
  isActive: boolean;

  // UI-only (your current design uses stock)
  stock: number;
};

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit {
  products: ProductUi[] = [];

  // used in add form + edit modal
  selectedProduct: ProductUi = {
    id: 0,
    name: '',
    sku: '',
    price: 0,
    costPerUnit: 0,
    isActive: true,
    stock: 0,
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.api.getProducts().subscribe({
      next: (res: any) => {
        const data: ProductApiDto[] = res?.data ?? [];

        this.products = data.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: Number(p.salePrice ?? 0),
          costPerUnit: Number(p.costPerUnit ?? 0),
          isActive: !!p.isActive,
          stock: 0, // UI-only until you have a stock endpoint
        }));
      },
      error: (err) => {
        console.error(err);
        alert('فشل تحميل المنتجات');
      },
    });
  }

  // Add new product (POST /Create)
  addNewProduct() {
    const name = (this.selectedProduct.name || '').trim();
    const sku = (this.selectedProduct.sku || '').trim();
    const salePrice = Number(this.selectedProduct.price);
    const costPerUnit = Number(this.selectedProduct.costPerUnit);

    if (!name || !sku || Number.isNaN(salePrice) || Number.isNaN(costPerUnit)) {
      alert('من فضلك أدخل الاسم و SKU والسعر والتكلفة بشكل صحيح');
      return;
    }

    const payload = { name, sku, salePrice, costPerUnit };

    this.api.createProduct(payload).subscribe({
      next: () => {
        alert('تم إضافة المنتج بنجاح');
        this.loadProducts();

        // reset
        this.selectedProduct = {
          id: 0,
          name: '',
          sku: '',
          price: 0,
          costPerUnit: 0,
          isActive: true,
          stock: 0,
        };
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل إضافة المنتج');
      },
    });
  }

  // open edit modal (clone)
  openEditModal(prod: ProductUi) {
    this.selectedProduct = { ...prod };
  }

  // Save edit (PUT /Update/:id)
  saveProductChanges() {
    if (!this.selectedProduct?.id) return;

    const payload = {
      name: (this.selectedProduct.name || '').trim(),
      sku: (this.selectedProduct.sku || '').trim(),
      salePrice: Number(this.selectedProduct.price),
      costPerUnit: Number(this.selectedProduct.costPerUnit),
      isActive: !!this.selectedProduct.isActive,
    };

    this.api.updateProduct(this.selectedProduct.id, payload).subscribe({
      next: () => {
        alert('تم تحديث بيانات المنتج بنجاح');
        this.loadProducts();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل تحديث المنتج');
      },
    });
  }

  // Delete (DELETE /Delete/:id)
  deleteProduct(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    this.api.deleteProduct(id).subscribe({
      next: () => {
        alert('تم حذف المنتج');
        this.loadProducts();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل حذف المنتج');
      },
    });
  }
}

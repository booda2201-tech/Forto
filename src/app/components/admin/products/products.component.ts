import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { ProductStockAlertService } from 'src/app/services/product-stock-alert.service';

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
  price: number;
  costPerUnit: number;
  isActive: boolean;
  stock: number;
  reorderLevel: number;
};

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit {
  products: ProductUi[] = [];

  selectedProduct: ProductUi = {
    id: 0,
    name: '',
    sku: '',
    price: 0,
    costPerUnit: 0,
    isActive: true,
    stock: 0,
    reorderLevel: 0,
  };

  branchId = 1;
  dismissedAlertIds = new Set<number>();

  stockInProduct: ProductUi | null = null;
  stockInQty = 0;
  stockInUnitCost = 0;
  stockInNotes = '';
  adjustProduct: ProductUi | null = null;
  adjustQty = 0;
  adjustNotes = '';
  isSavingStock = false;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private alertService: ProductStockAlertService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.api.getProducts().subscribe({
      next: (prodsRes: any) => {
        const data: ProductApiDto[] = prodsRes?.data ?? [];
        this.api.getBranchProductStock(this.branchId).subscribe({
          next: (stockRes: any) => {
            const stock = stockRes?.data ?? stockRes;
            const items: any[] = Array.isArray(stock) ? stock : [];
            const stockMap = new Map<number, any>();
            items.forEach((s: any) => {
              const pid = s.productId ?? s.ProductId;
              if (pid != null) stockMap.set(Number(pid), s);
            });

            this.products = data.map((p) => {
              const s = stockMap.get(p.id);
              const onHand = s?.onHandQty ?? s?.OnHandQty ?? 0;
              const reorder = s?.reorderLevel ?? s?.ReorderLevel ?? 0;
              return {
                id: p.id,
                name: p.name,
                sku: p.sku,
                price: Number(p.salePrice ?? 0),
                costPerUnit: Number(p.costPerUnit ?? 0),
                isActive: !!p.isActive,
                stock: Number(onHand),
                reorderLevel: Number(reorder),
              };
            });

            let alertCount = 0;
            this.products.forEach((prod) => {
              const r = Number(prod.reorderLevel) || 0;
              if (r > 0 && (Number(prod.stock) || 0) < r) alertCount++;
            });
            this.alertService.setCount(alertCount);
          },
          error: () => {
            this.products = data.map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              price: Number(p.salePrice ?? 0),
              costPerUnit: Number(p.costPerUnit ?? 0),
              isActive: !!p.isActive,
              stock: 0,
              reorderLevel: 0,
            }));
          },
        });
      },
      error: (err) => {
        console.error(err);
        alert('فشل تحميل المنتجات');
      },
    });
  }

  openStockInModal(prod: ProductUi) {
    this.stockInProduct = prod;
    this.stockInQty = 0;
    this.stockInUnitCost = prod.costPerUnit ?? 0;
    this.stockInNotes = '';
  }

  saveStockIn() {
    if (!this.stockInProduct || this.stockInQty <= 0) {
      alert('أدخل الكمية بشكل صحيح');
      return;
    }
    const cashierId = this.auth.getEmployeeId() ?? 0;
    this.isSavingStock = true;
    this.api.addProductStockIn(this.branchId, {
      cashierId,
      productId: this.stockInProduct.id,
      qty: this.stockInQty,
      unitCost: this.stockInUnitCost,
      notes: this.stockInNotes || undefined,
    }).subscribe({
      next: () => {
        alert('تم إدخال المخزون بنجاح');
        this.loadProducts();
        this.isSavingStock = false;
        (window as any).bootstrap?.Modal?.getOrCreateInstance(document.getElementById('productStockInModal'))?.hide();
      },
      error: (err) => {
        this.isSavingStock = false;
        alert(err?.error?.message || err?.error?.Message || 'فشل إدخال المخزون');
      },
    });
  }

  openAdjustModal(prod: ProductUi) {
    this.adjustProduct = prod;
    this.adjustQty = prod.stock ?? 0;
    this.adjustNotes = '';
  }

  saveAdjust() {
    if (!this.adjustProduct) return;
    const cashierId = this.auth.getEmployeeId() ?? 0;
    this.isSavingStock = true;
    this.api.adjustProductStock(this.branchId, {
      cashierId,
      productId: this.adjustProduct.id,
      physicalOnHandQty: this.adjustQty,
      notes: this.adjustNotes || undefined,
    }).subscribe({
      next: () => {
        alert('تم تعديل المخزون بنجاح');
        this.loadProducts();
        this.isSavingStock = false;
        (window as any).bootstrap?.Modal?.getOrCreateInstance(document.getElementById('productAdjustStockModal'))?.hide();
      },
      error: (err) => {
        this.isSavingStock = false;
        alert(err?.error?.message || err?.error?.Message || 'فشل تعديل المخزون');
      },
    });
  }

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

        this.selectedProduct = {
          id: 0,
          name: '',
          sku: '',
          price: 0,
          costPerUnit: 0,
          isActive: true,
          stock: 0,
          reorderLevel: 0,
        };
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل إضافة المنتج');
      },
    });
  }

  openEditModal(prod: ProductUi) {
    this.selectedProduct = { ...prod };
  }

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
        const onHand = Number(this.selectedProduct.stock) ?? 0;
        const reorder = Number(this.selectedProduct.reorderLevel) ?? 0;
        this.api.upsertBranchProductStock({
          branchId: this.branchId,
          productId: this.selectedProduct.id,
          onHandQty: onHand,
          reorderLevel: reorder,
        }).subscribe({
          next: () => {
            alert('تم تحديث بيانات المنتج والمخزون بنجاح');
            this.loadProducts();
          },
          error: (e) => {
            alert('تم تحديث المنتج، لكن فشل تحديث المخزون: ' + (e?.error?.message || e?.error?.Message || ''));
            this.loadProducts();
          },
        });
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل تحديث المنتج');
      },
    });
  }

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

  isBelowReorder(prod: ProductUi): boolean {
    const r = Number(prod.reorderLevel) || 0;
    if (r <= 0) return false;
    return (Number(prod.stock) || 0) < r;
  }

  isAlertDismissed(prod: ProductUi): boolean {
    return this.dismissedAlertIds.has(prod.id);
  }

  dismissAlert(prod: ProductUi): void {
    this.dismissedAlertIds.add(prod.id);
  }
}

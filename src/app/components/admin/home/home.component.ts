import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { MaterialStockAlertService } from 'src/app/services/material-stock-alert.service';
import { ProductStockAlertService } from 'src/app/services/product-stock-alert.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  materialsAlertCount = 0;
  productsAlertCount = 0;

  constructor(
    public router: Router,
    private api: ApiService,
    private materialAlertService: MaterialStockAlertService,
    private productAlertService: ProductStockAlertService
  ) {}

  ngOnInit(): void {
    this.materialAlertService.alertCount$.subscribe(c => (this.materialsAlertCount = c));
    this.productAlertService.alertCount$.subscribe(c => (this.productsAlertCount = c));
    this.loadMaterialsAlertCount();
    this.loadProductsAlertCount();
  }

  loadProductsAlertCount(): void {
    const branchId = 1;
    this.api.getProducts().subscribe({
      next: (prodsRes: any) => {
        const data = prodsRes?.data ?? [];
        this.api.getBranchProductStock(branchId).subscribe({
          next: (stockRes: any) => {
            const stock = stockRes?.data ?? stockRes;
            const items: any[] = Array.isArray(stock) ? stock : [];
            const map = new Map<number, any>();
            items.forEach((s: any) => {
              const pid = s.productId ?? s.ProductId;
              if (pid != null) map.set(Number(pid), s);
            });
            let count = 0;
            data.forEach((p: any) => {
              const s = map.get(p.id);
              const onHand = Number(s?.onHandQty ?? s?.OnHandQty ?? 0);
              const reorder = Number(s?.reorderLevel ?? s?.ReorderLevel ?? 0);
              if (reorder > 0 && onHand < reorder) count++;
            });
            this.productAlertService.setCount(count);
          },
          error: () => { this.productAlertService.setCount(0); }
        });
      },
      error: () => { this.productAlertService.setCount(0); }
    });
  }

  loadMaterialsAlertCount(): void {
    const branchId = 1;
    this.api.getMaterials().subscribe({
      next: (matsRes: any) => {
        const data = matsRes?.data ?? [];
        this.api.getBranchStock(branchId).subscribe({
          next: (stockRes: any) => {
            const stock = stockRes?.data ?? stockRes;
            const items: any[] = Array.isArray(stock) ? stock : [];
            const map = new Map<number, any>();
            items.forEach((s: any) => {
              const mid = s.materialId ?? s.MaterialId;
              if (mid != null) map.set(Number(mid), s);
            });
            let count = 0;
            data.forEach((m: any) => {
              const s = map.get(m.id);
              const onHand = Number(s?.onHandQty ?? s?.OnHandQty ?? 0);
              const reorder = Number(s?.reorderLevel ?? s?.ReorderLevel ?? 0);
              if (reorder > 0 && onHand < reorder) count++;
            });
            this.materialAlertService.setCount(count);
          },
          error: () => { this.materialAlertService.setCount(0); }
        });
      },
      error: () => { this.materialAlertService.setCount(0); }
    });
  }
}

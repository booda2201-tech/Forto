import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { MaterialStockAlertService } from 'src/app/services/material-stock-alert.service';

type MaterialApiDto = {
  id: number;
  name: string;
  unit: number;
  costPerUnit: number;
  chargePerUnit: number;
  isActive: boolean;
};

type MaterialUi = {
  id: number;
  name: string;
  unit: number;
  costPerUnit: number;
  chargePerUnit: number;
  isActive: boolean;
  stock: number;
  reorderLevel: number;
};

type StockItem = { materialId: number; onHandQty?: number; reorderLevel?: number };

@Component({
  selector: 'app-materials',
  templateUrl: './materials.component.html',
  styleUrls: ['./materials.component.scss']
})
export class MaterialsComponent implements OnInit {
  materials: MaterialUi[] = [];

  selectedMaterial: MaterialUi = {
    id: 0,
    name: '',
    unit: 1,
    costPerUnit: 0,
    chargePerUnit: 0,
    isActive: true,
    stock: 0,
    reorderLevel: 0
  };

  branchId = 1;

  /** مواد تم تجاهل إنذارها في هذه الجلسة (يتلاشى بعد refresh) */
  dismissedAlertIds = new Set<number>();

  // Stock modals
  stockInMaterial: MaterialUi | null = null;
  stockInQty = 0;
  stockInUnitCost = 0;
  stockInNotes = '';
  adjustMaterial: MaterialUi | null = null;
  adjustQty = 0;
  adjustNotes = '';
  isSavingStock = false;

  // units dropdown (غيري المسميات حسب نظامكم)
  units = [
    { id: 1, label: 'مل (ml)' },
    { id: 2, label: 'قطعة (pcs)' },
    { id: 3, label: 'جرام (g)' }
  ];

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private alertService: MaterialStockAlertService
  ) {}

  ngOnInit(): void {
    this.loadMaterials();
  }

  loadMaterials() {
    this.api.getMaterials().subscribe({
      next: (matsRes: any) => {
        const data: MaterialApiDto[] = matsRes?.data ?? [];
        this.api.getBranchStock(this.branchId).subscribe({
          next: (stockRes: any) => {
            const stock = stockRes?.data ?? stockRes;
            const stockItems: any[] = Array.isArray(stock) ? stock : [];
        const stockMap = new Map<number, any>();
        stockItems.forEach((s: any) => {
          const mid = s.materialId ?? s.MaterialId;
          if (mid != null) stockMap.set(Number(mid), s);
        });

        this.materials = data.map(m => {
          const s = stockMap.get(m.id);
          const onHand = s?.onHandQty ?? s?.OnHandQty ?? 0;
          const reorder = s?.reorderLevel ?? s?.ReorderLevel ?? 0;
          return {
            id: m.id,
            name: m.name,
            unit: Number(m.unit ?? 1),
            costPerUnit: Number(m.costPerUnit ?? 0),
            chargePerUnit: Number(m.chargePerUnit ?? 0),
            isActive: !!m.isActive,
            stock: Number(onHand),
            reorderLevel: Number(reorder),
          };
        });
            let alertCount = 0;
            this.materials.forEach(mat => {
              const stock = Number(mat.stock) || 0;
              const r = Number(mat.reorderLevel) || 0;
              if (stock === 0 || (r > 0 && stock < r)) alertCount++;
            });
            this.alertService.setCount(alertCount);
          },
          error: () => {
            this.materials = data.map(m => ({
              id: m.id,
              name: m.name,
              unit: Number(m.unit ?? 1),
              costPerUnit: Number(m.costPerUnit ?? 0),
              chargePerUnit: Number(m.chargePerUnit ?? 0),
              isActive: !!m.isActive,
              stock: 0,
              reorderLevel: 0,
            }));
            this.alertService.setCount(0);
          }
        });
      },
      error: (err) => {
        console.error(err);
        alert('فشل تحميل المواد');
      }
    });
  }

  openStockInModal(mat: MaterialUi) {
    this.stockInMaterial = mat;
    this.stockInQty = 0;
    this.stockInUnitCost = mat.costPerUnit ?? 0;
    this.stockInNotes = '';
  }

  saveStockIn() {
    if (!this.stockInMaterial || this.stockInQty <= 0) {
      alert('أدخل الكمية بشكل صحيح');
      return;
    }
    const cashierId = this.auth.getEmployeeId() ?? 0;
    this.isSavingStock = true;
    this.api.addStockIn(this.branchId, {
      cashierId,
      materialId: this.stockInMaterial.id,
      qty: this.stockInQty,
      unitCost: this.stockInUnitCost,
      notes: this.stockInNotes || undefined,
    }).subscribe({
      next: () => {
        alert('تم إدخال المخزون بنجاح');
        this.loadMaterials();
        this.isSavingStock = false;
        (window as any).bootstrap?.Modal?.getOrCreateInstance(document.getElementById('stockInModal'))?.hide();
      },
      error: (err) => {
        this.isSavingStock = false;
        alert(err?.error?.message || err?.error?.Message || 'فشل إدخال المخزون');
      }
    });
  }

  openAdjustModal(mat: MaterialUi) {
    this.adjustMaterial = mat;
    this.adjustQty = mat.stock ?? 0;
    this.adjustNotes = '';
  }

  saveAdjust() {
    if (!this.adjustMaterial) return;
    const cashierId = this.auth.getEmployeeId() ?? 0;
    this.isSavingStock = true;
    this.api.adjustStock(this.branchId, {
      cashierId,
      materialId: this.adjustMaterial.id,
      physicalOnHandQty: this.adjustQty,
      notes: this.adjustNotes || undefined,
    }).subscribe({
      next: () => {
        alert('تم تعديل المخزون بنجاح');
        this.loadMaterials();
        this.isSavingStock = false;
        (window as any).bootstrap?.Modal?.getOrCreateInstance(document.getElementById('adjustStockModal'))?.hide();
      },
      error: (err) => {
        this.isSavingStock = false;
        alert(err?.error?.message || err?.error?.Message || 'فشل تعديل المخزون');
      }
    });
  }

  addNewMaterial() {
    const name = (this.selectedMaterial.name || '').trim();
    const unit = Number(this.selectedMaterial.unit);
    const costPerUnit = Number(this.selectedMaterial.costPerUnit);
    const chargePerUnit = Number(this.selectedMaterial.chargePerUnit);

    if (!name || Number.isNaN(unit) || Number.isNaN(costPerUnit) || Number.isNaN(chargePerUnit)) {
      alert('من فضلك أدخل البيانات بشكل صحيح');
      return;
    }

    const payload = { name, unit, costPerUnit, chargePerUnit };

    this.api.createMaterial(payload).subscribe({
      next: () => {
        alert('تم إضافة المادة بنجاح');
        this.loadMaterials();

        this.selectedMaterial = {
          id: 0,
          name: '',
          unit: 1,
          costPerUnit: 0,
          chargePerUnit: 0,
          isActive: true,
          stock: 0,
          reorderLevel: 0
        };
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل إضافة المادة');
      }
    });
  }

  openEditModal(mat: MaterialUi) {
    this.selectedMaterial = { ...mat };
  }

  saveMaterialChanges() {
    if (!this.selectedMaterial?.id) return;

    const payload = {
      name: (this.selectedMaterial.name || '').trim(),
      unit: Number(this.selectedMaterial.unit),
      costPerUnit: Number(this.selectedMaterial.costPerUnit),
      chargePerUnit: Number(this.selectedMaterial.chargePerUnit),
      isActive: !!this.selectedMaterial.isActive
    };

    this.api.updateMaterial(this.selectedMaterial.id, payload).subscribe({
      next: () => {
        const onHand = Number(this.selectedMaterial.stock) ?? 0;
        const reorder = Number(this.selectedMaterial.reorderLevel) ?? 0;
        this.api.upsertStock(this.branchId, {
          materialId: this.selectedMaterial.id,
          onHandQty: onHand,
          reorderLevel: reorder,
        }).subscribe({
          next: () => {
            alert('تم تحديث بيانات المادة والمخزون بنجاح');
            this.loadMaterials();
          },
          error: (e) => {
            alert('تم تحديث المادة، لكن فشل تحديث المخزون: ' + (e?.error?.message || e?.error?.Message || ''));
            this.loadMaterials();
          }
        });
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل تحديث المادة');
      }
    });
  }

  deleteMaterial(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذه المادة؟')) return;

    this.api.deleteMaterial(id).subscribe({
      next: () => {
        alert('تم حذف المادة');
        this.loadMaterials();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل حذف المادة');
      }
    });
  }

  unitLabel(unitId: number): string {
    return this.units.find(u => u.id === unitId)?.label || `Unit ${unitId}`;
  }

  isBelowReorder(mat: MaterialUi): boolean {
    const stock = Number(mat.stock) || 0;
    const r = Number(mat.reorderLevel) || 0;
    if (stock === 0) return true;
    if (r <= 0) return false;
    return stock < r;
  }

  isAlertDismissed(mat: MaterialUi): boolean {
    return this.dismissedAlertIds.has(mat.id);
  }

  dismissAlert(mat: MaterialUi): void {
    this.dismissedAlertIds.add(mat.id);
  }

}

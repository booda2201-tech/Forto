import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

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

  // UI-only (لو عايزة نفس بادج "المخزون" مؤقتًا)
  stock: number;
};

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
    stock: 0
  };

  // units dropdown (غيري المسميات حسب نظامكم)
  units = [
    { id: 1, label: 'مل (ml)' },
    { id: 2, label: 'قطعة (pcs)' },
    { id: 3, label: 'جرام (g)' }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadMaterials();
  }

  loadMaterials() {
    this.api.getMaterials().subscribe({
      next: (res: any) => {
        const data: MaterialApiDto[] = res?.data ?? [];
        this.materials = data.map(m => ({
          id: m.id,
          name: m.name,
          unit: Number(m.unit ?? 1),
          costPerUnit: Number(m.costPerUnit ?? 0),
          chargePerUnit: Number(m.chargePerUnit ?? 0),
          isActive: !!m.isActive,
          stock: 0 // UI-only
        }));
      },
      error: (err) => {
        console.error(err);
        alert('فشل تحميل المواد');
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
          stock: 0
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
        alert('تم تحديث بيانات المادة بنجاح');
        this.loadMaterials();
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

  // UI-only stock +/- لو عايزة تسيبيه مؤقت
  updateQuickStock(mat: MaterialUi, amount: number) {
    const newStock = (mat.stock ?? 0) + amount;
    if (newStock >= 0) mat.stock = newStock;
  }
}

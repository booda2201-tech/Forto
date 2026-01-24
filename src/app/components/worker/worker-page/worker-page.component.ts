import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-worker-page',
  templateUrl: './worker-page.component.html',
  styleUrls: ['./worker-page.component.scss'],
})
export class WorkerPageComponent implements OnInit {
  employeeId = 1; // العامل الحالي
  selectedDate = this.today();

  availableTasks: any[] = []; // ✅ متاح
  myActiveTasks: any[] = []; // ✅ شغال عليه

  // materials modal
  materials: any[] = [];
  selectedMaterialRows: { materialId: number; actualQty: number }[] = [];

  selectedTask: any = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadTasks();
    this.loadMaterials();
  }

  loadTasks() {
    this.api.getEmployeeTasks(this.employeeId, this.selectedDate).subscribe({
      next: (res: any) => {
        this.availableTasks = res?.data?.available ?? [];
        this.myActiveTasks = res?.data?.myActive ?? [];
      },
      error: (err) => {
        console.error(err);
        alert('فشل تحميل المهام');
      },
    });
  }

  onDateChange(e: any) {
    this.selectedDate = e.target.value;
    this.loadTasks();
  }

  // ---------- Start ----------
  startExecution(task: any) {
    this.api
      .startBookingItem(task.bookingItemId, { employeeId: this.employeeId })
      .subscribe({
        next: () => {
          // بعد start نعمل refresh عشان يدخل myActive من السيرفر
          this.loadTasks();
        },
        error: (err) => {
          console.error(err);
          alert(err?.error?.message || 'فشل بدء التنفيذ');
        },
      });
  }

  // ---------- Complete ----------
  finishExecution(task: any) {
    this.api
      .completeBookingItem(task.bookingItemId, { employeeId: this.employeeId })
      .subscribe({
        next: () => {
          // بعد complete نعمل refresh عشان يختفي من myActive
          this.loadTasks();
          this.selectedTask = null;
        },
        error: (err) => {
          console.error(err);
          alert(err?.error?.message || 'فشل إنهاء المهمة');
        },
      });
  }

  // ---------- Materials ----------
  loadMaterials() {
    this.api.getMaterials().subscribe({
      next: (res: any) => (this.materials = res?.data ?? []),
      error: (err) => console.error(err),
    });
  }

  selectTask(task: any) {
    this.selectedTask = task;
    this.selectedMaterialRows = [{ materialId: 0, actualQty: 0 }];
  }

  addMaterialRow() {
    this.selectedMaterialRows.push({ materialId: 0, actualQty: 0 });
  }

  removeMaterialRow(i: number) {
    this.selectedMaterialRows.splice(i, 1);
    if (this.selectedMaterialRows.length === 0) {
      this.selectedMaterialRows.push({ materialId: 0, actualQty: 0 });
    }
  }

  saveMaterials() {
    if (!this.selectedTask) return;

    const payload = {
      employeeId: this.employeeId,
      materials: this.selectedMaterialRows
        .filter((m) => Number(m.materialId) > 0 && Number(m.actualQty) > 0)
        .map((m) => ({
          materialId: Number(m.materialId),
          actualQty: Number(m.actualQty),
        })),
    };

    console.log(payload);

    this.api
      .updateBookingItemMaterials(this.selectedTask.bookingItemId, payload)
      .subscribe({
        next: (res) => {
          console.log(res);

          alert('تم حفظ المواد');
        },
        error: (err) => {
          console.error(err);
          alert(err?.error?.message || 'فشل حفظ المواد');
        },
      });
  }

  // ---------- Helpers ----------
  statusText(status: number) {
    return status === 1
      ? 'قيد الانتظار'
      : status === 2
        ? 'قيد التنفيذ'
        : 'مكتمل';
  }

  today() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
}

import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

type ShiftUi = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

@Component({
  selector: 'app-shifts',
  templateUrl: './shifts.component.html',
  styleUrls: ['./shifts.component.scss'],
})
export class ShiftsComponent implements OnInit {
  shifts: ShiftUi[] = [];
  selectedShift: ShiftUi = {
    id: 0,
    name: '',
    startTime: '09:00',
    endTime: '17:00',
  };
  isSaving = false;
  editingId: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadShifts();
  }

  loadShifts(): void {
    this.api.getShiftsAll().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? [];
        this.shifts = (Array.isArray(data) ? data : []).map((s: any) => ({
          id: s.id,
          name: s.name ?? '',
          startTime: this.formatTime(s.startTime),
          endTime: this.formatTime(s.endTime),
        }));
      },
      error: (err) => {
        console.error(err);
        alert('فشل تحميل الشيفتات');
      },
    });
  }

  private formatTime(t: any): string {
    if (!t) return '09:00';
    if (typeof t === 'string') {
      const match = t.match(/^(\d{1,2}):(\d{2})/);
      return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '09:00';
    }
    if (t.hours != null && t.minutes != null) {
      return `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`;
    }
    return '09:00';
  }

  resetForm(): void {
    this.selectedShift = {
      id: 0,
      name: '',
      startTime: '09:00',
      endTime: '17:00',
    };
    this.editingId = null;
  }

  createShift(): void {
    const name = (this.selectedShift.name || '').trim();
    if (!name) {
      alert('أدخل اسم الشيفت');
      return;
    }

    this.isSaving = true;
    this.api
      .createShift({
        name,
        startTime: this.selectedShift.startTime || '09:00',
        endTime: this.selectedShift.endTime || '17:00',
      })
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.resetForm();
          this.loadShifts();
          alert('تم إضافة الشيفت بنجاح');
        },
        error: (err) => {
          console.error(err);
          this.isSaving = false;
          alert(err?.error?.message || 'فشل إضافة الشيفت');
        },
      });
  }

  openEditModal(s: ShiftUi): void {
    this.editingId = s.id;
    this.selectedShift = { ...s };
  }

  updateShift(): void {
    if (!this.editingId) return;
    const name = (this.selectedShift.name || '').trim();
    if (!name) {
      alert('أدخل اسم الشيفت');
      return;
    }

    this.isSaving = true;
    this.api
      .updateShift(this.editingId, {
        name,
        startTime: this.selectedShift.startTime || '09:00',
        endTime: this.selectedShift.endTime || '17:00',
      })
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.resetForm();
          this.loadShifts();
          const el = document.getElementById('editShiftModal');
          const modal = (window as any).bootstrap.Modal.getInstance(el);
          modal?.hide();
        },
        error: (err) => {
          console.error(err);
          this.isSaving = false;
          alert(err?.error?.message || 'فشل تحديث الشيفت');
        },
      });
  }

  deleteShift(id: number): void {
    if (!confirm('هل أنت متأكد من حذف هذا الشيفت؟')) return;

    this.api.deleteShift(id).subscribe({
      next: () => {
        this.loadShifts();
        this.resetForm();
        alert('تم حذف الشيفت');
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل حذف الشيفت');
      },
    });
  }
}

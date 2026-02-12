import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { CashierShiftService } from '../../../services/cashier-shift.service';

@Component({
  selector: 'app-start-shift',
  templateUrl: './start-shift.component.html',
  styleUrls: ['./start-shift.component.scss'],
})
export class StartShiftComponent implements OnInit {
  shifts: { id: number; name: string; startTime: string; endTime: string }[] = [];
  selectedShiftId: number | null = null;
  loading = true;
  starting = false;
  errorMessage = '';

  constructor(
    private api: ApiService,
    private cashierShift: CashierShiftService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadShifts();
  }

  private formatTime(t: any): string {
    if (t == null) return '--:--';
    if (typeof t === 'string') return t;
    return String(t);
  }

  loadShifts(): void {
    this.loading = true;
    this.api.getShiftsAll().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? [];
        this.shifts = (Array.isArray(data) ? data : []).map((s: any) => ({
          id: s.id,
          name: s.name ?? '',
          startTime: this.formatTime(s.startTime),
          endTime: this.formatTime(s.endTime),
        }));
        if (this.shifts.length > 0 && !this.selectedShiftId) {
          this.selectedShiftId = this.shifts[0].id;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'فشل تحميل الورديات';
      },
    });
  }

  startShift(): void {
    if (this.selectedShiftId == null || this.starting) return;
    this.starting = true;
    this.errorMessage = '';
    this.cashierShift.startShift(this.selectedShiftId).subscribe({
      next: () => {
        this.starting = false;
        this.router.navigate(['/cashier/reservations']);
      },
      error: (err) => {
        this.starting = false;
        this.errorMessage = err?.error?.message ?? 'فشل بدء الوردية. حاول مرة أخرى.';
      },
    });
  }
}

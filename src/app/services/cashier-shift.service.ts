import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface ActiveCashierShift {
  id: number;
  branchId: number;
  shiftId: number;
  shiftName: string;
  openedByEmployeeId: number;
  openedAt: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CashierShiftService {
  private readonly defaultBranchId = 1;
  private activeShiftSubject = new BehaviorSubject<ActiveCashierShift | null>(null);
  activeShift$ = this.activeShiftSubject.asObservable();

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  getBranchId(): number {
    return this.defaultBranchId;
  }

  getActiveShift(): ActiveCashierShift | null {
    return this.activeShiftSubject.value;
  }

  setActiveShift(shift: ActiveCashierShift | null): void {
    this.activeShiftSubject.next(shift);
  }

  /** جلب الوردية النشطة من الـ API وتحديث الحالة — تُعتبر نشطة فقط إذا كانت لنفس الكاشير (openedByEmployeeId = employeeId الحالي) */
  loadActiveShift(): Observable<ActiveCashierShift | null> {
    const branchId = this.getBranchId();
    const currentEmployeeId = this.auth.getEmployeeId();
    return new Observable((subscriber) => {
      this.api.getActiveCashierShift(branchId).subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          const isActiveAndMine =
            data &&
            data.isActive &&
            currentEmployeeId != null &&
            Number(data.openedByEmployeeId) === Number(currentEmployeeId);
          const shift = isActiveAndMine
            ? {
                id: data.id,
                branchId: data.branchId,
                shiftId: data.shiftId,
                shiftName: data.shiftName ?? '',
                openedByEmployeeId: data.openedByEmployeeId,
                openedAt: data.openedAt,
                isActive: data.isActive,
              }
            : null;
          this.activeShiftSubject.next(shift);
          subscriber.next(shift);
          subscriber.complete();
        },
        error: () => {
          this.activeShiftSubject.next(null);
          subscriber.next(null);
          subscriber.complete();
        },
      });
    });
  }

  startShift(shiftId: number): Observable<any> {
    const branchId = this.getBranchId();
    const cashierEmployeeId = this.auth.getEmployeeId();
    if (!cashierEmployeeId) {
      return new Observable((sub) => {
        sub.error(new Error('لم يتم التعرف على الموظف'));
        sub.complete();
      });
    }
    return new Observable((subscriber) => {
      this.api
        .startCashierShift({ branchId, cashierEmployeeId, shiftId })
        .subscribe({
          next: (res: any) => {
            const data = res?.data ?? res;
            if (data) {
              this.activeShiftSubject.next({
                id: data.id,
                branchId: data.branchId ?? branchId,
                shiftId: data.shiftId ?? shiftId,
                shiftName: data.shiftName ?? '',
                openedByEmployeeId: data.openedByEmployeeId ?? cashierEmployeeId,
                openedAt: data.openedAt ?? new Date().toISOString(),
                isActive: true,
              });
            }
            subscriber.next(res);
            subscriber.complete();
          },
          error: (err) => {
            subscriber.error(err);
            subscriber.complete();
          },
        });
    });
  }

  closeShift(): Observable<any> {
    const shift = this.activeShiftSubject.value;
    const employeeId = this.auth.getEmployeeId();
    if (!shift || !employeeId) {
      return new Observable((sub) => {
        sub.error(new Error('لا توجد وردية نشطة'));
        sub.complete();
      });
    }
    return new Observable((subscriber) => {
      this.api.closeCashierShift(shift.id, { closedByEmployeeId: employeeId }).subscribe({
        next: () => {
          this.activeShiftSubject.next(null);
          subscriber.next(null);
          subscriber.complete();
        },
        error: (err) => {
          subscriber.error(err);
          subscriber.complete();
        },
      });
    });
  }

  clearActiveShift(): void {
    this.activeShiftSubject.next(null);
  }
}

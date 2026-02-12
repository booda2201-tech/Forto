import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { CashierShiftService } from '../services/cashier-shift.service';

@Injectable({
  providedIn: 'root',
})
export class CashierShiftGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private cashierShift: CashierShiftService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    if (this.auth.getRole()?.toLowerCase() !== 'cashier') {
      return of(true);
    }

    const isStartShiftPage = state.url.includes('/start-shift');

    return this.cashierShift.loadActiveShift().pipe(
      map((active) => {
        if (active?.isActive) {
          this.cashierShift.setActiveShift(active);
          if (isStartShiftPage) {
            this.router.navigate(['/cashier/reservations']);
            return false;
          }
          return true;
        }
        if (!isStartShiftPage) {
          this.router.navigate(['/cashier/start-shift']);
          return false;
        }
        return true;
      }),
      catchError(() => {
        if (!isStartShiftPage) {
          this.router.navigate(['/cashier/start-shift']);
          return of(false);
        }
        return of(true);
      })
    );
  }
}

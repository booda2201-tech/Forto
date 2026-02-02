import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRole = String(route.data['expectedRole'] || '').toLowerCase();
    const currentRole = (this.auth.getRole() || '').toLowerCase();

    if (!currentRole) {
      this.router.navigate(['/login']);
      return false;
    }

    if (currentRole !== expectedRole) {
      if (currentRole === 'admin') {
        this.router.navigate(['/admin/services']);
      } else if (currentRole === 'cashier') {
        this.router.navigate(['/cashier/reservations']);
      } else if (currentRole === 'worker') {
        this.router.navigate(['/worker-page']);
      } else {
        this.router.navigate(['/login']);
      }
      return false;
    }
    return true;
  }
}

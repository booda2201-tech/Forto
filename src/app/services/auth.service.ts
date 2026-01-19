import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private userRoleSubject = new BehaviorSubject<string | null>(localStorage.getItem('userRole'));
  userRole$ = this.userRoleSubject.asObservable();
  constructor(private router: Router) { }

login(role: string) {
  localStorage.setItem('userRole', role);
  this.userRoleSubject.next(role);


  if (role === 'admin') {
    this.router.navigate(['/admin/services']);
  } else if (role === 'cashier') {
    this.router.navigate(['/cashier/reservations']);
  } else if (role === 'worker') {
    this.router.navigate(['/worker-page']);
  }
}

  logout() {
    localStorage.removeItem('userRole');
    this.userRoleSubject.next(null);
    this.router.navigate(['/login']);
  }
}

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userRoleSubject = new BehaviorSubject<string | null>(localStorage.getItem('userRole'));
  private fullNameSubject = new BehaviorSubject<string | null>(localStorage.getItem('userFullName'));

  userRole$ = this.userRoleSubject.asObservable();
  fullName$ = this.fullNameSubject.asObservable();

  constructor(
    private router: Router,
    private api: ApiService
  ) {
    this.fullNameSubject.next(localStorage.getItem('userFullName'));
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getEmployeeId(): number | null {
    const id = localStorage.getItem('employeeId');
    return id ? Number(id) : null;
  }

  getFullName(): string | null {
    return localStorage.getItem('userFullName');
  }

  getRole(): string | null {
    return localStorage.getItem('userRole');
  }

  /** تسجيل الدخول بالـ API: phoneNumber + password */
  login(phoneNumber: string, password: string) {
    return this.api.signin({ phoneNumber, password });
  }

  /** حفظ بيانات المستخدم بعد نجاح تسجيل الدخول (الكاشير: التوجيه يتم من صفحة اللوجن بعد التحقق من الوردية) */
  setUser(data: { token: string; role: string; fullName: string; employeeId: number }) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('userFullName', data.fullName ?? '');
    localStorage.setItem('employeeId', String(data.employeeId));

    this.userRoleSubject.next(data.role);
    this.fullNameSubject.next(data.fullName ?? '');

    const role = String(data.role || '').toLowerCase();
    if (role === 'admin') {
      this.router.navigate(['/admin/services']);
    } else if (role === 'cashier') {
      // التوجيه يتم من LoginComponent بعد التحقق من وجود وردية نشطة
    } else if (role === 'worker') {
      this.router.navigate(['/worker-page']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('employeeId');
    this.userRoleSubject.next(null);
    this.fullNameSubject.next(null);
    // إنهاء حالة الوردية للكاشير (يُستدعى من Navbar إن لزم)
    this.router.navigate(['/login']);
  }
}

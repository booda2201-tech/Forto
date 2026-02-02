import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loginForm = new FormGroup({
      phoneNumber: new FormControl('', [Validators.required, Validators.minLength(10)]),
      password: new FormControl('', [Validators.required, Validators.minLength(1)])
    });
  }

  onSubmit() {
    if (this.loginForm.invalid || this.isSubmitting) return;

    const phoneNumber = (this.loginForm.value.phoneNumber || '').trim();
    const password = (this.loginForm.value.password || '').trim();

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.login(phoneNumber, password).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        this.authService.setUser({
          token: data.token ?? '',
          role: data.role ?? 'worker',
          fullName: data.fullName ?? '',
          employeeId: Number(data.employeeId ?? 0)
        });
        this.isSubmitting = false;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message ?? 'رقم الهاتف أو كلمة المرور غير صحيحة';
      }
    });
  }
}





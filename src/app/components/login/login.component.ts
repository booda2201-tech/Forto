import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  constructor(private authService: AuthService, private router: Router) {}
  ngOnInit() {
    this.loginForm = new FormGroup({
      userData: new FormControl('', [Validators.required, Validators.minLength(3)]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)])
    });
  }


onSubmit() {
  if (this.loginForm.valid) {
    const email = this.loginForm.value.userData || '';
    let roleName: string;

    if (email.includes('admin')) {
      roleName = 'admin';
    } else if (email.includes('cashier')) {
      roleName = 'cashier';
    } else {
      roleName = 'worker';
    }

    this.authService.login(roleName);
  }
}
  isButtonDisabled(): boolean {
    return this.loginForm.invalid;
  }
}





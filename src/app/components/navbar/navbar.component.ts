import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  isMenuOpen = false;
  userRole$: Observable<string | null>;
  data: any;



  constructor(private authService: AuthService, private router: Router) {
    this.userRole$ = this.authService.userRole$;
  }

  ngOnInit(): void {}

  getRoleDisplayName(role: string | null): string {
    if (!role) return 'زائر';
    if (role === 'admin') return 'أحمد';
    if (role === 'cashier') return 'محمد';
    if (role === 'worker') return 'على';
    return 'زائر';
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  getLogoRoute(): string {

    const role = localStorage.getItem('userRole');
    if (role === 'admin') return '/admin/services';
    if (role === 'cashier') return '/cashier/reservations';
    if (role === 'worker') return '/worker-page';
    return '/login';
  }



  logout() {
    this.authService.logout();
  }


  carRequests = [
    {
      id: 1,
      customerName: 'أحمد محمد',
      phone: '+966 50 123 4567',
      carModel: 'تويوتا كامري 2022',
      plateNumber: 'أ ب ج 1234',
      service: 'غسيل فاخر + تلميع',
      date: 'الخميس، 8 يناير 2026',
      time: '10:00 ص',
      price: 150,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 2,
      customerName: 'سارة أحمد',
      phone: '+966 55 987 6543',
      carModel: 'هوندا أكورد 2021',
      plateNumber: 'د هـ و 5678',
      service: 'غسيل عادي',
      date: 'الخميس، 8 يناير 2026',
      time: '11:30 ص',
      price: 80,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 3,
      customerName: 'خالد مختار',
      phone: '+966 54 000 1111',
      carModel: 'بيجو 508 2025',
      plateNumber: 'ر ع د  9999',
      service: 'تلميع ساطع',
      date: 'الخميس، 8 يناير 2026',
      time: '01:00 م',
      price: 200,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 4,
      customerName: 'فهد العتيبي',
      phone: '+966 54 586 1111',
      carModel: 'تويوتا لاند كلوزر 2023',
      plateNumber: 'ف ة د 5555',
      service: 'تلميع ساطع',
      date: 'الخميس، 8 يناير 2026',
      time: '01:00 م',
      price: 500,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 5,
      customerName: 'عصام الشوالي',
      phone: '+962 54 654 1111',
      carModel: 'BMW X6 2025',
      plateNumber: 'ح ط ي 6666',
      service: 'تلميع ساطع',
      date: 'الخميس، 8 يناير 2026',
      time: '01:00 م',
      price: 400,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 6,
      customerName: 'حفيظ درااجي',
      phone: '+966 54 235 1111',
      carModel: 'G Class 2024',
      plateNumber: 'ب ط ل 2222',
      service: 'تلميع ساطع',
      date: 'الخميس، 8 يناير 2026',
      time: '01:00 م',
      price: 300,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 7,
      customerName: 'فارس عوض',
      phone: '+966 54 852 1111',
      carModel: 'نيسان باترول 2023',
      plateNumber: 'أ س د 7777',
      service: 'تلميع ساطع',
      date: 'الخميس، 8 يناير 2026',
      time: '01:00 م',
      price: 200,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    }
  ];


}

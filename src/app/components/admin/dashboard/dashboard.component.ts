// import { Component, OnInit } from '@angular/core';





// interface DashboardStats {
//   totalRevenue: number;
//   activeCount: number;
//   waitingCount: number;
//   completedCount: number;
// }



// @Component({
//   selector: 'app-dashboard',
//   templateUrl: './dashboard.component.html',
//   styleUrls: ['./dashboard.component.scss']
// })
// export class DashboardComponent implements OnInit {


//   staffPerformance = [
//     { name: 'أحمد محمد', completedCount: 8, isBusy: true },
//     { name: 'ادهم الشرقاوي', completedCount: 5, isBusy: false },
//     { name: 'محمود كهربا', completedCount: 12, isBusy: true },
//     { name: 'تامر حسني', completedCount: 3, isBusy: false }
//   ];

//   constructor() { }

//   ngOnInit(): void {

//   }
// }



import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  stats = {
    totalRevenue: 1539,
    activeCount: 3,
    waitingCount: 10,
    completedCount: 25
  };

  staffPerformance = [
    { name: 'أحمد محمد', completedCount: 8, isBusy: true },
    { name: 'أدهم الشرقاوي', completedCount: 5, isBusy: false },
    { name: 'محمود كهربا', completedCount: 10, isBusy: true },
    { name: 'تامر حسني', completedCount: 3, isBusy: false },
    { name: 'سيد رجب', completedCount: 7, isBusy: true },
    { name: 'إبراهيم حسن', completedCount: 0, isBusy: false }
  ];

  topServices = [
    { name: 'غسيل خارجي نانو', count: 45, color: '#ff9800' },
    { name: 'تلميع صالون كامل', count: 20, color: '#2196f3' },
    { name: 'غسيل محرك بخار', count: 12, color: '#4caf50' }
  ];

  constructor() { }

  ngOnInit(): void {
  }
}

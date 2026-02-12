import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';
import { CashierShiftGuard } from './guards/cashier-shift.guard';

import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/admin/home/home.component';
import { CashierPageComponent } from './components/cashier/cashier-page/cashier-page.component';
import { WorkerPageComponent } from './components/worker/worker-page/worker-page.component';
import { RequestsComponent } from './components/admin/requests/requests.component';
import { OrderInformationComponent } from './components/cashier/order-information/order-information.component';
import { AddClientComponent } from './components/cashier/add-client/add-client.component';
import { ReservationsComponent } from './components/cashier/reservations/reservations.component';
import { CustomersComponent } from './components/cashier/customers/customers.component';
import { ServicesComponent } from './components/admin/services/services.component';
import { InvoicesComponent } from './components/cashier/invoices/invoices.component';
import { NewReservationComponent } from './components/cashier/new-reservation/new-reservation.component';
import { MessagesComponent } from './components/cashier/messages/messages.component';
import { ProductsComponent } from './components/admin/products/products.component';
import { WorkersComponent } from './components/admin/workers/workers.component';
import { PaymentPointComponent } from './components/cashier/payment-point/payment-point.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { MaterialsComponent } from './components/admin/materials/materials.component';
import { ShiftsComponent } from './components/admin/shifts/shifts.component';
import { EmployeesReportComponent } from './components/admin/employees-report/employees-report.component';
import { TestComponent } from './components/cashier/test/test.component';
import { StartShiftComponent } from './components/cashier/start-shift/start-shift.component';
import { CategoriesComponent } from './components/admin/categories/categories.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent, data: { title: 'تسجيل الدخول' } },
  {
    path: 'admin',
    component: HomeComponent,
    canActivate: [RoleGuard],
    data: { title: 'لوحة الأدمن', expectedRole: 'admin' },
    children: [
      { path: 'products', component: ProductsComponent, data: { title: 'المنتجات' } },
      { path: 'workers', component: WorkersComponent, data: { title: 'العمال' } },
      { path: 'requests', component: RequestsComponent, data: { title: 'الطلبات' } },
      { path: 'services', component: ServicesComponent, data: { title: 'الخدمات' } },
      { path: 'categories', component: CategoriesComponent, data: { title: 'الفئات' } },
      { path: 'materials', component: MaterialsComponent, data: { title: 'المواد' } },
      { path: 'shifts', component: ShiftsComponent, data: { title: 'الشيفتات' } },
      { path: 'dashboard', component: DashboardComponent, data: { title: 'لوحة التحكم' } },
      { path: 'employees-report', component: EmployeesReportComponent, data: { title: 'تقرير الموظفين' } },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  {
    path: 'cashier',
    component: CashierPageComponent,
    canActivate: [RoleGuard],
    data: { title: 'الكاشير', expectedRole: 'cashier' },
    children: [
      { path: 'start-shift', component: StartShiftComponent, data: { title: 'بدء الوردية' } },
      { path: 'order-info', component: OrderInformationComponent, canActivate: [CashierShiftGuard], data: { title: 'معلومات الطلب' } },
      { path: 'pay-point', component: PaymentPointComponent, canActivate: [CashierShiftGuard], data: { title: 'نقطة الدفع' } },
      { path: 'add-client', component: AddClientComponent, canActivate: [CashierShiftGuard], data: { title: 'إضافة عميل' } },
      { path: 'reservations', component: ReservationsComponent, canActivate: [CashierShiftGuard], data: { title: 'الحجوزات' } },
      { path: 'customers', component: CustomersComponent, canActivate: [CashierShiftGuard], data: { title: 'العملاء' } },
      { path: 'new-reservation', component: NewReservationComponent, canActivate: [CashierShiftGuard], data: { title: 'حجز جديد' } },
      { path: 'invoices', component: InvoicesComponent, canActivate: [CashierShiftGuard], data: { title: 'الفواتير' } },
      { path: 'messages', component: MessagesComponent, canActivate: [CashierShiftGuard], data: { title: 'الرسائل' } },
      { path: 'test', component: TestComponent, canActivate: [CashierShiftGuard], data: { title: 'اختبار' } },
      { path: '', redirectTo: 'reservations', pathMatch: 'full' },
    ],
  },

  { path: 'worker-page', component: WorkerPageComponent, canActivate: [RoleGuard], data: { title: 'مهام العامل', expectedRole: 'worker' } },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

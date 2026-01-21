import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';

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

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    component: HomeComponent,
    children: [
      { path: 'products', component: ProductsComponent },
      { path: 'workers', component: WorkersComponent },
      { path: 'requests', component: RequestsComponent },
      { path: 'services', component: ServicesComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  {
    path: 'cashier',
    component: CashierPageComponent,
    children: [
      { path: 'order-info', component: OrderInformationComponent },
      { path: 'pay-point', component: PaymentPointComponent },
      { path: 'add-client', component: AddClientComponent },
      { path: 'reservations', component: ReservationsComponent },
      { path: 'customers', component: CustomersComponent },
      { path: 'new-reservation', component: NewReservationComponent },
      { path: 'invoices', component: InvoicesComponent },
      { path: 'messages', component: MessagesComponent },
      { path: '', redirectTo: 'cashier', pathMatch: 'full' },
    ],
  },

  { path: 'worker-page', component: WorkerPageComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';

import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/admin/home/home.component';
import { CreateOrderComponent } from './components/admin/create-order/create-order.component';
import { CashierPageComponent } from './components/cashier/cashier-page/cashier-page.component';
import { WorkerPageComponent } from './components/worker/worker-page/worker-page.component';
import { RequestsComponent } from './components/admin/requests/requests.component';
import { OrderInformationComponent } from './components/cashier/order-information/order-information.component';
import { AddClientComponent } from './components/cashier/add-client/add-client.component';
import { ReservationsComponent } from './components/cashier/reservations/reservations.component';
import { CustomersComponent } from './components/cashier/customers/customers.component';
import { ServicesComponent } from './components/cashier/services/services.component';


const routes: Routes = [
  { path: 'login', component: LoginComponent },
{
    path: 'admin',
    canActivate: [RoleGuard],
    data: { expectedRole: 'admin' },
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'requests', component: RequestsComponent },
      { path: 'create-order', component: CreateOrderComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },


{
  path: 'cashier',
  component: CashierPageComponent,
  children: [
    { path: 'order-info', component: OrderInformationComponent },
    { path: 'add-client', component: AddClientComponent },
    { path: 'reservations', component: ReservationsComponent },
    { path: 'customers', component: CustomersComponent },
    { path: 'services', component: ServicesComponent },
    { path: '', redirectTo: 'customers', pathMatch: 'full' }
  ]
},


  { path: 'worker-page', component: WorkerPageComponent },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})


export class AppRoutingModule { }

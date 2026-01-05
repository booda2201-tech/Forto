import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { CreateOrderComponent } from './components/create-order/create-order.component';
import { CarWashComponent } from './components/car-wash/car-wash.component';
import { LoginComponent } from './components/login/login.component';
import { ConformOrderComponent } from './components/conform-order/conform-order.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  // { path: 'create-order', component: CreateOrderComponent },
  { path: 'car-wash', component: CarWashComponent },
  { path: 'login', component: LoginComponent },
  { path: 'conform-order', component: ConformOrderComponent },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';


import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HomeComponent } from './components/admin/home/home.component';
import { CreateOrderComponent } from './components/admin/create-order/create-order.component';
import { LoginComponent } from './components/login/login.component';
import { RequestsComponent } from './components/admin/requests/requests.component';
import { OrderInformationComponent } from './components/cashier/order-information/order-information.component';
import { WorkerPageComponent } from './components/worker/worker-page/worker-page.component';
import { CashierPageComponent } from './components/cashier/cashier-page/cashier-page.component';
import { AddClientComponent } from './components/cashier/add-client/add-client.component';
import { ReservationsComponent } from './components/cashier/reservations/reservations.component';
import { FilterStatusPipe } from './pipes/filter-status.pipe';
import { CustomersComponent } from './components/cashier/customers/customers.component';
import { ServicesComponent } from './components/cashier/services/services.component';
import { InvoicesComponent } from './components/cashier/invoices/invoices.component';
import { NewReservationComponent } from './components/cashier/new-reservation/new-reservation.component';
import { MessagesComponent } from './components/cashier/messages/messages.component';
import { NotificationService } from './services/notification.service';



@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    HomeComponent,
    CreateOrderComponent,
    LoginComponent,
    RequestsComponent,
    OrderInformationComponent,
    WorkerPageComponent,
    CashierPageComponent,
    CustomersComponent,
    ServicesComponent,
    NewReservationComponent,
    MessagesComponent,






  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot(),
    CommonModule,
    FormsModule,
    NgbModule
  ],
  providers: [
    NotificationService,
    provideAnimations(),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-left',
      preventDuplicates: true,
    }),
  ],


  bootstrap: [AppComponent]
})

export class AppModule { }

import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators} from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceCatalogService, ServiceItem } from 'src/app/services/service-catalog.service';
import { ToastrService } from 'ngx-toastr';



@Component({
  selector: 'app-new-reservation',
  templateUrl: './new-reservation.component.html',
  styleUrls: ['./new-reservation.component.scss']
})
export class NewReservationComponent implements OnInit{

  services: ServiceItem[] = [];
  selectedServices: ServiceItem[] = [];
  totalPrice: number = 0;


  customerForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required]),
    carType: new FormControl('', [Validators.required]),
    carNumber: new FormControl('', [Validators.required]),
    appointmentDate: new FormControl('', [Validators.required]),
    appointmentTime: new FormControl('', [Validators.required])
  });

constructor(private serviceCatalog: ServiceCatalogService, private router: Router, private toastr: ToastrService) {}

  ngOnInit(): void {

    this.serviceCatalog.getServices().subscribe(res => {
      this.services = res;
    });
  }


  toggleService(service: ServiceItem, event: any) {
    if (event.target.checked) {
      this.selectedServices.push(service);
    } else {
      this.selectedServices = this.selectedServices.filter(s => s.id !== service.id);
    }
    this.calculateTotal();
  }

  calculateTotal() {
    this.totalPrice = this.selectedServices.reduce((sum, s) => sum + s.price, 0);
  }

  onSubmit() {
    if (this.customerForm.valid && this.selectedServices.length > 0) {
      const formValue = this.customerForm.value;
      const customerData = {
        ...formValue,
        serviceItem: this.selectedServices,
        totalAmount: this.totalPrice
      };

      this.serviceCatalog.addCustomer(customerData);
      this.toastr.success('تم إضافة الحجز بنجاح!', 'عملية ناجحة');
      this.router.navigate(['/cashier/cashier-page']);
    } else if (this.selectedServices.length === 0) {
      this.toastr.warning('يرجى اختيار خدمة واحدة على الأقل', 'تنبيه');
    } else {
      this.toastr.error('يرجى التأكد من البيانات المدخلة', 'خطأ');
    }
  }


  isServiceSelected(service: ServiceItem): boolean {
  return this.selectedServices.some(s => s.id === service.id);
}

// toggleService(service: ServiceItem) {
//   const index = this.selectedServices.findIndex(s => s.id === service.id);
//   if (index === -1) {
//     this.selectedServices.push(service);
//   } else {
//     this.selectedServices.splice(index, 1);
//   }

//   this.orderForm.patchValue({
//     services: this.selectedServices.length > 0 ? this.selectedServices : []
//   });

//   this.orderForm.get('services')?.updateValueAndValidity();
//   if (this.selectedServices.length === 0) {
//     this.selectedTimeId = '';
//   }
// }


}

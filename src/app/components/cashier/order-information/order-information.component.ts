import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ServiceCatalogService , ServiceItem} from 'src/app/services/service-catalog.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-order-information',
  templateUrl: './order-information.component.html',
  styleUrls: ['./order-information.component.scss']
})
export class OrderInformationComponent {

  selectedTimeId: string = '';

orderForm: FormGroup = new FormGroup({
  fullName: new FormControl('', [Validators.required]),
  phone: new FormControl('', [Validators.required]),
  carNumber: new FormControl('', [Validators.required]),
  carType: new FormControl('', [Validators.required]),
  paymentMethodId: new FormControl('1', [Validators.required]),

  services: new FormControl([], [Validators.required, Validators.minLength(1)]),
  code: new FormControl('')
});


allServices: ServiceItem[] = [];
selectedServices: ServiceItem[] = [];
selectedService: ServiceItem | null = null;
availableTimes: string[] = ['10:00 AM', '11:30 AM', '01:00 PM', '03:00 PM'];

constructor(private serviceCatalog: ServiceCatalogService) {

  this.serviceCatalog.getServices().subscribe(services => {
    this.allServices = services;
  });
}


toggleService(service: ServiceItem) {
  const index = this.selectedServices.findIndex(s => s.id === service.id);
  if (index === -1) {
    this.selectedServices.push(service);
  } else {
    this.selectedServices.splice(index, 1);
  }

  this.orderForm.patchValue({
    services: this.selectedServices.length > 0 ? this.selectedServices : []
  });

  this.orderForm.get('services')?.updateValueAndValidity();
  if (this.selectedServices.length === 0) {
    this.selectedTimeId = '';
  }
}

isServiceSelected(serviceId: number): boolean {
  return this.selectedServices.some(s => s.id === serviceId);
}




onServiceSelected() {
  if (this.selectedService) {

    this.orderForm.patchValue({
      service: this.selectedService
    });
    this.selectedTimeId = '';
  }
}
  selectTime(id: string) {
    this.selectedTimeId = id;
  }

  onSubmit() {
    if (this.orderForm.valid && this.selectedTimeId) {
      const finalData = {
        ...this.orderForm.value,
        selectedTime: this.selectedTimeId
      };
      console.log('بيانات الطلب:', finalData);
    }
  }


  isButtonDisabled(): boolean {
    return this.orderForm.invalid || this.selectedTimeId === '';
  }



}

import { Component, OnInit } from '@angular/core';
import { ServiceCatalogService , Customer, ServiceItem} from 'src/app/services/service-catalog.service';
import { tap, map } from 'rxjs/operators';




@Component({
  selector: 'app-customers',
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss']
})
export class CustomersComponent implements OnInit {

  carRequests: any[] = [];
  filteredCarRequests: any[] = [];
  allServices: ServiceItem[] = [];
  selectedService: ServiceItem | null = null;
  availableTimes: string[] = [];
  selectedCar: any = null;
  newCarData = { carModel: '', plateNumber: '' };
  currentCustomer: any = null;
  isMenuOpen: boolean = false;
  tempTotal: number = 0;
  tempAppointmentTime: string | null = null;





  constructor(private serviceCatalog: ServiceCatalogService) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }


ngOnInit() {
    this.serviceCatalog.getServices().subscribe(services => this.allServices = services);

    this.serviceCatalog.getCustomers().subscribe((customers: Customer[]) => {
      this.carRequests = customers.map(c => ({
        id: c.id,
        customerName: c.customerName,
        phone: c.phone,
        cars: c.cars || [],
        status: 'waiting',
        statusText: 'قيد الانتظار'
      }));

      this.filteredCarRequests = [...this.carRequests];
    });
  }


onSearchChange(event: any) {
  const term = event.target.value.trim().toLowerCase();

  if (!term) {
    this.filteredCarRequests = [...this.carRequests];
  } else {
    this.filteredCarRequests = this.carRequests.filter(c => {

      const matchPhone = c.phone.includes(term);


      const matchName = c.customerName.toLowerCase().includes(term);


      const matchPlate = c.cars && c.cars.some((car: any) =>
        car.plateNumber.toLowerCase().includes(term)
      );

      return matchPhone || matchName || matchPlate;
    });
  }
}



selectCar(carDetail: any, customer: any) {
  this.selectedCar = carDetail;
  this.currentCustomer = customer;
  this.tempAppointmentTime = null;
  this.tempTotal = 0;


  this.allServices.forEach(s => s.selected = false);


  this.availableTimes = ['10:00 AM', '11:30 AM', '01:00 PM', '03:00 PM'];
}
hasSelectedServices(): boolean {
  return this.allServices.some(s => s.selected);
}


calculateTempTotal() {
  this.tempTotal = this.allServices
    .filter(s => s.selected)
    .reduce((sum, s) => sum + s.price, 0);
}


confirmBooking() {
  const selectedServices = this.allServices.filter(s => s.selected);

  const bookingData = {
    name: this.currentCustomer.customerName,
    phone: this.currentCustomer.phone,
    carType: this.selectedCar.carModel,
    carNumber: this.selectedCar.plateNumber,
    totalAmount: this.tempTotal,
    serviceItem: selectedServices,
    appointmentTime: this.tempAppointmentTime,
    appointmentDate: new Date().toISOString().split('T')[0]
  };


  this.serviceCatalog.addCustomer(bookingData);


  alert('تم إضافة الحجز بنجاح!');
  location.reload();
}












addNewCarToCustomer(car: any) {
  console.log('إضافة سيارة جديدة للعميل:', car.customerName);
}



finishCar(car: any) {
    if (confirm('هل تريد إنهاء الطلب وحذفه؟')) {
      this.serviceCatalog.deleteCustomer(car.id);
    }
  }


saveChanges() {
    if (this.selectedCar && this.selectedService) {
      console.log('تم تأكيد الحجز:', {
        car: this.selectedCar.carModel,
        service: this.selectedService.name,
        time: this.selectedCar.selectedTime
      });

    }
  }



prepareNewCar(customer: any) {
  this.currentCustomer = customer;
  this.newCarData = { carModel: '', plateNumber: '' };
}


confirmAddNewCar() {
  if (this.newCarData.carModel && this.newCarData.plateNumber) {
    const newCar = {
      carid: Date.now(),
      carModel: this.newCarData.carModel,
      plateNumber: this.newCarData.plateNumber,
    };


    const customer = this.carRequests.find(c => c.id === this.currentCustomer.id);
    if (customer) {
      if (!customer.cars) { customer.cars = []; }
      customer.cars.push(newCar);
    }

    this.filteredCarRequests = [...this.carRequests];
    this.newCarData = { carModel: '', plateNumber: '' };
  }
}

deleteCarFromCustomer(customer: any, carIndex: number) {
  if (confirm(`هل أنت متأكد من حذف سيارة ${customer.cars[carIndex].carModel}؟`)) {

    customer.cars.splice(carIndex, 1);
    this.filteredCarRequests = [...this.carRequests];
    console.log('تم حذف السيارة بنجاح');
  }
}

onServiceSelected() {
  if (this.selectedService) {


    this.availableTimes = ['10:00 AM', '11:30 AM', '01:00 PM', '03:00 PM'];
    this.selectedCar.selectedTime = null;
  }
}


}

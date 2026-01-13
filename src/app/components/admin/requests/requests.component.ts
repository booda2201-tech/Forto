import { Component } from '@angular/core';

@Component({
  selector: 'app-requests',
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.scss']
})
export class RequestsComponent {



  carRequests = [
    { id: 1, name: 'عبدالرحمن', carType: 'BMW', service: 'غسيل اكسسوارت', carNumber: 'ق ع ص : 321', price: 150, staff: ['موظف 1', 'موظف 2'] },
    { id: 2, name: 'أحمد', carType: 'Mercedes', service: 'تلميع داخلي', carNumber: 'ر ع د : 496', price: 300, staff: ['موظف 3', 'موظف 4'] }
  ];

  selectedCar: any = null;

  selectCar(car: any) {
    this.selectedCar = car;
  }
}



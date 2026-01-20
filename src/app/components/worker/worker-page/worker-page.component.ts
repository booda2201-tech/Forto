import { Component } from '@angular/core';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-worker-page',
  templateUrl: './worker-page.component.html',
  styleUrls: ['./worker-page.component.scss']
})
export class WorkerPageComponent {
  selectedCar: any = null;
  isMenuOpen = false;
  userRole: number = 0;
  currentWorkerName: string = ' محمد رمضان ';



  constructor(private notificationService: NotificationService) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  carRequests = [
    {
      id: 1,
      customerName: 'أحمد محمد',
      phone: '+966 50 123 4567',
      carModel: 'تويوتا كامري 2022',
      plateNumber: 'أ ب ج 1234',
      service: 'غسيل فاخر + تلميع',
      date: 'الخميس، 8 يناير 2026',
      time: '10:00 ص',
      price: 150,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 2,
      customerName: 'سارة أحمد',
      phone: '+966 55 987 6543',
      carModel: 'هوندا أكورد 2021',
      plateNumber: 'د هـ و 5678',
      service: 'غسيل عادي',
      date: 'الخميس، 8 يناير 2026',
      time: '11:30 ص',
      price: 80,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 3,
      customerName: 'خالد مختار',
      phone: '+966 54 000 1111',
      carModel: 'بيجو 508 2025',
      plateNumber: 'ر ع د  9999',
      service: 'تلميع ساطع',
      date: 'الخميس، 8 يناير 2026',
      time: '01:00 م',
      price: 200,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 4,
      customerName: 'فهد العتيبي',
      phone: '+966 54 586 1111',
      carModel: 'تويوتا لاند كلوزر 2023',
      plateNumber: 'ف ة د 5555',
      service: 'تلميع ساطع',
      date: 'الخميس، 8 يناير 2026',
      time: '01:00 م',
      price: 500,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 5,
      customerName: 'عصام الشوالي',
      phone: '+962 54 654 1111',
      carModel: 'BMW X6 2025',
      plateNumber: 'ح ط ي 6666',
      service: 'تلميع ساطع',
      date: 'الخميس، 8 يناير 2026',
      time: '01:00 م',
      price: 400,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 6,
      customerName: 'حفيظ درااجي',
      phone: '+966 54 235 1111',
      carModel: 'G Class 2024',
      plateNumber: 'ب ط ل 2222',
      service: 'تلميع ساطع',
      date: 'الخميس، 8 يناير 2026',
      time: '01:00 م',
      price: 300,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    },
    {
      id: 7,
      customerName: 'فارس عوض',
      phone: '+966 54 852 1111',
      carModel: 'نيسان باترول 2023',
      plateNumber: 'أ س د 7777',
      service: 'تلميع ساطع',
      date: 'الخميس، 8 يناير 2026',
      time: '01:00 م',
      price: 200,
      status: 'waiting',
      statusText: 'قيد الانتظار'
    }
  ];

  selectCar(car: any) {
    this.selectedCar = car;
  }

startExecution(car: any) {
    car.status = 'in-progress';
    car.statusText = 'نشط';

    this.notificationService.addMessage({
      id: Date.now(),
      workerName: this.currentWorkerName,
      type: 'start',
      content: `بدأ العمل الآن على سيارة ${car.carModel} (لوحة: ${car.plateNumber})`,
      time: new Date()
    });
}


finishCar(car: any) {
    this.notificationService.addMessage({
      id: Date.now(),
      workerName: this.currentWorkerName,
      type: 'end',
      content: `تم الانتهاء من السيارة ${car.carModel} وهي جاهزة للاستلام`,
      time: new Date()
    });

    this.carRequests = this.carRequests.filter(item => item.id !== car.id);
    this.selectedCar = null;
}


saveChanges() {
    if (this.selectedCar) {

      this.notificationService.addMessage({
        id: Date.now(),
        workerName: this.currentWorkerName,
        type: 'edit_request',
        content: `طلب تعديل: استخدم ${this.selectedCar.soapCount || 0}جم صابون و ${this.selectedCar.perfumeCount || 0} لتر معطر للحجز #${this.selectedCar.id}`,
        time: new Date()
      });
      console.log('تم إرسال طلب التعديل للكاشير');
    }
  }
}





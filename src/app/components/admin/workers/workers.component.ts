import { Component, OnInit } from '@angular/core';
import { ServiceCatalogService, Worker } from 'src/app/services/service-catalog.service';


@Component({
  selector: 'app-workers',
  templateUrl: './workers.component.html',
  styleUrls: ['./workers.component.scss']
})
export class WorkersComponent implements OnInit {
  workers: Worker[] = [];
  selectedWorker: any = { name: '', phone: '' , age: 0  , monthlySalary: 0 };

  constructor(private service: ServiceCatalogService) {}

  ngOnInit(): void {
    this.loadWorkers();
  }

  loadWorkers() {
    this.service.getWorkers().subscribe(data => {
      this.workers = data;
    });
  }


  saveWorker(nameInp: any, phoneInp: any, ageInp: any, monthlyInp: any) {
    if (nameInp.value && phoneInp.value && monthlyInp.value) {
      const newWorker: Worker = {
      id: Date.now(),
      name: nameInp.value,
      phone: phoneInp.value,
      age: Number(ageInp.value) || 0,
      monthlySalary: Number(monthlyInp.value)
    };

    this.service.addWorkerDetail(newWorker);
    this.loadWorkers();


    nameInp.value = '';
    phoneInp.value = '';
    ageInp.value = '';
    monthlyInp.value = '';

    alert('تم إضافة العامل بنجاح للقائمة');
  } else {
    alert('يرجى ملء الحقول الأساسية (الاسم، الهاتف، الراتب)');
  }
}

  deleteWorker(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا العامل؟')) {
      this.service.deleteWorker(id);
      this.loadWorkers();
    }
  }


    openEditModal(work: any) {
    this.selectedWorker = { ...work };
  }



saveWorkerChanges() {
  const index = this.workers.findIndex(p => p.id === this.selectedWorker.id);
  if (index !== -1) {


    this.workers[index] = { ...this.selectedWorker };
    alert('تم تحديث بيانات العامل بنجاح');
  }
}


}

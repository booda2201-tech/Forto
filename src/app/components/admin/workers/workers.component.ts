import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

type EmployeeUi = {
  id: number;
  name: string;
  age: number;
  phoneNumber: string;
  isActive: boolean;
  role: number; // 1 worker, 2 cashier

  // UI-only
  monthlySalary?: number;
};

@Component({
  selector: 'app-workers',
  templateUrl: './workers.component.html',
  styleUrls: ['./workers.component.scss'],
})
export class WorkersComponent implements OnInit {
  workers: EmployeeUi[] = [];

  // edit modal model
  selectedWorker: EmployeeUi = {
    id: 0,
    name: '',
    phoneNumber: '',
    age: 0,
    isActive: true,
    role: 1,
    monthlySalary: 0
  };

  // create form model (create-user)
  newWorker = {
    name: '',
    phoneNumber: '',
    age: 0,
    monthlySalary: 0, // UI-only
    password: '',
    role: 1
  };

  roles = [
    { id: 1, label: 'Worker' },
    { id: 2, label: 'Cashier' }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadWorkers();
  }

  loadWorkers() {
    this.api.getEmployees().subscribe({
      next: (res: any) => {
        const data = res?.data ?? [];
        this.workers = data.map((e: any) => ({
          id: e.id,
          name: e.name,
          age: Number(e.age ?? 0),
          phoneNumber: e.phoneNumber ?? '',
          isActive: !!e.isActive,
          role: Number(e.role ?? 1),
          monthlySalary: 0 // UI-only
        }));
      },
      error: (err) => {
        console.error(err);
        alert('فشل تحميل العمال');
      }
    });
  }

// ---------- CREATE (POST create-user) ----------
saveWorker() {
  const name = (this.newWorker.name || '').trim();
  const phone = (this.newWorker.phoneNumber || '').trim();
  const age = Number(this.newWorker.age ?? 0);
  const password = String(this.newWorker.password || '').trim();

  // 👇 هنا التحويل المهم
  const role =
    this.newWorker.role === 2 ? 'Cashier' : 'Worker';

  if (!name || !phone || !password) {
    alert('يرجى ملء الحقول الأساسية (الاسم، الهاتف، كلمة المرور)');
    return;
  }

  const payload = {
    name,
    age,
    phoneNumber: phone,
    password,
    role // 👈 string دلوقتي
  };

  this.api.createEmployeeUser(payload).subscribe({
    next: (res) => {
      console.log(res);
      console.log(payload);
      
      alert('تم إضافة العامل بنجاح');
      this.loadWorkers();

      // reset
      this.newWorker = {
        name: '',
        phoneNumber: '',
        age: 0,
        monthlySalary: 0,
        password: '',
        role: 1
      };
    },
    error: (err) => {
      console.log(payload);
      
      console.error(err);
      alert(err?.error?.message || 'فشل إضافة العامل');
    }
  });
}


  // ---------- DELETE ----------
  deleteWorker(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا العامل؟')) return;

    this.api.deleteEmployee(id).subscribe({
      next: () => {
        alert('تم حذف العامل');
        this.loadWorkers();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل حذف العامل');
      }
    });
  }

  // ---------- EDIT ----------
  openEditModal(work: EmployeeUi) {
    this.selectedWorker = { ...work };
  }

  saveWorkerChanges() {
    if (!this.selectedWorker?.id) return;

    const payload = {
      name: (this.selectedWorker.name || '').trim(),
      phoneNumber: (this.selectedWorker.phoneNumber || '').trim(),
      age: Number(this.selectedWorker.age ?? 0),
      isActive: !!this.selectedWorker.isActive,
      role: Number(this.selectedWorker.role ?? 1)
    };

    this.api.updateEmployee(this.selectedWorker.id, payload).subscribe({
      next: () => {
        alert('تم تحديث بيانات العامل بنجاح');
        this.loadWorkers();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل تحديث العامل');
      }
    });
  }

  // optional display
  roleLabel(role: number): string {
    return role === 2 ? 'Cashier' : 'Worker';
  }
}

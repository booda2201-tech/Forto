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
  // ===== Assign services state =====
  assignEmployeeId: number | null = null;
  allServices: any[] = [];
  selectedServiceIds: number[] = [];
  isLoadingServices = false;
  isSavingServices = false;

  // edit modal model
  selectedWorker: EmployeeUi = {
    id: 0,
    name: '',
    phoneNumber: '',
    age: 0,
    isActive: true,
    role: 1,
    monthlySalary: 0,
  };

  // create form model (create-user)
  newWorker = {
    name: '',
    phoneNumber: '',
    age: 0,
    monthlySalary: 0, // UI-only
    password: '',
    role: 1,
  };

  roles = [
    { id: 1, label: 'Worker' },
    { id: 2, label: 'Cashier' },
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
          monthlySalary: 0, // UI-only
        }));
      },
      error: (err) => {
        console.error(err);
        alert('فشل تحميل العمال');
      },
    });
  }

  // ---------- CREATE (POST create-user) ----------
  saveWorker() {
    const name = (this.newWorker.name || '').trim();
    const phone = (this.newWorker.phoneNumber || '').trim();
    const age = Number(this.newWorker.age ?? 0);
    const password = String(this.newWorker.password || '').trim();

    // 👇 هنا التحويل المهم
    const role = this.newWorker.role === 2 ? 'Cashier' : 'Worker';

    if (!name || !phone || !password) {
      alert('يرجى ملء الحقول الأساسية (الاسم، الهاتف، كلمة المرور)');
      return;
    }

    const payload = {
      name,
      age,
      phoneNumber: phone,
      password,
      role, // 👈 string دلوقتي
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
          role: 1,
        };
      },
      error: (err) => {
        console.log(payload);

        console.error(err);
        alert(err?.error?.message || 'فشل إضافة العامل');
      },
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
      },
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
      role: Number(this.selectedWorker.role ?? 1),
    };

    this.api.updateEmployee(this.selectedWorker.id, payload).subscribe({
      next: () => {
        alert('تم تحديث بيانات العامل بنجاح');
        this.loadWorkers();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل تحديث العامل');
      },
    });
  }

  // optional display
  roleLabel(role: number): string {
    return role === 2 ? 'Cashier' : 'Worker';
  }

  loadAllCatalogServices(): void {
    if (this.allServices.length > 0) return;

    this.isLoadingServices = true;

    this.api.getCatalogCategories().subscribe({
      next: (res: any) => {
        const categories = (res?.data ?? []).filter((c: any) => c.isActive);

        if (!categories.length) {
          this.allServices = [];
          this.isLoadingServices = false;
          return;
        }

        import('rxjs').then(({ forkJoin, of }) => {
          import('rxjs/operators').then(({ catchError }) => {
            const calls = categories.map((c: any) =>
              this.api
                .getCatalogServices(c.id)
                .pipe(catchError(() => of({ success: false, data: [] }))),
            );

            forkJoin(calls).subscribe({
              next: (results: any) => {
                const merged = results.flatMap((r:any) => r?.data ?? []);

                // unique by id
                const mapById = new Map<number, any>();
                merged.forEach((s: any) => mapById.set(s.id, s));
                this.allServices = Array.from(mapById.values());

                this.isLoadingServices = false;
              },
              error: (err: any) => {
                console.error(err);
                this.isLoadingServices = false;
              },
            });
          });
        });
      },
      error: (err: any) => {
        console.error(err);
        this.isLoadingServices = false;
      },
    });
  }

  openAssignServicesModal(worker: any) {
    this.assignEmployeeId = worker.id;
    this.selectedServiceIds = []; // start empty (until we have GET employee services)

    this.loadAllCatalogServices();

    const el = document.getElementById('assignServicesModal');
    const modal = new (window as any).bootstrap.Modal(el);
    modal.show();
  }

  toggleServiceSelection(serviceId: number, checked: boolean) {
    if (checked) {
      if (!this.selectedServiceIds.includes(serviceId))
        this.selectedServiceIds.push(serviceId);
    } else {
      this.selectedServiceIds = this.selectedServiceIds.filter(
        (id) => id !== serviceId,
      );
    }
  }


  saveAssignedServices() {
  if (!this.assignEmployeeId) return;

  this.isSavingServices = true;

  this.api.updateEmployeeServices(this.assignEmployeeId, this.selectedServiceIds).subscribe({
    next: () => {
      this.isSavingServices = false;
      alert('تم حفظ خدمات العامل بنجاح');

      const el = document.getElementById('assignServicesModal');
      const modal = (window as any).bootstrap.Modal.getInstance(el);
      modal?.hide();
    },
    error: (err: any) => {
      console.error(err);
      this.isSavingServices = false;
      alert(err?.error?.message || 'فشل حفظ خدمات العامل');
    }
  });
}

}

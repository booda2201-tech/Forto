import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-add-client',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-client.component.html',
  styleUrls: ['./add-client.component.scss']
})
export class AddClientComponent {

  // ⚠️ IMPORTANT: Update enum values to match backend
  bodyTypes = [
    { label: 'Sedan', value: 1 },
    { label: 'SUV', value: 4 },
    { label: 'Hatchback', value: 2 },
    { label: 'Coupe', value: 3 },
    { label: 'Pickup', value: 5 },
    { label: 'Van', value: 6 },
  ];

  customerForm = new FormGroup({
    // client
    name: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required, Validators.pattern('^[0-9]+$')]),
    email: new FormControl(''),
    notes: new FormControl(''),

    // car
    bodyType: new FormControl<number | null>(null, [Validators.required]),
    plateNumber: new FormControl('', [Validators.required]),
    brand: new FormControl('', [Validators.required]),
    model: new FormControl(''),
    color: new FormControl(''),
    year: new FormControl<number | null>(null),
    isDefault: new FormControl(true),
  });

  constructor(
    private apiService: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  onSubmit() {
    if (this.customerForm.invalid) {
      this.toastr.error('يرجى التأكد من البيانات المدخلة', 'خطأ');
      return;
    }

    const v = this.customerForm.value;

    const createClientPayload = {
      fullName: (v.name ?? '').trim(),
      phoneNumber: (v.phone ?? '').trim(),
      email: (v.email ?? '').trim() || null,
      notes: (v.notes ?? '').trim() || ''
    };

    const addCarPayload = {
      bodyType: Number(v.bodyType),
      plateNumber: (v.plateNumber ?? '').trim(),
      brand: (v.brand ?? '').trim(),
      model: (v.model ?? '').trim(),
      color: (v.color ?? '').trim(),
      year: v.year ? Number(v.year) : null,
      isDefault: !!v.isDefault
    };

    this.apiService.createClient(createClientPayload).pipe(
      map((res: any) => res?.data?.id), // ✅ from your response
      switchMap((clientId: number) => {
        if (!clientId) throw new Error('ClientId not found');
        return this.apiService.addCarToClient(clientId, addCarPayload);
      })
    ).subscribe({
      next: () => {
        this.toastr.success('تم إضافة العميل والعربية بنجاح!', 'عملية ناجحة');
        this.router.navigate(['/cashier/cashier-page']);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'حدث خطأ أثناء الحفظ';
        this.toastr.error(msg, 'خطأ');
        console.error(err);
      }
    });
  }

onlyNumbers(event: any) {
  const pattern = /[0-9]/; // يسمح فقط بالأرقام من 0 إلى 9
  const inputChar = String.fromCharCode(event.charCode);

  if (!pattern.test(inputChar)) {
    // إذا لم يكن المدخل رقماً، يتم إلغاء الحدث ومنع الكتابة
    event.preventDefault();
  }
}










}

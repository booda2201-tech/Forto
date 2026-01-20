import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceCatalogService } from 'src/app/services/service-catalog.service';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';


@Component({
  selector: 'app-add-client',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './add-client.component.html',
  styleUrls: ['./add-client.component.scss']
})
export class AddClientComponent {

  customerForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required, Validators.pattern('^[0-9]+$')]),
    email: new FormControl(''),
    carType: new FormControl('', [Validators.required]),
    carNumber: new FormControl('', [Validators.required]),
    carColor: new FormControl(''),
    carCategory: new FormControl(''),
    carModel: new FormControl('')
  });

//   constructor(private serviceCatalog: ServiceCatalogService,private router: Router,private toastr: ToastrService) {}

// onSubmit() {
//     if (this.customerForm.valid) {
//       const formValue = this.customerForm.value;
//       const customerData = {
//         name: formValue.name,
//         phone: formValue.phone,
//         carNumber: formValue.carNumber,
//         carType: formValue.carType,
//         carCategory: formValue.carCategory,
//         services: []
//       };

//       this.serviceCatalog.addCustomer(customerData);


//       this.toastr.success('تم إضافة العميل بنجاح!', 'عملية ناجحة');

//       this.router.navigate(['/cashier/cashier-page']);
//     } else {

//       this.toastr.error('يرجى التأكد من البيانات المدخلة', 'خطأ');
//     }
//   }

constructor(
    private apiService: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  onSubmit() {
    if (this.customerForm.valid) {
      const customerData = this.customerForm.value;



      this.apiService.createClient(customerData).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('تم إضافة العميل بنجاح!', 'عملية ناجحة');
            this.router.navigate(['/cashier/cashier-page']);
          } else {
            this.toastr.error(response.message || 'فشل إضافة العميل', 'خطأ');
          }
        },
        error: (err) => {
          this.toastr.error('حدث خطأ في الاتصال بالسيرفر', 'خطأ');
          console.error(err);
        }
      });
    } else {
      this.toastr.error('يرجى التأكد من البيانات المدخلة', 'خطأ');
    }
  }



}



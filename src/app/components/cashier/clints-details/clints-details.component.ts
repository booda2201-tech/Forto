import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-clints-details',
  templateUrl: './clints-details.component.html',
  styleUrls: ['./clints-details.component.scss']
})
export class ClintsDetailsComponent implements OnInit {
  customer: any = null;
  vehicles: any[] = [];
  services: any[] = [];
  isLoading = true;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private toastr: ToastrService // أضف هذا السطر هنا
  ) {}

  ngOnInit(): void {
    // 1. الحصول على الـ ID من الـ URL (مثلاً: /clients/1)
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id) {
      this.fetchData(id);
    }
  }


  currentCustomer: any = null; // selected customer from UI
  newCarData = {
    bodyType: 4,
    plateNumber: '',
    brand: '',
    model: '',
    color: '',
    year: null as number | null,
    isDefault: true,
  };
    // ======================
  // Add car flow (optional here)
  // ======================
  prepareNewCar(customer: any) {
    this.currentCustomer = customer;
    this.newCarData = {
      bodyType: 4,
      plateNumber: '',
      brand: '',
      model: '',
      color: '',
      year: null,
      isDefault: true,
    };
  }

  carRequests: any[] = [];
  filteredCarRequests: any[] = [];

  confirmAddNewCar() {
    if (!this.currentCustomer?.id) return;

    if (!this.newCarData.plateNumber || !this.newCarData.brand) {
      this.toastr.error('رقم اللوحة و Brand مطلوبين', 'تنبيه');
      return;
    }

    this.apiService
      .addCarToClient(this.currentCustomer.id, this.newCarData)
      .subscribe({
        next: (res: any) => {
          this.toastr.success('تم إضافة السيارة بنجاح', 'نجاح');

          // If API returns created car in res.data -> update UI
          const createdCar = res?.data;
          if (createdCar) {
            const cust = this.carRequests.find(
              (x) => x.id === this.currentCustomer.id
            );
            if (cust) {
              cust.cars = cust.cars || [];
              cust.cars.push(createdCar);
              this.filteredCarRequests = [...this.carRequests];
            }
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'فشل إضافة السيارة', 'خطأ');
          console.error(err);
        },
      });
  }
  bodyTypes = [
    { label: 'سيدان (Sedan)', value: 1 },
    { label: 'دفع رباعي (SUV)', value: 2 },
    { label: 'هاتشباك (Hatchback)', value: 4 },
    { label: 'كوبيه (Coupe)', value: 3 },
    { label: 'بيك أب (Pickup)', value: 5 },
    { label: 'فان (Van)', value: 6 },
    { label: 'شاحنة (Truck)', value: 7 },
    { label: 'أخرى (Other)', value: 99 }
  ];

fetchData(id: string) {
  this.isLoading = true;
  this.apiService.getClientDetails(Number(id)).subscribe({
    next: (response: any) => {
      if (response && response.data) {
        const apiData = response.data;
        
        this.customer = {
          name: apiData.fullName,
          id: apiData.id,
          phone: apiData.phoneNumber,
          totalVisits: apiData.invoicesCount,
          totalSpent: apiData.totalPaidInInvoices,
          lastVisit: apiData.lastInvoiceDate
        };

        // إضافة فحص الأمان (safe check) للمصفوفات
        this.vehicles = (apiData.cars || []).map((car: any) => ({
          model: car.brand || 'غير محدد',
          plate: car.plateNumber,
          year: car.year || '----',
          color: car.color || 'غير محدد',
          lastService: apiData.lastInvoiceDate ? 'متوفر' : 'لا يوجد'
        }));

        this.services = (apiData.invoices || []).map((inv: any) => ({
          invoiceNo: inv.invoiceNumber,
          date: inv.date,
          price: inv.total,
          status: inv.status === 2 ? 'مكتمل' : 'قيد الانتظار',
          type: (inv.lines && inv.lines.length > 0) ? inv.lines[0].description : 'خدمة غسيل'
        }));
      }
      this.isLoading = false;
    },
    error: (err) => {
      this.isLoading = false;
      this.toastr.error('العميل غير موجود أو حدث خطأ في السيرفر', 'تنبيه');
    }
  });
}

  // الدوال المساعدة اللي عملناها للألوان والأيقونات تفضل موجودة هنا
  getServiceClass(type: string) { /* ... */ }
  getServiceIcon(type: string) { /* ... */ }
}
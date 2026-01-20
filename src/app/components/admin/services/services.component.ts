// import { Component, OnInit } from '@angular/core';
// import { ServiceCatalogService} from 'src/app/services/service-catalog.service';
// import { BehaviorSubject, Observable, of } from 'rxjs';
// import { ServiceCategory } from 'src/app/services/service-catalog.service';



// interface ServiceItem {
//   id: number;
//   name: string;
//   price: number;
//   category: string;
//   selected: boolean;
// }


// declare var bootstrap: any;


// @Component({
//   selector: 'app-services',
//   templateUrl: './services.component.html',
//   styleUrls: ['./services.component.scss']
// })
// export class ServicesComponent  implements OnInit {

//   readonly Category = ServiceCategory;

//   allServices: ServiceItem[] = [];
//   services: ServiceItem[] = [];
//   filteredservicesRequests: any[] = [];
//   activeCategory: ServiceCategory = ServiceCategory.All;
//   selectedService: any = { id: null, name: '', price: 0 };


//   constructor(private serviceCatalog: ServiceCatalogService) {}

//   ngOnInit(): void {
//     this.serviceCatalog.getServices().subscribe(data => {
//       this.allServices = data;
//       this.services = [...this.allServices];
//       this.filterCategory(ServiceCategory.All);
//     });
//   }

//   filterCategory(cat: ServiceCategory) {
//     this.activeCategory = cat;
//     if (cat === ServiceCategory.All) {
//       this.services = [...this.allServices];
//     } else {
//       this.services = this.allServices.filter(s => s.category === cat);
//     }
//   }




//   toggleService(item: ServiceItem) {
//     item.selected = !item.selected;
//   }

//   getTotal(): number {
//     return this.allServices
//       .filter(s => s.selected)
//       .reduce((total, item) => total + item.price, 0);
//   }



// addNewService(nameInput: HTMLInputElement, priceInput: HTMLInputElement, categorySelect: HTMLSelectElement) {
//   const name = nameInput.value;
//   const price = Number(priceInput.value);
//   const category = categorySelect.value as ServiceCategory;

//   if (name && price && category) {
//     const newService: ServiceItem = {
//       id: Date.now(),
//       name: name,
//       price: price,
//       category: category,
//       selected: false
//     };


//     this.allServices.push(newService);
//     this.filterCategory(this.activeCategory);


//     nameInput.value = '';
//     priceInput.value = '';
//     categorySelect.value = '';

//     alert('تمت إضافة الخدمة بنجاح إلى قسم ' + category);
//   } else {
//     alert('يرجى اختيار نوع الخدمة وإدخال الاسم والسعر');
//   }
// }

// editService(item: any) {

//     this.selectedService = { ...item };


//     const modalElement = document.getElementById('editServiceModal');
//     if (modalElement) {
//       const modal = new bootstrap.Modal(modalElement);
//       modal.show();
//     }
//   }


//   updateService() {
//     if (this.selectedService.name && this.selectedService.price) {

//       const index = this.allServices.findIndex(s => s.id === this.selectedService.id);
//       if (index !== -1) {
//         this.allServices[index].name = this.selectedService.name;
//         this.allServices[index].price = this.selectedService.price;


//         this.filterCategory(this.activeCategory);


//         const modalElement = document.getElementById('editServiceModal');
//         const modal = bootstrap.Modal.getInstance(modalElement);
//         modal.hide();

//         alert('تم تحديث الخدمة بنجاح');
//       }
//     }
//   }



// deleteService(id: number) {
//     if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {

//       this.services = this.services.filter(service => service.id !== id);

//       this.allServices = this.allServices.filter(s => s.id !== id);

//       console.log('تم حذف الخدمة رقم:', id);

//     }
//   }



// }




import { Component, OnInit } from '@angular/core';
import { ServiceCategory } from 'src/app/services/service-catalog.service';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit {
  readonly Category = ServiceCategory;
  activeCategory: ServiceCategory = ServiceCategory.All;
  services: any[] = [];
  allServices: any[] = [];


  constructor(private apiService: ApiService) {}

  ngOnInit(): void {


    this.apiService.getAllServices().subscribe({
      next: (response) => {
        console.log('البيانات:', response);
        this.services = response.data;
      },
      error: (err) => console.error('خطاء في الاتصال:', err)

    })
    this.filterCategory(this.activeCategory);
  }

  filterCategory(cat: ServiceCategory) {
    this.activeCategory = cat;
    const apiId = this.mapCategoryToId(cat);

    this.apiService.getAllServices(4).subscribe({
      next: (response) => {
        console.log('البيانات القادمة:', response);
        if (response && response.success && response.data) {
          this.services = response.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: (item.rates && item.rates.length > 0) ? item.rates[0].price : 0,
            category: cat
          }));
        }
      },
      error: (err) => console.error('خطأ في الاتصال:', err)
    });
  }

  mapCategoryToId(cat: ServiceCategory): number {
    switch(cat) {
      case ServiceCategory.CarWash: return 1;
      case ServiceCategory.Polishing: return 2;
      case ServiceCategory.Interior: return 3;
      case ServiceCategory.Special: return 4;
      default: return 0;
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { ServiceCatalogService} from 'src/app/services/service-catalog.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { ServiceCategory } from 'src/app/services/service-catalog.service';

interface ServiceItem {
  id: number;
  name: string;
  price: number;
  category: string;
  selected: boolean;
}


@Component({
  selector: 'app-create-order',
  templateUrl: './create-order.component.html',
  styleUrls: ['./create-order.component.scss']
})

// export class CreateOrderComponent {


//   allServices: ServiceItem[] = [
//     { id: 1, name: 'غسيل سيارة خارجي', price: 200,category: 'car-wash', selected: false},
//     { id: 2, name: 'غسيل داخلي وبخار', price: 250,category: 'car-wash', selected: false},
//     { id: 3, name: 'تلميع إطارات', price: 150,category: 'car-wash', selected: false} ,
//     { id: 4, name: 'تلميع الفرش', price: 300,category: 'car-wash', selected: false} ,
//     { id: 5, name: 'غسبل المتور', price: 50, category: 'car-wash', selected: false},
//     { id: 6, name: 'غسيل مساحات', price: 50, category: 'car-wash', selected: false},
//     { id: 7, name: 'تعطير وتطهير', price: 120,category: 'car-wash', selected: false},
//     { id: 8, name: 'غسيل كامل ', price: 650,category: 'car-wash', selected: false} ,
//     { id: 9, name: 'غسيل المقاعد', price: 130,category: 'car-wash', selected: false} ,
//     { id: 10, name:'تطهير المكيف', price: 130,category: 'car-wash', selected: false},
//     { id: 20, name: 'غسيل أسفل السيارة', price: 150, category: 'car-wash', selected: false },
//     { id: 11, name: 'غسيل الموتور بالبخار', price: 150, category: 'car-wash', selected: false },
//     { id: 12, name: 'تلميع بودي (واكس نانو)', price: 400, category: 'polishing', selected: false },
//     { id: 13, name: 'تلميع الفوانيس الأمامية', price: 120, category: 'polishing', selected: false },
//     { id: 14, name: 'تلميع الجنوط وإزالة الرايش', price: 150, category: 'polishing', selected: false },
//     { id: 15, name: 'تلميع التابلوه والأبواب', price: 80, category: 'polishing', selected: false },
//     { id: 16, name: 'تنظيف مراتب السيارة', price: 300, category: 'interior', selected: false },
//     { id: 17, name: 'إزالة بقع السقف والشامواه', price: 200, category: 'interior', selected: false },
//     { id: 18, name: 'تعقيم المكيف بالبخار', price: 100, category: 'interior', selected: false },
//     { id: 19, name: 'طبقة حماية نانو سريعة', price: 600, category: 'special', selected: false },
//     { id: 21, name: 'إزالة الروائح الكريهة', price: 250, category: 'special', selected: false },
//     { id: 22, name: 'تغيير مسحات الزجاج', price: 50, category: 'special', selected: false },
// ];


//   services = [...this.allServices];
//   activeCategory: string = 'all';

// filterCategory(cat: string) {

//   this.activeCategory = cat;

//     if (cat === 'all') {
//       this.services = [...this.allServices];
//     } else {

//       this.services = this.allServices.filter(s => s.category === cat);
//     }
//   }

//   toggleService(item: any) {
//     item.selected = !item.selected;
//   }

//   getTotal() {
//     return this.allServices
//       .filter(s => s.selected)
//       .reduce((total, item) => total + item.price, 0);
//   }
// }

export class CreateOrderComponent implements OnInit {

  readonly Category = ServiceCategory;

  allServices: ServiceItem[] = [];
  services: ServiceItem[] = [];
  activeCategory: ServiceCategory = ServiceCategory.All;

  constructor(private serviceCatalog: ServiceCatalogService) {}

  ngOnInit(): void {
    this.serviceCatalog.getServices().subscribe(data => {
      this.allServices = data;
      this.services = [...this.allServices];
    });
  }

  filterCategory(cat: ServiceCategory) {
    this.activeCategory = cat;
    if (cat === ServiceCategory.All) {
      this.services = [...this.allServices];
    } else {
      this.services = this.allServices.filter(s => s.category === cat);
    }
  }

  toggleService(item: ServiceItem) {
    item.selected = !item.selected;
  }

  getTotal(): number {
    return this.allServices
      .filter(s => s.selected)
      .reduce((total, item) => total + item.price, 0);
  }
}

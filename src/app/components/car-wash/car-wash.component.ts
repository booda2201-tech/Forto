import { Component } from '@angular/core';



interface ServiceItem {
  id: number;
  name: string;
  price: number;
  category: string;
  selected: boolean;
}



@Component({
  selector: 'app-car-wash',
  templateUrl: './car-wash.component.html',
  styleUrls: ['./car-wash.component.scss']
})


export class CarWashComponent {

  allServices: ServiceItem[] = [
    { id: 1, name: 'غسيل سيارة خارجي', price: 200,category: 'car-wash', selected: false},
    { id: 2, name: 'غسيل داخلي وبخار', price: 250,category: 'car-wash', selected: false},
    { id: 3, name: 'تلميع إطارات', price: 150,category: 'car-wash', selected: false} ,
    { id: 4, name: 'تلميع الفرش', price: 300,category: 'car-wash', selected: false} ,
    { id: 5, name: 'غسبل المتور', price: 50, category: 'car-wash', selected: false},
    { id: 6, name: 'غسيل مساحات', price: 50, category: 'car-wash', selected: false},
    { id: 7, name: 'تعطير وتطهير', price: 120,category: 'car-wash', selected: false},
    { id: 8, name: 'غسيل كامل ', price: 650,category: 'car-wash', selected: false} ,
    { id: 9, name: 'غسيل المقاعد', price: 130,category: 'car-wash', selected: false} ,
    { id: 10, name:'تطهير المكيف', price: 130,category: 'car-wash', selected: false}
  ];

  services = [...this.allServices];
  activeCategory = '{{activeCategory}}';

filterCategory(cat: string) {
    if (cat === 'all') {
      this.services = [...this.allServices];
    } else {

      this.services = this.allServices.filter((s: ServiceItem) => s.category === cat);
    }
  }

  toggleService(item: any) {
    item.selected = !item.selected;
  }

  getTotal() {
    return this.allServices
      .filter(s => s.selected)
      .reduce((total, item) => total + item.price, 0);
  }
}

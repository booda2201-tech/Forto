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
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent  implements OnInit {

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

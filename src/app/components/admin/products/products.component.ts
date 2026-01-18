import { Component, OnInit } from '@angular/core';
import { ServiceCatalogService, ProductsItem, ServiceCategory } from 'src/app/services/service-catalog.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  products: ProductsItem[] = [];
  selectedProduct: any = { name: '', price: 0  , stock: 0 };


  constructor(private serviceCatalog: ServiceCatalogService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.serviceCatalog.getProducts().subscribe(data => {
      this.products = data;
    });
  }

  toggleProduct(item: ProductsItem) {
    item.selected = !item.selected;
  }

  addNewProduct(nameInp: HTMLInputElement, priceInp: HTMLInputElement) {
    const name = nameInp.value;
    const price = Number(priceInp.value);
    const stock = Number(priceInp.value);


    if (name && price) {

      this.serviceCatalog.addProduct(name, price,stock);
      this.loadProducts();

      nameInp.value = '';
      priceInp.value = '';
      

      alert('تم إضافة المنتج بنجاح');
    }
  }

  deleteProduct(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      this.serviceCatalog.deleteProduct(id);
      this.loadProducts();
    }
  }

  getTotalSelected(): number {
    return this.products
      .filter(p => p.selected)
      .reduce((total, item) => total + item.price, 0);
  }


  openEditModal(prod: any) {

    this.selectedProduct = { ...prod };
  }


  saveProductChanges() {
    const index = this.products.findIndex(p => p.id === this.selectedProduct.id);
  if (index !== -1) {
    this.products[index].name = this.selectedProduct.name;
    this.products[index].price = this.selectedProduct.price;
    this.products[index].stock = this.selectedProduct.stock;
    alert('تم تحديث بيانات المنتج بنجاح');
  }
}







}

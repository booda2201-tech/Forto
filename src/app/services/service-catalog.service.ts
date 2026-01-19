import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';


export enum ServiceCategory {
  All = 'all',
  CarWash = 'car-wash',
  Polishing = 'polishing',
  Interior = 'interior',
  Special = 'special'
}

export interface ServiceItem {
  id: number;
  name: string;
  price: number;
  category: ServiceCategory;
  selected: boolean;
  qualifiedWorkers?: number[];
}

export interface Customer {
  id: number;
  customerName: string;
  phone: string;
  cars: any[];
  selectedServices?: ServiceItem[];
  totalAmount?: number;
  serviceItem?: ServiceItem[];
  createdAt:Date;
  appointmentDate:string;
  appointmentTime:string;
  price?: number;
  status?: 'waiting' | 'active' | 'completed' | 'canceled';
  statusText?: string;
  worker?: string;
  role?: string | null;
}

export interface Worker {
  id: number;
  name: string;
  phone: string;
  age: number;
  monthlySalary: number;
}

export interface ProductsItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  selected: boolean;
}




@Injectable({
  providedIn: 'root'
})
export class ServiceCatalogService {

  private allServices: ServiceItem[] = [
    { id: 1, name: 'غسيل سيارة خارجي', price: 200, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [1,2,3] },
    { id: 2, name: 'غسيل داخلي وبخار', price: 250, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [1,2,] },
    { id: 3, name: 'تلميع إطارات', price: 150, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [2,3] },
    { id: 4, name: 'تلميع الفرش', price: 300, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [1,3] },
    { id: 5, name: 'غسبل المتور', price: 50, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [5,4,3] },
    { id: 6, name: 'غسيل مساحات', price: 50, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [2] },
    { id: 7, name: 'تعطير وتطهير', price: 120, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [1] },
    { id: 8, name: 'غسيل كامل ', price: 650, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [3] },
    { id: 9, name: 'غسيل المقاعد', price: 130, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [2,3] },
    { id: 10, name: 'تطهير المكيف', price: 130, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [1,2] },
    { id: 20, name: 'غسيل أسفل السيارة', price: 150, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [2,3] },
    { id: 11, name: 'غسيل الموتور بالبخار', price: 150, category: ServiceCategory.CarWash , selected: false, qualifiedWorkers: [4,5] },
    { id: 12, name: 'تلميع بودي (واكس نانو)', price: 400, category: ServiceCategory. Polishing , selected: false, qualifiedWorkers: [5] },
    { id: 13, name: 'تلميع الفوانيس الأمامية', price: 120, category: ServiceCategory. Polishing , selected: false, qualifiedWorkers: [1,3] },
    { id: 14, name: 'تلميع الجنوط وإزالة الرايش', price: 150, category: ServiceCategory. Polishing , selected: false, qualifiedWorkers: [1,5] },
    { id: 15, name: 'تلميع التابلوه والأبواب', price: 80, category: ServiceCategory. Polishing , selected: false, qualifiedWorkers: [2,4] },
    { id: 16, name: 'تنظيف مراتب السيارة', price: 300, category: ServiceCategory.Interior, selected: false, qualifiedWorkers: [3,5] },
    { id: 17, name: 'إزالة بقع السقف والشامواه', price: 200, category: ServiceCategory.Interior, selected: false, qualifiedWorkers: [1,2,3] },
    { id: 18, name: 'تعقيم المكيف بالبخار', price: 100, category: ServiceCategory.Interior, selected: false, qualifiedWorkers: [1,2,3,4,5] },
    { id: 19, name: 'طبقة حماية نانو سريعة', price: 600, category: ServiceCategory.Special, selected: false, qualifiedWorkers: [4,5] },
    { id: 21, name: 'إزالة الروائح الكريهة', price: 250, category: ServiceCategory.Special, selected: false, qualifiedWorkers: [5,2] },
    { id: 22, name: 'تغيير مسحات الزجاج', price: 50, category: ServiceCategory.Special, selected: false, qualifiedWorkers: [1,2,3] },
  ];


  private ProductsList: ProductsItem[] = [
    { id: 1, name: 'قهوه ', price: 50, stock: 20,selected: false },
    { id: 2, name: 'شاي ', price: 20, stock: 15,selected: false },
    { id: 3, name: 'برتقال ', price: 50, stock: 18 ,selected: false },
    { id: 4, name: 'كافي ', price: 50, stock: 5 ,selected: false },

  ];


  private customers: Customer[] = [
    {
      id: 1,
      customerName: 'أحمد محمد',
      phone: '+966 50 123 4567',
      cars: [
        { carid: 1,
          carModel: 'تويوتا كامري 2022',
          plateNumber: 'ف ه د 1234',}],
      serviceItem: [
        { id: 1, name: 'غسيل سيارة خارجي', price: 200, category: ServiceCategory.CarWash , selected: true },
            { id: 5, name: 'غسبل المتور', price: 50, category: ServiceCategory.CarWash , selected: false },
                { id: 20, name: 'غسيل أسفل السيارة', price: 150, category: ServiceCategory.CarWash , selected: false },
                    { id: 3, name: 'تلميع إطارات', price: 150, category: ServiceCategory.CarWash , selected: false },
      ],
      createdAt: new Date(),
      appointmentDate: '2026-01-25',
      appointmentTime: '011:00 ص',
      status: 'waiting',
      statusText: 'قيد الانتظار',
      worker: 'أحمد محمد',
      role: 'admin'
    },
    {
      id: 2,
      customerName: 'سارة أحمد',
      phone: '+966 55 987 6543',
      cars: [
        { carid: 1,
          carModel: 'تويوتا كامري 2025',
          plateNumber: 'د ه ب 1234',}],
      serviceItem: [
        { id: 1, name: 'غسيل سيارة خارجي', price: 200, category: ServiceCategory.CarWash , selected: true },
            { id: 4, name: 'تلميع الفرش', price: 300, category: ServiceCategory.CarWash , selected: false },
      ],
      createdAt: new Date(),
      appointmentDate: '2026-01-25',
      appointmentTime: '011:00 ص',
      status: 'waiting',
      statusText: 'قيد الانتظار',
      worker: 'محمد علي',
      role: 'cashier'
    },
    {
      id: 3,
      customerName: 'خالد مختار',
      phone: '+966 54 000 1111',
      cars: [
        { carid: 1,
          carModel: 'تويوتا كامري 2020',
          plateNumber: 'د ج ع 1234',}],
      serviceItem: [
        { id: 2, name: 'غسيل داخلي وبخار', price: 250, category: ServiceCategory.CarWash , selected: true },
            { id: 6, name: 'غسيل مساحات', price: 50, category: ServiceCategory.CarWash , selected: false },
      ],
      createdAt: new Date(),
      appointmentDate: '2026-01-25',
      appointmentTime: '011:00 ص',
      status: 'waiting',
      statusText: 'قيد الانتظار',
      worker: 'ادهم الشرقاوي',
      role: 'worker'
    },
    {
      id: 4,
      customerName: 'فهد العتيبي',
      phone: '+966 54 586 1111',
      cars: [
        { carid: 1,
          carModel: 'تويوتا كامري 2021',
          plateNumber: ' ب ص ج 1234',}],
      serviceItem: [
        { id: 4, name: 'تلميع الفرش', price: 300, category: ServiceCategory.CarWash , selected: true },
      ],
      createdAt: new Date(),
      appointmentDate: '2026-01-25',
      appointmentTime: '011:00 ص',
      status: 'waiting',
      statusText: 'قيد الانتظار',
      worker: 'محمود كهربا',
      role: 'client'
    },
    {
      id: 5,
      customerName: 'عصام الشوالي',
      phone: '+962 54 654 1111',
      cars: [
        { carid: 1,
          carModel: 'تويوتا كامري 2023',
          plateNumber: ' ب ص ج 1234',}],
      serviceItem: [
        { id: 8, name: 'غسيل كامل ', price: 650, category: ServiceCategory.CarWash , selected: true },
            { id: 12, name: 'تلميع بودي (واكس نانو)', price: 400, category: ServiceCategory. Polishing , selected: false },
      ],
      createdAt: new Date(),
      appointmentDate: '2026-01-25',
      appointmentTime: '011:00 ص',
      status: 'waiting',
      statusText: 'قيد الانتظار',
      worker: 'تامر حسني ',
      role: 'cashier'
    },
    {
      id: 6,
      customerName: 'حفيظ درااجي',
      phone: '+966 54 235 1111',
      cars: [
        { carid: 1,
          carModel: 'تويوتا كامري 2022',
          plateNumber: ' ا س د 1234',}],
      serviceItem: [
        { id: 2, name: 'غسيل داخلي وبخار', price: 250, category: ServiceCategory.CarWash , selected: true },
            { id: 7, name: 'تعطير وتطهير', price: 120, category: ServiceCategory.CarWash , selected: false },
      ],
      createdAt: new Date(),
      appointmentDate: '2026-01-25',
      appointmentTime: '011:00 ص',
      status: 'waiting',
      statusText: 'قيد الانتظار',
      worker: 'عمرو دياب ',
      role: 'worker'

    },
    {
      id: 7,
      customerName: 'فارس عوض',
      phone: '+966 54 852 1111',
      cars: [
        { carid: 1,
          carModel: 'تويوتا كامري 2026',
          plateNumber: 'ع س د 1234',}],
      serviceItem: [
                { id: 7, name: 'تعطير وتطهير', price: 120, category: ServiceCategory.CarWash , selected: false },
      ],
      createdAt: new Date(),
      appointmentDate: '2026-01-25',
      appointmentTime: '011:00 ص',
      status: 'waiting',
      statusText: 'قيد الانتظار',
      worker: 'محمد رمضان ',
      role: 'admin'
    },
    {
      id: 8,
      customerName: 'محمد عوض',
      phone: '+966 54 852 1551',
      cars: [
        { carid: 1,
          carModel: 'تويوتا كامري 2026',
          plateNumber: 'ع س د 1234',}],
      serviceItem: [
                { id: 5, name: 'غسبل المتور', price: 50, category: ServiceCategory.CarWash , selected: false },
      ],
      createdAt: new Date(),
      appointmentDate: '2026-01-25',
      appointmentTime: '011:00 ص',
      status: 'waiting',
      statusText: 'قيد الانتظار',
      worker: 'محمد رمضان ',
      role: 'admin'
    },
    {
      id: 9,
      customerName: 'منصور عوض',
      phone: '+966 54 852 1111',
      cars: [
        { carid: 1,
          carModel: 'تويوتا كامري 2026',
          plateNumber: 'ع س د 1234',}],
      serviceItem: [
                  { id: 4, name: 'تلميع الفرش', price: 300, category: ServiceCategory.CarWash , selected: false },
      ],
      createdAt: new Date(),
      appointmentDate: '2026-01-25',
      appointmentTime: '011:00 ص',
      status: 'waiting',
      statusText: 'قيد الانتظار',
      worker: 'محمد رمضان ',
      role: 'admin'
    },
    {
      id: 10,
      customerName: 'على القاسمي',
      phone: '+966 54 852 1221',
      cars: [
        { carid: 1,
          carModel: 'تويوتا كامري 2026',
          plateNumber: 'ع س د 1234',}],
      serviceItem: [
                { id: 2, name: 'غسيل داخلي وبخار', price: 250, category: ServiceCategory.CarWash , selected: true },
      ],
      createdAt: new Date(),
      appointmentDate: '2026-01-25',
      appointmentTime: '011:00 ص',
      status: 'waiting',
      statusText: 'قيد الانتظار',
      worker: 'محمد رمضان ',
      role: 'cashier'
    },
  ];


  private workersList: Worker[] = [
    { id: 1,name: 'أحمد محمد', phone: '+956 54 852 1111', age: 25, monthlySalary: 6000 },
    { id: 2,name: 'محمد علي', phone: '+856 54 852 0000', age: 28, monthlySalary: 6000 },
    { id: 3,name: 'ادهم الشرقاوي', phone: '+966 54 852 8888', age: 25, monthlySalary: 7000 },
    { id: 4,name: 'محمود كهربا', phone: '+926 54 852 3333', age: 30, monthlySalary: 8000 },
    { id: 5,name: 'تامر حسني', phone: '+996 54 852 4444', age: 25, monthlySalary: 10000 },
    { id: 6,name: 'عمرو دياب', phone: '+986 54 852 5555', age: 30, monthlySalary: 11000 },
    { id: 7,name: 'محمد رمضان', phone: '+976 54 852 2222', age: 25, monthlySalary: 8000 },
  ];

  private customersSubject = new BehaviorSubject<Customer[]>(this.customers);

constructor() {
  this.customers.forEach(customer => {

    if (customer.serviceItem && customer.serviceItem.length > 0) {
      customer.totalAmount = customer.serviceItem.reduce((sum, s) => sum + s.price, 0);
    } else {
      customer.totalAmount = customer.price || 0;
    }


    customer.status = customer.status || 'waiting';
    customer.statusText = customer.statusText || 'قيد الانتظار';


    customer.createdAt = customer.createdAt || new Date();


    customer.appointmentDate = customer.appointmentDate || new Date().toISOString().split('T')[0];
    customer.appointmentTime = customer.appointmentTime || 'غير محدد';
  });

  this.customersSubject.next([...this.customers]);
}

  getServices(): Observable<ServiceItem[]> {
    return of(this.allServices);
  }

  getCustomers(): Observable<Customer[]> {
    return this.customersSubject.asObservable();
  }

  getWorkers(): Observable<Worker[]> {
    return of(this.workersList);
  }


  getProducts(): Observable<ProductsItem[]> {
    return of(this.ProductsList);
  }


  addProduct(name: string, price: number, stock: number) {
    const newProduct: ProductsItem = {
      id: Date.now(),
      name,
      price,
      stock,
      selected: false
    };
    this.ProductsList.push(newProduct);
  }


  deleteProduct(id: number) {
    this.ProductsList = this.ProductsList.filter(p => p.id !== id);
  }


  addWorker(name: string, role: string) {
    const newWorker = { id: Date.now(), name, role };
  }

  addWorkerDetail(workerData: Worker) {
  const newWorker = {
    ...workerData,
    id: Date.now()
  };
  this.workersList.push(newWorker);
}


  deleteWorker(id: number) {
    this.workersList = this.workersList.filter(w => w.id !== id);
  }


  addCustomer(customerData: any) {
  const newCustomer: Customer = {
    id: Date.now(),
    customerName: customerData.name,
    phone: customerData.phone,
    cars: [
      {
        carid: Date.now() + 1,
        carModel: customerData.carType || 'غير محدد',
        plateNumber: customerData.carNumber || 'غير محدد'
      }
    ],
    selectedServices: [],
    totalAmount: customerData.totalAmount || 0,
    serviceItem: customerData.serviceItem || [],


    createdAt: new Date(),
    appointmentDate: customerData.appointmentDate || new Date().toISOString().split('T')[0],
    appointmentTime: customerData.appointmentTime || 'غير محدد',

    worker: customerData.worker || 'غير محدد',
    status: 'waiting',
    statusText: 'قيد الانتظار',
    role: 'admin'
  };

  this.customers.unshift(newCustomer);
  this.customersSubject.next([...this.customers]);
  }

  deleteCustomer(id: number) {
    this.customers = this.customers.filter(c => c.id !== id);
    this.customersSubject.next([...this.customers]);
  }

  updateCustomerStatus(id: number, newStatus: 'waiting' | 'active' | 'completed' | 'canceled', workerName?: string) {
  const index = this.customers.findIndex(c => c.id === id);
  if (index !== -1) {
    this.customers[index].status = newStatus;
    if (workerName) this.customers[index].worker = workerName;


    const statusMap = { 'active': 'نشط', 'completed': 'مكتمل', 'canceled': 'ملغي', 'waiting': 'قيد الانتظار' };
    this.customers[index].statusText = statusMap[newStatus];

    this.customersSubject.next([...this.customers]);
  }
  }


  updateCustomerDetails(id: number, data: { carModel: string, plateNumber: string, services: ServiceItem[] }) {
  const index = this.customers.findIndex(c => c.id === id);
  if (index !== -1) {
    this.customers[index].cars[0].carModel = data.carModel;
    this.customers[index].cars[0].plateNumber = data.plateNumber;
    this.customers[index].serviceItem = data.services;
    this.customers[index].totalAmount = data.services.reduce((sum, s) => sum + s.price, 0);
    this.customersSubject.next([...this.customers]);
  }
  }


}















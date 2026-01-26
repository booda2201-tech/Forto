import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'https://api.fortolaundry.com';
  // private baseUrl = 'https://localhost:7179';

  constructor(private http: HttpClient) { }

  getAllServices(categoryId: number = 4): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/api/catalog/services/GetAll?categoryId=${categoryId}`,
    );
  }

  getAllClients(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/clients/GetAll`);
  }

  // createClient2(clientData: any): Observable<any> {
  //   const url = `${this.baseUrl}/api/clients/Create`;
  //   return this.http.post(url, clientData);
  // }

  createClient(payload: any) {
    return this.http.post(`${this.baseUrl}/api/clients/Create`, payload);
  }

  addCarToClient(clientId: number, payload: any) {
    return this.http.post(
      `${this.baseUrl}/api/clients/${clientId}/addCars`,
      payload,
    );
  }

  getClientById(clientId: number): Observable<any> {
    const url = `${this.baseUrl}/api/clients/GetById/${clientId}`;
    return this.http.get(url);
  }

  getServices() {
    return this.http.get(`${this.baseUrl}/api/catalog/services/GetAll`);
  }

  getAvailableSlots(branchId: number, date: string, serviceIds: number[]) {
    const serviceIdsParam = serviceIds.join(',');
    return this.http.get(
      `${this.baseUrl}/api/bookings/available-slots?branchId=${branchId}&date=${date}&serviceIds=${serviceIdsParam}`,
    );
  }

  createBooking(payload: any) {
    return this.http.post(`${this.baseUrl}/api/bookings`, payload);
  }

  quickCreateBooking(payload: any) {
    return this.http.post(`${this.baseUrl}/api/bookings/quick-create`, payload);
  }

  getBookingsToday(branchId: number, date: string) {
    return this.http.get(
      `${this.baseUrl}/api/bookings/today?branchId=${branchId}&date=${date}`,
    );
  }

  // employees for a specific service
  getServiceEmployees2(serviceId: number) {
    return this.http.get(
      `${this.baseUrl}/api/catalog/services/${serviceId}/employees`,
    );
  }

  // assign employees to booking items
  assignBooking(
    bookingId: number,
    payload: {
      cashierId: number;
      assignments: { bookingItemId: number; employeeId: number }[];
    },
  ) {
    return this.http.put(
      `${this.baseUrl}/api/bookings/${bookingId}/assign`,
      payload,
    );
  }

  completeBooking(
    bookingId: number,
    payload: {
      cashierId: number;
      reason?: string;
      usedOverride?: { materialId: number; actualQty: number }[];
    },
  ) {
    return this.http.post(
      `${this.baseUrl}/api/bookings/${bookingId}/complete`,
      payload,
    );
  }

  cancelBooking(
    bookingId: number,
    payload: {
      cashierId: number;
      reason?: string;
      usedOverride: { materialId: number; actualQty: number }[];
    },
  ) {
    return this.http.post(
      `${this.baseUrl}/api/bookings/${bookingId}/cancel`,
      payload,
    );
  }

  // today bookings (already used)

  // getAllClients() {
  //   return this.http.get(`${this.baseUrl}/api/clients/GetAll`);
  // }

  // addCarToClient(clientId: number, payload: any) {
  //   return this.http.post(
  //     `${this.baseUrl}/api/clients/${clientId}/addCars`,
  //     payload
  //   );
  // }

  deleteCar(carId: number) {
    return this.http.delete(`${this.baseUrl}/api/clients/DeleteCar/${carId}`);
  }

  // createPosInvoice(payload: {
  //   branchId: number;
  //   cashierId: number;
  //   items: { productId: number; qty: number }[];
  //   occurredAt: string;
  //   notes?: string;
  // }) {
  //   return this.http.post(`${this.baseUrl}/api/invoices/pos`, payload);
  // }

  // getProducts() {
  //   return this.http.get(`${this.baseUrl}/api/products/GetAll`);
  // }

  getInvoicesList(params: {
    branchId: number;
    from?: string;
    to?: string;
    paymentMethod?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query: any = {
      BranchId: params.branchId,
    };

    if (params.from) query.From = params.from;
    if (params.to) query.To = params.to;
    if (params.paymentMethod) query.PaymentMethod = params.paymentMethod;
    if (params.q) query.Q = params.q;
    if (params.page != null) query.Page = params.page;
    if (params.pageSize != null) query.PageSize = params.pageSize;

    return this.http.get(`${this.baseUrl}/api/invoices/list`, {
      params: query,
    });
  }

  getProducts() {
    return this.http.get(`${this.baseUrl}/api/products/with-stock?branchId=1`);
  }

  createProduct(payload: {
    name: string;
    sku: string;
    salePrice: number;
    costPerUnit: number;
  }) {
    return this.http.post(`${this.baseUrl}/api/products/Create`, payload);
  }

  updateProduct(
    id: number,
    payload: {
      name: string;
      sku: string;
      salePrice: number;
      costPerUnit: number;
      isActive: boolean;
    },
  ) {
    return this.http.put(`${this.baseUrl}/api/products/Update/${id}`, payload);
  }

  deleteProduct(id: number) {
    return this.http.delete(`${this.baseUrl}/api/products/Delete/${id}`);
  }

  getEmployees() {
    return this.http.get(`${this.baseUrl}/api/employees/GetAll`);
  }

  createEmployeeUser(payload: {
    name: string;
    age: number;
    phoneNumber: string;
    password: string;
    role: string; // 1 worker, 2 cashier
  }) {
    return this.http.post(
      `${this.baseUrl}/api/employees/admin/employees/create-user`,
      payload,
    );
  }

  updateEmployee(
    id: number,
    payload: {
      name: string;
      phoneNumber: string;
      age: number;
      isActive: boolean;
      role: number; // 1 worker, 2 cashier
    },
  ) {
    return this.http.put(`${this.baseUrl}/api/employees/Update/${id}`, payload);
  }

  deleteEmployee(id: number) {
    return this.http.delete(`${this.baseUrl}/api/employees/Delete/${id}`);
  }

  getDashboardSummary(params: { branchId: number; from: string; to: string }) {
    return this.http.get(`${this.baseUrl}/api/dashboard/summary`, {
      params: {
        branchId: String(params.branchId),
        from: params.from,
        to: params.to,
      },
    });
  }

  getMaterials() {
    return this.http.get(`${this.baseUrl}/api/materials/GetAll`);
  }

  createMaterial(payload: {
    name: string;
    unit: number;
    costPerUnit: number;
    chargePerUnit: number;
  }) {
    return this.http.post(`${this.baseUrl}/api/materials/Create`, payload);
  }

  updateMaterial(
    id: number,
    payload: {
      name: string;
      unit: number;
      costPerUnit: number;
      chargePerUnit: number;
      isActive: boolean;
    },
  ) {
    return this.http.put(`${this.baseUrl}/api/materials/Update/${id}`, payload);
  }

  deleteMaterial(id: number) {
    return this.http.delete(`${this.baseUrl}/api/materials/Delete/${id}`);
  }

  getCatalogCategories() {
    return this.http.get(`${this.baseUrl}/api/catalog/categories/GetAll`);
  }

  getCatalogServices(categoryId: number) {
    return this.http.get(`${this.baseUrl}/api/catalog/services/GetAll`, {
      params: { categoryId: String(categoryId) },
    });
  }

  createCatalogService(payload: {
    categoryId: number;
    name: string;
    description: string;
  }) {
    return this.http.post(
      `${this.baseUrl}/api/catalog/services/Create`,
      payload,
    );
  }

  deleteCatalogService(id: number) {
    return this.http.delete(
      `${this.baseUrl}/api/catalog/services/Delete/${id}`,
    );
  }

  upsertServiceRates(
    serviceId: number,
    payload: {
      rates: { bodyType: number; price: number; durationMinutes: number }[];
    },
  ) {
    return this.http.put(
      `${this.baseUrl}/api/catalog/services/UpsertRates/${serviceId}/rates`,
      payload,
    );
  }

  updateEmployeeServices(employeeId: number, serviceIds: number[]) {
    return this.http.put(
      `${this.baseUrl}/api/employees/${employeeId}/services`,
      {
        serviceIds,
      },
    );
  }

  // getCatalogServices(categoryId: number) {
  //   return this.http.get(`${this.baseUrl}/api/catalog/services/GetAll`, {
  //     params: { categoryId: String(categoryId) },
  //   });
  // }

  // getCatalogCategories() {
  //   return this.http.get(`${this.baseUrl}/api/catalog/categories/GetAll`);
  // }

  getEmployeeTasks(employeeId: number, date: string) {
    return this.http.get(
      `${this.baseUrl}/api/employees/${employeeId}/tasks/GetEmployeeTasks`,
      {
        params: { date },
      },
    );
  }

  startBookingItem(itemId: number, payload: { employeeId: number }) {
    return this.http.put(
      `${this.baseUrl}/api/booking-items/${itemId}/start`,
      payload,
    );
  }

  completeBookingItem(itemId: number, payload: { employeeId: number }) {
    return this.http.put(
      `${this.baseUrl}/api/booking-items/${itemId}/complete`,
      payload,
    );
  }

  updateBookingItemMaterials(
    bookingItemId: number,
    payload: {
      employeeId: number;
      materials: { materialId: number; actualQty: number }[];
    },
  ) {
    return this.http.put(
      `${this.baseUrl}/api/booking-items/${bookingItemId}/materials/requests`,
      payload,
    );
  }

  getPendingMaterialRequests(branchId: number, date: string) {
    return this.http.get(`${this.baseUrl}/api/booking-items/pending`, {
      params: { branchId: String(branchId), date },
    });
  }

  approveMaterialRequest(
    bookingItemId: number,
    requestId: number,
    payload: { cashierId: number; note: string },
  ) {
    return this.http.post(
      `${this.baseUrl}/api/booking-items/${bookingItemId}/materials/requests/${requestId}/approve`,
      payload,
    );
  }

  rejectMaterialRequest(
    bookingItemId: number,
    requestId: number,
    payload: { cashierId: number; note: string },
  ) {
    return this.http.post(
      `${this.baseUrl}/api/booking-items/${bookingItemId}/materials/requests/${requestId}/reject`,
      payload,
    );
  }

  updateBookingServices(payload: any) {
    return this.http.post(
      `${this.baseUrl}/api/bookings/update-services`,
      payload,
    );
  }

  addServiceToBookingCashier(
    bookingId: number,
    payload: {
      cashierId: number;
      serviceId: number;
      assignedEmployeeId: number;
    },
  ) {
    return this.http.post(
      `${this.baseUrl}/api/bookings-cashier/${bookingId}/services`,
      payload,
    );
  }

  startBookingCashier(bookingId: number, payload: { cashierId: number }) {
    return this.http.post(
      `${this.baseUrl}/api/bookings-cashier/${bookingId}/start`,
      payload,
    );
  }

  completeBookingCashier(bookingId: number, payload: { cashierId: number }) {
    return this.http.post(
      `${this.baseUrl}/api/bookings-cashier/${bookingId}/complete`,
      payload,
    );
  }

  // you already have this (used to load employees per service)
  getServiceEmployees(serviceId: number) {
    return this.http.get(
      `${this.baseUrl}/api/catalog/services/${serviceId}/employees`,
    );
  }



  createPosInvoice(payload: any) {
    return this.http.post(
      `${this.baseUrl}/api/invoices/pos`,
      payload
    );
  }





  cashierCheckout(payload: any) {
    return this.http.post(`${this.baseUrl}/api/cashier/checkout`, payload);
  }






  // cashierCheckout(payload: any) {
  //   return this.http.post(`${this.baseUrl}/api/cashier/checkout`, payload);
  // }

  // getServiceEmployees(serviceId: number) {
  //   return this.http.get(`${this.baseUrl}/api/catalog/services/${serviceId}/employees`);
  // }
  // addServiceToBookingCashier(bookingId: number, payload: {
  //   cashierId: number;
  //   serviceId: number;
  //   assignedEmployeeId: number;
  // }) {
  //   return this.http.post(`${this.baseUrl}/api/bookings-cashier/${bookingId}/services`, payload);
  // }

  cancelBookingItemCashier(bookingItemId: number, payload: {
    cashierId: number;
    reason?: string;
    usedOverride?: { materialId: number; actualQty: number }[];
  }) {
    return this.http.post(`${this.baseUrl}/api/bookings-cashier/booking-items/${bookingItemId}/cancel`, payload);
  }

  // you already use it elsewhere
  // getServiceEmployees(serviceId: number) {
  //   return this.http.get(`${this.baseUrl}/api/catalog/services/${serviceId}/employees`);
  // }





getBookingServiceOptions(bookingId: number) {
  return this.http.get(`${this.baseUrl}/api/bookings/${bookingId}/services/options`);
}

// addServiceToBookingCashier(bookingId: number, payload: {
//   cashierId: number;
//   serviceId: number;
//   assignedEmployeeId: number;
// }) {
//   return this.http.post(`${this.baseUrl}/api/bookings-cashier/${bookingId}/services`, payload);
// }

// cancelBookingItemCashier(bookingItemId: number, payload: {
//   cashierId: number;
//   reason?: string;
//   usedOverride?: { materialId: number; actualQty: number }[];
// }) {
//   return this.http.post(`${this.baseUrl}/api/bookings-cashier/booking-items/${bookingItemId}/cancel`, payload);
// }

// getServiceEmployees(serviceId: number) {
//   return this.http.get(`${this.baseUrl}/api/catalog/services/${serviceId}/employees`);
// }





}

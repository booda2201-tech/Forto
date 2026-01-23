import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'https://api.fortolaundry.com';

  constructor(private http: HttpClient) { }

  getAllServices(categoryId: number = 4): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/api/catalog/services/GetAll?categoryId=${categoryId}`
    );
  }

  getAllClients(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/clients/GetAll`);
  }

  createClient2(clientData: any): Observable<any> {
    const url = `${this.baseUrl}/api/clients/Create`;
    return this.http.post(url, clientData);
  }

  createClient(payload: any) {
    return this.http.post(`${this.baseUrl}/api/clients/Create`, payload);
  }

  addCarToClient(clientId: number, payload: any) {
    return this.http.post(
      `${this.baseUrl}/api/clients/${clientId}/addCars`,
      payload
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
      `${this.baseUrl}/api/bookings/available-slots?branchId=${branchId}&date=${date}&serviceIds=${serviceIdsParam}`
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
      `${this.baseUrl}/api/bookings/today?branchId=${branchId}&date=${date}`
    );
  }



  // employees for a specific service
  getServiceEmployees(serviceId: number) {
    return this.http.get(`${this.baseUrl}/api/catalog/services/${serviceId}/employees`);
  }

  // assign employees to booking items
  assignBooking(bookingId: number, payload: {
    cashierId: number;
    assignments: { bookingItemId: number; employeeId: number }[];
  }) {
    return this.http.put(`${this.baseUrl}/api/bookings/${bookingId}/assign`, payload);
  }


  completeBooking(bookingId: number, payload: {
    cashierId: number;
    reason?: string;
    usedOverride?: { materialId: number; actualQty: number }[];
  }) {
    return this.http.post(`${this.baseUrl}/api/bookings/${bookingId}/complete`, payload);
  }




  cancelBooking(bookingId: number, payload: {
    cashierId: number;
    reason?: string;
    usedOverride: { materialId: number; actualQty: number }[];
  }) {
    return this.http.post(`${this.baseUrl}/api/bookings/${bookingId}/cancel`, payload);
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




  createPosInvoice(payload: {
    branchId: number;
    cashierId: number;
    items: { productId: number; qty: number }[];
    occurredAt: string;
    notes?: string;
  }) {
    return this.http.post(`${this.baseUrl}/api/invoices/pos`, payload);
  }

getProducts() {
  return this.http.get(`${this.baseUrl}/api/products/GetAll`);
}





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

  return this.http.get(`${this.baseUrl}/api/invoices/list`, { params: query });
}




}

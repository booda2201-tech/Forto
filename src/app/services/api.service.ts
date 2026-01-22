import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'https://api.fortolaundry.com';

  constructor(private http: HttpClient) {}

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
}

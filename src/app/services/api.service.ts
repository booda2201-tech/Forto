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
      `${this.baseUrl}/api/catalog/services/GetAll?categoryId=${categoryId}`,
    );
  }

  getAllClients(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/clients/GetAll`);
  }

  createClient(clientData: any): Observable<any> {
    const url = `${this.baseUrl}/api/clients/Create`;
    return this.http.post(url, clientData);
  }

  getClientById(clientId: number): Observable<any> {
    const url = `${this.baseUrl}/api/clients/GetById/${clientId}`;
    return this.http.get(url);
  }
}

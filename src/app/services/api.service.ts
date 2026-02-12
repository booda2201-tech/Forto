import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  /** استخدم server أو local حسب أين شغّال الباك — الـ API و SignalR هيستخدموا نفس الـ base */
  private baseUrl = 'https://api.fortolaundry.com';   // سيرفر
  // private baseUrl = 'https://localhost:7179';      // local (للتطوير لو الباك على نفس الجهاز)

  constructor(private http: HttpClient) {}

  /** يستخدم مع SignalR (نفس الـ host للـ hubs) */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  signin(payload: { phoneNumber: string; password: string }) {
    return this.http.post<{
      token: string;
      role: string;
      phoneNumber: string;
      fullName: string;
      employeeId: number;
    }>(`${this.baseUrl}/api/auth/signin`, payload);
  }

  getAllServices(categoryId: number = 4): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/api/catalog/services/GetAll?categoryId=${categoryId}`
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
      payload
    );
  }

  getClientById(clientId: number): Observable<any> {
    const url = `${this.baseUrl}/api/clients/GetById/${clientId}`;
    return this.http.get(url);
  }

  lookupClientByPhone(phoneNumber: string, take = 10): Observable<any> {
    let params = new HttpParams().set('phone', phoneNumber);
    if (take) params = params.set('take', String(take));
    return this.http.get(`${this.baseUrl}/api/clients/lookup`, { params });
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
  getServiceEmployees2(serviceId: number) {
    return this.http.get(
      `${this.baseUrl}/api/catalog/services/${serviceId}/employees`
    );
  }

  // assign employees to booking items
  assignBooking(
    bookingId: number,
    payload: {
      cashierId: number;
      assignments: { bookingItemId: number; employeeId: number }[];
    }
  ) {
    return this.http.put(
      `${this.baseUrl}/api/bookings/${bookingId}/assign`,
      payload
    );
  }

  completeBooking(
    bookingId: number,
    payload: {
      cashierId: number;
      reason?: string;
      usedOverride?: { materialId: number; actualQty: number }[];
    }
  ) {
    return this.http.post(
      `${this.baseUrl}/api/bookings/${bookingId}/complete`,
      payload
    );
  }

  cancelBooking(
    bookingId: number,
    payload: {
      cashierId: number;
      reason?: string;
      usedOverride: { materialId: number; actualQty: number }[];
    }
  ) {
    return this.http.post(
      `${this.baseUrl}/api/bookings/${bookingId}/cancel`,
      payload
    );
  }

  deleteCar(carId: number) {
    return this.http.delete(`${this.baseUrl}/api/clients/DeleteCar/${carId}`);
  }

  getInvoicesList(params: {
    branchId: number;
    from?: string;
    to?: string;
    paymentMethod?: string;
    /** "unpaid" | "paid" | "cancelled" */
    status?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    let httpParams = new HttpParams().set('BranchId', String(params.branchId));
    if (params.from) httpParams = httpParams.set('From', params.from);
    if (params.to) httpParams = httpParams.set('To', params.to);
    if (params.paymentMethod)
      httpParams = httpParams.set('PaymentMethod', String(params.paymentMethod));
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.q) httpParams = httpParams.set('Q', params.q);
    if (params.page != null) httpParams = httpParams.set('Page', String(params.page));
    if (params.pageSize != null) httpParams = httpParams.set('PageSize', String(params.pageSize));

    return this.http.get(`${this.baseUrl}/api/invoices/list`, {
      params: httpParams,
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
    }
  ) {
    return this.http.put(`${this.baseUrl}/api/products/Update/${id}`, payload);
  }

  deleteProduct(id: number) {
    return this.http.delete(`${this.baseUrl}/api/products/Delete/${id}`);
  }

  getBranchProductStock(branchId: number) {
    return this.http.get(`${this.baseUrl}/api/GetBranchProductStock/${branchId}`);
  }

  upsertBranchProductStock(branchId: number, payload: {
    productId: number;
    onHandQty: number;
    reorderLevel: number;
  }) {
    return this.http.put(`${this.baseUrl}/api/UpsertBranchProductStock?branchId=${branchId}`, payload);
  }

  addProductStockIn(branchId: number, payload: {
    cashierId: number;
    productId: number;
    qty: number;
    unitCost: number;
    notes?: string;
    occurredAt?: string;
  }) {
    return this.http.post(`${this.baseUrl}/api/branches/${branchId}/products/stock/in`, {
      ...payload,
      occurredAt: payload.occurredAt ?? new Date().toISOString(),
    });
  }

  adjustProductStock(branchId: number, payload: {
    cashierId: number;
    productId: number;
    physicalOnHandQty: number;
    notes?: string;
    occurredAt?: string;
  }) {
    return this.http.post(`${this.baseUrl}/api/branches/${branchId}/products/stock/adjust`, {
      ...payload,
      occurredAt: payload.occurredAt ?? new Date().toISOString(),
    });
  }

  getEmployees() {
    return this.http.get(`${this.baseUrl}/api/employees/GetAll`);
  }

  getSupervisors() {
    return this.http.get(`${this.baseUrl}/api/employees/supervisors`);
  }

  createEmployee(payload: {
    name: string;
    age: number;
    phoneNumber: string;
    role: number; // 1 Worker, 2 Cashier, 3 Supervisor, 4 Admin
  }) {
    return this.http.post(`${this.baseUrl}/api/employees/Create`, payload);
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
      payload
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
    }
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

  getDashboardServices(params: { branchId: number; from: string; to: string }) {
    return this.http.get(`${this.baseUrl}/api/dashboard/services`, {
      params: {
        branchId: String(params.branchId),
        from: params.from,
        to: params.to,
      },
    });
  }

  getDashboardEmployees(params: {
    branchId: number;
    from: string;
    to: string;
  }) {
    return this.http.get(`${this.baseUrl}/api/dashboard/employees`, {
      params: {
        branchId: String(params.branchId),
        from: params.from,
        to: params.to,
      },
    });
  }

  getDashboardEmployeesWithServices(params: {
    branchId: number;
    from: string;
    to: string;
    role?: number | null;
  }) {
    let httpParams = new HttpParams()
      .set('branchId', String(params.branchId))
      .set('from', params.from)
      .set('to', params.to);
    if (params.role != null && params.role > 0) {
      httpParams = httpParams.set('role', String(params.role));
    }
    return this.http.get(`${this.baseUrl}/api/dashboard/employees-with-services`, {
      params: httpParams,
    });
  }

  getMaterials() {
    return this.http.get(`${this.baseUrl}/api/materials/GetAll`);
  }

  getBranchStock(branchId: number) {
    return this.http.get(`${this.baseUrl}/api/branches/${branchId}/stock/GetBranchStock`);
  }

  upsertStock(branchId: number, payload: { materialId: number; onHandQty: number; reorderLevel: number }) {
    return this.http.put(`${this.baseUrl}/api/branches/${branchId}/stock/Upsert`, payload);
  }

  addStockIn(branchId: number, payload: {
    cashierId: number;
    materialId: number;
    qty: number;
    unitCost: number;
    notes?: string;
    occurredAt?: string;
  }) {
    return this.http.post(`${this.baseUrl}/api/branches/${branchId}/stock/in`, {
      ...payload,
      occurredAt: payload.occurredAt ?? new Date().toISOString(),
    });
  }

  adjustStock(branchId: number, payload: {
    cashierId: number;
    materialId: number;
    physicalOnHandQty: number;
    notes?: string;
    occurredAt?: string;
  }) {
    return this.http.post(`${this.baseUrl}/api/branches/${branchId}/stock/adjust`, {
      ...payload,
      occurredAt: payload.occurredAt ?? new Date().toISOString(),
    });
  }

  getServiceRecipes(serviceId: number, bodyType: number) {
    return this.http.get(
      `${this.baseUrl}/api/catalog/services/${serviceId}/recipes/${bodyType}`
    );
  }

  upsertServiceRecipe(
    serviceId: number,
    bodyType: number,
    payload: { materials: { materialId: number; defaultQty: number }[] }
  ) {
    return this.http.put(
      `${this.baseUrl}/api/catalog/services/${serviceId}/recipes/${bodyType}`,
      payload
    );
  }

  // Gift Options (هدايا الخدمات)
  getGiftOptions(serviceIds: number[], branchId: number) {
    const params = new HttpParams()
      .set('serviceIds', serviceIds.join(','))
      .set('branchId', String(branchId));
    return this.http.get(`${this.baseUrl}/api/catalog/services/gift-options`, { params });
  }

  addGiftOptions(serviceId: number, productIds: number[]) {
    return this.http.post(
      `${this.baseUrl}/api/catalog/services/${serviceId}/gift-options`,
      { productIds }
    );
  }

  removeGiftOptions(serviceId: number, productIds: number[]) {
    return this.http.request('DELETE',
      `${this.baseUrl}/api/catalog/services/${serviceId}/gift-options`,
      { body: { productIds } }
    );
  }

  selectGiftForInvoice(invoiceId: number, payload: {
    cashierId: number;
    productId: number;
    occurredAt?: string;
    notes?: string;
  }) {
    return this.http.post(
      `${this.baseUrl}/api/invoices/${invoiceId}/gift/select`,
      { ...payload, occurredAt: payload.occurredAt ?? new Date().toISOString() }
    );
  }

  // Cashier shifts (ورديات الكاشير)
  getActiveCashierShift(branchId: number) {
    return this.http.get<{ success: boolean; data?: { id: number; branchId: number; shiftId: number; shiftName: string; openedByEmployeeId: number; openedAt: string; isActive: boolean } | null }>(
      `${this.baseUrl}/api/cashier-shifts/active`,
      { params: { branchId: String(branchId) } }
    );
  }

  startCashierShift(payload: { branchId: number; cashierEmployeeId: number; shiftId: number }) {
    return this.http.post(`${this.baseUrl}/api/cashier-shifts/start`, payload);
  }

  closeCashierShift(shiftId: number, payload: { closedByEmployeeId: number }) {
    return this.http.post(`${this.baseUrl}/api/cashier-shifts/${shiftId}/close`, payload, {
      responseType: 'text',
    });
  }

  // Shifts
  getShiftsAll() {
    return this.http.get(`${this.baseUrl}/api/shifts/GetAll`);
  }

  getShiftById(id: number) {
    return this.http.get(`${this.baseUrl}/api/shifts/GetById/${id}`);
  }

  createShift(payload: {
    name: string;
    startTime: string; // "09:00"
    endTime: string;
  }) {
    return this.http.post(`${this.baseUrl}/api/shifts/Create`, payload);
  }

  updateShift(
    id: number,
    payload: { name: string; startTime: string; endTime: string }
  ) {
    return this.http.put(`${this.baseUrl}/api/shifts/Update/${id}`, payload);
  }

  deleteShift(id: number) {
    return this.http.delete(`${this.baseUrl}/api/shifts/Delete/${id}`);
  }

  // Employee Schedule (الشيفت لكل موظف)
  getEmployeeSchedule(employeeId: number) {
    return this.http.get(
      `${this.baseUrl}/api/employees/${employeeId}/schedule/Get`
    );
  }

  upsertEmployeeSchedule(
    employeeId: number,
    payload: {
      days: {
        dayOfWeek: number;
        isOff: boolean;
        shiftId: number | null;
        startTime?: string;
        endTime?: string;
      }[];
    }
  ) {
    return this.http.put(
      `${this.baseUrl}/api/employees/${employeeId}/schedule/Upsert`,
      payload
    );
  }

  getInvoiceByBooking(bookingId: number) {
    return this.http.get(`${this.baseUrl}/api/invoices/by-booking/${bookingId}`);
  }

  getInvoiceById(invoiceId: number) {
    return this.http.get(`${this.baseUrl}/api/invoices/${invoiceId}`);
  }

  /** 1 = cash, 2 = visa, 3 = custom (split) */
  payInvoiceCash(
    invoiceId: number,
    body: {
      cashierId: number;
      paymentMethod?: number;
      cashAmount?: number;
      visaAmount?: number;
    }
  ) {
    return this.http.post(
      `${this.baseUrl}/api/invoices/${invoiceId}/pay-cash`,
      body
    );
  }

  patchInvoiceAdjustedTotal(invoiceId: number, adjustedTotal: number) {
    return this.http.patch(
      `${this.baseUrl}/api/invoices/${invoiceId}/adjusted-total`,
      { adjustedTotal }
    );
  }

  /** طلب حذف فاتورة — POST /api/invoices/{invoiceId}/request-deletion */
  requestInvoiceDeletion(
    invoiceId: number,
    body: { reason: string; cashierEmployeeId: number }
  ) {
    return this.http.post(
      `${this.baseUrl}/api/invoices/${invoiceId}/request-deletion`,
      body
    );
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
    }
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
      payload
    );
  }

  deleteCatalogService(id: number) {
    return this.http.delete(
      `${this.baseUrl}/api/catalog/services/Delete/${id}`
    );
  }

  upsertServiceRates(
    serviceId: number,
    payload: {
      rates: { bodyType: number; price: number; durationMinutes: number }[];
    }
  ) {
    return this.http.put(
      `${this.baseUrl}/api/catalog/services/UpsertRates/${serviceId}/rates`,
      payload
    );
  }

  /** جلب الخدمات المرتبطة بالموظف GET /api/employees/{employeeId}/services */
  getEmployeeServices(employeeId: number) {
    return this.http.get<{ success: boolean; data?: { employeeId: number; serviceIds: number[] } }>(
      `${this.baseUrl}/api/employees/${employeeId}/services`
    );
  }

  updateEmployeeServices(employeeId: number, serviceIds: number[]) {
    return this.http.put(
      `${this.baseUrl}/api/employees/${employeeId}/services`,
      {
        serviceIds,
      }
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
      }
    );
  }

  startBookingItem(itemId: number, payload: { employeeId: number }) {
    return this.http.put(
      `${this.baseUrl}/api/booking-items/${itemId}/start`,
      payload
    );
  }

  completeBookingItem(itemId: number, payload: { employeeId: number }) {
    return this.http.put(
      `${this.baseUrl}/api/booking-items/${itemId}/complete`,
      payload
    );
  }

  updateBookingItemMaterials(
    bookingItemId: number,
    payload: {
      employeeId: number;
      materials: { materialId: number; actualQty: number }[];
    }
  ) {
    return this.http.put(
      `${this.baseUrl}/api/booking-items/${bookingItemId}/materials/requests`,
      payload
    );
  }

  /** تحديث كميات المواد المستخدمة لصنف حجز (من الكاشير) */
  updateBookingItemMaterialsByCashier(
    bookingItemId: number,
    payload: {
      cashierId: number;
      materials: { materialId: number; actualQty: number }[];
    }
  ) {
    return this.http.put(
      `${this.baseUrl}/api/booking-items/${bookingItemId}/materials/by-cashier`,
      payload
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
    payload: { cashierId: number; note: string }
  ) {
    return this.http.post(
      `${this.baseUrl}/api/booking-items/${bookingItemId}/materials/requests/${requestId}/approve`,
      payload
    );
  }

  rejectMaterialRequest(
    bookingItemId: number,
    requestId: number,
    payload: { cashierId: number; note: string }
  ) {
    return this.http.post(
      `${this.baseUrl}/api/booking-items/${bookingItemId}/materials/requests/${requestId}/reject`,
      payload
    );
  }

  updateBookingServices(payload: any) {
    return this.http.post(
      `${this.baseUrl}/api/bookings/update-services`,
      payload
    );
  }

  addServiceToBookingCashier(
    bookingId: number,
    payload: {
      cashierId: number;
      serviceIds: number[];
      assignedEmployeeId: number | null;
    }
  ) {
    return this.http.post(
      `${this.baseUrl}/api/bookings-cashier/${bookingId}/services/bulk`,
      payload
    );
  }

  startBookingCashier(bookingId: number, payload: { cashierId: number }) {
    return this.http.post(
      `${this.baseUrl}/api/bookings-cashier/${bookingId}/start`,
      payload
    );
  }

  completeBookingCashier(bookingId: number, payload: { cashierId: number }) {
    return this.http.post(
      `${this.baseUrl}/api/bookings-cashier/${bookingId}/complete`,
      payload
    );
  }

  // you already have this (used to load employees per service)
  getServiceEmployees(
    serviceId: number,
    bookingId: number,
    scheduledStart: string
  ) {
    return this.http.get(
      `${this.baseUrl}/api/catalog/services/bookings/${bookingId}/services/${serviceId}/employees`,
      { params: { scheduledStart } }
    );
  }

  createPosInvoice(payload: any) {
    return this.http.post(`${this.baseUrl}/api/invoices/pos`, payload);
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

  cancelBookingItemCashier(
    bookingItemId: number,
    payload: {
      cashierId: number;
      reason?: string;
      usedOverride?: { materialId: number; actualQty: number }[];
    }
  ) {
    return this.http.post(
      `${this.baseUrl}/api/bookings-cashier/booking-items/${bookingItemId}/cancel`,
      payload
    );
  }

  // you already use it elsewhere
  // getServiceEmployees(serviceId: number) {
  //   return this.http.get(`${this.baseUrl}/api/catalog/services/${serviceId}/employees`);
  // }

  getBookingServiceOptions(bookingId: number) {
    return this.http.get(
      `${this.baseUrl}/api/bookings/${bookingId}/services/options`
    );
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








updateCatalogService(
  id: number,
  payload: { categoryId: number; name: string; description: string; isActive: boolean }
) {
  return this.http.put(`${this.baseUrl}/api/catalog/services/Update/${id}`, payload);
}


// إضافة فئة جديدة — POST /api/catalog/categories/Create
createCategory(payload: { name: string }) {
  return this.http.post(`${this.baseUrl}/api/catalog/categories/Create`, payload);
}

// تحديث فئة — PUT /api/catalog/categories/Update/{id}
updateCategory(id: number, payload: { name: string; isActive?: boolean }) {
  return this.http.put(`${this.baseUrl}/api/catalog/categories/Update/${id}`, payload);
}

// حذف فئة — DELETE /api/catalog/categories/Delete/{id}
deleteCategory(id: number) {
  return this.http.delete(`${this.baseUrl}/api/catalog/categories/Delete/${id}`);
}

// ملاحظة: تأكد من أن المسارات (Endpoints) تطابق ما هو موجود في الـ Backend لديك













}

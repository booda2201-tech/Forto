import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

type PendingMaterialRequest = {
  requestId: number;
  bookingItemId: number;
  bookingId: number;
  scheduledStart: string;
  requestedByEmployeeId: number;
  requestedByEmployeeName: string;
  requestedAt: string;
  lines: {
    materialId: number;
    materialName: string;
    defaultQty: number;
    currentActualQty: number;
    proposedActualQty: number;
  }[];
};

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit {

  branchId = 1;
  cashierId = 5; // ✅ حطي cashierId الحقيقي
  selectedDate = this.todayYYYYMMDD();

  isLoading = false;

  pendingRequests: PendingMaterialRequest[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  onDateChange(e: any) {
    this.selectedDate = (e.target.value || '').trim();
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;

    this.api.getPendingMaterialRequests(this.branchId, this.selectedDate).subscribe({
      next: (res: any) => {
        this.pendingRequests = res?.data ?? [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.pendingRequests = [];
        this.isLoading = false;
        alert(err?.error?.message || 'فشل تحميل الطلبات');
      }
    });
  }

  approve(req: PendingMaterialRequest): void {
    const note = ''; // اختياري
    const payload = { cashierId: this.cashierId, note };

    this.api.approveMaterialRequest(req.bookingItemId, req.requestId, payload).subscribe({
      next: () => {
        alert('تمت الموافقة');
        this.pendingRequests = this.pendingRequests.filter(x => x.requestId !== req.requestId);
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل الموافقة');
      }
    });
  }

  reject(req: PendingMaterialRequest): void {
    const note = ''; // اختياري
    const payload = { cashierId: this.cashierId, note };

    this.api.rejectMaterialRequest(req.bookingItemId, req.requestId, payload).subscribe({
      next: () => {
        alert('تم الرفض');
        this.pendingRequests = this.pendingRequests.filter(x => x.requestId !== req.requestId);
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'فشل الرفض');
      }
    });
  }

  clearAll(): void {
    // هنا "مسح الكل" = تفريغ عرض القائمة فقط (مش API)
    this.pendingRequests = [];
  }

  private todayYYYYMMDD(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}

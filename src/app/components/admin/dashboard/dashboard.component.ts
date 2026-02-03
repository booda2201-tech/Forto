import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

type DashboardSummary = {
  branchId: number;
  from: string;
  to: string;

  paidRevenue: number;
  materialsConsumeCost: number;
  materialsWasteCost: number;
  materialsAdjustNet: number;

  productsSoldCost: number;
  giftsCost: number;
  productsAdjustNet: number;

  totalCosts: number;
  netProfit: number;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  branchId = 1;

  // UI filters
  fromDate = '';
  toDate = '';

  // real summary from API (default values)
  summary: DashboardSummary | null = null;

  isLoading = false;
  errorMsg = '';

  // من API: /api/dashboard/employees
  dashboardEmployees: { id: number; name: string; count: number; percent: number }[] = [];
  totalDoneItemsEmployees = 0;

  // من API: /api/dashboard/services
  dashboardServices: { id: number; name: string; count: number; percent: number }[] = [];
  totalDoneItemsServices = 0;

  // ألوان للخدمات في الـ progress
  serviceColors = ['#ff9800', '#2196f3', '#4caf50', '#9c27b0', '#00bcd4', '#ff5722'];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // default: أول يوم في الشهر الحالي → اليوم
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate = this.formatDateYYYYMMDD(firstOfMonth);
    this.toDate = this.formatDateYYYYMMDD(now);

    this.loadSummary();
  }

  loadSummary(): void {
    if (!this.fromDate || !this.toDate) return;

    this.isLoading = true;
    this.errorMsg = '';

    const params = {
      branchId: this.branchId,
      from: this.fromDate,
      to: this.toDate
    };

    this.api.getDashboardSummary(params).subscribe({
      next: (res: any) => {
        this.summary = res?.data ?? null;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.summary = null;
        this.errorMsg = err?.error?.message || 'فشل تحميل بيانات الداشبورد';
      }
    });

    this.api.getDashboardServices(params).subscribe({
      next: (res: any) => {
        const data = res?.data;
        this.dashboardServices = data?.items ?? [];
        this.totalDoneItemsServices = data?.totalDoneItems ?? 0;
      },
      error: () => {
        this.dashboardServices = [];
        this.totalDoneItemsServices = 0;
      }
    });

    this.api.getDashboardEmployees(params).subscribe({
      next: (res: any) => {
        const data = res?.data;
        this.dashboardEmployees = data?.items ?? [];
        this.totalDoneItemsEmployees = data?.totalDoneItems ?? 0;
      },
      error: () => {
        this.dashboardEmployees = [];
        this.totalDoneItemsEmployees = 0;
      }
    });

  }

  // KPIs for UI
  get totalRevenue(): number {
    return Number(this.summary?.paidRevenue ?? 0);
  }

  get totalCosts(): number {
    return Number(this.summary?.totalCosts ?? 0);
  }

  get netProfit(): number {
    return Number(this.summary?.netProfit ?? 0);
  }

  get productsCost(): number {
    return Number(this.summary?.productsSoldCost ?? 0);
  }

  get materialsCost(): number {
    return Number(this.summary?.materialsConsumeCost ?? 0);
  }

  getServiceColor(index: number): string {
    return this.serviceColors[index % this.serviceColors.length];
  }

  // helper
  private formatDateYYYYMMDD(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}

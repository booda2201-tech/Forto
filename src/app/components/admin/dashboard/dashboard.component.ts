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

  // keep your placeholders until you get endpoints
  staffPerformance = [
    { name: 'أحمد محمد', completedCount: 8, isBusy: true },
    { name: 'أدهم الشرقاوي', completedCount: 5, isBusy: false },
    { name: 'محمود كهربا', completedCount: 10, isBusy: true },
    { name: 'تامر حسني', completedCount: 3, isBusy: false },
    { name: 'سيد رجب', completedCount: 7, isBusy: true },
    { name: 'إبراهيم حسن', completedCount: 0, isBusy: false }
  ];

  topServices = [
    { name: 'غسيل خارجي نانو', count: 45, color: '#ff9800' },
    { name: 'تلميع صالون كامل', count: 20, color: '#2196f3' },
    { name: 'غسيل محرك بخار', count: 12, color: '#4caf50' }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // default: today → today
    const today = this.formatDateYYYYMMDD(new Date());
    this.fromDate = today;
    this.toDate = today;

    this.loadSummary();
  }

  loadSummary(): void {
    if (!this.fromDate || !this.toDate) return;

    this.isLoading = true;
    this.errorMsg = '';

    this.api.getDashboardSummary({
      branchId: this.branchId,
      from: this.fromDate,
      to: this.toDate
    }).subscribe({
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

  // helper
  private formatDateYYYYMMDD(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  
}

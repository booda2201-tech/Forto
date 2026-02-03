import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

type EmployeeItem = {
  employeeId: number;
  employeeName: string;
  role: number;
  count: number;
  percent: number;
  services: { serviceId?: number; serviceName?: string; name?: string; count?: number }[];
  invoicesAsCashierCount: number;
  invoicesAsSupervisorCount: number;
};

@Component({
  selector: 'app-employees-report',
  templateUrl: './employees-report.component.html',
  styleUrls: ['./employees-report.component.scss']
})
export class EmployeesReportComponent implements OnInit {
  branchId = 1;
  fromDate = '';
  toDate = '';
  roleFilter = 0;

  items: EmployeeItem[] = [];
  // totalInvoicesAsCashier = 0;
  // totalInvoicesAsSupervisor = 0;
  totalDoneItems = 0;
  isLoading = false;
  errorMsg = '';

  roleOptions = [
    { id: 0, label: 'الكل' },
    { id: 1, label: 'عامل' },
    { id: 2, label: 'كاشير' },
    { id: 3, label: 'مشرف' },
    { id: 4, label: 'أدمن' },
  ];

  expandedEmployeeId: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate = this.formatDate(firstOfMonth);
    this.toDate = this.formatDate(now);
    this.load();
  }

  load(): void {
    if (!this.fromDate || !this.toDate) return;

    this.isLoading = true;
    this.errorMsg = '';

    this.api.getDashboardEmployeesWithServices({
      branchId: this.branchId,
      from: this.fromDate,
      to: this.toDate,
      role: this.roleFilter > 0 ? this.roleFilter : undefined,
    }).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        this.items = data?.items ?? [];
        this.totalDoneItems = data?.totalDoneItems ?? 0;
        // this.totalInvoicesAsCashier = this.items.reduce((s, e) => s + (e.invoicesAsCashierCount ?? 0), 0);
        // this.totalInvoicesAsSupervisor = this.items.reduce((s, e) => s + (e.invoicesAsSupervisorCount ?? 0), 0);
        this.isLoading = false;
      },
      error: () => {
        this.items = [];
        this.isLoading = false;
        this.errorMsg = 'فشل تحميل البيانات';
      }
    });
  }

  getRoleLabel(role: number): string {
    return this.roleOptions.find(o => o.id === role)?.label ?? '';
  }

  /** عامل: يخفى فواتير ككاشير وكمشرف */
  get showInvoicesAsCashier(): boolean {
    return this.roleFilter !== 1 && this.roleFilter !== 3;
  }

  /** كاشير: يخفى فواتير كمشرف | مشرف: يخفى فواتير ككاشير */
  get showInvoicesAsSupervisor(): boolean {
    return this.roleFilter !== 1 && this.roleFilter !== 2;
  }

  /** مشرف وكاشير: يخفى الخدمات المنفذة */
  get showServices(): boolean {
    return this.roleFilter !== 2 && this.roleFilter !== 3;
  }

  get visibleColumnCount(): number {
    return 2 + (this.showInvoicesAsCashier ? 1 : 0) + (this.showInvoicesAsSupervisor ? 1 : 0) + (this.showServices ? 1 : 0);
  }

  toggleExpand(employeeId: number): void {
    this.expandedEmployeeId = this.expandedEmployeeId === employeeId ? null : employeeId;
  }

  getServiceDisplayName(svc: any): string {
    return svc?.serviceName ?? svc?.name ?? 'خدمة';
  }

  getServiceCount(svc: any): number {
    return svc?.count ?? 0;
  }

  private formatDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}

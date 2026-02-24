import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * عند حفظ "مبالغ أخرى" من النافبار نستدعي requestRefresh()
 * وصفحة الفواتير (كاشير/أدمن) تستمع وتحدّث القائمة والإحصائيات.
 */
@Injectable({
  providedIn: 'root',
})
export class InvoicesRefreshService {
  private refresh$ = new Subject<void>();
  readonly onRefreshRequested = this.refresh$.asObservable();

  requestRefresh(): void {
    this.refresh$.next();
  }
}

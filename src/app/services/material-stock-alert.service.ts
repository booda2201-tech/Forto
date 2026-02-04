import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MaterialStockAlertService {
  private countSubject = new BehaviorSubject<number>(0);
  alertCount$ = this.countSubject.asObservable();

  setCount(count: number): void {
    this.countSubject.next(count);
  }

  getCount(): number {
    return this.countSubject.getValue();
  }
}

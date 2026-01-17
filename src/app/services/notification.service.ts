import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// تأكد من تصدير هذه الواجهة ليراها المكون
export interface AppMessage {
  id: number;
  workerName: string;
  type: 'start' | 'end' | 'edit_request';
  content: string;
  time: Date;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private storageKey = 'forto_notifications';
  private messagesSource = new BehaviorSubject<AppMessage[]>(this.loadInitial());
  messages$ = this.messagesSource.asObservable();

  private loadInitial(): AppMessage[] {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : [];
  }

  addMessage(message: AppMessage) {
    const current = [message, ...this.messagesSource.getValue()];
    this.messagesSource.next(current);
    localStorage.setItem(this.storageKey, JSON.stringify(current));
  }

  removeMessage(id: number) {
    const filtered = this.messagesSource.getValue().filter(m => m.id !== id);
    this.messagesSource.next(filtered);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  clearAll() {
    this.messagesSource.next([]);
    localStorage.removeItem(this.storageKey);
  }

  loadFromStorage() {
    this.messagesSource.next(this.loadInitial());
  }
}

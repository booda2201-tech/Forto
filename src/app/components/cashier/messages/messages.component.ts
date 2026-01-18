import { Component, OnInit } from '@angular/core';
import { NotificationService, AppMessage  } from 'src/app/services/notification.service';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit {

  messages: AppMessage[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {

  this.notificationService.messages$.subscribe((data) => {
    this.messages = data;

    window.addEventListener('storage', (event) => {
    if (event.key === 'forto_notifications') {
      this.notificationService.loadFromStorage();
    }
  });
  });


  window.addEventListener('storage', (event) => {
    if (event.key === 'forto_notifications') {

      this.notificationService.loadFromStorage();
    }
  });
}


  getStatusClass(type: string): string {
    switch (type) {
      case 'start': return 'bg-primary-subtle text-primary';
      case 'edit_request': return 'bg-warning-subtle text-warning';
      case 'end': return 'bg-success-subtle text-success';
      default: return 'bg-light text-secondary';
    }
  }


  getIconClass(type: string): string {
    switch (type) {
      case 'start': return 'bi-play-circle-fill';
      case 'edit_request': return 'bi-pencil-square';
      case 'end': return 'bi-check-circle-fill';
      default: return 'bi-bell';
    }
  }


  removeMessage(id: number): void {
    this.notificationService.removeMessage(id);
  }


  clearAll(): void {
    this.notificationService.clearAll();
  }


  approveEdit(msg: AppMessage): void {
    console.log('تمت الموافقة على تعديلات الحجز رقم:', msg.id);

    this.removeMessage(msg.id);
  }

  rejectEdit(msg: AppMessage): void {
    console.log('تم رفض طلب التعديل:', msg.id);
    this.removeMessage(msg.id);
  }
}

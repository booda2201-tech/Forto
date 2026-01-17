import { Component, OnInit } from '@angular/core';
import { NotificationService, AppMessage  } from 'src/app/services/notification.service';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit {
  // تعريف المصفوفة التي يتم عرضها في الـ *ngFor
  messages: AppMessage[] = [];

  constructor(private notificationService: NotificationService) {}

 ngOnInit(): void {
  // 1. الاشتراك العادي في الخدمة
  this.notificationService.messages$.subscribe((data) => {
    this.messages = data;
  });

  // 2. إضافة مراقب للتبويبات الأخرى (إذا تم الإرسال من تبويب العامل)
  window.addEventListener('storage', (event) => {
    if (event.key === 'forto_notifications') {
      // هذه الدالة ستجعل صفحة الكاشير تحدث نفسها تلقائياً عند إرسال العامل رسالة
      this.notificationService.loadFromStorage();
    }
  });
}

  // دالة لتحديد لون الأيقونة بناءً على نوع الرسالة
  getStatusClass(type: string): string {
    switch (type) {
      case 'start': return 'bg-primary-subtle text-primary';
      case 'edit_request': return 'bg-warning-subtle text-warning';
      case 'end': return 'bg-success-subtle text-success';
      default: return 'bg-light text-secondary';
    }
  }

  // دالة لتحديد شكل الأيقونة بناءً على النوع
  getIconClass(type: string): string {
    switch (type) {
      case 'start': return 'bi-play-circle-fill';
      case 'edit_request': return 'bi-pencil-square';
      case 'end': return 'bi-check-circle-fill';
      default: return 'bi-bell';
    }
  }

  // حذف رسالة واحدة
  removeMessage(id: number): void {
    this.notificationService.removeMessage(id);
  }

  // حذف كل الرسائل
  clearAll(): void {
    this.notificationService.clearAll();
  }

  // الأزرار التفاعلية لطلب التعديل
  approveEdit(msg: AppMessage): void {
    console.log('تمت الموافقة على تعديلات الحجز رقم:', msg.id);
    // هنا مستقبلاً ستضع كود الـ API لتحديث الفاتورة
    this.removeMessage(msg.id); // حذف الرسالة بعد التأكيد
  }

  rejectEdit(msg: AppMessage): void {
    console.log('تم رفض طلب التعديل:', msg.id);
    this.removeMessage(msg.id);
  }
}

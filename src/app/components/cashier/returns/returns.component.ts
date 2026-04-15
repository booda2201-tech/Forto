// returns.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service'; // تأكد من المسار
import { PrintInvoiceService } from 'src/app/services/print-invoice.service';

@Component({
  selector: 'app-returns',
  templateUrl: './returns.component.html',
  styleUrls: ['./returns.component.scss']
})
export class ReturnsComponent implements OnInit {
  returnedInvoices: any[] = [];
  isLoading: boolean = false;
  selectedReturn: any = null;
  
  // كائنات لتخزين الإحصائيات الحقيقية
  stats = {
    totalCount: 0,
    totalAmount: 0,
    cashAmount: 0,
    visaAmount: 0
  };

  constructor(
    private apiService: ApiService,
    private printInvoice: PrintInvoiceService
  ) { }

  ngOnInit(): void {
    this.fetchReturns();
  }

  fetchReturns() {
    this.isLoading = true;
    // تم استخدام branchId = 1 كما هو ظاهر في الـ Postman الخاص بك
    this.apiService.getReturns(1).subscribe({
      next: (response) => {
        if (response.success) {
          this.returnedInvoices = response.data;
          this.calculateStats(); // تحديث البطاقات العلوية بالبيانات الحقيقية
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching returns:', err);
        this.isLoading = false;
      }
    });
  }

  calculateStats() {
    this.stats.totalCount = this.returnedInvoices.length;
    this.stats.totalAmount = this.returnedInvoices.reduce((sum, item) => sum + item.total, 0);
    this.stats.cashAmount = this.returnedInvoices
      .filter(item => item.refundMethod === 1) // 1 تعني كاش بناءً على الـ API
      .reduce((sum, item) => sum + item.total, 0);
    this.stats.visaAmount = this.stats.totalAmount - this.stats.cashAmount;
  }

// returns.component.ts

  deleteInvoice(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا المرتجع؟')) {
      this.apiService.deleteReturn(id).subscribe({
        next: (res: any) => {
          // إذا نجح السيرفر (Status 200)
          alert('تم الحذف بنجاح');
          this.fetchReturns(); 
        },
        error: (err) => {
          console.error('Full Error:', err); // لعرض تفاصيل الخطأ في الـ Console
          
          // التعامل مع رسالة التعارض (Conflict 409) أو الطلب الخاطئ (400)
          if (err.status === 409 || err.status === 400) {
            // محاولة قراءة الرسالة من السيرفر إذا كان يرسل "Cannot delete this return..."
            const errorMsg = err.error?.message || 'لا يمكن حذف هذا المرتجع ';
            alert('فشل الحذف: ' + errorMsg);
          } else {
            alert('حدث خطأ غير متوقع أثناء الاتصال بالسيرفر.');
          }
        }
      });
    }
  }

  paymentLabel(method: number): string {
  if (method === 1) return 'كاش';
  if (method === 2) return 'فيزا';
  return 'غير معروف';
}

  viewDetails(item: any) {
  this.selectedReturn = item;
  // إذا كان الـ API يوفر دالة جلب بالـ ID يفضل استخدامها لضمان أحدث بيانات
  // ولكن حالياً سنعرض البيانات الموجودة بالفعل في الكائن
  }

  /** إظهار رقم الفاتورة الأصلي (Invoice Number) بدل الـ ID */
  originalInvoiceNumber(item: any): string {
    return String(
      item?.originalInvoiceNumber ??
      item?.invoiceNumber ??
      item?.originalInvoiceNo ??
      item?.originalInvoiceId ??
      '-'
    );
  }

  // طباعة بنفس شكل فاتورة النظام مع توضيح أنها مرتجع
  downloadReturnInvoice(item?: any) {
    if (item) this.selectedReturn = item;
    if (!this.selectedReturn) {
      alert('لا توجد بيانات مرتجع للطباعة');
      return;
    }
    setTimeout(() => this.printInvoice.print('adminPrintableReturnInvoice'), 100);
  }

}
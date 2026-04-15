// returns.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service'; // تأكد من المسار
import { PrintInvoiceService } from 'src/app/services/print-invoice.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-returns',
  templateUrl: './returns.component.html',
  styleUrls: ['./returns.component.scss']
})
export class ReturnsComponent implements OnInit {
  allReturns: any[] = []; // المصفوفة الأصلية من السيرفر
  filteredInvoices: any[] = []; // المصفوفة التي ستعرض في الجدول
  isLoading: boolean = false;
  returnedInvoices: any[] = [];
  selectedReturn: any = null;
  
  filterSettings = {
    searchText: '',
    fromDate: new Date().toISOString().split('T')[0], // تاريخ اليوم كافتراضي
    toDate: new Date().toISOString().split('T')[0],   // تاريخ اليوم كافتراضي
    paymentMethod: '0'
  };

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
  this.apiService.getReturns(1).subscribe({
    next: (response) => {
      if (response.success) {
        // ✅ المهم جداً: وضع البيانات في allReturns لأنها مصدر الفلترة
        this.allReturns = response.data; 
        this.applyFilter(); 
      }
      this.isLoading = false;
    },
    error: (err) => {
      console.error('Error fetching returns:', err);
      this.isLoading = false;
    }
  });
}

applyFilter() {
  if (!this.allReturns) return;

  this.filteredInvoices = this.allReturns.filter(item => {
    // 1. فلترة التاريخ (استخدمنا الحقل الصحيح item.refundedAt)
    const itemDate = new Date(item.refundedAt).toISOString().split('T')[0];
    const matchDate = itemDate >= this.filterSettings.fromDate && 
                      itemDate <= this.filterSettings.toDate;

    // 2. فلترة نص البحث (استخدمنا الحقول الصحيحة item.clientName و item.id)
    const search = this.filterSettings.searchText.toLowerCase();
    const matchSearch = !search || 
                        item.clientName?.toLowerCase().includes(search) || 
                        item.id?.toString().includes(search) ||
                        item.clientNumber?.includes(search);

    // 3. فلترة طريقة الدفع
    const matchPayment = this.filterSettings.paymentMethod === '0' || 
                         item.refundMethod.toString() === this.filterSettings.paymentMethod;

    return matchDate && matchSearch && matchPayment;
  });

  this.calculateStats(); 
}

calculateStats() {
    // استخدم filteredInvoices بدلاً من returnedInvoices لتكون الأرقام مطابقة لما يراه المستخدم
    this.stats.totalCount = this.filteredInvoices.length;
    this.stats.totalAmount = this.filteredInvoices.reduce((sum, item) => sum + item.total, 0);
    this.stats.cashAmount = this.filteredInvoices
      .filter(item => item.refundMethod === 1)
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


  // دالة لتصدير البيانات المفلترة إلى Excel
  exportExcel() {
    if (this.filteredInvoices.length === 0) {
      alert('لا توجد بيانات لتصديرها');
      return;
    }
    console.log('جاري تصدير Excel...', this.filteredInvoices);
    // هنا يتم استدعاء مكتبة XLSX إذا كانت مثبتة لديك
  }



exportPDF() {
  if (this.filteredInvoices.length === 0) {
    alert('لا توجد بيانات للطباعة');
    return;
  }
  // استدعاء أمر طباعة المتصفح
  window.print();
}


}
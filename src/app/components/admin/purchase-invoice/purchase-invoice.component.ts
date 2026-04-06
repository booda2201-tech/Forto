

// export class PurchaseInvoiceComponent {
//   currentTab: 'list' | 'add' = 'list';

//   // قيم الملخص المالي
//   taxPercentage = 0;
//   discountPercentage = 0;
//   amountPaid = 0;

//   // مصفوفة العناصر داخل الفاتورة
//   invoiceItems = [
//     { type: 'product', name: '', quantity: 1, purchasePrice: 0, sellingPrice: 0 }
//   ];

//   // إضافة سطر جديد
//   addNewItem() {
//     this.invoiceItems.push({
//       type: 'product',
//       name: '',
//       quantity: 1,
//       purchasePrice: 0,
//       sellingPrice: 0
//     });
//   }

//   // حذف سطر
//   removeItem(index: number) {
//     if (this.invoiceItems.length > 1) {
//       this.invoiceItems.splice(index, 1);
//     }
//   }

//   // 1. حساب إجمالي المنتجات قبل الضريبة والخصم
//   get subTotal(): number {
//     return this.invoiceItems.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
//   }

//   // 2. حساب قيمة الضريبة
//   get taxAmount(): number {
//     return (this.subTotal * this.taxPercentage) / 100;
//   }

//   // 3. حساب قيمة الخصم
//   get discountAmount(): number {
//     return (this.subTotal * this.discountPercentage) / 100;
//   }

//   // 4. الإجمالي النهائي
//   get finalTotal(): number {
//     return this.subTotal + this.taxAmount - this.discountAmount;
//   }

//   // 5. المتبقي (الآجل)
//   get remainingAmount(): number {
//     return this.finalTotal - this.amountPaid;
//   }

//   // دالة فارغة فقط لمنع الخطأ في HTML لأننا نستخدم Getters للحساب اللحظي
//   calculateTotal() { }

//   previousInvoices = [
//     { id: 'INV-5501', supplier: 'شركة الأمل للتوريدات', date: '2024-03-20', branch: 'فرع القاهرة', total: 15400, paid: 10000, remaining: 5400, status: 'partial' },
//     { id: 'INV-5502', supplier: 'المركز العالمي للقطع', date: '2024-03-22', branch: 'فرع الجيزة', total: 8200, paid: 8200, remaining: 0, status: 'paid' },
//     { id: 'INV-5503', supplier: 'مؤسسة النور الحديثة', date: '2024-03-25', branch: 'فرع الإسكندرية', total: 22000, paid: 0, remaining: 22000, status: 'unpaid' },
//     { id: 'INV-5504', supplier: 'مصنع الشرق للأدوات', date: '2024-03-28', branch: 'فرع القاهرة', total: 1250, paid: 1250, remaining: 0, status: 'paid' }
//   ];
// // بياناتك التجريبية كما هي
// }






import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-purchase-invoice',
  templateUrl: './purchase-invoice.component.html',
  styleUrls: ['./purchase-invoice.component.scss']
})
export class PurchaseInvoiceComponent implements OnInit {
  currentTab: 'list' | 'add' = 'add';
  previousInvoices: any[] = [];
  suppliers: any[] = [];

  isLoading = false;
  taxRate = 0;
  discount = 0;
  amountPaid = 0;

  // تهيئة التاريخ بصيغة متوافقة مع input type="date"
  todayDate = new Date().toISOString().split('T')[0];

  invoiceDetails = {
    supplierId: null,
    branchId: 2549,
    invoiceDate: this.todayDate,
    paymentMethod: 1, // 1: Cash, 2: Visa, 3: Credit (آجل)
    recordedByEmployeeId: 6827
  };

  invoiceItems = [
    { lineKind: 0, productId: null, materialId: null, qty: 1, unitPurchasePrice: 0, unitSalePrice: 0 }
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadInvoices();
    this.loadSuppliers();
  }

loadSuppliers() {
    this.apiService.getAllSuppliers().subscribe({
      next: (res: any) => {
        // 👇 التعديل هنا: إضافة .data أو .items حسب ما الباك إند بيرجع
        this.suppliers = res.data ? res.data : res;

        // 💡 ملحوظة: لو فضلت المشكلة، افتح الكونسول وشوف السطر ده طابع إيه
        console.log('شكل استجابة الموردين:', res);
      },
      error: (err) => console.error('خطأ في جلب الموردين', err)
    });
  }

  loadInvoices() {
    this.isLoading = true;
    this.apiService.getAllPurchaseInvoices().subscribe({
      next: (res: any) => {
        // 👇 التعديل هنا أيضاً
        this.previousInvoices = res.data ? res.data : res;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  saveInvoice() {
    this.isLoading = true;

    // بناء الـ Payload مع توزيع المبلغ المدفوع حسب وسيلة الدفع
    const paymentType = Number(this.invoiceDetails.paymentMethod);

    const payload = {
      branchId: this.invoiceDetails.branchId,
      items: this.invoiceItems,
      paymentMethod: paymentType,
      recordedByEmployeeId: this.invoiceDetails.recordedByEmployeeId,
      supplierId: this.invoiceDetails.supplierId,
      invoiceDate: new Date(this.invoiceDetails.invoiceDate).toISOString(), // تحويله لـ ISO للـ Backend
      discount: this.discount,
      taxRate: this.taxRate,
      amountPaid: this.amountPaid,
      // توجيه المبلغ المدفوع للخزنة الصحيحة
      cashAmount: paymentType === 1 ? this.amountPaid : 0,
      visaAmount: paymentType === 2 ? this.amountPaid : 0
    };

    this.apiService.createPurchaseInvoice(payload).subscribe({
      next: () => {
        alert('تم حفظ الفاتورة بنجاح!');
        this.resetForm();
        this.loadInvoices();
        this.currentTab = 'list'; // العودة لقائمة الفواتير
        this.isLoading = false;
      },
      error: (err) => {
        alert('حدث خطأ أثناء حفظ الفاتورة');
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  resetForm() {
    this.invoiceItems = [{ lineKind: 0, productId: null, materialId: null, qty: 1, unitPurchasePrice: 0, unitSalePrice: 0 }];
    this.discount = 0;
    this.taxRate = 0;
    this.amountPaid = 0;
    this.invoiceDetails.supplierId = null;
    this.invoiceDetails.invoiceDate = this.todayDate;
    this.invoiceDetails.paymentMethod = 1;
  }

  // Getters للحسابات التلقائية
  get subTotal() {
    return this.invoiceItems.reduce((acc, item) => acc + (item.qty * item.unitPurchasePrice), 0);
  }

  get finalTotal() {
    return this.subTotal + (this.subTotal * this.taxRate / 100) - (this.subTotal * this.discount / 100);
  }

  get remainingAmount() {
    return this.finalTotal - this.amountPaid;
  }

  addNewItem() {
    this.invoiceItems.push({ lineKind: 0, productId: null, materialId: null, qty: 1, unitPurchasePrice: 0, unitSalePrice: 0 });
  }

  removeItem(index: number) {
    if (this.invoiceItems.length > 1) this.invoiceItems.splice(index, 1);
  }
}

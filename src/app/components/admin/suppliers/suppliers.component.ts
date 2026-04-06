// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// export interface Partner {
//   id: number;
//   nameAr: string;
//   nameEn: string;
//   categoryAr: string;
//   categoryEn: string;
//   phone: string;
//   currentBalance: number;
//   lastPaymentDate: string;
//   lastPaymentAmount: number;
//   type: 'supplier' | 'company';
// }

// declare var bootstrap: any;

// @Component({
//   selector: 'app-suppliers',
//   templateUrl: './suppliers.component.html',
//   styleUrls: ['./suppliers.component.scss']
// })
// export class SuppliersComponent implements OnInit {

//   viewType: 'supplier' | 'company' = 'supplier';
//   paymentForm!: FormGroup;
//   selectedPartner: any;
//   transactions: any[] = [];
//   selectedInvoice: any;

//   allPartners: Partner[] = [
//     {
//       id: 1,
//       nameAr: 'مورد قطع الغيار الموثوق',
//       nameEn: 'Reliable Parts Supplier',
//       categoryAr: 'قطع غيار',
//       categoryEn: 'Spare Parts',
//       phone: '93456789',
//       currentBalance: 5000,
//       lastPaymentDate: '2026-03-30',
//       lastPaymentAmount: 8000,
//       type: 'supplier'
//     },
//     {
//       id: 2,
//       nameAr: 'شركة الأدوات والمعدات',
//       nameEn: 'Tools & Equipment Co.',
//       categoryAr: 'أدوات',
//       categoryEn: 'Tools',
//       phone: '91234567',
//       currentBalance: 2500,
//       lastPaymentDate: '2026-03-28',
//       lastPaymentAmount: 5000,
//       type: 'company'
//     }
//   ];

//   filteredPartners: Partner[] = [];
//   searchTerm: string = '';

//   constructor(private fb: FormBuilder) {}

//   ngOnInit(): void {
//     this.filterByType();
//     this.initPaymentForm();
//   }

//   initPaymentForm() {
//     this.paymentForm = this.fb.group({
//       amount: [null, [Validators.required, Validators.min(1)]],
//       method: ['cash', Validators.required],
//       cashAmount: [0],
//       visaAmount: [{ value: 0, disabled: true }]
//     });

//     this.paymentForm.get('cashAmount')?.valueChanges.subscribe(() => this.calculateSplit());
//     this.paymentForm.get('amount')?.valueChanges.subscribe(() => this.calculateSplit());
//   }

//   calculateSplit() {
//     const total = this.paymentForm.get('amount')?.value || 0;
//     const cash = this.paymentForm.get('cashAmount')?.value || 0;

//     if (cash > total) {
//       this.paymentForm.get('cashAmount')?.patchValue(total, { emitEvent: false });
//       this.paymentForm.get('visaAmount')?.patchValue(0);
//     } else {
//       this.paymentForm.get('visaAmount')?.patchValue(total - cash);
//     }
//   }

//   // --- دالة عرض الفاتورة المعدلة ---
//   viewInvoice(transaction: any) {
//     // نقوم بتجهيز بيانات الفاتورة كاملة مع المنتجات
//     this.selectedInvoice = {
//       ...transaction,
//       supplierName: this.selectedPartner?.nameAr,
//       branch: transaction.branch || 'الفرع الرئيسي',
//       // إذا لم تكن هناك منتجات في الكائن المرسل، نضع مصفوفة فارغة
//       items: transaction.items || [],
//       tax: transaction.tax || 0,
//       discount: transaction.discount || 0
//     };

//     const modalElement = document.getElementById('invoiceModal');
//     if (modalElement) {
//       const modal = new bootstrap.Modal(modalElement);
//       modal.show();
//     }
//   }

//   // --- محاكاة جلب كشف الحساب مع المنتجات ---
//   viewStatement(partner: any) {
//     this.selectedPartner = partner;

//     // محاكاة البيانات القادمة من السيرفر
//     this.transactions = [
//       {
//         id: '101',
//         date: '2026-03-30',
//         reference: 'فاتورة مشتريات #101',
//         debit: 8000,
//         credit: 0,
//         balance: 8000,
//         branch: 'فرع الجيزة',
//         tax: 1120, // 14%
//         discount: 0,
//         items: [
//           { name: 'فحمات فرامل خلفي', qty: 2, price: 1500, total: 3000 },
//           { name: 'مساعدين أمامي KYB', qty: 2, price: 2500, total: 5000 }
//         ]
//       },
//       {
//         id: '202',
//         date: '2026-04-01',
//         reference: 'دفعة نقدية #202',
//         debit: 0,
//         credit: 3000,
//         balance: 5000,
//         method: 'نقدي'
//       }
//     ];

//     const modalElement = document.getElementById('statementModal');
//     const modal = new bootstrap.Modal(modalElement);
//     modal.show();
//   }

//   // الدوال المساعدة الأخرى
//   switchView(type: 'supplier' | 'company') {
//     this.viewType = type;
//     this.filterByType();
//   }

//   filterByType() {
//     this.filteredPartners = this.allPartners.filter(p =>
//       p.type === this.viewType &&
//       (p.nameAr.includes(this.searchTerm) || p.nameEn.toLowerCase().includes(this.searchTerm.toLowerCase()))
//     );
//   }

//   getTotalDebt(): number {
//     return this.filteredPartners.reduce((acc, curr) => acc + curr.currentBalance, 0);
//   }

//   onPay(partner: any) {
//     this.selectedPartner = partner;
//     this.paymentForm.reset({ method: 'cash', amount: null, cashAmount: 0 });
//     const modalElement = document.getElementById('payModal');
//     const modal = new bootstrap.Modal(modalElement);
//     modal.show();
//   }

//   confirmPayment() {
//     if (this.paymentForm.valid) {
//       const rawData = this.paymentForm.getRawValue();
//       console.log('بيانات الدفع:', rawData);
//       const modalElement = document.getElementById('payModal');
//       bootstrap.Modal.getInstance(modalElement).hide();
//     }
//   }
// }































import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service'; // تأكد من المسار الصحيح

export interface PurchaseInvoice {
  supplierId: number;      // المورد
  branch: string;          // الفرع
  date: string;            // التاريخ
  discount: number;        // خصم
  tax: number;             // ضريبة
  paymentMethod: 'cash' | 'visa' | 'split'; // وسيلة الدفع
  employeeName: string;    // مين الموظف اللي سجلها
  paidAmount: number;      // دفعت كام
  totalAmount: number;     // الإجمالي (سيتم حسابه تلقائياً)
  items: InvoiceItem[];    // والمنتجات أيه
}

export interface InvoiceItem {
  productId: number;
  productName: string;
  quantity: number;        // الكمية
  purchasePrice: number;   // سعر الشراء
  sellingPrice: number;    // سعر البيع (مطلوب في الورقة)
}

declare var bootstrap: any;




@Component({
  selector: 'app-suppliers',
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.scss']
})
export class SuppliersComponent implements OnInit {

  viewType: 'supplier' | 'company' = 'supplier';
  paymentForm!: FormGroup;
  addPartnerForm!: FormGroup; // نموذج إضافة مورد جديد
  selectedPartner: any;
  transactions: any[] = [];
  selectedInvoice: any;

  allPartners: any[] = [];
  filteredPartners: any[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;

  constructor(private fb: FormBuilder, private apiService: ApiService) {}

  ngOnInit(): void {
    this.initForms();
    this.loadSuppliers(); // جلب البيانات عند البداية
  }

  initForms() {
    // نموذج الدفع
    this.paymentForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      method: ['cash', Validators.required],
      cashAmount: [0],
      visaAmount: [{ value: 0, disabled: true }]
    });

    // نموذج إضافة مورد/شركة جديد (مطابق للـ API)
    this.addPartnerForm = this.fb.group({
      supplierNameAr: ['', Validators.required],
      supplierNameEn: ['', Validators.required],
      companyNameAr: [''],
      companyNameEn: [''],
      phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      openingBalance: [0]
    });

    this.paymentForm.get('cashAmount')?.valueChanges.subscribe(() => this.calculateSplit());
    this.paymentForm.get('amount')?.valueChanges.subscribe(() => this.calculateSplit());
  }

  // --- جلب البيانات من الـ API ---
loadSuppliers() {
  this.isLoading = true;
  this.apiService.getAllSuppliers().subscribe({
    next: (data: any) => {
      // هذا السطر يحمي الكود من الانهيار إذا لم تكن البيانات مصفوفة
      this.allPartners = Array.isArray(data) ? data : (data.data || []);
      this.filterByType();
      this.isLoading = false;
    },
    error: (err: any) => { // إضافة : any هنا لحل مشكلة النوع في الصور
      console.error('Error:', err);
      this.allPartners = [];
      this.isLoading = false;
    }
  });
}

  // --- حفظ بيانات مورد جديد ---
// --- حفظ بيانات مورد جديد ---
onSavePartner() {
  if (this.addPartnerForm.valid) {
    this.isLoading = true; // الزر يتحول لـ "جاري الحفظ"

    const formValue = this.addPartnerForm.value;
    const payload = {
      supplierNameAr: formValue.supplierNameAr,
      supplierNameEn: formValue.supplierNameEn,
      companyNameAr: this.viewType === 'company' ? formValue.supplierNameAr : "",
      companyNameEn: this.viewType === 'company' ? formValue.supplierNameEn : "",
      phoneNumber: formValue.phoneNumber
    };

    this.apiService.createSupplier(payload).subscribe({
      next: (res) => {
        alert('تمت إضافة البيانات بنجاح');
        this.addPartnerForm.reset({ openingBalance: 0 });
        this.loadSuppliers();
        this.isLoading = false; // فك تعليق الزر عند النجاح
      },
      error: (err) => {
        console.error('Error saving:', err);
        alert('حدث خطأ أثناء الاتصال بالخادم');
        this.isLoading = false; // هام جداً: فك تعليق الزر حتى في حالة الخطأ
      },
      complete: () => {
        this.isLoading = false; // للتأكد الإضافي
      }
    });
  } else {
    this.addPartnerForm.markAllAsTouched();
  }
}

  // دالة مساعدة لإغلاق المودالات
  private closeModal(modalId: string) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) modalInstance.hide();
    }
  }

  // --- منطق عرض الفواتير والتعامل مع المودال ---
viewStatement(partner: any) {
  this.selectedPartner = partner;
  this.transactions = [];
  this.isLoading = true;

  this.apiService.getSupplierStatement(partner.id).subscribe({
    next: (data: any) => {
      // الحماية من البيانات الفارغة أو غير المتوافقة
      if (data && Array.isArray(data)) {
        this.transactions = data;
      } else if (data && data.transactions) {
        this.transactions = data.transactions;
      } else {
        this.transactions = [];
      }

      const modalElement = document.getElementById('statementModal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    },
    error: (err: any) => {
      console.error('Error fetching statement:', err);
      alert('فشل في تحميل كشف الحساب');
      this.isLoading = false;
    },
    complete: () => this.isLoading = false
  });
}
// دالة الطباعة (بسيطة)
printStatement() {
  window.print();
}

  // بقية الدوال (filterByType, switchView, calculateSplit, الخ...)
filterByType() {
  if (!Array.isArray(this.allPartners)) {
    this.filteredPartners = [];
    return;
  }

  this.filteredPartners = this.allPartners.filter(p => {
    // منطق الفلترة الحالي الخاص بك...
    const isCorrectType = this.viewType === 'company'
      ? (p.companyNameAr || p.companyNameEn)
      : (!p.companyNameAr && !p.companyNameEn);

    const search = (this.searchTerm || '').toLowerCase();
    const matchSearch =
      p.supplierNameAr?.includes(search) ||
      p.supplierNameEn?.toLowerCase().includes(search) ||
      p.phoneNumber?.includes(search);

    return isCorrectType && matchSearch;
  });
}

  switchView(type: 'supplier' | 'company') {
    this.viewType = type;
    this.filterByType();
  }

getLastPaidDebt(): number {
  return this.filteredPartners.reduce((acc, curr) => acc + (curr.lastPaymentAmount || 0), 0);
}
  getTotalDebt(): number {
    return this.filteredPartners.reduce((acc, curr) => acc + (curr.currentBalance || 0), 0);
  }

  viewInvoice(transaction: any) {
    this.selectedInvoice = { ...transaction, supplierName: this.selectedPartner?.supplierNameAr };
    const modalElement = document.getElementById('invoiceModal');
    new bootstrap.Modal(modalElement).show();
  }

  onPay(partner: any) {
    this.selectedPartner = partner;
    this.paymentForm.reset({ method: 'cash', amount: null, cashAmount: 0 });
    const modalElement = document.getElementById('payModal');
    new bootstrap.Modal(modalElement).show();
  }

  calculateSplit() {
    const total = this.paymentForm.get('amount')?.value || 0;
    const cash = this.paymentForm.get('cashAmount')?.value || 0;
    this.paymentForm.get('visaAmount')?.setValue(total - cash, {emitEvent: false});
  }

  confirmPayment() { /* تنفيذ عملية الدفع عبر الـ API */ }
}

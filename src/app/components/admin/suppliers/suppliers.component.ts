
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { AppRoutingModule } from "src/app/app-routing.module"; // تأكد من المسار الصحيح

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
  styleUrls: ['./suppliers.component.scss'],
  // imports: [AppRoutingModule]
})
export class SuppliersComponent implements OnInit {

  viewType: 'supplier' | 'company' = 'company';
  paymentForm!: FormGroup;
  addPartnerForm!: FormGroup; // نموذج إضافة مورد جديد
  selectedPartner: any;
  transactions: any[] = [];
  invoicePayments: any[] = [];
  selectedInvoice: any;
  selectedInvoiceData: any = null;
  selectedInvoiceNumber: string = '';

  allPartners: any[] = [];
  filteredPartners: any[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  totalRecentPayments: number = 0;



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
      visaAmount: [0]
    });

    // نموذج إضافة مورد/شركة جديد (مطابق للـ API)
this.addPartnerForm = this.fb.group({
  supplierNameAr: [''], // اختياري
  supplierNameEn: [''], // اختياري
  companyNameAr: [''],  // اختياري
  companyNameEn: [''],  // اختياري
  phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]] // إجباري
});

    this.paymentForm.get('cashAmount')?.valueChanges.subscribe(() => this.autoCalculateVisa());
    this.paymentForm.get('amount')?.valueChanges.subscribe(() => this.autoCalculateVisa());


    this.paymentForm.get('method')?.valueChanges.subscribe((val) => {
          if (val !== 'custom') {
            this.paymentForm.patchValue({ cashAmount: 0, visaAmount: 0 }, { emitEvent: false });
          }
        });

  }

autoCalculateVisa() {
  const total = this.paymentForm.get('amount')?.value || 0;
  const cash = this.paymentForm.get('cashAmount')?.value || 0;
  let visa = total - cash;

  // لضمان عدم وجود أرقام سالبة
  if (visa < 0) visa = 0;

  this.paymentForm.patchValue({
    visaAmount: visa
  }, { emitEvent: false });
}

  // --- جلب البيانات من الـ API ---
loadSuppliers() {
  this.isLoading = true;
  this.apiService.getAllSuppliers().subscribe({
    next: (res: any) => {
      this.allPartners = res.data || [];
      this.filterByType();
      this.filteredPartners = [...this.allPartners];

      // حساب إجمالي الدفعات الأخيرة إذا كان الحقل موجوداً في الـ API
      // ملاحظة: في الصورة الحقل غير موجود، لذا سنفترض أنك ستضيفه أو تحسبه
      this.calculateRecentPayments();

      this.isLoading = false;
    },
    error: (err) => {
      this.isLoading = false;
    }
  });
}

  // --- حفظ بيانات مورد جديد ---
// --- حفظ بيانات مورد جديد ---
onSavePartner() {
  const formValue = this.addPartnerForm.value;

  // التحقق: هل يوجد اسم واحد على الأقل (تاجر أو شركة) وهل رقم الهاتف موجود؟
  const hasName = !!(formValue.supplierNameAr || formValue.supplierNameEn || 
                     formValue.companyNameAr || formValue.companyNameEn);
  const hasPhone = !!formValue.phoneNumber;

  if (hasName && hasPhone) {
    this.isLoading = true;

    // بناء الـ Payload
    // المنطق: إذا كان أحد الحقول فارغاً، نضع قيمة الحقل الآخر فيه لضمان اكتمال البيانات
    const payload = {
      supplierNameAr: formValue.supplierNameAr || formValue.companyNameAr || "غير محدد",
      supplierNameEn: formValue.supplierNameEn || formValue.companyNameEn || "Not Specified",
      companyNameAr: formValue.companyNameAr || formValue.supplierNameAr || "غير محدد",
      companyNameEn: formValue.companyNameEn || formValue.supplierNameEn || "Not Specified",
      phoneNumber: formValue.phoneNumber
    };

    this.apiService.createSupplier(payload).subscribe({
      next: (res) => {
        alert('تمت إضافة البيانات بنجاح');
        this.addPartnerForm.reset();
        this.loadSuppliers();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error saving:', err);
        alert(err.error?.message || 'حدث خطأ أثناء الاتصال بالخادم');
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  } else {
    // إظهار تنبيه في حال عدم إدخال الحد الأدنى من البيانات
    if (!hasPhone) {
      alert('يرجى إدخال رقم الهاتف.');
    } else if (!hasName) {
      alert('يرجى إدخال اسم التاجر أو اسم الشركة على الأقل.');
    }
    this.addPartnerForm.markAllAsTouched();
  }
}

  // دالة مساعدة لإغلاق المودالات
private closeModal(modalId: string) {
  const modalElement = document.getElementById(modalId);
  if (modalElement) {
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
      modalInstance.hide();
    }
    // تنظيف الـ Backdrop يدوياً في حال لم يختفِ
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }
}

  // --- منطق عرض الفواتير والتعامل مع المودال ---
viewStatement(partner: any) {
  this.selectedPartner = partner;
  this.transactions = [];
  this.isLoading = true;

  // استدعاء الخدمة اللي بتربط المورد بفواتيره
  this.apiService.getSupplierStatement(partner.id).subscribe({
    next: (res: any) => {
      // بناءً على Postman، البيانات دايماً جوه res.data
      this.transactions = res.data || [];

      const modalElement = document.getElementById('statementModal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    },
    error: (err) => {
      console.error('حدث خطأ في جلب الفواتير:', err);
      this.isLoading = false;
    },
    complete: () => this.isLoading = false
  });
}
// دالة الطباعة (بسيطة)
printDocument(type: 'pos' | 'a4' | 'payments') {
  // إضافة الكلاس المناسب بناءً على الاختيار
  const className = type === 'pos' ? 'print-pos' : (type === 'payments' ? 'print-payments' : 'print-a4');
  
  document.body.classList.add(className);
  
  // تأخير بسيط لضمان رندر التنسيق قبل فتح نافذة الطباعة
  setTimeout(() => {
    window.print();
    document.body.classList.remove('print-pos', 'print-a4', 'print-payments');
  }, 50);
}
  // بقية الدوال (filterByType, switchView, calculateSplit, الخ...)
filterByType() {
  const search = (this.searchTerm || '').toLowerCase();

  this.filteredPartners = this.allPartners.filter(p => {
    const isCompany = !!(p.companyNameAr || p.companyNameEn);
    const isCorrectType = this.viewType === 'company' ? isCompany : !isCompany;

    const matchSearch =
      (p.supplierNameAr?.includes(search)) ||
      (p.supplierNameEn?.toLowerCase().includes(search)) ||
      (p.phoneNumber?.includes(search));

    return isCorrectType && matchSearch;
  });

  // استدعاء الحساب هنا ليتم تحديثه فوراً مع كل فلترة أو تغيير تبويب
  this.calculateRecentPayments();
}

  switchView(type: 'supplier' | 'company') {
    this.viewType = type;
    this.filterByType();
  }


// تعديل دالة حساب الدفعات لتجلب آخر دفعة لكل مورد
calculateRecentPayments() {
  this.totalRecentPayments = this.filteredPartners.reduce((acc, curr) => {
    // نبحث عن الحقل الذي يحتوي على مبلغ آخر دفعة من الـ API
    // بناءً على تصميمك، سنفترض وجود حقل اسمه lastPaymentAmount
    return acc + (Number(curr.lastPaymentAmount) || 0);
  }, 0);
}

// دالة لجلب آخر مبلغ مدفوع لمورد معين لعرضه في الكارت
getLastPaymentForPartner(partner: any): number {
  if (partner.lastPaymentAmount) {
    return partner.lastPaymentAmount;
  }
  // إذا لم يكن الحقل موجوداً في الكائن المباشر، يمكن حسابه من كشف الحساب إذا تم تحميله
  return 0;
}


getLastPaidDebt(): number {
  return this.totalRecentPayments;
}

// إجمالي المديونية لجميع الموردين المعروضين حالياً
getTotalDebt(): number {
  return this.filteredPartners.reduce((acc, curr) => {
    return acc + (curr.outstandingBalance || 0);
  }, 0);
}


// دالة تحسب إجمالي كل المبالغ التي دُفعت لكل الموردين المفلترين حالياً
getTotalPaidPayments(): number {
  return this.filteredPartners.reduce((acc, curr) => {
    // ملاحظة: تأكد من مسمى الحقل في الـ API (غالباً totalPaid أو مجموع المبالغ المسددة)
    return acc + (Number(curr.totalPaid) || 0); 
  }, 0);
}

// دالة تحسب إجمالي جميع المبالغ المسددة (تاريخياً) لكل الموردين المعروضين
getTotalAllSuppliersPayments(): number {
  return this.filteredPartners.reduce((acc, curr) => {
    // نستخدم Number لضمان عدم حدوث خطأ إذا كانت القيمة نصية من الـ API
    // تأكد أن الحقل في الـ API هو totalPaid أو اجمالى المدفوعات
    return acc + (Number(curr.totalPaid) || 0);
  }, 0);
}





viewInvoice(transaction: any) {
  // 1. إغلاق المودال الحالي يدوياً للتأكيد
  this.closeModal('statementModal');

  this.isLoading = true;
  const invoiceId = transaction.id || transaction.purchaseInvoiceId;

  this.apiService.getPurchaseInvoiceById(invoiceId).subscribe({
    next: (res: any) => {
      this.selectedInvoice = res.data;

      // 2. الانتظار قليلاً لضمان اختفاء الـ backdrop القديم
      setTimeout(() => {
        const modalElement = document.getElementById('invoiceModal');
        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }
      }, 400); 
    },
    error: (err) => console.error(err),
    complete: () => this.isLoading = false
  });
}





onPayFromInvoice() {
  if (!this.selectedInvoiceData) return;

  const total = this.selectedInvoiceData.total || 0;
  const paid = this.selectedInvoiceData.amountPaid || 0;
  const remaining = total - paid;

  if (remaining <= 0) {
    alert('هذه الفاتورة مسددة بالكامل ولا يوجد مبلغ متبقي.');
    return;
  }

  // إعداد البيانات
  this.selectedPartner = {
    id: this.selectedInvoiceData.supplierId,
    supplierNameAr: this.selectedInvoiceData.supplierDisplayName || this.selectedPartner?.supplierNameAr
  };

  this.paymentForm.reset({
    method: 'cash',
    amount: remaining,
    cashAmount: 0,
    visaAmount: 0
  });

  // 1. إغلاق المودال الحالي (قائمة الدفعات) برمجياً
  const currentModalEl = document.getElementById('paymentsListModal');
  if (currentModalEl) {
    const currentModal = bootstrap.Modal.getInstance(currentModalEl);
    if (currentModal) currentModal.hide();
  }

  // 2. الانتظار قليلاً لضمان انتهاء أنيميشن الإغلاق
  setTimeout(() => {
    this.clearBackdrops(); // تنظيف نهائي لأي بقايا

    const nextModalEl = document.getElementById('confirmPayModal');
    if (nextModalEl) {
      const nextModal = new bootstrap.Modal(nextModalEl);
      nextModal.show();
    }
  }, 400); // زيادة المهلة قليلاً لضمان السلاسة
}



calculateSplit() {
  const total = this.paymentForm.get('amount')?.value || 0;
  const cash = this.paymentForm.get('cashAmount')?.value || 0;
  let visa = total - cash;

  if (visa < 0) visa = 0; // منع الأرقام السالبة

  this.paymentForm.patchValue({
    visaAmount: visa
  }, { emitEvent: false });
}


async confirmPayment() {
  if (this.paymentForm.invalid || !this.selectedInvoiceData) {
    alert('يرجى التأكد من إدخال البيانات بشكل صحيح.');
    return;
  }

  const formValue = this.paymentForm.getRawValue();
  const targetInvoiceId = this.selectedInvoiceData.id;
  const amountToPay = Number(formValue.amount);

  // 1. حساب المتبقي مرة أخرى للحماية قبل الإرسال
  const total = this.selectedInvoiceData.total || 0;
  const paid = this.selectedInvoiceData.amountPaid || 0;
  const remaining = total - paid;

  if (amountToPay > remaining) {
    alert(`عفواً، المبلغ المدخل (${amountToPay}) أكبر من المبلغ المتبقي للفاتورة (${remaining}).`);
    return;
  }

  // 2. تحديد مبالغ الكاش والفيزا بناءً على الطريقة المختارة
  let finalCash = 0;
  let finalVisa = 0;

  if (formValue.method === 'cash') {
    finalCash = amountToPay;
  } else if (formValue.method === 'visa') {
    finalVisa = amountToPay;
  } else if (formValue.method === 'custom') {
    finalCash = Number(formValue.cashAmount);
    finalVisa = Number(formValue.visaAmount);
    
    // التحقق من أن مجموع المخصص يساوي الإجمالي
    if ((finalCash + finalVisa) !== amountToPay) {
      alert('يجب أن يكون مجموع الكاش والفيزا مساوياً لإجمالي المبلغ المطلوب دفعه!');
      return;
    }
  }

  this.isLoading = true;

  const payload = {
    amount: amountToPay,
    paymentMethod: this.mapPaymentMethod(formValue.method),
    recordedByEmployeeId: 1, // يمكنك تغييره ليجلب ID الموظف من الـ AuthService لو متوفر
    cashAmount: finalCash,
    visaAmount: finalVisa,
    notes: `سداد للفاتورة رقم ${this.selectedInvoiceNumber}`,
    paidAt: new Date().toISOString()
  };

  // 3. إرسال الدفعة للـ API
  this.apiService.postPayment(targetInvoiceId, payload).subscribe({
    next: () => {
      alert('تم تسجيل الدفعة بنجاح');
      this.closeModal('confirmPayModal');
      
      // تحديث قائمة الموردين والأرصدة
      this.loadSuppliers(); 
      
      // (اختياري) إذا أردت تحديث كشف الحساب المفتوح في الخلفية:
      // if (this.selectedPartner) this.viewStatement(this.selectedPartner);

      this.isLoading = false;
    },
    error: (err) => {
      console.error('Payment Error:', err);
      alert(err.error?.Message || 'حدث خطأ في عملية الدفع');
      this.isLoading = false;
    }
  });
}



private mapPaymentMethod(method: string): number {
  const mapping: { [key: string]: number } = {
    'cash': 1,
    'bank': 2,
    'visa': 2,
    'custom': 3
  };
  return mapping[method] || 1;
}

private clearBackdrops() {
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}


viewInvoicePayments(transaction: any) {
  // 1. إغلاق مودال كشف الحساب أولاً
  this.closeModal('statementModal');

  this.isLoading = true;
  this.selectedInvoiceNumber = transaction.purchaseNumber;
  const invoiceId = transaction.id || transaction.purchaseInvoiceId;

  this.apiService.getPurchaseInvoiceById(invoiceId).subscribe({
    next: (res: any) => {
      if (res.success) {
        this.selectedInvoiceData = res.data;
        this.invoicePayments = res.data?.payments || [];

        // 2. فتح مودال قائمة الدفعات بعد مهلة قصيرة
        setTimeout(() => {
          const modalElement = document.getElementById('paymentsListModal');
          if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
          }
        }, 400);
      }
    },
    error: (err) => console.error(err),
    complete: () => this.isLoading = false
  });
}
}

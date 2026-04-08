
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
    next: (res: any) => {
      this.allPartners = res.data || [];
      this.filterByType();
      
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
printStatement() {
  window.print();
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


calculateRecentPayments() {
  this.totalRecentPayments = this.filteredPartners.reduce((acc, curr) => {
    // تأكد من مبرمج الـ Backend من اسم الحقل الصحيح (مثلاً قد يكون lastPaymentValue)
    return acc + (Number(curr.lastPaymentAmount) || 0); 
  }, 0);
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








viewInvoice(transaction: any) {
  this.isLoading = true;
  // بننادي الـ ID بتاع الفاتورة عشان نجيب الـ Items
  const invoiceId = transaction.id || transaction.purchaseInvoiceId;
  
  this.apiService.getPurchaseInvoiceById(invoiceId).subscribe({
    next: (res: any) => {
      // الـ API في Postman بيرجع البيانات في res.data
      this.selectedInvoice = res.data; 
      
      const modalElement = document.getElementById('invoiceModal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    },
    error: (err) => console.error('Error fetching invoice details:', err),
    complete: () => this.isLoading = false
  });
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
  let visa = total - cash;
  
  if (visa < 0) visa = 0; // منع الأرقام السالبة
  
  this.paymentForm.patchValue({
    visaAmount: visa
  }, { emitEvent: false });
}

async confirmPayment() {
  if (this.paymentForm.valid && this.selectedPartner) {
    this.isLoading = true;
    const formValue = this.paymentForm.getRawValue();
    let totalToPay = Number(formValue.amount);

try {
  const invoices = await this.apiService.getSupplierInvoices(this.selectedPartner.id).toPromise();
  
  // التعديل هنا: نضمن أن invoices ليست undefined قبل الفلترة
  const pendingInvoices = (invoices || []).filter(inv => inv.remainingAmount > 0);

  if (pendingInvoices.length === 0) {
    alert('لا توجد فواتير مستحقة لهذا المورد');
    this.isLoading = false;
    return;
  }

      // 2. توزيع المبلغ على الفواتير
      for (const invoice of pendingInvoices) {
        if (totalToPay <= 0) break;

        // المبلغ الذي سيتم دفعه لهذه الفاتورة هو الأقل بين (المبلغ المتبقي معنا) و (مديونية الفاتورة)
        const amountForThisInvoice = Math.min(totalToPay, invoice.remainingAmount);

        const payload = {
          amount: amountForThisInvoice,
          paymentMethod: this.mapPaymentMethod(formValue.method),
          recordedByEmployeeId: 1, // تأكد من الـ ID الصحيح من الصورة (الموظف رقم 1 غير موجود كما يظهر في الخطأ)
          cashAmount: formValue.method === 'cash' ? amountForThisInvoice : (formValue.method === 'custom' ? formValue.cashAmount : 0),
          visaAmount: formValue.method === 'visa' ? amountForThisInvoice : (formValue.method === 'custom' ? formValue.visaAmount : 0),
          notes: `سداد آلي - جزء من مبلغ ${formValue.amount}`,
          paidAt: new Date().toISOString()
        };

        // إرسال طلب الدفع لهذه الفاتورة
        await this.apiService.postPayment(invoice.id, payload).toPromise();

        totalToPay -= amountForThisInvoice;
      }

      // 3. إنهاء العملية
      alert('تم توزيع المبلغ بنجاح على الفواتير المستحقة');
      this.closeModal('payModal');
      this.loadSuppliers();

    } catch (err: any) {
      console.error('Payment Error:', err);
      alert(err.error?.Message || 'حدث خطأ أثناء معالجة الدفع التلقائي');
    } finally {
      this.isLoading = false;
    }
  }
}

// دالة تحويل وسيلة الدفع لأرقام (حسب طلب الـ Backend في صورة بوستمان)
private mapPaymentMethod(method: string): number {
  const mapping: { [key: string]: number } = {
    'cash': 1,
    'bank': 2,
    'visa': 3,
    'custom': 4
  };
  return mapping[method] || 1;
}

viewInvoicePayments(transaction: any) {
  this.isLoading = true;
  this.selectedInvoiceNumber = transaction.purchaseNumber;
  const invoiceId = transaction.id || transaction.purchaseInvoiceId;

  this.apiService.getPurchaseInvoiceById(invoiceId).subscribe({
    next: (res: any) => {
      if (res.success) {
        this.selectedInvoiceData = res.data; // حفظ البيانات الأساسية (Total, AmountPaid...)
        this.invoicePayments = res.data?.payments || []; // حفظ مصفوفة الدفعات
        
        const modalElement = document.getElementById('paymentsListModal');
        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }
      }
    },
    error: (err) => {
      console.error('Error:', err);
      alert('خطأ في جلب البيانات من السيرفر');
    },
    complete: () => this.isLoading = false
  });
}









}

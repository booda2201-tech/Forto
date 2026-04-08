
import { Component, OnInit, TemplateRef } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';


@Component({
  selector: 'app-purchase-invoice',
  templateUrl: './purchase-invoice.component.html',
  styleUrls: ['./purchase-invoice.component.scss']
})
export class PurchaseInvoiceComponent implements OnInit {
// الحالات والبيانات الأساسية
  currentTab: 'list' | 'add' = 'add';
  isLoading = false;

  // المصفوفات (تم تعريف filteredInvoices و searchTerm لحل أخطاء الـ Build)
  previousInvoices: any[] = [];
  filteredInvoices: any[] = [];
  suppliers: any[] = [];
  allProducts: any[] = [];
  allMaterials: any[] = [];

  // متغيرات البحث والفلترة
  searchTerm: string = '';
  filterDate: string = '';

  // تفاصيل الفاتورة المختارة للعرض
  selectedInvoice: any = null;
  selectedInvoiceData: any;
  selectedInvoiceNumber: string = '';
  invoicePayments: any[] = [];

  // الحسابات المالية
  taxRate = 0;
  discount = 0;
  amountPaid = 0;
  todayDate = new Date().toISOString().split('T')[0];

  // هيكل الفاتورة الجديدة
  invoiceDetails = {
    supplierId: null,
    branchId: 1, // تثبيت الفرع دائماً على 1
    invoiceDate: new Date().toISOString().split('T')[0],
    paymentMethod: 1,
    recordedByEmployeeId: 0
  };

  invoiceItems: any[] = [];

  // دالة إضافة عنصر مخصص (Tag)
  addCustomItem = (term: string) => ({ id: 0, name: term, isNew: true });

  constructor(
    private apiService: ApiService,
    private modalService: NgbModal,
    private authService: AuthService,
  )
    {
    this.initFirstItem();
  }

ngOnInit() {
  this.loadInvoices();
  this.loadSuppliers();
  this.loadInitialData();
  this.setAutomaticData(); // دالة لجلب بيانات المستخدم الحالي
}
  // تهيئة السطر الأول بقيم رقمية بدلاً من null لتجنب أخطاء الـ Build
initFirstItem() {
  this.invoiceItems = [{
    lineKind: 0, productId: 0, materialId: 0, customName: '', customSku: '', // أضفنا customSku
    qty: 1, unitPurchasePrice: 0, unitSalePrice: 0
  }];
}


  loadSuppliers() {
    this.apiService.getAllSuppliers().subscribe({
      next: (res: any) => this.suppliers = res.data || res,
      error: (err) => console.error('خطأ في جلب الموردين', err)
    });
  }

loadInvoices() {
    this.isLoading = true;
    this.apiService.getAllPurchaseInvoices().subscribe({
      next: (res: any) => {
        this.previousInvoices = res.data || res;
        this.applyFilter(); // تحديث القائمة المفلترة فور الوصول
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

applyFilter() {
    this.filteredInvoices = this.previousInvoices.filter(invoice => {
      // استخدام supplierDisplayName حسب ما ظهر في الـ API
      const nameMatch = (invoice.supplierDisplayName || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const dateMatch = this.filterDate ? (invoice.invoiceDate || '').includes(this.filterDate) : true;
      return nameMatch && dateMatch;
    });
  }

  loadInitialData() {
    this.apiService.getProducts().subscribe((res: any) => this.allProducts = res.data || res);
    this.apiService.getMaterials().subscribe((res: any) => this.allMaterials = res.data || res);
  }

get currentEmployeeName(): string {
    return this.authService.getFullName() || 'موظف غير معروف';
  }

setAutomaticData() {
    // جلب معرف الموظف من الـ AuthService
    const empId = this.authService.getEmployeeId();
    if (empId) {
      this.invoiceDetails.recordedByEmployeeId = empId;
    } else {
      // قيمة احتياطية في حالة فشل الجلب
      this.invoiceDetails.recordedByEmployeeId = 6827;
    }
  }


  // عرض التفاصيل باستخدام المودال
  openDetails(content: TemplateRef<any>, invoice: any) {
    this.selectedInvoice = invoice;
    this.modalService.open(content, { size: 'xl', centered: true, scrollable: true });
  }

// 1. عند اختيار عنصر من القائمة
// onItemSelect(item: any, selectedData: any) {
//   if (selectedData) {
//     if (selectedData.isNew) {

//       // حالة إضافة جديد (Tag) - سنقوم بالحفظ الفوري في السيرفر
//       this.isLoading = true;

//       if (item.lineKind === 0) {
//         // نداء إضافة منتج
//         const productPayload = {
//           name: selectedData.name,
//           sku: 'SKU-' + Date.now(), // توليد SKU تلقائي بسيط
//           salePrice: Number(item.unitSalePrice || 0),
//           costPerUnit: Number(item.unitPurchasePrice || 0),
//           categoryId: 1, // تأكد من وجود Category بالرقم ده أو غيره
//           branchId: 1,
//           initialStockQty: Number(item.qty || 0),
//           reorderLevel: 5
//         };

//         this.apiService.createProduct(productPayload).subscribe({
//           next: (res: any) => {
//             const newProd = res.data || res;
//             item.productId = newProd.id;
//             item.selectedId = newProd.id;
//             item.customName = ''; // تم الحفظ، لم يعد مخصصاً
//             this.loadInitialData(); // لتحديث القائمة
//             this.isLoading = false;
//             alert(`تم إضافة المنتج "${selectedData.name}" بنجاح`);
//           },
//           error: () => (this.isLoading = false)
//         });

//       } else {
//         // نداء إضافة خامة
//         const materialPayload = {
//           name: selectedData.name,
//           unit: 1, // وحدة افتراضية
//           costPerUnit: Number(item.unitPurchasePrice || 0),
//           chargePerUnit: Number(item.unitSalePrice || 0),
//           branchId: 1,
//           initialStockQty: Number(item.qty || 0),
//           reorderLevel: 5
//         };

//         this.apiService.createMaterial(materialPayload).subscribe({
//           next: (res: any) => {
//             const newMat = res.data || res;
//             item.materialId = newMat.id;
//             item.selectedId = newMat.id;
//             item.customName = '';
//             this.loadInitialData();
//             this.isLoading = false;
//             alert(`تم إضافة الخامة "${selectedData.name}" بنجاح`);
//           },
//           error: () => (this.isLoading = false)
//         });
//       }

//     } else {
//       // حالة اختيار منتج موجود فعلياً
//       item.customName = '';
//       if (item.lineKind === 0) {
//         item.productId = selectedData.id;
//         item.materialId = 0;
//       } else {
//         item.materialId = selectedData.id;
//         item.productId = 0;
//       }
//       item.unitPurchasePrice = selectedData.purchasePrice || selectedData.costPerUnit || 0;
//       item.unitSalePrice = selectedData.salePrice || selectedData.chargePerUnit || 0;
//     }
//   }
// }

onItemSelect(item: any, selectedData: any) {
  if (selectedData) {
    if (selectedData.isNew) {
      // 1. أهم خطوة: بنثبت الاسم في customName عشان الـ *ngIf في الـ HTML يفضل شايفه ويفتح الخانة
      item.customName = selectedData.name;

      // 2. بنصفر البيانات القديمة عشان نضمن إننا بنبدأ "على بياض" للصنف الجديد
      item.productId = 0;
      item.materialId = 0;
      item.selectedId = null;
      item.customSku = ''; // بنفضي خانة الكود عشان الموظف يكتبها

      // هنا إحنا وقفنا.. مش هنعمل حفظ للسيرفر غير لما الموظف يدوس بنفسه على زرار الحفظ الأصفر
    } else {
      // حالة اختيار منتج موجود فعلياً في السيستم
      item.customName = ''; // بنخفي الـ input لو كان مفتوح

      if (item.lineKind === 0) {
        item.productId = selectedData.id;
        item.materialId = 0;
      } else {
        item.materialId = selectedData.id;
        item.productId = 0;
      }

      // بنسحب الأسعار المسجلة فعلاً في السيستم عشان الموظف ميضطرش يكتبها تاني
      item.unitPurchasePrice = selectedData.purchasePrice || selectedData.costPerUnit || 0;
      item.unitSalePrice = selectedData.salePrice || selectedData.chargePerUnit || 0;
    }
  }
}


// 2. تحديث دالة إضافة سطر جديد لتشمل selectedId
addNewItem() {
  this.invoiceItems.push({
    lineKind: 0,
    productId: 0,
    materialId: 0,
    selectedId: null, // الحقل الوسيط للـ ng-select
    customName: '',
    customSku: '',
    qty: 1,
    unitPurchasePrice: 0,
    unitSalePrice: 0
  });
}
  removeItem(index: number) {
    if (this.invoiceItems.length > 1) {
      this.invoiceItems.splice(index, 1);
    } else {
      this.initFirstItem();
    }
  }

  // deleteInvoice(id: number) {
  //   if (confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
  //     this.apiService.deletePurchaseInvoice(id).subscribe({
  //       next: () => {
  //         alert('تم الحذف بنجاح');
  //         this.loadInvoices();
  //       },
  //       error: (err) => alert('فشل الحذف: ' + err.message)
  //     });
  //   }
  // }

  // saveInvoice() {
  //   if (!this.invoiceDetails.supplierId) {
  //     alert('من فضلك اختر المورد أولاً');
  //     return;
  //   }

  //   this.isLoading = true;
  //   this.setAutomaticData();
  //      const payload = {
  //          supplierId: Number(this.invoiceDetails.supplierId),
  //          branchId: 1,
  //          invoiceDate: new Date(this.todayDate).toISOString(),
  //          paymentMethod: Number(this.invoiceDetails.paymentMethod),
  //          recordedByEmployeeId: Number(this.invoiceDetails.recordedByEmployeeId), // تحويل لرقم
  //          discount: Number(this.discount || 0),
  //          taxRate: Number(this.taxRate || 0),
  //          amountPaid: Number(this.amountPaid || 0),
  //          // تغيير التسمية إلى lines كما يتوقع السيرفر في الصورة 508579
  //          lines: this.invoiceItems.map(item => ({
  //            lineKind: Number(item.lineKind),
  //            productId: item.productId > 0 ? item.productId : null,
  //            materialId: item.materialId > 0 ? item.materialId : null,
  //            customName: item.customName || '',
  //            qty: Number(item.qty),
  //            unitPurchasePrice: Number(item.unitPurchasePrice)
  //          }))
  //        };
  //   this.apiService.createPurchaseInvoice(payload).subscribe({
  //     next: () => {
  //       console.log(payload);

  //       alert('تم الحفظ بنجاح!');
  //       this.resetForm();
  //       this.loadInvoices();
  //       this.currentTab = 'list';
  //       this.isLoading = false;
  //     },
  //     error: (err) => {
  //       console.log(payload);

  //       this.isLoading = false;
  //       alert('خطأ في الحفظ: ' + (err.error?.message || 'تأكد من الصلاحيات'));
  //     }
  //   });
  // }

// 2. إضافة دالة حفظ المنتج الجديد (الإصلاح لخطأ الصورة الأخيرة)
saveNewItemQuickly(item: any) {
  if (!item.customName) return;

if (item.lineKind === 0 && !item.customSku) {
    alert('من فضلك أدخل كود المنتج أولاً');
    return;
  }

  this.isLoading = true;

  if (item.lineKind === 0) {
    // تجهيز بيانات المنتج
    const payload = {
      name: item.customName,
      sku: item.customSku,
      salePrice: Number(item.unitSalePrice || 0),
      costPerUnit: Number(item.unitPurchasePrice || 0),
      categoryId: 1, // تأكد أن الرقم 1 موجود في السيستم
      branchId: 1,
      initialStockQty: Number(item.qty || 0),
      reorderLevel: 5
    };

    this.apiService.createProduct(payload).subscribe({
      next: (res: any) => {
        const newProd = res.data || res;
        item.productId = newProd.id;
        item.selectedId = newProd.id;
        item.customName = '';
        item.customSku = ''; // مسح الحالة "جديد" بعد الحفظ
        this.loadInitialData(); // تحديث القائمة
        this.isLoading = false;
        alert('تم حفظ المنتج الجديد بنجاح');
      },
      error: (err) => {
        this.isLoading = false;
        alert('حدث خطأ أثناء حفظ المنتج');
      }
    });
  } else {
    // تجهيز بيانات الخامة
    const payload = {
      name: item.customName,
      sku: item.customSku,
      unit: 1,
      costPerUnit: Number(item.unitPurchasePrice || 0),
      chargePerUnit: Number(item.unitSalePrice || 0),
      branchId: 1,
      initialStockQty: Number(item.qty || 0),
      reorderLevel: 5
    };

    this.apiService.createMaterial(payload).subscribe({
      next: (res: any) => {
        const newMat = res.data || res;
        item.materialId = newMat.id;
        item.selectedId = newMat.id;
        item.customName = '';
        item.customSku = '';
        this.loadInitialData();
        this.isLoading = false;
        alert('تم حفظ الخامة الجديدة بنجاح');
      },
      error: (err) => {
        this.isLoading = false;
        alert('حدث خطأ أثناء حفظ الخامة');
      }
    });
  }
}








saveInvoice() {
  if (!this.invoiceDetails.supplierId) {
    alert('من فضلك اختر المورد أولاً');
    return;
  }

  this.isLoading = true;
  this.setAutomaticData(); // التأكد من جلب ID الموظف

  const payload = {
    supplierId: Number(this.invoiceDetails.supplierId),
    branchId: 1,
    invoiceDate: new Date(this.todayDate).toISOString(), // استخدام التاريخ المختار
    paymentMethod: Number(this.invoiceDetails.paymentMethod),
    recordedByEmployeeId: Number(this.invoiceDetails.recordedByEmployeeId),
    discount: Number(this.discount || 0),
    taxRate: Number(this.taxRate || 0),
    amountPaid: Number(this.amountPaid || 0),

    // الحل الجذري هنا: إرسال الحقل المطلوب فقط للسيرفر
    Items: this.invoiceItems.map(item => {
      const line: any = {
        lineKind: Number(item.lineKind),
        qty: Number(item.qty),
        unitPurchasePrice: Number(item.unitPurchasePrice),
        customName: item.customName || ''
      };

      // إذا كان منتج (0) أرسل productId فقط
      if (line.lineKind === 0) {
        line.productId = item.productId > 0 ? item.productId : null;
      }
      // إذا كان خامة (1) أرسل materialId فقط
      else if (line.lineKind === 1) {
        line.materialId = item.materialId > 0 ? item.materialId : null;
      }

      return line;
    })
  };

  this.apiService.createPurchaseInvoice(payload).subscribe({
    next: () => {
      alert('تم الحفظ بنجاح!');
      this.resetForm();
      this.loadInvoices();
      this.currentTab = 'list';
      this.isLoading = false;
    },
    error: (err) => {
      this.isLoading = false;
      console.error('البيانات المرسلة (Payload):', payload);
      console.error('خطأ السيرفر:', err.error);
      alert('خطأ في الحفظ: ' + (err.error?.message || 'تأكد من صحة البيانات المرسلة'));
    }
  });
}


  resetForm() {
    this.initFirstItem();
    this.discount = 0;
    this.taxRate = 0;
    this.amountPaid = 0;
    this.invoiceDetails.supplierId = null;
    this.invoiceDetails.invoiceDate = this.todayDate;
  }

printInvoice(invoice?: any) {
  // إذا مررنا فاتورة نستخدمها، وإذا لم نمرر نستخدم الفاتورة المختارة في المودال
  const targetInvoice = invoice || this.selectedInvoice;
  if (targetInvoice) {
    console.log('طباعة الفاتورة رقم:', targetInvoice.id);
    // هنا يمكنك استدعاء window.print() أو خدمة طباعة مخصصة
    window.print();
  }
}

openPayments(content: any, invoice: any) {
  // 1. إسناد بيانات الفاتورة المختارة للمتغيرات
  this.selectedInvoiceData = invoice;
  this.selectedInvoiceNumber = invoice.invoiceNumber || invoice.id;

  // 2. جلب سجل الدفعات (افترضنا هنا أنها موجودة كـ Array داخل الفاتورة أو يتم جلبها من API)
  // إذا كانت الدفعات تأتي من الـ API، يمكنك مناداة الخدمة هنا
  this.invoicePayments = invoice.payments || [];

  // 3. فتح المودال باستخدام NgbModal
  this.modalService.open(content, {
    size: 'lg',
    centered: true,
    scrollable: true
    // windowClass: 'custom-modal-animation' // اختياري لإضافة أنيميشن فخم
  });
}










  get subTotal() { return this.invoiceItems.reduce((acc, item) => acc + (item.qty * item.unitPurchasePrice), 0); }
  get finalTotal() { return this.subTotal + (this.subTotal * this.taxRate / 100) - (this.subTotal * this.discount / 100); }
  get remainingAmount() { return this.finalTotal - this.amountPaid; }
}

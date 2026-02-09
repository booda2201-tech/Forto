import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from 'src/app/services/api.service';

type CategoryDto = {
  id: number;
  name: string;
  parentId: number | null;
  isActive: boolean;
};

type ServiceRateDto = {
  id?: number;
  bodyType: number;
  price: number;
  durationMinutes: number;
};

type ServiceDto = {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  rates: ServiceRateDto[];
};

type ServiceCardVm = {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  minPrice: number;
  ratesCount: number;
  raw: ServiceDto;
};

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss'],
})
export class ServicesComponent implements OnInit {
  newCategoryName: string = '';
isSavingCat: boolean = false;
  isSavingName = false;
  categories: CategoryDto[] = [];
  activeCategoryId: number | null = null; // null = All
  services: ServiceCardVm[] = [];

  // Add form model (simple)
  newService = {
    categoryId: null as number | null,
    name: '',
    description: '',
  };

  // Edit rates modal
  selectedService: ServiceCardVm | null = null;
  ratesForm!: FormGroup;

  // Recipe modal
  selectedRecipeService: ServiceCardVm | null = null;
  selectedRecipeBodyType = 1;
  recipeRows: { materialId: number; defaultQty: number }[] = [];
  allMaterials: { id: number; name: string }[] = [];
  isLoadingRecipe = false;
  isSavingRecipe = false;

  // Gift modal (هدايا الخدمة)
  selectedGiftService: ServiceCardVm | null = null;
  giftOptions: { productId: number; productName: string; sku?: string; availableQty?: number }[] = [];
  allProducts: { id: number; name: string; sku?: string }[] = [];
  giftProductToAdd = 0;
  isLoadingGifts = false;
  isSavingGift = false;
  branchId = 1;

  // BodyTypes list (adjust labels as you like)
  bodyTypes = [
    { id: 1, label: 'Sedan' },
    { id: 2, label: 'SUV' },
    { id: 3, label: 'Hatchback' },
    { id: 4, label: 'Coupe' },
    { id: 5, label: 'Pickup' },
    { id: 6, label: 'Van' },
    { id: 7, label: 'Truck' },
  ];

  isLoading = false;
  isSaving = false;

  constructor(private api: ApiService, private fb: FormBuilder, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.initRatesForm();
    this.loadCategories();
    this.loadMaterials();
    this.loadProducts();
  }

  private loadProducts(): void {
    this.api.getProducts().subscribe({
      next: (res: any) => {
        const data = res?.data ?? [];
        this.allProducts = (Array.isArray(data) ? data : []).map((p: any) => ({
          id: p.id,
          name: p.name ?? '',
          sku: p.sku
        }));
      },
    });
  }

  private loadMaterials(): void {
    this.api.getMaterials().subscribe({
      next: (res: any) => {
        const data = res?.data ?? [];
        this.allMaterials = data
          .filter((m: any) => m.isActive !== false)
          .map((m: any) => ({ id: m.id, name: m.name ?? '' }));
      },
    });
  }

  private initRatesForm(): void {
    this.ratesForm = this.fb.group({
      rates: this.fb.array([]),
    });
  }

  get ratesArr(): FormArray {
    return this.ratesForm.get('rates') as FormArray;
  }

  // ---------------------------
  // Load categories
  // ---------------------------
  loadCategories(): void {
    this.isLoading = true;

    this.api.getCatalogCategories().subscribe({
      next: (res: any) => {
        this.categories = (res?.data ?? []).filter((c: CategoryDto) => c.isActive);

        // Default: All
        this.activeCategoryId = null;
        this.loadServicesForActiveCategory();

        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      },
    });
  }

  // ---------------------------
  // Category selection
  // ---------------------------
  setCategory(categoryId: number | null): void {
    this.activeCategoryId = categoryId;
    this.loadServicesForActiveCategory();
  }

  // ---------------------------
  // Load services (All or by category)
  // ---------------------------
  loadServicesForActiveCategory(): void {
    this.isLoading = true;

    // All -> fetch each category services then merge
    if (this.activeCategoryId == null) {
      if (!this.categories.length) {
        this.services = [];
        this.isLoading = false;
        return;
      }

      const calls = this.categories.map((c) =>
        this.api.getCatalogServices(c.id).pipe(
          catchError(() => of({ success: false, data: [] }))
        )
      );

      forkJoin(calls).subscribe({
        next: (results: any[]) => {
          const all: ServiceDto[] = results.flatMap((r) => r?.data ?? []);
          this.services = this.mapToCards(all);
          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.services = [];
          this.isLoading = false;
        },
      });

      return;
    }

    // Single category
    this.api.getCatalogServices(this.activeCategoryId).subscribe({
      next: (res: any) => {
        const data: ServiceDto[] = res?.data ?? [];
        this.services = this.mapToCards(data);
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.services = [];
        this.isLoading = false;
      },
    });
  }

  private mapToCards(data: ServiceDto[]): ServiceCardVm[] {
    return (data ?? []).map((s) => {
      const rates = s.rates ?? [];
      const minPrice = rates.length ? Math.min(...rates.map((r) => Number(r.price ?? 0))) : 0;

      return {
        id: s.id,
        categoryId: s.categoryId,
        name: s.name,
        description: s.description,
        minPrice,
        ratesCount: rates.length,
        raw: s,
      };
    });
  }

  categoryName(categoryId: number): string {
    return this.categories.find((c) => c.id === categoryId)?.name ?? `#${categoryId}`;
  }

  bodyTypeLabel(id: number): string {
    return this.bodyTypes.find((b) => b.id === id)?.label ?? `BodyType ${id}`;
  }

  // ---------------------------
  // Create service
  // ---------------------------
  createService(): void {
    const categoryId = Number(this.newService.categoryId);
    const name = (this.newService.name || '').trim();
    const description = (this.newService.description || '').trim();

    if (!categoryId || !name) return;

    this.isSaving = true;

    const payload = { categoryId, name, description };

    this.api.createCatalogService(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.newService = { categoryId: null, name: '', description: '' };
        this.loadServicesForActiveCategory();
      },
      error: (err) => {
        console.error(err);
        this.isSaving = false;
      },
    });
  }

  // ---------------------------
  // Delete service
  // ---------------------------
  deleteService(serviceId: number): void {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;

    this.api.deleteCatalogService(serviceId).subscribe({
      next: () => this.loadServicesForActiveCategory(),
      error: (err) => console.error(err),
    });
  }

  // ---------------------------
  // Open edit rates modal
  // ---------------------------
  openRatesModal(card: ServiceCardVm): void {
    this.selectedService = card;
    this.buildRatesForm(card.raw.rates ?? []);

    // open bootstrap modal
    const el = document.getElementById('ratesModal');
    const modal = new (window as any).bootstrap.Modal(el);
    modal.show();
  }

  private buildRatesForm(existingRates: ServiceRateDto[]): void {
    this.ratesArr.clear();

    // For every bodyType we create a row (pre-filled if exists)
    this.bodyTypes.forEach((bt) => {
      const found = existingRates.find((r) => r.bodyType === bt.id);

      this.ratesArr.push(
        this.fb.group({
          bodyType: [bt.id, [Validators.required]],
          price: [found ? found.price : 0, [Validators.required, Validators.min(0)]],
          durationMinutes: [found ? found.durationMinutes : 0, [Validators.required, Validators.min(0)]],
          enabled: [!!found], // toggle row on/off
        })
      );
    });
  }

  // Save rates (PUT UpsertRates/{id}/rates)
  saveRates(): void {
    if (!this.selectedService) return;

    const serviceId = this.selectedService.id;

    const enabledRates = this.ratesArr.controls
      .map((g) => g.value)
      .filter((r: any) => r.enabled === true)
      .map((r: any) => ({
        bodyType: Number(r.bodyType),
        price: Number(r.price),
        durationMinutes: Number(r.durationMinutes),
      }));

    this.isSaving = true;

    this.api.upsertServiceRates(serviceId, { rates: enabledRates }).subscribe({
      next: () => {
        this.isSaving = false;
        // refresh list
        this.loadServicesForActiveCategory();

        // close modal
        const el = document.getElementById('ratesModal');
        const modal = (window as any).bootstrap.Modal.getInstance(el);
        modal?.hide();
      },
      error: (err) => {
        console.error(err);
        this.isSaving = false;
      },
    });
  }

  // ---------------------------
  // Recipe modal
  // ---------------------------
  openRecipeModal(card: ServiceCardVm): void {
    this.selectedRecipeService = card;
    this.selectedRecipeBodyType = this.bodyTypes[0]?.id ?? 1;
    this.recipeRows = [];
    this.loadRecipeForBodyType();

    const el = document.getElementById('recipeModal');
    const modal = new (window as any).bootstrap.Modal(el);
    modal.show();
  }

  loadRecipeForBodyType(): void {
    if (!this.selectedRecipeService) return;

    this.isLoadingRecipe = true;
    this.api
      .getServiceRecipes(this.selectedRecipeService.id, this.selectedRecipeBodyType)
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          const materials = data?.materials ?? [];
          this.recipeRows = materials.map((m: any) => ({
            materialId: Number(m.materialId ?? m.material_id ?? 0),
            defaultQty: Number(m.defaultQty ?? m.default_qty ?? 0),
          }));
          if (this.recipeRows.length === 0) {
            this.recipeRows = [{ materialId: 0, defaultQty: 0 }];
          }
          this.isLoadingRecipe = false;
        },
        error: () => {
          this.recipeRows = [{ materialId: 0, defaultQty: 0 }];
          this.isLoadingRecipe = false;
        },
      });
  }

  addRecipeRow(): void {
    this.recipeRows.push({ materialId: 0, defaultQty: 0 });
  }

  removeRecipeRow(index: number): void {
    this.recipeRows.splice(index, 1);
  }

  saveRecipe(): void {
    if (!this.selectedRecipeService) return;

    const validRows = this.recipeRows.filter(
      (r) => r.materialId > 0 && r.defaultQty > 0
    );
    if (validRows.length === 0) {
      alert('أضف مادة واحدة على الأقل مع كمية');
      return;
    }

    this.isSavingRecipe = true;
    const payload = {
      materials: validRows.map((r) => ({
        materialId: r.materialId,
        defaultQty: r.defaultQty,
      })),
    };

    this.api
      .upsertServiceRecipe(
        this.selectedRecipeService.id,
        this.selectedRecipeBodyType,
        payload
      )
      .subscribe({
        next: () => {
          this.isSavingRecipe = false;
          alert('تم حفظ الوصفة بنجاح');
          const el = document.getElementById('recipeModal');
          const modal = (window as any).bootstrap.Modal.getInstance(el);
          modal?.hide();
        },
        error: (err) => {
          console.error(err);
          this.isSavingRecipe = false;
          alert(err?.error?.message || 'فشل حفظ الوصفة');
        },
      });
  }

  // ---------------------------
  // Gift modal (هدايا الخدمة)
  // ---------------------------
  openGiftModal(card: ServiceCardVm): void {
    this.selectedGiftService = card;
    this.giftOptions = [];
    this.giftProductToAdd = 0;
    this.loadGiftOptions();

    const el = document.getElementById('giftModal');
    const modal = new (window as any).bootstrap.Modal(el);
    modal.show();
  }

  loadGiftOptions(): void {
    if (!this.selectedGiftService) return;

    this.isLoadingGifts = true;
    this.api.getGiftOptions([this.selectedGiftService.id], this.branchId).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const opts = data?.options ?? [];
        this.giftOptions = (Array.isArray(opts) ? opts : []).map((o: any) => ({
          productId: o.productId ?? o.product_id ?? 0,
          productName: o.productName ?? o.name ?? '',
          sku: o.sku,
          availableQty: o.availableQty
        }));
        this.isLoadingGifts = false;
      },
      error: () => {
        this.giftOptions = [];
        this.isLoadingGifts = false;
      },
    });
  }

  addGiftProduct(): void {
    if (!this.selectedGiftService || !this.giftProductToAdd) return;
    if (this.giftOptions.some((g) => g.productId === this.giftProductToAdd)) {
      alert('المنتج مضاف مسبقاً');
      return;
    }

    this.isSavingGift = true;
    this.api.addGiftOptions(this.selectedGiftService.id, [this.giftProductToAdd]).subscribe({
      next: () => {
        this.isSavingGift = false;
        this.giftProductToAdd = 0;
        this.loadGiftOptions();
      },
      error: (err) => {
        this.isSavingGift = false;
        alert(err?.error?.message || 'فشل إضافة الهدية');
      },
    });
  }

  isProductInGiftOptions(productId: number): boolean {
    return this.giftOptions.some((g) => g.productId === productId);
  }

  removeGiftProduct(productId: number): void {
    if (!this.selectedGiftService) return;

    this.isSavingGift = true;
    this.api.removeGiftOptions(this.selectedGiftService.id, [productId]).subscribe({
      next: () => {
        this.isSavingGift = false;
        this.loadGiftOptions();
      },
      error: (err) => {
        this.isSavingGift = false;
        alert(err?.error?.message || 'فشل حذف الهدية');
      },
    });
  }


  updateCatalogService(): void {
  if (!this.selectedService || !this.selectedService.name.trim()) return;

  this.isSavingName = true;
  const payload = {
    categoryId: this.selectedService.categoryId,
    name: this.selectedService.name.trim(),
    description: (this.selectedService.description ?? '').trim(),
    isActive: (this.selectedService.raw as any)?.isActive ?? true,
  };

  this.api.updateCatalogService(this.selectedService.id, payload).subscribe({
    next: () => {
      this.isSavingName = false;
      // alert('تم تحديث بيانات الخدمة بنجاح');
      this.toastr.success('تم تحديث بيانات الخدمة بنجاح');
      this.loadServicesForActiveCategory();
    },
    error: (err) => {
      console.error(err);
      this.isSavingName = false;
      alert(err?.error?.message || 'فشل تحديث البيانات');
    },
  });
}




// فتح مودال إضافة فئة
// openAddCategoryModal() {
//   // كود فتح المودال أو توجيه لصفحة الإضافة
// }

// // فتح مودال الإدارة
// openManageCategoriesModal() {
//   const el = document.getElementById('manageCategoriesModal');
//   const modal = new (window as any).bootstrap.Modal(el);
//   modal.show();
// }

deleteCategory(id: number): void {
  if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
  this.api.deleteCategory(id).subscribe({
    next: () => {
      this.loadCategories();
      alert('تم الحذف بنجاح');
    },
    error: (err: any) => {
      console.error(err);
      alert(err?.error?.message || 'فشل حذف الفئة');
    },
  });
}



editCategory(cat: CategoryDto): void {
  const newName = prompt('أدخل الاسم الجديد للفئة:', cat.name);
  if (newName != null && newName.trim() !== '') {
    const payload = {
      name: newName.trim(),
      isActive: cat.isActive ?? true,
    };
    this.api.updateCategory(cat.id, payload).subscribe({
      next: () => {
        this.loadCategories();
        alert('تم تحديث الفئة');
      },
      error: (err: any) => {
        console.error(err);
        alert(err?.error?.message || 'فشل تحديث الفئة');
      },
    });
  }
}




saveNewCategory() {
  if (!this.newCategoryName.trim()) return;

  this.isSavingCat = true;
  const payload = { name: this.newCategoryName.trim() };

  this.api.createCategory(payload).subscribe({
    next: () => {
      this.isSavingCat = false;
      this.newCategoryName = '';
      this.loadCategories();

      const el = document.getElementById('addCategoryModal');
      const modal = (window as any).bootstrap.Modal.getInstance(el);
      modal?.hide();

      const manageEl = document.getElementById('manageCategoriesModal');
      const manageModal = (window as any).bootstrap.Modal.getInstance(manageEl);
      if (manageModal) {
        // لو المودال مفتوح نحدّث القائمة فقط بدون إغلاق
      }

      alert('تم إضافة الفئة بنجاح');
    },
    error: (err: any) => {
      console.error(err);
      this.isSavingCat = false;
      alert(err?.error?.message || 'فشل في إضافة الفئة');
    },
  });
}


// فتح مودال إضافة فئة جديدة (+)
openAddCategoryModal() {
  const el = document.getElementById('addCategoryModal');
  const modal = new (window as any).bootstrap.Modal(el);
  modal.show();
}





}

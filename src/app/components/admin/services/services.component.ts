import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
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

  constructor(private api: ApiService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initRatesForm();
    this.loadCategories();
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
}

import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

type CategoryDto = {
  id: number;
  name: string;
  parentId: number | null;
  isActive: boolean;
};

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
})
export class CategoriesComponent implements OnInit {
  categories: CategoryDto[] = [];
  newCategoryName = '';
  isSavingCat = false;
  isLoading = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.api.getCatalogCategories().subscribe({
      next: (res: any) => {
        this.categories = (res?.data ?? []).filter((c: CategoryDto) => c.isActive);
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      },
    });
  }

  addCategory(): void {
    const name = (this.newCategoryName || '').trim();
    if (!name) return;
    this.isSavingCat = true;
    this.api.createCategory({ name }).subscribe({
      next: () => {
        this.isSavingCat = false;
        this.newCategoryName = '';
        this.loadCategories();
        alert('تم إضافة الفئة بنجاح');
      },
      error: (err: any) => {
        console.error(err);
        this.isSavingCat = false;
        alert(err?.error?.message || 'فشل في إضافة الفئة');
      },
    });
  }

  updateCategory(cat: CategoryDto): void {
    const newName = prompt('أدخل الاسم الجديد للفئة:', cat.name);
    if (newName == null || newName.trim() === '') return;
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
}

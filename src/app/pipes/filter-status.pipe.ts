import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterStatus',
  standalone: true
})
export class FilterStatusPipe implements PipeTransform {
  transform(customers: any[] | null, status: string): any[] {
    if (!customers) return [];
    return customers.filter(c => c.status === status);
  }
}

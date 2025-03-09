import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-media-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-4">
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Type</label
          >
          <div class="flex gap-2">
            @for (type of mediaTypes; track type) {
            <label class="inline-flex items-center">
              <input
                type="checkbox"
                [checked]="isTypeSelected(type)"
                (change)="toggleType(type)"
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span class="ml-2 text-sm text-gray-700">{{ type }}</span>
            </label>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MediaFilterComponent {
  @Input() filters: any;
  @Output() filterChange = new EventEmitter<any>();

  mediaTypes = ['image', 'video', 'document'];
  dateRange = {
    start: '',
    end: '',
  };

  isTypeSelected(type: string): boolean {
    return this.filters.type.includes(type);
  }

  toggleType(type: string): void {
    const index = this.filters.type.indexOf(type);
    if (index === -1) {
      this.filters.type.push(type);
    } else {
      this.filters.type.splice(index, 1);
    }
    this.updateFilters();
  }

  updateFilters(): void {
    this.filterChange.emit({
      ...this.filters,
      dateRange: this.dateRange,
    });
  }
}

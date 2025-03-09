import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CreateAreaDialogData,
  AreaOrientation,
} from '../../models/area-dialog.model';

@Component({
  selector: 'app-area-orientation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 class="text-xl font-semibold mb-4">Select Display Orientation</h2>
        <p class="text-gray-600 mb-6">
          Choose the orientation for Area "{{ areaData.name }}"
        </p>

        <div class="grid grid-cols-2 gap-4">
          @for (option of orientationOptions; track option.value) {
          <button
            (click)="selectOrientation(option.value)"
            class="p-4 border rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            [class.border-blue-500]="selectedOrientation === option.value"
          >
            <span class="material-icons text-4xl mb-2">{{ option.icon }}</span>
            <h3 class="font-medium">{{ option.label }}</h3>
            <p class="text-sm text-gray-500">{{ option.description }}</p>
          </button>
          }
        </div>

        <div class="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            (click)="back.emit()"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="button"
            (click)="create()"
            [disabled]="!selectedOrientation"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Area
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AreaOrientationDialogComponent {
  @Input() areaData!: Partial<CreateAreaDialogData>;
  @Output() createArea = new EventEmitter<CreateAreaDialogData>();
  @Output() back = new EventEmitter<void>();

  selectedOrientation: 'landscape' | 'portrait' | null = null;

  orientationOptions: AreaOrientation[] = [
    {
      value: 'landscape',
      label: 'Landscape',
      description: 'Horizontal display (16:9)',
      icon: 'panorama',
    },
    {
      value: 'portrait',
      label: 'Portrait',
      description: 'Vertical display (9:16)',
      icon: 'stay_current_portrait',
    },
  ];

  selectOrientation(orientation: 'landscape' | 'portrait'): void {
    this.selectedOrientation = orientation;
  }

  create(): void {
    if (
      this.selectedOrientation &&
      this.areaData.name &&
      this.areaData.location
    ) {
      this.createArea.emit({
        name: this.areaData.name,
        location: this.areaData.location,
        description: this.areaData.description,
       
      });
    }
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Screen } from '../../../../models/screen.model';
import { CreateAreaDialogData } from '../../models/area-dialog.model';

@Component({
  selector: 'app-area-screens-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <h2 class="text-xl font-semibold mb-4">Add Screens to Area</h2>
        <p class="text-gray-600 mb-6">
          Select screens for Area "{{ areaData.name }}"
        </p>

        <!-- Available Screens Grid -->
        <div class="space-y-4">
          @if (availableScreens.length === 0) {
            <div class="bg-gray-50 p-6 rounded-lg text-center">
              <span class="material-icons text-gray-400 text-3xl mb-2">devices</span>
              <p class="text-gray-600">No available screens found</p>
              <p class="text-sm text-gray-500 mt-1">All screens are already assigned to areas</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (screen of availableScreens; track screen.id) {
                <div
                  class="p-4 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                  [class.border-blue-500]="isScreenSelected(screen)"
                  (click)="toggleScreen(screen)"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-medium">{{ screen.name }}</h3>
                      <p class="text-sm text-gray-500">{{ screen.resolution }}</p>
                    </div>
                    <div 
                      class="w-5 h-5 border-2 rounded-full flex items-center justify-center"
                      [class.border-blue-500]="isScreenSelected(screen)"
                      [class.bg-blue-500]="isScreenSelected(screen)"
                    >
                      @if (isScreenSelected(screen)) {
                        <span class="material-icons text-white text-sm">check</span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
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
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Create Area
          </button>
        </div>
      </div>
    </div>
  `
})
export class AreaScreensDialogComponent {
  @Input() areaData!: Partial<CreateAreaDialogData>;
  @Input() availableScreens: Screen[] = [];
  @Output() createArea = new EventEmitter<Partial<CreateAreaDialogData> & { screenIds: string[] }>();
  @Output() back = new EventEmitter<void>();

  selectedScreens: Screen[] = [];

  isScreenSelected(screen: Screen): boolean {
    return this.selectedScreens.some(s => s.id === screen.id);
  }

  toggleScreen(screen: Screen): void {
    if (this.isScreenSelected(screen)) {
      this.selectedScreens = this.selectedScreens.filter(s => s.id !== screen.id);
    } else {
      this.selectedScreens.push(screen);
    }
  }

  create(): void {
    // Make sure we emit data in the expected format
    this.createArea.emit({
      ...this.areaData,
      screenIds: this.selectedScreens.map(screen => screen.id)
    });
  }
}
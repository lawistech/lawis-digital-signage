import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Screen } from '../../../../models/screen.model';
import { CreateAreaDialogData } from '../../models/area-dialog.model';
import { ScreenService } from '../../../screens/services/screen.service';

@Component({
  selector: 'app-area-screens-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <h2 class="text-xl font-semibold mb-4">{{ isExistingArea ? 'Add Screens to Area' : 'Select Screens for New Area' }}</h2>
        <p class="text-gray-600 mb-6">
          Select screens for Area "{{ areaData.name }}"
        </p>

        <!-- Search Input -->
        <div class="mb-4">
          <div class="relative">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search screens..."
              class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-colors"
            />
            <span class="material-icons absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
          </div>
        </div>

        <!-- Available Screens Grid -->
        <div class="space-y-4">
          @if (filteredScreens.length === 0) {
            <div class="bg-gray-50 p-6 rounded-lg text-center">
              <span class="material-icons text-gray-400 text-3xl mb-2">devices</span>
              <p class="text-gray-600">No available screens found</p>
              <p class="text-sm text-gray-500 mt-1">
                {{ searchQuery ? 'Try modifying your search query' : 'All screens are already assigned to areas' }}
              </p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (screen of filteredScreens; track screen.id) {
                <div
                  class="p-4 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                  [class.border-blue-500]="isScreenSelected(screen)"
                  [class.bg-blue-50]="isScreenSelected(screen)"
                  (click)="toggleScreen(screen)"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-medium">{{ screen.name }}</h3>
                      <p class="text-sm text-gray-500">{{ screen.resolution || 'Unknown resolution' }}</p>
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
                  
                  <!-- Additional screen details -->
                  <div class="mt-2 flex items-center text-xs text-gray-500">
                    <span class="inline-flex items-center rounded-full px-2 py-1 mr-2"
                      [class.bg-green-100]="screen.status === 'online'"
                      [class.text-green-800]="screen.status === 'online'"
                      [class.bg-gray-100]="screen.status === 'offline'"
                      [class.text-gray-800]="screen.status === 'offline'"
                      [class.bg-yellow-100]="screen.status === 'maintenance'"
                      [class.text-yellow-800]="screen.status === 'maintenance'"
                      [class.bg-red-100]="screen.status === 'error'"
                      [class.text-red-800]="screen.status === 'error'"
                    >
                      {{ screen.status }}
                    </span>
                    
                    @if (screen.tags && screen.tags.length > 0) {
                      <span class="truncate">{{ screen.tags.join(', ') }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Confirmation and Selected Count -->
        <div class="flex items-center justify-between mt-4">
          <div class="text-sm text-gray-600">
            {{ selectedScreens.length }} screen{{ selectedScreens.length !== 1 ? 's' : '' }} selected
          </div>
          
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              (click)="back.emit()"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              (click)="confirm()"
              [disabled]="selectedScreens.length === 0"
              class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isExistingArea ? 'Add Screens' : 'Create Area' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AreaScreensDialogComponent implements OnInit {
  @Input() areaData!: Partial<CreateAreaDialogData>;
  @Input() availableScreens: Screen[] = [];
  @Output() createArea = new EventEmitter<Partial<CreateAreaDialogData> & { screenIds: string[] }>();
  @Output() back = new EventEmitter<void>();

  selectedScreens: Screen[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  
  constructor(private screenService: ScreenService) {}
  
  ngOnInit(): void {
    // If we don't have available screens passed in, load unassigned screens
    if (this.availableScreens.length === 0) {
      this.loadUnassignedScreens();
    }
  }
  
  private loadUnassignedScreens(): void {
    this.isLoading = true;
    this.screenService.getScreens()
      .subscribe({
        next: (screens) => {
          // Filter screens that don't have an area assigned
          this.availableScreens = screens.filter(screen => !screen.area_id);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading unassigned screens:', error);
          this.isLoading = false;
        }
      });
  }

  get isExistingArea(): boolean {
    // Check if this is for an existing area (has an ID) or a new area creation
    return 'id' in this.areaData && !!this.areaData.id;
  }
  
  get filteredScreens(): Screen[] {
    if (!this.searchQuery.trim()) {
      return this.availableScreens;
    }
    
    const query = this.searchQuery.toLowerCase();
    return this.availableScreens.filter(screen => 
      screen.name.toLowerCase().includes(query) ||
      (screen.tags && screen.tags.some(tag => tag.toLowerCase().includes(query))) ||
      screen.status.toLowerCase().includes(query)
    );
  }

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

  confirm(): void {
    // Emit data with selected screen IDs
    this.createArea.emit({
      ...this.areaData,
      screenIds: this.selectedScreens.map(screen => screen.id)
    });
  }
}
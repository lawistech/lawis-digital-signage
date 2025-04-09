// src/app/features/areas/components/dialogs/area-name-dialog/area-name-dialog.component.ts

import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CreateAreaDialogData,
} from '../../models/area-dialog.model';

@Component({
  selector: 'app-area-name-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 class="text-xl font-semibold mb-4">Create New Area</h2>

        <form (ngSubmit)="onSubmit()" #form="ngForm">
          <div class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700"
                >Area Name *</label
              >
              <input
                type="text"
                id="name"
                name="name"
                [(ngModel)]="areaData.name"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter area name (e.g., Main Lobby, Cafeteria)"
              />
            </div>

            <div>
              <label
                for="building"
                class="block text-sm font-medium text-gray-700"
                >Building *</label
              >
              <input
                type="text"
                id="building"
                name="building"
                [(ngModel)]="areaData.location"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter building name"
              />
            </div>

            <div>
              <label
                for="description"
                class="block text-sm font-medium text-gray-700"
                >Description</label
              >
              <textarea
                id="description"
                name="description"
                [(ngModel)]="areaData.description"
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter area description"
              ></textarea>
            </div>
          </div>

          <div class="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              (click)="onCancel.emit()"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="!form.form.valid"
              class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class AreaNameDialogComponent {
  @Output() next = new EventEmitter<Partial<CreateAreaDialogData>>();
  @Output() onCancel = new EventEmitter<void>();

  areaData: Partial<CreateAreaDialogData> = {
    name: '',
    location: '',
    description: '',
  };

  onSubmit(): void {
    if (this.areaData.name && this.areaData.location) {
      this.next.emit(this.areaData);
    }
  }
}
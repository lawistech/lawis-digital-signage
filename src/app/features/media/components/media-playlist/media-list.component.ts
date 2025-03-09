// media-list.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Media } from '../../../../models/media.model';

@Component({
  selector: 'app-media-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Media
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Upload Date
            </th>
            <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          @for (item of media; track item.id) {
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 relative rounded overflow-hidden">
                    @if (item.type === 'image') {
                      <img
                        [src]="item.url"
                        [alt]="item.name"
                        class="h-10 w-10 object-cover cursor-pointer"
                        (click)="select.emit(item)"
                      />
                    } @else if (item.type === 'video') {
                      <div
                        class="h-10 w-10 bg-gray-100 flex items-center justify-center cursor-pointer group"
                        (click)="select.emit(item)"
                      >
                        @if (item.thumbnail_url) {
                          <img
                            [src]="item.thumbnail_url"
                            [alt]="item.name"
                            class="h-10 w-10 object-cover"
                          />
                        }
                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span class="material-icons text-white">play_arrow</span>
                        </div>
                      </div>
                    }
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900 max-w-xs truncate">
                      {{ item.name }}
                    </div>
                    @if (item.tags.length) {
                      <div class="flex gap-1 mt-1">
                        @for (tag of item.tags.slice(0, 2); track tag) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {{ tag }}
                          </span>
                        }
                        @if (item.tags.length > 2) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            +{{ item.tags.length - 2 }}
                          </span>
                        }
                      </div>
                    }
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="item.type === 'image' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'"
                >
                  {{ item.type }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatFileSize(item.metadata.size) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.duration ? formatDuration(item.duration) : '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.created_at | date:'medium' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  (click)="select.emit(item)"
                  class="text-blue-600 hover:text-blue-900 mx-2"
                  title="Preview"
                >
                  <span class="material-icons">
                    {{ item.type === 'image' ? 'zoom_in' : 'play_circle' }}
                  </span>
                </button>
                <button
                  (click)="delete.emit(item.id)"
                  class="text-red-600 hover:text-red-900"
                  title="Delete"
                >
                  <span class="material-icons">delete</span>
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MediaListComponent {
  @Input() media: Media[] = [];
  @Output() select = new EventEmitter<Media>();
  @Output() delete = new EventEmitter<string>();

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
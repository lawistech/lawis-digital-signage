import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Screen } from '../../../../models/screen.model';

@Component({
  selector: 'app-screen-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Channel
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Resolution
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Current Playlist
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Last Ping
            </th>
            <th
              class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          @for (screen of screens; track screen.id) {
          <tr>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="flex items-center">
                <span
                  class="h-2.5 w-2.5 rounded-full mr-2"
                  [class]="
                    screen.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
                  "
                ></span>
                {{ screen.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">{{ screen.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              {{ screen.channel_name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">{{ screen.resolution }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              {{ screen.channel_name || 'None' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">{{ screen.channel_name }}</td>
            <td
              class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
            >
              <button
                (click)="edit.emit(screen)"
                class="text-indigo-600 hover:text-indigo-900 mr-4"
              >
                Edit
              </button>
              <button
                (click)="delete.emit(screen.id)"
                class="text-red-600 hover:text-red-900"
              >
                Delete
              </button>
            </td>
          </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ScreenTableComponent {
  @Input() screens: Screen[] = [];
  @Output() edit = new EventEmitter<Screen>();
  @Output() delete = new EventEmitter<string>();
}

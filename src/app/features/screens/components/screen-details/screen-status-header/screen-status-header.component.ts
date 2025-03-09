import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Screen } from '../../../../../models/screen.model';

@Component({
  selector: 'app-screen-status-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <button
              routerLink="/screens"
              class="text-gray-400 hover:text-gray-600 p-2"
            >
              <span class="material-icons">arrow_back</span>
            </button>
            <h1 class="ml-4 text-xl font-medium text-gray-900">
              {{ screen?.name }}
            </h1>
          </div>
          <div class="flex items-center space-x-4">
            <div class="flex items-center gap-2">
              <div
                [class]="'h-2.5 w-2.5 rounded-full ' + getStatusColor()"
              ></div>
              <span class="text-sm font-medium">{{ screen?.status }}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  `,
})
export class ScreenStatusHeaderComponent {
  @Input() screen: Screen | null = null;

  getStatusColor(): string {
    if (!this.screen) return 'bg-gray-400';

    switch (this.screen.status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-gray-400';
      case 'maintenance':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  }
}

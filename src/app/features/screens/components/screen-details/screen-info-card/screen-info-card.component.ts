import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Screen } from '../../../../../models/screen.model';

@Component({
  selector: 'app-screen-info-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-medium mb-4">Screen Information</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-500">Channel</label>
          <p class="font-medium">{{ screen?.channel_name }}</p>
        </div>
        <div>
          <label class="block text-sm text-gray-500">Location</label>
          <p class="font-medium">
            {{ screen?.location }}
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ScreenInfoCardComponent {
  @Input() screen: Screen | null = null;
}

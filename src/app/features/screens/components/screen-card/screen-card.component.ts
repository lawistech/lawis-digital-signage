// src/app/features/screens/components/screen-card/screen-card.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Screen } from '../../../../models/screen.model';
import { PlaylistService } from '../../../playlists/services/playlist.service';

@Component({
  selector: 'app-screen-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div
      class="bg-white rounded-lg shadow-lg transition-shadow duration-200 hover:shadow-xl"
    >
      <!-- Main Card Section - Clickable Area -->
      <div [routerLink]="['/screens', screen.id]" class="p-4 cursor-pointer">
        <!-- Header Row -->
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div [class]="'h-2.5 w-2.5 rounded-full ' + getStatusColor()"></div>
            <h3 class="font-medium text-gray-900 truncate max-w-[200px]">
              {{ screen.name }}
            </h3>
          </div>

          <div class="flex items-center gap-2">
            @if (hasErrors()) {
              <div
                class="text-amber-500"
                [title]="getErrorCount() + ' issues detected'"
              >
                <span class="material-icons text-base">warning</span>
              </div>
            }
            <button
              (click)="toggleExpand($event)"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span class="material-icons text-xl">
                {{ isExpanded ? 'expand_less' : 'chevron_right' }}
              </span>
            </button>
          </div>
        </div>

        <!-- Quick Info Row -->
        <div
          class="flex items-center justify-between text-sm text-gray-500 mb-2"
        >
          <span class="flex items-center gap-1 text-xs">
            {{ screen.channel_name || 'No Channel' }}
          </span>
        </div>

        <!-- Current Playlist -->
        <div
          class="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded-md p-2"
        >
          <span class="material-icons text-blue-500 text-base">play_circle</span>
          <span class="truncate">{{
            currentPlaylistName || 'No playlist assigned'
          }}</span>
        </div>
      </div>

      <!-- Expandable Section -->
      @if (isExpanded) {
        <div class="border-t border-gray-100 p-4 bg-gray-50 space-y-3 text-sm">
          <!-- Quick Info Row -->
          <div
            class="flex items-center justify-between text-sm text-gray-500 mb-2"
          >
            <span class="flex items-center gap-1">
              <span class="material-icons text-base">monitor</span>
              {{ screen.channel_name || 'No Channel' }}
            </span>
            <span class="text-xs">{{ screen.location.building || 'No Location' }}</span>
          </div>
          <!-- Quick Stats Grid -->
          <div class="grid grid-cols-3 gap-4">
            <div>
              <span class="text-gray-500 block">Resolution</span>
              <span class="font-medium">{{ screen.resolution || 'Unknown' }}</span>
            </div>
            <div>
              <span class="text-gray-500 block">Uptime</span>
              <span class="font-medium">{{ getUptime() }}%</span>
            </div>
            <div>
              <span class="text-gray-500 block">Last Ping</span>
              <span class="font-medium">{{ formatDate(screen.last_ping) }}</span>
            </div>
          </div>

          <!-- Tags -->
          @if (screen.tags && screen.tags.length > 0) {
            <div class="flex flex-wrap gap-1">
              @for (tag of screen.tags; track tag) {
                <span
                  class="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs"
                >
                  {{ tag }}
                </span>
              }
            </div>
          }

          <!-- Action Buttons -->
          <div class="flex justify-end gap-2 pt-2">
            <button
              (click)="handleEdit($event)"
              class="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors text-xs font-medium flex items-center gap-1"
            >
              <span class="material-icons text-base">settings</span>
              Settings
            </button>
            <button
              [routerLink]="['/screens', screen.id]"
              class="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors text-xs font-medium"
            >
              View Details
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ScreenCardComponent implements OnInit {
  @Input({ required: true }) screen!: Screen;
  @Output() edit = new EventEmitter<Screen>();
  @Output() viewDetails = new EventEmitter<Screen>();

  isExpanded = false;
  currentPlaylistName = '';

  constructor(private playlistService: PlaylistService) {}

  ngOnInit(): void {
    this.loadPlaylistName();
  }

  loadPlaylistName(): void {
    if (this.screen && this.screen.current_playlist) {
      this.playlistService.getPlaylist(this.screen.current_playlist).subscribe({
        next: (playlist) => {
          this.currentPlaylistName = playlist.name;
        },
        error: () => {
          this.currentPlaylistName = 'Unknown playlist';
        }
      });
    } else {
      this.currentPlaylistName = 'No playlist assigned';
    }
  }

  getStatusColor(): string {
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

  // Add this method to safely check for errors
  hasErrors(): boolean {
    return this.screen.analytics && 
           this.screen.analytics.errors && 
           typeof this.screen.analytics.errors.count === 'number' && 
           this.screen.analytics.errors.count > 0;
  }

  // Add this method to safely get the error count
  getErrorCount(): number {
    if (this.screen.analytics && 
        this.screen.analytics.errors && 
        typeof this.screen.analytics.errors.count === 'number') {
      return this.screen.analytics.errors.count;
    }
    return 0;
  }

  // Add a safe method to get uptime
  getUptime(): number {
    if (this.screen.analytics && 
        typeof this.screen.analytics.uptime === 'number') {
      return this.screen.analytics.uptime;
    }
    return 0;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;
      
      return date.toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  }

  toggleExpand(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isExpanded = !this.isExpanded;
  }

  handleEdit(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.edit.emit(this.screen);
  }
}
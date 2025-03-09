// playlist-details-dialog.component.ts
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Playlist } from '../../../../../models/playlist.model';
import { PlaylistService } from '../../../../playlists/services/playlist.service';

@Component({
  selector: 'app-playlist-details-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-gray-100/95 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
      <!-- Main Paper Card -->
      <div class="bg-white rounded-lg w-full max-w-5xl mx-4 my-auto shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] transform transition-all duration-300 max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100">
          @if (loading) {
            <div class="h-6 w-48 bg-gray-100 animate-pulse rounded"></div>
          } @else {
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <span class="material-icons text-blue-500">playlist_play</span>
                </div>
                <div>
                  <h2 class="text-xl text-gray-800">{{ playlist?.name }}</h2>
                  <p class="text-sm text-gray-500">Modified {{ playlist?.lastModified | date:'medium' }}</p>
                </div>
              </div>
              <button
                (click)="onClose.emit()"
                class="h-8 w-8 rounded-full hover:bg-gray-50 flex items-center justify-center"
              >
                <span class="material-icons text-gray-400">close</span>
              </button>
            </div>
          }
        </div>

        <!-- Content Area -->
        <div class="p-8 overflow-y-auto flex-1">
          @if (loading) {
            <div class="flex justify-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent"></div>
            </div>
          } @else if (error) {
            <div class="bg-red-50 rounded-lg p-4 text-red-600 flex items-center gap-3">
              <span class="material-icons">error_outline</span>
              <p>{{ error }}</p>
              <button
                (click)="loadPlaylist()"
                class="ml-auto text-sm text-red-600 hover:text-red-700"
              >
                Retry
              </button>
            </div>
          } @else if (playlist) {
            <div class="space-y-8">
              <!-- Stats Cards -->
              <div class="grid grid-cols-3 gap-6">
                <!-- Duration Card -->
                <div class="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="h-8 w-8 bg-blue-50 rounded-full flex items-center justify-center">
                      <span class="material-icons text-blue-500">timer</span>
                    </div>
                    <p class="text-gray-600">Duration</p>
                  </div>
                  <p class="text-2xl font-light text-gray-800">{{ formatDuration(playlist.duration) }}</p>
                </div>

                <!-- Items Count Card -->
                <div class="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="h-8 w-8 bg-emerald-50 rounded-full flex items-center justify-center">
                      <span class="material-icons text-emerald-500">view_list</span>
                    </div>
                    <p class="text-gray-600">Items</p>
                  </div>
                  <p class="text-2xl font-light text-gray-800">{{ playlist.items.length }}</p>
                </div>

                <!-- Status Card -->
                <div class="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="h-8 w-8 bg-purple-50 rounded-full flex items-center justify-center">
                      <span class="material-icons text-purple-500">radio_button_checked</span>
                    </div>
                    <p class="text-gray-600">Status</p>
                  </div>
                  <p class="text-2xl font-light capitalize" 
                     [class]="getStatusColor(playlist.status)">
                    {{ playlist.status }}
                  </p>
                </div>
              </div>

              <!-- Description Section -->
              @if (playlist.description) {
                <div class="bg-gray-50 rounded-lg p-6">
                  <h3 class="text-gray-700 font-medium mb-3 flex items-center gap-2">
                    <span class="material-icons text-gray-400">description</span>
                    Description
                  </h3>
                  <p class="text-gray-600 leading-relaxed">{{ playlist.description }}</p>
                </div>
              }

              <!-- Playlist Items -->
              <div class="bg-white rounded-lg border border-gray-100 shadow-sm">
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 class="text-gray-700 font-medium flex items-center gap-2">
                    <span class="material-icons text-gray-400">format_list_bulleted</span>
                    Playlist Items
                  </h3>
                  <span class="text-sm text-gray-500">
                    {{ playlist.items.length }} items • {{ formatDuration(playlist.duration) }}
                  </span>
                </div>

                <div class="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                  @for (item of playlist.items; track item.id) {
                    <div class="p-4 hover:bg-gray-50 transition-colors">
                      <div class="flex items-center gap-4">
                        <!-- Number -->
                        <div class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          {{ playlist.items.indexOf(item) + 1 }}
                        </div>

                        <!-- Thumbnail -->
                        <div class="h-16 w-16 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                          @if (item.type === 'image') {
                            <img [src]="item.content.url" [alt]="item.name" 
                                 class="h-full w-full object-cover" />
                          } @else if (item.type === 'video' && item.content.thumbnail) {
                            <div class="relative h-full w-full">
                              <img [src]="item.content.thumbnail" [alt]="item.name" 
                                   class="h-full w-full object-cover" />
                              <div class="absolute inset-0 flex items-center justify-center bg-black/20">
                                <span class="material-icons text-white">play_circle</span>
                              </div>
                            </div>
                          } @else {
                            <span class="material-icons text-gray-400">{{ getItemIcon(item.type) }}</span>
                          }
                        </div>

                        <!-- Info -->
                        <div class="flex-1">
                          <h4 class="font-medium text-gray-800">{{ item.name }}</h4>
                          <div class="flex items-center gap-4 mt-1">
                            <span class="text-sm text-gray-500 capitalize">{{ item.type }}</span>
                            <span class="text-sm text-gray-500 flex items-center gap-1">
                              <span class="material-icons text-gray-400 text-sm">schedule</span>
                              {{ formatDuration(item.duration) }}
                            </span>
                          </div>

                          <!-- Settings Tags -->
                          <div class="flex gap-2 mt-2">
                            @if (item.settings.transition !== 'none') {
                              <span class="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                {{ item.settings.transition }}
                              </span>
                            }
                            @if (item.settings.loop) {
                              <span class="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                Loop
                              </span>
                            }
                            @if (item.settings.muted) {
                              <span class="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                Muted
                              </span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Footer -->
        @if (playlist) {
          <div class="p-6 border-t border-gray-100 flex justify-end gap-3">
            <button
              (click)="onClose.emit()"
              class="px-6 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              (click)="onAssign.emit(playlist)"
              class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
            >
              Assign Playlist
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Custom scrollbar */
    .overflow-y-auto {
      scrollbar-width: thin;
      scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
      width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
      background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
      background-color: rgba(156, 163, 175, 0.5);
      border-radius: 3px;
    }
  `]
})
export class PlaylistDetailsDialogComponent implements OnInit {
  @Input({ required: true }) playlistId!: string;
  @Output() onAssign = new EventEmitter<Playlist>();
  @Output() onClose = new EventEmitter<void>();

  playlist: Playlist | null = null;
  loading = true;
  error: string | null = null;

  constructor(private playlistService: PlaylistService) {}

  ngOnInit() {
    this.loadPlaylist();
  }

  loadPlaylist() {
    this.loading = true;
    this.error = null;

    this.playlistService.getPlaylist(this.playlistId).subscribe({
      next: (playlist) => {
        this.playlist = playlist;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading playlist:', error);
        this.error = 'Failed to load playlist details. Please try again.';
        this.loading = false;
      }
    });
  }

  getItemIcon(type: string): string {
    switch (type) {
      case 'video':
        return 'movie';
      case 'image':
        return 'image';
      case 'webpage':
        return 'web';
      default:
        return 'insert_drive_file';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'text-emerald-500';
      case 'draft':
        return 'text-gray-500';
      case 'archived':
        return 'text-amber-500';
      default:
        return 'text-gray-500';
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  }
}
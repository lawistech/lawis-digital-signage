// updated current-playlist-card.component.ts
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaylistService } from '../../../../playlists/services/playlist.service';
import { Playlist } from '../../../../../models/playlist.model';

@Component({
  selector: 'app-current-playlist-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-blue-50 rounded-lg p-4">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="font-medium text-gray-900">{{ playlist?.name || 'Untitled Playlist' }}</h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ playlist?.items?.length || 0 }} items • {{ formatDuration(playlist?.duration || 0) }}
          </p>
        </div>
        <div class="flex gap-2">
        <button
            (click)="onView.emit(playlist)"
            class="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50"
            title="View Details"
            *ngIf="playlist"
          >
            <span class="material-icons">play_arrow</span>
          </button>
        <button
              (click)="playPlaylist()"
              class="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50"
              title="Play"
              *ngIf="playlist"
            >
              <span class="material-icons">visibility</span>
            </button>
        
        </div>
      </div>
      @if (currentItem && playlist?.items?.length) {
        <div class="mt-4 p-3 bg-white rounded border border-blue-100">
          <p class="text-sm font-medium">Now Playing:</p>
          <div class="flex items-center gap-3 mt-2">
            @if (currentItem.type === 'image') {
              <img 
                [src]="currentItem.content.url" 
                [alt]="currentItem.name"
                class="w-12 h-12 object-cover rounded"
              />
            } @else {
              <div class="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                <span class="material-icons text-gray-400">
                  {{ currentItem.type === 'video' ? 'movie' : 'web' }}
                </span>
              </div>
            }
            <div>
              <p class="font-medium">{{ currentItem.name }}</p>
              <p class="text-sm text-gray-500">{{ formatDuration(currentItem.duration) }}</p>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CurrentPlaylistCardComponent implements OnInit {
  @Input() screenId!: string;
  @Input() currentPlaylistId: string | null = null;
  @Output() onView = new EventEmitter<Playlist>();
  @Output() onAssign = new EventEmitter<void>();
  @Output() onPlayStatusChange = new EventEmitter<boolean>();

  playlist: Playlist | null = null;
  loading = false;
  error: string | null = null;
  isPlaying = false;
  currentItem: any = null;

  constructor(private playlistService: PlaylistService) {}

  ngOnInit() {
    if (this.currentPlaylistId) {
      this.loadPlaylist();
    }
  }

  loadPlaylist() {
    if (!this.currentPlaylistId) return;

    this.loading = true;
    this.error = null;

    this.playlistService.getPlaylist(this.currentPlaylistId).subscribe({
      next: (playlist) => {
        this.playlist = playlist;
        // Only set current item if the playlist has items
        if (playlist.items && playlist.items.length > 0) {
          this.currentItem = playlist.items[0]; // For demo, start with first item
        } else {
          this.currentItem = null;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading playlist:', error);
        this.error = 'Failed to load playlist';
        this.loading = false;
        this.playlist = null;
        this.currentItem = null;
      }
    });
  }

  playPlaylist() {
    this.isPlaying = true;
    this.onPlayStatusChange.emit(true);
  }

  pausePlaylist() {
    this.isPlaying = false;
    this.onPlayStatusChange.emit(false);
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
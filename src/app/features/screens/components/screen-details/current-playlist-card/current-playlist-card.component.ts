// current-playlist-card.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaylistService } from '../../../../playlists/services/playlist.service';
import { Playlist } from '../../../../../models/playlist.model';

@Component({
  selector: 'app-current-playlist-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-medium mb-4">Current Playlist</h2>

      @if (loading) {
        <div class="animate-pulse flex items-center gap-4">
          <div class="h-12 w-12 bg-gray-200 rounded"></div>
          <div class="flex-1">
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
          </div>
        </div>
      } @else if (error) {
        <div class="bg-red-50 border-l-4 border-red-400 p-4">
          <p class="text-red-700">{{ error }}</p>
          <button 
            (click)="loadPlaylist()"
            class="mt-2 text-sm text-red-600 hover:text-red-700"
          >
            Try Again
          </button>
        </div>
      } @else if (playlist) {
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="font-medium text-gray-900">{{ playlist.name }}</h3>
              <p class="text-sm text-gray-500 mt-1">
                {{ playlist.items.length }} items • {{ formatDuration(playlist.duration) }}
              </p>
            </div>
            <div class="flex gap-2">
            <button
                (click)="onView.emit(playlist)"
                class="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50"
                title="View Details"
              >
                <span class="material-icons">play_arrow</span>
              </button>
            <button
                  (click)="playPlaylist()"
                  class="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50"
                  title="Play"
                >
                  <span class="material-icons">visibility</span>
                </button>
            
            </div>
          </div>
          @if (currentItem) {
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
      } @else {
        <div class="bg-gray-50 rounded-lg p-10 text-center">
          <span class="material-icons text-gray-400 text-3xl mb-2">playlist_play</span>
          <p class="text-gray-600">No playlist currently assigned</p>
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
        this.currentItem = playlist.items[0]; // For demo, start with first item
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading playlist:', error);
        this.error = 'Failed to load playlist';
        this.loading = false;
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
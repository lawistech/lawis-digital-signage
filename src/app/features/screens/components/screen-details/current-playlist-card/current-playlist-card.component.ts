import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
      
      <!-- Only show Now Playing section if there's a current item with proper content -->
      @if (playlist?.items?.length && currentItem?.name) {
        <div class="mt-4 p-3 bg-white rounded border border-blue-100">
          <p class="text-sm font-medium">Now Playing:</p>
          <div class="flex items-center gap-3 mt-2">
            @if (currentItem.type === 'image' && currentItem.content?.url) {
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
              <p class="font-medium">{{playlist?.name  || 'Untitled Playlist'}}</p>
              <p class="text-sm text-gray-500">{{ formatDuration(currentItem.duration || 0) }}</p>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CurrentPlaylistCardComponent implements OnInit, OnChanges {
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
  private cachedPlaylist: Playlist | null = null;
  private loadCompleted = false;

  constructor(private playlistService: PlaylistService) {}

  ngOnInit() {
    if (this.currentPlaylistId) {
      this.loadPlaylist();
    } else {
      this.resetState();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Only reload playlist if the currentPlaylistId actually changed
    if (changes['currentPlaylistId'] && 
        changes['currentPlaylistId'].currentValue !== changes['currentPlaylistId'].previousValue) {
      console.log('Current playlist ID changed:', this.currentPlaylistId);
      
      // Reset the load completed flag to ensure we get fresh data
      this.loadCompleted = false;
      
      if (this.currentPlaylistId) {
        // Clear current state before loading new data
        this.playlist = null;
        this.currentItem = null;
        
        // Load the new playlist
        this.loadPlaylist();
      } else {
        this.resetState();
      }
    }
  }

  private resetState() {
    this.playlist = null;
    this.cachedPlaylist = null;
    this.currentItem = null;
    this.isPlaying = false;
    this.error = null;
    this.loadCompleted = false;
  }

  loadPlaylist() {
    if (!this.currentPlaylistId) {
      this.resetState();
      return;
    }

    // If we already completed loading once and have cached data, use that first
    if (this.loadCompleted && this.cachedPlaylist) {
      this.playlist = this.cachedPlaylist;
      if (this.playlist.items && this.playlist.items.length > 0) {
        this.currentItem = this.playlist.items[0];
      }
    }

    this.loading = true;
    this.error = null;
    console.log('Loading playlist with ID:', this.currentPlaylistId);

    this.playlistService.getPlaylist(this.currentPlaylistId).subscribe({
      next: (playlist) => {
        console.log('Playlist loaded:', playlist);
        
        // Deep clone the playlist to ensure we don't lose data
        this.cachedPlaylist = JSON.parse(JSON.stringify(playlist));
        
        // Only update the playlist reference if we don't already have cached data
        // or if this is our first load
        if (!this.loadCompleted) {
          this.playlist = playlist;
        }
        
        // Only set current item if the playlist has items and we don't already have one
        if (playlist.items && playlist.items.length > 0 && !this.currentItem) {
          this.currentItem = JSON.parse(JSON.stringify(playlist.items[0]));
          console.log('Current item set:', this.currentItem);
          this.isPlaying = true;
        } else if (!playlist.items || playlist.items.length === 0) {
          console.log('Playlist has no items');
          this.currentItem = null;
          this.isPlaying = false;
        }
        
        this.loading = false;
        this.loadCompleted = true;
      },
      error: (error) => {
        console.error('Error loading playlist:', error);
        this.error = 'Failed to load playlist';
        this.loading = false;
        
        // If we have a cached playlist, use that instead of resetting
        if (this.cachedPlaylist) {
          this.playlist = this.cachedPlaylist;
        } else {
          this.resetState();
        }
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
    if (isNaN(seconds) || seconds < 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
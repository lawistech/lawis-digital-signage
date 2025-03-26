// src/app/features/preview/public-playlist-preview.component.ts
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Playlist, PlaylistItem } from '../../models/playlist.model';
import { supabase } from '../../core/services/supabase.config';

@Component({
  selector: 'app-public-playlist-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black flex items-center justify-center z-50">
      <!-- Loading Indicator -->
      @if (loading) {
        <div class="flex flex-col items-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
          <p class="text-white text-lg">Loading playlist...</p>
        </div>
      }

      <!-- Error State -->
      @if (error) {
        <div class="text-center p-8 rounded-lg bg-black/80 text-white max-w-md">
          <span class="material-icons text-red-500 text-5xl mb-4">error_outline</span>
          <h2 class="text-xl font-medium mb-2">{{ error }}</h2>
          <p class="text-gray-300 mb-6">This playlist may be private or no longer exists.</p>
        </div>
      }

      <!-- Playlist Preview -->
      @if (!loading && !error && currentItem) {
        <div class="relative w-full h-full">
          <!-- Current Media Item -->
          <div class="absolute inset-0">
            @if (currentItem.type === 'image') {
              <img
                [src]="currentItem.content.url"
                [alt]="currentItem.name"
                [class]="getScalingClass(currentItem.settings?.scaling)"
                class="w-full h-full transition-opacity duration-500"
                [class.opacity-0]="isTransitioning"
                [class.opacity-100]="!isTransitioning"
              />
            } @else if (currentItem.type === 'video') {
              <video
                #videoPlayer
                [src]="currentItem.content.url"
                [muted]="currentItem.settings.muted ?? true"
                [loop]="currentItem.settings.loop ?? false"
                [class]="getScalingClass(currentItem.settings.scaling)"
                (ended)="onVideoEnded()"
                class="w-full h-full transition-opacity duration-500"
                [class.opacity-0]="isTransitioning"
                [class.opacity-100]="!isTransitioning"
              ></video>
            } @else if (currentItem.type === 'webpage') {
              <iframe
                [src]="getSafeUrl(currentItem.content.url)"
                class="w-full h-full border-0 transition-opacity duration-500"
                [class.opacity-0]="isTransitioning"
                [class.opacity-100]="!isTransitioning"
              ></iframe>
            }
          </div>

          <!-- Transition Overlay -->
          @if (currentItem?.settings?.transition !== 'none') {
            <div
              class="absolute inset-0 bg-black transition-opacity duration-500"
              [class.opacity-0]="!isTransitioning"
              [class.opacity-100]="isTransitioning"
            ></div>
          }

          <!-- Info Bar (shows only on hover) -->
          <div 
            class="absolute bottom-0 left-0 right-0 bg-black/50 p-4 transition-transform duration-300"
            [class.translate-y-full]="!showControls"
            (mouseenter)="showControls = true"
            (mouseleave)="showControls = false"
          >
            <div class="flex items-center justify-between text-white">
              <div class="flex items-center">
                <span class="material-icons mr-2">{{ getItemIcon(currentItem.type) }}</span>
                <div>
                  <h3 class="font-medium">{{ currentItem.name }}</h3>
                  <p class="text-sm text-gray-300">{{ formatDuration(currentItem.duration) }}</p>
                </div>
              </div>
              <div class="text-sm">
                {{ currentIndex + 1 }} / {{ playlist.items.length }}
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 transition-all duration-100"
                [style.width.%]="progress"
              ></div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    
    .material-icons {
      font-family: 'Material Icons';
      font-weight: normal;
      font-style: normal;
      display: inline-block;
      line-height: 1;
      text-transform: none;
      letter-spacing: normal;
      word-wrap: normal;
      white-space: nowrap;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
    }
  `]
})
export class PublicPlaylistPreviewComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer?: ElementRef<HTMLVideoElement>;

  playlist!: Playlist;
  currentItem: PlaylistItem | null = null;
  currentIndex = 0;
  progress = 0;
  isTransitioning = false;
  showControls = false;
  loading = true;
  error: string | null = null;
  
  private timer: any = null;
  private mouseTimeout: any = null;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadPlaylist();
    
    // Show controls on mouse move
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  ngOnDestroy(): void {
    this.clearTimer();
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    if (this.mouseTimeout) {
      clearTimeout(this.mouseTimeout);
    }
  }

  private async loadPlaylist(): Promise<void> {
    try {
      const playlistId = this.route.snapshot.paramMap.get('id');
      if (!playlistId) {
        throw new Error('No playlist ID provided');
      }

      // Fetch the playlist from Supabase directly
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          items:playlist_items(*)
        `)
        .eq('id', playlistId)
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Playlist not found');
      }

      // Map the data to our Playlist model
      this.playlist = this.mapPlaylist(data);
      
      if (this.playlist.items.length === 0) {
        throw new Error('This playlist has no content');
      }

      // Start the playback
      this.loading = false;
      this.startPlayback();
    } catch (error: any) {
      console.error('Error loading playlist:', error);
      this.loading = false;
      this.error = error.message || 'Failed to load playlist';
    }
  }

  private mapPlaylist(data: any): Playlist {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      duration: data.duration || 0,
      items: (data.items || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        duration: item.duration,
        content: {
          url: item.content_url,
          thumbnail: item.thumbnail_url
        },
        settings: {
          transition: item.transition || 'fade',
          transitionDuration: item.transition_duration || 0.5,
          scaling: item.scaling || 'fit',
          muted: item.muted,
          loop: item.loop
        },
        schedule: null
      })),
      lastModified: data.updated_at,
      createdBy: data.created_by,
      status: data.status,
      tags: data.tags || [],
      settings: data.settings || {
        autoPlay: true,
        loop: true,
        defaultMuted: true,
        transition: {
          type: 'fade',
          duration: 0.5
        },
        defaultDuration: 10,
        scheduling: {
          enabled: false,
          priority: 1
        }
      }
    };
  }

  private startPlayback(): void {
    if (!this.playlist || this.playlist.items.length === 0) return;

    this.currentItem = this.playlist.items[this.currentIndex];
    this.progress = 0;
    this.isTransitioning = true;

    // Apply transition effect
    setTimeout(() => {
      this.isTransitioning = false;
      
      if (this.currentItem?.type === 'video' && this.videoPlayer) {
        const video = this.videoPlayer.nativeElement;
        video.currentTime = 0;
        video.play().catch(error => {
          console.error('Error playing video:', error);
          // If autoplay is blocked, show a play button or try to handle it
        });
      } else {
        // For non-video content, set up the timer based on duration
        const duration = this.currentItem?.duration || 10;
        this.startTimer(duration * 1000);
      }
    }, (this.currentItem?.settings?.transitionDuration || 0.5) * 1000);
  }

  private startTimer(duration: number): void {
    this.clearTimer();
    
    const startTime = Date.now();
    this.timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.progress = (elapsed / duration) * 100;

      if (elapsed >= duration) {
        this.nextItem();
      }
    }, 100);
  }

  private nextItem(): void {
    this.clearTimer();
    this.currentIndex = (this.currentIndex + 1) % this.playlist.items.length;

    // Check if we've reached the end and if looping is disabled
    if (this.currentIndex === 0 && !this.playlist.settings.loop) {
      // Either stop or restart from beginning based on your requirements
      this.currentIndex = 0; // Restart from beginning anyway for public preview
    }

    this.startPlayback();
  }

  onVideoEnded(): void {
    if (this.currentItem?.settings?.loop) {
      // If the video is set to loop, the video element will handle it
      return;
    }
    
    this.nextItem();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getScalingClass(scaling?: string): string {
    switch (scaling) {
      case 'fill':
        return 'object-cover';
      case 'stretch':
        return 'object-fill';
      case 'fit':
      default:
        return 'object-contain';
    }
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
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

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${remainingSeconds}s`;
  }

  private handleMouseMove(): void {
    this.showControls = true;
    
    if (this.mouseTimeout) {
      clearTimeout(this.mouseTimeout);
    }
    
    this.mouseTimeout = setTimeout(() => {
      this.showControls = false;
    }, 3000);
  }
}
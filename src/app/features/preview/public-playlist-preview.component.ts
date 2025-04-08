// src/app/features/preview/public-playlist-preview.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
    <div class="fixed inset-0 bg-black flex items-center justify-center">
      <!-- Loading -->
      <div *ngIf="loading" class="text-white text-xl">Loading playlist...</div>
      
      <!-- Error -->
      <div *ngIf="error" class="text-white text-xl">{{ error }}</div>
      
      <!-- Content -->
      <div *ngIf="!loading && !error" class="w-full h-full relative">
        <!-- Display the current image/content -->
        <div *ngFor="let item of items; let i = index" class="absolute inset-0">
          <!-- Image -->
          <img 
            *ngIf="item.type === 'image'" 
            [src]="item.content.url"
            [style.display]="currentIndex === i ? 'block' : 'none'"
            class="w-full h-full object-contain"
          />
          
          <!-- Video -->
          <video 
            #videoPlayer
            *ngIf="item.type === 'video'" 
            [src]="item.content.url"
            [style.display]="currentIndex === i ? 'block' : 'none'"
            class="w-full h-full object-contain"
            [muted]="item.settings.muted ?? true"
            [loop]="false"
            (ended)="handleVideoEnded()"
          ></video>
        </div>
        
        <!-- Progress bar at bottom -->
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
          <div 
            class="h-full bg-blue-500 transition-all"
            [style.width.%]="progressPercentage"
          ></div>
        </div>
      </div>
    </div>
  `
})
export class PublicPlaylistPreviewComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer?: ElementRef<HTMLVideoElement>;
  
  loading = true;
  error: string | null = null;
  items: PlaylistItem[] = [];
  currentIndex = 0;
  
  // Timer variables
  private slideTimer: any = null;
  private startTime: number = 0;
  private currentDuration: number = 0;
  progressPercentage: number = 0;
  private animationFrameId: number | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}
  
  ngOnInit() {
    this.loadPlaylist();
  }
  
  ngOnDestroy() {
    this.clearTimers();
  }
  
  private clearTimers() {
    if (this.slideTimer) {
      clearTimeout(this.slideTimer);
      this.slideTimer = null;
    }
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  async loadPlaylist() {
    try {
      const playlistId = this.route.snapshot.paramMap.get('id');
      console.log('Loading playlist:', playlistId);
      
      if (!playlistId) {
        throw new Error('No playlist ID provided');
      }
      
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          items:playlist_items(*)
        `)
        .eq('id', playlistId)
        .single();
        
      if (error) throw error;
      
      console.log('Playlist data loaded:', data);
      
      // Map the items
      this.items = (data.items || []).map((item: any) => ({
        id: item.id,
        type: item.type || 'image',
        name: item.name || '',
        duration: item.duration || 10,
        content: {
          url: item.content_url || '',
          thumbnail: item.thumbnail_url || ''
        },
        settings: {
          transition: item.transition || 'fade',
          transitionDuration: item.transition_duration || 0.5,
          scaling: item.scaling || 'fit',
          muted: item.muted || true,
          loop: item.loop || false
        },
        schedule: null
      }));
      
      console.log('Mapped items:', this.items);
      
      if (this.items.length === 0) {
        throw new Error('Playlist has no items');
      }
      
      this.loading = false;
      this.showCurrentItem();
      
    } catch (err: any) {
      console.error('Error loading playlist:', err);
      this.error = err.message || 'Failed to load playlist';
      this.loading = false;
    }
  }
  
  showCurrentItem() {
    // Clear any existing timers
    this.clearTimers();
    
    const currentItem = this.items[this.currentIndex];
    console.log(`Showing item ${this.currentIndex + 1}/${this.items.length}: ${currentItem.name} (${currentItem.duration}s)`);
    
    if (currentItem.type === 'video') {
      // For videos, wait for the video to end (handling through the ended event)
      setTimeout(() => {
        if (this.videoPlayer?.nativeElement) {
          this.videoPlayer.nativeElement.currentTime = 0;
          this.videoPlayer.nativeElement.play().catch(err => {
            console.error('Error playing video:', err);
            // If video fails to play, move to next slide after the defined duration
            this.startTimerForCurrentItem();
          });
        } else {
          // If video player is not available for some reason, fall back to timer
          this.startTimerForCurrentItem();
        }
      }, 0);
    } else {
      // For images and other content, use the defined duration
      this.startTimerForCurrentItem();
    }
  }
  
  startTimerForCurrentItem() {
    const currentItem = this.items[this.currentIndex];
    this.currentDuration = currentItem.duration * 1000; // Convert to milliseconds
    this.startTime = Date.now();
    
    // Set up the timer to move to the next item
    this.slideTimer = setTimeout(() => {
      this.nextSlide();
    }, this.currentDuration);
    
    // Start progress bar animation
    this.updateProgressBar();
  }
  
  updateProgressBar() {
    const elapsed = Date.now() - this.startTime;
    this.progressPercentage = Math.min((elapsed / this.currentDuration) * 100, 100);
    
    if (this.progressPercentage < 100) {
      this.animationFrameId = requestAnimationFrame(() => this.updateProgressBar());
    }
  }
  
  handleVideoEnded() {
    console.log('Video ended naturally');
    this.nextSlide();
  }
  
  nextSlide() {
    this.clearTimers();
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.progressPercentage = 0;
    this.showCurrentItem();
  }
}
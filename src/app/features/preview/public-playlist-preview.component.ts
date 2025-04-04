// src/app/features/preview/public-playlist-preview.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
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
            *ngIf="item.type === 'video'" 
            [src]="item.content.url"
            [style.display]="currentIndex === i ? 'block' : 'none'"
            class="w-full h-full object-contain"
            autoplay
            muted
            (ended)="nextSlide()"
          ></video>
        </div>
      </div>
    </div>
  `
})
export class PublicPlaylistPreviewComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  items: PlaylistItem[] = [];
  currentIndex = 0;
  slideInterval: any = null;
  
  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}
  
  ngOnInit() {
    this.loadPlaylist();
  }
  
  ngOnDestroy() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
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
      this.startSlideshow();
      
    } catch (err: any) {
      console.error('Error loading playlist:', err);
      this.error = err.message || 'Failed to load playlist';
      this.loading = false;
    }
  }
  
  startSlideshow() {
    console.log('Starting slideshow with', this.items.length, 'items');
    
    // Clear any existing interval
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
    
    // Set interval to change slides
    this.slideInterval = setInterval(() => {
      console.log('Auto advancing to next slide');
      this.nextSlide();
    }, 5000); // Fixed 5 second duration for simplicity
  }
  
  nextSlide() {
    console.log('Moving to next slide from', this.currentIndex);
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    console.log('New index:', this.currentIndex);
  }
  
  prevSlide() {
    console.log('Moving to previous slide from', this.currentIndex);
    this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    console.log('New index:', this.currentIndex);
  }
}
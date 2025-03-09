// playlist-card.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Playlist } from '../../../../models/playlist.model';

@Component({
  selector: 'app-playlist-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './playlist-card.component.html',
})

export class PlaylistCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) playlist!: Playlist;
  @Output() preview = new EventEmitter<Playlist>();
  @Output() edit = new EventEmitter<Playlist>();

  currentIndex = 0;
  private slideshowInterval: any;
  private readonly SLIDE_DURATION = 3000; // 2 seconds

  ngOnInit() {
    this.currentIndex = 0;
  }

  ngOnDestroy() {
    this.stopSlideshow();
  }

  startSlideshow() {
    if (this.playlist.items.length <= 1) return;
    
    // Clear any existing interval first
    this.stopSlideshow();
    
    this.slideshowInterval = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.playlist.items.length;
    }, this.SLIDE_DURATION);
  }

  stopSlideshow() {
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval);
      this.slideshowInterval = null;
    }
  }

  onPreview(event: Event) {
    event.stopPropagation();
    this.preview.emit(this.playlist);
  }

  onEdit(event: Event) {
    event.stopPropagation();
    this.edit.emit(this.playlist);
  }

  getItemIcon(type: string): string {
    switch (type) {
      case 'video': return 'movie';
      case 'image': return 'image';
      case 'webpage': return 'web';
      default: return 'insert_drive_file';
    }
  }

  getStatusBackgroundColor(status: string): string {
    switch (status) {
      case 'active': return '#10B981';  // emerald-500
      case 'draft': return '#6B7280';   // gray-500
      case 'archived': return '#F59E0B'; // amber-500
      default: return '#6B7280';        // gray-500
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
}
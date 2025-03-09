// add-content-dialog.component.ts
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlaylistItem } from '../../../../models/playlist.model';
import { Media } from '../../../../models/media.model';
import { SupabaseMediaService } from '../../../../core/services/supabase-media.service';
import { MediaUploadComponent } from '../../../media/components/media-upload/media-upload.component'; 

@Component({
  selector: 'app-add-content-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaUploadComponent],
  templateUrl:"add-content-dialog.component.html"
})
export class AddContentDialogComponent {
  @Output() onAdd = new EventEmitter<PlaylistItem[]>(); // Changed to emit an array
  @Output() onCancel = new EventEmitter<void>();

  private mediaService = inject(SupabaseMediaService);

  activeTab: 'select' | 'upload' = 'select';
  searchQuery = '';
  selectedType: 'all' | 'image' | 'video' = 'all';
  selectedMediaIds: string[] = []; // Changed to array of IDs
  
  mediaItems: Media[] = [];
  filteredMedia: Media[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit() {
    this.loadMedia();
  }

  loadMedia() {
    this.loading = true;
    this.error = null;

    this.mediaService.getMedia().subscribe({
      next: (media) => {
        this.mediaItems = media;
        this.filterMedia();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading media:', error);
        this.error = 'Failed to load media. Please try again.';
        this.loading = false;
      }
    });
  }

  filterMedia() {
    this.filteredMedia = this.mediaItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesType = this.selectedType === 'all' || item.type === this.selectedType;
      return matchesSearch && matchesType;
    });
  }

  // Toggle selection of media item
  toggleSelection(item: Media) {
    const index = this.selectedMediaIds.indexOf(item.id);
    if (index > -1) {
      this.selectedMediaIds.splice(index, 1);
    } else {
      this.selectedMediaIds.push(item.id);
    }
  }

  // Check if a media item is selected
  isSelected(mediaId: string): boolean {
    return this.selectedMediaIds.includes(mediaId);
  }

  onUploadComplete(media: Media[]) {
    this.mediaItems = [...media, ...this.mediaItems];
    this.filterMedia();
    this.activeTab = 'select';
    
    // Automatically select newly uploaded items
    if (media.length > 0) {
      media.forEach(item => {
        if (!this.selectedMediaIds.includes(item.id)) {
          this.selectedMediaIds.push(item.id);
        }
      });
    }
  }

  handleSubmit() {
    if (this.selectedMediaIds.length === 0) {
      return; // Don't proceed if no media is selected
    }
    
    const selectedItems = this.mediaItems.filter(item => this.selectedMediaIds.includes(item.id));
    const playlistItems: PlaylistItem[] = selectedItems.map(media => {
      return {
        id: crypto.randomUUID(),
        type: media.type,
        name: media.name,
        duration: media.duration || 10,
        content: {
          url: media.url,
          thumbnail: media.thumbnail_url || undefined
        },
        settings: {
          transition: 'fade',
          transitionDuration: 0.5,
          scaling: 'fit',
          muted: media.type === 'video',
          loop: false
        },
        schedule: undefined
      };
    });
    
    // Emit array of playlist items
    this.onAdd.emit(playlistItems);
  }

  formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
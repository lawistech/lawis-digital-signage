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
  @Output() onAdd = new EventEmitter<PlaylistItem>();
  @Output() onCancel = new EventEmitter<void>();

  private mediaService = inject(SupabaseMediaService);

  activeTab: 'select' | 'upload' = 'select';
  searchQuery = '';
  selectedType: 'all' | 'image' | 'video' = 'all';
  selectedMediaId: string | null = null;
  
  mediaItems: Media[] = [];
  filteredMedia: Media[] = [];
  loading = true;
  error: string | null = null;


  handleSubmit() {
    const selectedMedia = this.mediaItems.find(item => item.id === this.selectedMediaId);
    if (selectedMedia) {
      const playlistItem: PlaylistItem = {
        id: crypto.randomUUID(),
        type: selectedMedia.type,
        name: selectedMedia.name,
        duration: selectedMedia.duration || 10,
        content: {
          url: selectedMedia.url,
          thumbnail: selectedMedia.thumbnail_url || undefined
        },
        settings: {
          transition: 'fade',
          transitionDuration: 0.5,
          scaling: 'fit',
          muted: selectedMedia.type === 'video',
          loop: false
        },
        schedule: undefined
      };
      // Emit a single item
      this.onAdd.emit(playlistItem);
    }
  }


  

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

  selectMedia(item: Media) {
    this.selectedMediaId = item.id;
  }

  onUploadComplete(media: Media[]) {
    this.mediaItems = [...media, ...this.mediaItems];
    this.filterMedia();
    this.activeTab = 'select';
    if (media.length === 1) {
      this.selectedMediaId = media[0].id;
    }
  }

  // handleSubmit() {
  //   const selectedMedia = this.mediaItems.find(item => item.id === this.selectedMediaId);
  //   if (selectedMedia) {
  //     const playlistItem: PlaylistItem = {
  //       id: crypto.randomUUID(),
  //       type: selectedMedia.type,
  //       name: selectedMedia.name,
  //       duration: selectedMedia.duration || 10,
  //       content: {
  //         url: selectedMedia.url,
  //         thumbnail: selectedMedia.thumbnail_url || undefined
  //       },
  //       settings: {
  //         transition: 'fade',
  //         transitionDuration: 0.5,
  //         scaling: 'fit',
  //         muted: selectedMedia.type === 'video',
  //         loop: false
  //       },
  //       schedule: undefined
  //     };
  //     this.onAdd.emit(playlistItem);
  //   }
  // }

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
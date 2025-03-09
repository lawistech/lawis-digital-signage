// src/app/features/media/media.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseMediaService } from '../../core/services/supabase-media.service';
import { Media, MediaFilter } from '../../models/media.model';
import { MediaUploadComponent } from './components/media-upload/media-upload.component';
import { MediaGridComponent } from './components/media-grid/media-grid.component';
import { MediaFilterComponent } from './components/media-filter/media-filter.component';
import { MediaPreviewDialogComponent } from './components/media-preview-dialog/media-preview-dialog.component';
import { MediaListComponent } from './components/media-playlist/media-list.component';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MediaUploadComponent,
    MediaGridComponent,
    MediaFilterComponent,
    MediaPreviewDialogComponent,
    MediaListComponent
  ],
  templateUrl:"./media.component.html"
})
export class MediaComponent implements OnInit {
  mediaItems: Media[] = [];
  loading = true;
  error: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';
  showUploadDialog = false;
  searchQuery = '';
  selectedMedia: Media | null = null;
  
  filters: MediaFilter = {
    type: [],
    tags: []
  };

  constructor(private mediaService: SupabaseMediaService) {}

  ngOnInit(): void {
    this.loadMedia();
  }

  onSelect(item: Media): void {
    console.log('Selected media:', item); // Add debugging
    this.selectedMedia = item;
  }

  loadMedia(): void {
    this.loading = true;
    this.error = null;

    this.mediaService.getMedia(this.getActiveFilters()).subscribe({
      next: (media) => {
        this.mediaItems = media;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load media. Please try again.';
        this.loading = false;
        console.error('Error loading media:', error);
      }
    });
  }

  getActiveFilters(): MediaFilter {
    const filters: MediaFilter = { ...this.filters };
    if (this.searchQuery) {
      filters.search = this.searchQuery;
    }
    return filters;
  }

  onFilterChange(filters: MediaFilter): void {
    this.filters = filters;
    this.loadMedia();
  }

  applyFilters(): void {
    this.loadMedia();
  }

  onMediaSelect(media: Media): void {
    // Implement media preview/details view
    console.log('Selected media:', media);
    this.selectedMedia = media;
  }

  async onMediaDelete(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this media?')) {
      try {
        await this.mediaService.deleteMedia(id);
        this.mediaItems = this.mediaItems.filter(item => item.id !== id);
      } catch (error) {
        console.error('Error deleting media:', error);
        alert('Failed to delete media. Please try again.');
      }
    }
  }

  onUploadComplete(media: Media[]): void {
    this.showUploadDialog = false;
    this.mediaItems = [...media, ...this.mediaItems];
  }
}
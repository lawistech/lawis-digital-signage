// src/app/features/media/media.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
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
  templateUrl: "./media.component.html"
})
export class MediaComponent implements OnInit, OnDestroy {
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

  private destroy$ = new Subject<void>();

  constructor(private mediaService: SupabaseMediaService) {}

  ngOnInit(): void {
    this.loadMedia();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSelect(item: Media): void {
    this.selectedMedia = item;
  }

  loadMedia(): void {
    this.loading = true;
    this.error = null;

    this.mediaService.getMedia(this.getActiveFilters())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (media) => {
          this.mediaItems = media;
          this.loading = false;
        },
        error: (error) => {
          // Handle specific database column error
          if (error?.message?.includes('column media.user_id does not exist')) {
            this.error = 'There appears to be a database schema issue. Please ensure the media table has a user_id column.';
            console.error('Database schema error:', error);
          } else {
            this.error = 'Failed to load media. Please try again.';
            console.error('Error loading media:', error);
          }
          this.loading = false;
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
    this.selectedMedia = media;
  }

  async onMediaDelete(id: string): Promise<void> {
    try {
      // Show confirmation dialog
      if (confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
        this.loading = true; // Set loading state while deleting
        await this.mediaService.deleteMedia(id);
        
        // Update the local list after successful deletion
        this.mediaItems = this.mediaItems.filter(item => item.id !== id);
        this.loading = false;
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      this.error = 'Failed to delete media. Please try again.';
      this.loading = false;
    }
  }

  onUploadComplete(media: Media[]): void {
    this.showUploadDialog = false;
    // Add new media to the beginning of the list
    this.mediaItems = [...media, ...this.mediaItems];
  }

  onCancelUpload(): void {
    this.showUploadDialog = false;
  }

  // Helper method to retry loading after error
  retryLoading(): void {
    this.error = null;
    this.loadMedia();
  }
}
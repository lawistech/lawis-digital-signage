// src/app/features/media/components/media-grid/media-grid.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Media } from '../../../../models/media.model';

@Component({
  selector: 'app-media-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl:"./media-grid.component.html"
})
export class MediaGridComponent {
  @Input({ required: true }) media: Media[] = [];
  @Output() select = new EventEmitter<Media>();
  @Output() delete = new EventEmitter<string>();

  formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
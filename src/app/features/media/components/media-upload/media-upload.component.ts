import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateMediaDto, Media } from '../../../../models/media.model';
import { SupabaseMediaService } from '../../../../core/services/supabase-media.service';

@Component({
  selector: 'app-media-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-upload.component.html',
  styles: [`
    .material-icons {
      font-family: 'Material Icons';
      font-weight: normal;
      font-style: normal;
      font-size: 24px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-smoothing: antialiased;
    }
  `]
})
export class MediaUploadComponent {
  @Output() uploadComplete = new EventEmitter<Media[]>();
  @Output() cancel = new EventEmitter<void>();

  private mediaService = inject(SupabaseMediaService);
  uploadProgress = 0;
  isUploading = false;
  error: string | null = null;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Add visual feedback for drag over if desired
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.add('border-blue-400');
  }

  onDragLeave(event: DragEvent): void {
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.remove('border-blue-400');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.remove('border-blue-400');
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  async handleFiles(files: File[]): Promise<void> {
    if (!files.length) return;

    this.isUploading = true;
    this.error = null;
    const uploadedMedia: Media[] = [];
    const totalFiles = files.length;

    try {
      for (const [index, file] of files.entries()) {
        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          throw new Error(`File ${file.name} is not a supported media type`);
        }

        // Create metadata for the file
        const mediaDto: CreateMediaDto = {
          name: file.name.split('.')[0], // Remove file extension from name
          type: file.type.startsWith('image/') ? 'image' : 'video',
          description: `Uploaded ${file.type.startsWith('image/') ? 'image' : 'video'} file`,
          metadata: {
            size: file.size,
            format: file.type,
            lastModified: new Date(file.lastModified).toISOString()
          }
        };

        try {
          // Upload the file
          const result = await this.mediaService.uploadMedia(file, mediaDto);
          uploadedMedia.push(result.media);
          
          // Update progress
          this.uploadProgress = Math.round(((index + 1) / totalFiles) * 100);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      // Complete the upload
      this.uploadProgress = 100;
      
      // Wait a brief moment to show 100% progress before closing
      setTimeout(() => {
        this.uploadComplete.emit(uploadedMedia);
        this.resetUpload();
      }, 500);

    } catch (error) {
      console.error('Upload error:', error);
      this.error = error instanceof Error ? error.message : 'Failed to upload files';
      this.isUploading = false;
    }
  }

  private resetUpload(): void {
    this.uploadProgress = 0;
    this.isUploading = false;
    this.error = null;
  }
}
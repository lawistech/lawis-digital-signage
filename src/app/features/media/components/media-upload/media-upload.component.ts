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
  totalFiles = 0;
  currentFileIndex = 0;
  successfulUploads: Media[] = [];

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
    this.successfulUploads = [];
    this.totalFiles = files.length;
    this.currentFileIndex = 0;
    
    // Set a free-plan friendly file size limit
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    // Check for oversized files first
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      this.error = `The following file(s) exceed the 10MB size limit for free plan: ${fileNames}`;
      this.isUploading = false;
      return;
    }
    
    // Filter for supported media types
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    if (validFiles.length !== files.length) {
      console.warn(`${files.length - validFiles.length} files were skipped because they are not supported media types`);
    }
    
    if (validFiles.length === 0) {
      this.error = "No valid media files selected. Please upload images or videos only.";
      this.isUploading = false;
      return;
    }
  
    // Process each file individually to improve reliability
    for (const [index, file] of validFiles.entries()) {
      this.currentFileIndex = index;
      try {
        console.log(`Uploading file ${index + 1}/${validFiles.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
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
  
        // Update progress to show we're working on this file
        this.uploadProgress = Math.round(((index) / this.totalFiles) * 100);
        
        // Try to upload the file
        const result = await this.mediaService.uploadMedia(file, mediaDto);
        console.log(`Successfully uploaded: ${file.name}`);
        
        // Add to successful uploads
        this.successfulUploads.push(result.media);
        
        // Update progress
        this.uploadProgress = Math.round(((index + 1) / this.totalFiles) * 100);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        // Continue with next file instead of stopping the whole process
      }
    }
  
    // Complete the upload process
    this.uploadProgress = 100;
    
    // If we have at least one successful upload, consider it a success
    if (this.successfulUploads.length > 0) {
      setTimeout(() => {
        this.uploadComplete.emit(this.successfulUploads);
        this.resetUpload();
      }, 500);
    } else {
      if (!this.error) {
        this.error = "Failed to upload all files. Please try again or contact support.";
      }
      this.isUploading = false;
    }
  }

  private resetUpload(): void {
    this.uploadProgress = 0;
    this.isUploading = false;
    this.error = null;
    this.successfulUploads = [];
  }
}
// src/app/models/media.model.ts

export interface Media {
    id: string;
    name: string;
    description?: string;
    type: MediaType;
    url: string;
    thumbnail_url?: string | null;  // Allow null for database compatibility
    duration?: number | null;       // Allow null for database compatibility
    metadata: MediaMetadata;
    tags: string[];
    created_at?: string;
    updated_at?: string;
  }
  
  export type MediaType = 'image' | 'video';
  
  export interface MediaMetadata {
    size: number;           // File size in bytes
    format: string;         // MIME type
    resolution?: string;    // e.g., "1920x1080"
    lastModified?: string;  // ISO date string
    width?: number;
    height?: number;
    encoding?: string;
    fileExtension?: string;
  }
  
  export interface CreateMediaDto {
    name: string;
    description?: string;
    type: MediaType;
    metadata?: Partial<MediaMetadata>;
    tags?: string[];
  }
  
  export interface UpdateMediaDto {
    name?: string;
    description?: string;
    tags?: string[];
    metadata?: Partial<MediaMetadata>;
  }
  
  export interface MediaUploadResponse {
    media: Media;
    thumbnailUrl?: string;
  }
  
  export interface MediaFilter {
    type?: MediaType[];
    tags?: string[];
    search?: string;
    startDate?: string;
    endDate?: string;
  }
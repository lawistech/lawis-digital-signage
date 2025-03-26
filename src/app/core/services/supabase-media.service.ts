// core/services/supabase-media.service.ts - FIXED
import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { supabase } from './supabase.config';
import { 
  Media, 
  CreateMediaDto, 
  UpdateMediaDto, 
  MediaFilter, 
  MediaUploadResponse 
} from '../../models/media.model';
import { SupabaseAuthService } from './supabase-auth.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseMediaService {
  private readonly BUCKET_NAME = 'media';
  private readonly TABLE_NAME = 'media';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; //10mb

  constructor(private authService: SupabaseAuthService) {}

  // Fix for the "operator does not exist: bigint + jsonb" error
  // Fix for the "operator does not exist: bigint + jsonb" error

  async uploadMedia(file: File, metadata: CreateMediaDto): Promise<MediaUploadResponse> {
    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
  
      // Validate file
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds limit`);
      }
  
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `${timestamp}-${randomString}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
  
      // Upload the file to storage
      const { data: fileData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
  
      if (uploadError) {
        throw new Error(`Storage error: ${uploadError.message}`);
      }
  
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);
        
      const publicUrl = urlData.publicUrl;
  
      // Generate thumbnail for videos
      let thumbnailUrl: string | undefined;
      if (metadata.type === 'video') {
        try {
          const thumbnailDataUri = await this.generateVideoThumbnail(file);
          const thumbnailBlob = this.dataURItoBlob(thumbnailDataUri);
          const thumbnailFilePath = `${userId}/thumbnails/${fileName.replace(/\.\w+$/, '.jpg')}`;
          
          const { data: thumbnailData, error: thumbnailError } = await supabase.storage
            .from(this.BUCKET_NAME)
            .upload(thumbnailFilePath, thumbnailBlob, {
              cacheControl: '3600',
              upsert: false
            });
              
          if (!thumbnailError && thumbnailData) {
            const { data: thumbUrlData } = supabase.storage
              .from(this.BUCKET_NAME)
              .getPublicUrl(thumbnailFilePath);
              
            thumbnailUrl = thumbUrlData.publicUrl;
          }
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error);
        }
      }
  
      // Get video duration
      let duration: number | undefined;
      if (metadata.type === 'video') {
        try {
          duration = await this.getVideoDuration(file);
        } catch (error) {
          console.warn("Could not determine video duration:", error);
        }
      }
  
      // Create database entry - MODIFIED: Remove storage_size field
      const mediaData = {
        name: metadata.name,
        description: metadata.description,
        type: metadata.type,
        url: publicUrl,
        thumbnail_url: thumbnailUrl,
        duration: duration,
        // Remove the storage_size field since it doesn't exist in your database
        metadata: {
          size: String(file.size), // Store as string in metadata to avoid bigint + jsonb error
          format: file.type,
          lastModified: new Date(file.lastModified).toISOString(),
          ...(metadata.metadata || {})
        },
        tags: metadata.tags || []
      };
  
      // Try multiple insertion strategies to handle different database schemas
      let result;
      try {
        // Try with user_id field
        const { data: insertData, error: insertError } = await supabase
          .from(this.TABLE_NAME)
          .insert([{ ...mediaData, user_id: userId }])
          .select()
          .single();
        
        if (insertError) {
          if (insertError.message.includes('user_id')) {
            throw new Error("user_id field not available");
          } else {
            throw insertError;
          }
        }
        
        result = insertData;
      } catch (userIdError) {
        // Fallback to created_by
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from(this.TABLE_NAME)
            .insert([{ ...mediaData, created_by: userId }])
            .select()
            .single();
            
          if (fallbackError) {
            throw fallbackError;
          }
          
          result = fallbackData;
        } catch (createdByError) {
          // Last attempt without user association
          const { data: lastResortData, error: lastResortError } = await supabase
            .from(this.TABLE_NAME)
            .insert([mediaData])
            .select()
            .single();
            
          if (lastResortError) {
            throw lastResortError;
          }
          
          result = lastResortData;
        }
      }
  
      return { media: result as Media };
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  // Rest of the methods remain unchanged
  getMedia(filter?: MediaFilter): Observable<Media[]> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return from(this.fetchMediaWithMultipleStrategies(userId, filter));
  }

  private async fetchMediaWithMultipleStrategies(userId: string, filter?: MediaFilter): Promise<Media[]> {
    // Try with user_id field first
    try {
      let query = supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId);

      query = this.applyFilters(query, filter);
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log(`Retrieved ${data.length} media items using user_id field`);
      return data as Media[];
    } catch (userIdError) {
      console.log("Failed to fetch with user_id, trying created_by:", userIdError);
      
      // Try with created_by field
      try {
        let query = supabase
          .from(this.TABLE_NAME)
          .select('*')
          .eq('created_by', userId);
    
        query = this.applyFilters(query, filter);
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        console.log(`Retrieved ${data.length} media items using created_by field`);
        return data as Media[];
      } catch (createdByError) {
        console.log("Failed to fetch with created_by, fetching all media:", createdByError);
        
        // Last resort: fetch all media
        try {
          let query = supabase.from(this.TABLE_NAME).select('*');
          query = this.applyFilters(query, filter);
          const { data, error } = await query.order('created_at', { ascending: false });
          
          if (error) throw error;
          console.log(`Retrieved ${data.length} media items without user filtering`);
          return data as Media[];
        } catch (finalError) {
          console.error("All media fetch strategies failed:", finalError);
          throw finalError;
        }
      }
    }
  }

  private applyFilters(query: any, filter?: MediaFilter): any {
    if (!filter) return query;
    
    if (filter.type?.length) {
      query = query.in('type', filter.type);
    }
    if (filter.tags?.length) {
      query = query.contains('tags', filter.tags);
    }
    if (filter.search) {
      query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }
    if (filter.startDate) {
      query = query.gte('created_at', filter.startDate);
    }
    if (filter.endDate) {
      query = query.lte('created_at', filter.endDate);
    }
    
    return query;
  }

  getMediaById(id: string): Observable<Media> {
    return from(
      supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Media;
      }),
      catchError((error) => {
        console.error('Error fetching media:', error);
        return throwError(() => error);
      })
    );
  }

  updateMedia(id: string, updates: UpdateMediaDto): Observable<Media> {
    return from(
      supabase
        .from(this.TABLE_NAME)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Media;
      }),
      catchError((error) => {
        console.error('Error updating media:', error);
        return throwError(() => error);
      })
    );
  }

  async deleteMedia(id: string): Promise<void> {
    try {
      // Get media details
      const { data: media, error: fetchError } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete file from storage if URL exists
      if (media.url) {
        try {
          const filePath = this.getPathFromUrl(media.url);
          await supabase.storage
            .from(this.BUCKET_NAME)
            .remove([filePath]);
        } catch (storageError) {
          console.warn('Error removing file from storage:', storageError);
          // Continue with deletion even if file removal fails
        }
      }

      // Delete thumbnail if exists
      if (media.thumbnail_url) {
        try {
          const thumbnailPath = this.getPathFromUrl(media.thumbnail_url);
          await supabase.storage
            .from(this.BUCKET_NAME)
            .remove([thumbnailPath]);
        } catch (thumbnailError) {
          console.warn('Error removing thumbnail from storage:', thumbnailError);
          // Continue with deletion even if thumbnail removal fails
        }
      }

      // Delete database entry
      const { error: deleteError } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  }

  // Helper methods
  private async generateVideoThumbnail(videoFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        reject(new Error('Could not get canvas context'));
        return;
      }
  
      // Load metadata first
      video.onloadedmetadata = () => {
        // Set canvas dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Calculate the time to seek to (25% of duration)
        const seekTime = video.duration * 0.25;
        
        // Only seek after metadata is loaded
        video.currentTime = Math.min(1, seekTime || 0);
      };
  
      video.onseeked = () => {
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          // Clean up
          URL.revokeObjectURL(video.src);
          resolve(thumbnailUrl);
        } catch (error) {
          reject(new Error('Error generating thumbnail: ' + error));
        }
      };
  
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Error loading video'));
      };
  
      // Create object URL and start loading the video
      const objectUrl = URL.createObjectURL(videoFile);
      video.src = objectUrl;
      video.load(); // Explicitly load the video
    });
  }
  
  private async getVideoDuration(videoFile: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        URL.revokeObjectURL(video.src);
        resolve(duration);
      };
  
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Error getting video duration'));
      };
  
      const objectUrl = URL.createObjectURL(videoFile);
      video.src = objectUrl;
      video.load(); // Explicitly load the video
    });
  }

  private dataURItoBlob(dataURI: string): Blob {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeString });
  }

  private getPathFromUrl(url: string): string {
    try {
      const baseUrl = supabase.storage.from(this.BUCKET_NAME).getPublicUrl('').data.publicUrl;
      return decodeURIComponent(url.replace(baseUrl, ''));
    } catch (error) {
      console.warn('Error getting path from URL:', error);
      // Fallback - extract the path component after the bucket name
      const urlParts = url.split(this.BUCKET_NAME + '/');
      return urlParts.length > 1 ? urlParts[1] : url;
    }
  }
}
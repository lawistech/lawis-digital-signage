// src/app/core/services/supabase-media.service.ts

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
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  constructor(private authService: SupabaseAuthService) {}

  async uploadMedia(file: File, metadata: CreateMediaDto): Promise<MediaUploadResponse> {
    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Validate file
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error('File size exceeds 100MB limit');
      }

      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // 1. Upload file to Supabase Storage
      const { data: fileData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL for the file
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);
        
      const publicUrl = urlData.publicUrl;

      // 3. Generate thumbnail for videos
      let thumbnailUrl: string | undefined;
      if (metadata.type === 'video') {
        try {
          const thumbnailDataUri = await this.generateVideoThumbnail(file);
          const thumbnailBlob = this.dataURItoBlob(thumbnailDataUri);
          const thumbnailFilePath = `${userId}/thumbnails/${fileName.replace(/\.\w+$/, '.jpg')}`;
          
          const { data: thumbnailData, error: thumbnailError } = await supabase.storage
            .from(this.BUCKET_NAME)
            .upload(thumbnailFilePath, thumbnailBlob);
            
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

      // 4. Create database entry
      const mediaData: Partial<Media> = {
        name: metadata.name,
        description: metadata.description,
        type: metadata.type,
        url: publicUrl,
        thumbnail_url: thumbnailUrl || undefined,
        duration: metadata.type === 'video' ? 
          await this.getVideoDuration(file).catch(() => undefined) : 
          undefined,
        metadata: {
          size: file.size,
          format: file.type,
          lastModified: new Date(file.lastModified).toISOString(),
          ...(metadata.metadata || {})
        },
        tags: metadata.tags || []
      };

      // Before inserting, check if the table has a user_id column
      const { error: checkError } = await supabase
        .from(this.TABLE_NAME)
        .select('created_by')
        .limit(1);

      // If the table has the user_id column, use it, otherwise use created_by
      if (checkError && checkError.message.includes('column "user_id" does not exist')) {
        console.log('Using created_by column instead of user_id');
        
        // Insert with created_by field
        const { data: insertData, error: insertError } = await supabase
          .from(this.TABLE_NAME)
          .insert([{ ...mediaData, created_by: userId }])
          .select()
          .single();
          
        if (insertError) throw insertError;
        return { media: insertData as Media };
      } else {
        // Try to use user_id column if it exists
        try {
          const { data: insertData, error: insertError } = await supabase
            .from(this.TABLE_NAME)
            .insert([{ ...mediaData, user_id: userId }])
            .select()
            .single();
            
          if (insertError) {
            // If it fails with user_id, try with created_by as a fallback
            if (insertError.message.includes('user_id')) {
              const { data: fallbackData, error: fallbackError } = await supabase
                .from(this.TABLE_NAME)
                .insert([{ ...mediaData, created_by: userId }])
                .select()
                .single();
                
              if (fallbackError) throw fallbackError;
              return { media: fallbackData as Media };
            } else {
              throw insertError;
            }
          }
          
          return { media: insertData as Media };
        } catch (insertError) {
          // Final fallback: try without user association
          console.warn('Falling back to insert without user association:', insertError);
          const { data: lastResortData, error: lastResortError } = await supabase
            .from(this.TABLE_NAME)
            .insert([mediaData])
            .select()
            .single();
            
          if (lastResortError) throw lastResortError;
          return { media: lastResortData as Media };
        }
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  getMedia(filter?: MediaFilter): Observable<Media[]> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    // First try with user_id
    return from(this.fetchMediaWithUserAssociation(userId, filter)).pipe(
      catchError(error => {
        // If user_id column doesn't exist, try with created_by
        if (error.message && error.message.includes('user_id does not exist')) {
          console.log('Falling back to created_by for user association');
          return from(this.fetchMediaWithCreatedBy(userId, filter));
        }
        return throwError(() => error);
      })
    );
  }

  private async fetchMediaWithUserAssociation(userId: string, filter?: MediaFilter): Promise<Media[]> {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('user_id', userId);

    query = this.applyFilters(query, filter);
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Media[];
  }

  private async fetchMediaWithCreatedBy(userId: string, filter?: MediaFilter): Promise<Media[]> {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('created_by', userId);

    query = this.applyFilters(query, filter);
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      // If still failing, try without user filtering as a last resort
      if (error.message.includes('created_by does not exist')) {
        console.warn('No user association columns found, fetching all media');
        let fallbackQuery = supabase.from(this.TABLE_NAME).select('*');
        fallbackQuery = this.applyFilters(fallbackQuery, filter);
        const fallbackResult = await fallbackQuery.order('created_at', { ascending: false });
        
        if (fallbackResult.error) throw fallbackResult.error;
        return fallbackResult.data as Media[];
      }
      throw error;
    }
    
    return data as Media[];
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
      // 1. Get media details
      const { data: media, error: fetchError } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Delete file from storage
      const filePath = this.getPathFromUrl(media.url);
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (storageError) throw storageError;

      // 3. Delete thumbnail if exists
      if (media.thumbnail_url) {
        const thumbnailPath = this.getPathFromUrl(media.thumbnail_url);
        await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([thumbnailPath]);
      }

      // 4. Delete database entry
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
    const baseUrl = supabase.storage.from(this.BUCKET_NAME).getPublicUrl('').data.publicUrl;
    return decodeURIComponent(url.replace(baseUrl, ''));
  }
}
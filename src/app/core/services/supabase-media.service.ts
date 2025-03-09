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

@Injectable({
  providedIn: 'root'
})
export class SupabaseMediaService {
  private readonly BUCKET_NAME = 'media';
  private readonly TABLE_NAME = 'media';
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  async uploadMedia(file: File, metadata: CreateMediaDto): Promise<MediaUploadResponse> {
    try {
      // Validate file
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error('File size exceeds 100MB limit');
      }

      // 1. Upload file to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${metadata.type}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Generate thumbnail for videos
      let thumbnailUrl = '';
      if (metadata.type === 'video') {
        thumbnailUrl = await this.generateVideoThumbnail(file);
        const thumbnailPath = `thumbnails/${fileName.replace(/\.[^/.]+$/, '')}.jpg`;
        
        const { error: thumbnailError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(thumbnailPath, this.dataURItoBlob(thumbnailUrl));

        if (thumbnailError) throw thumbnailError;
        
        thumbnailUrl = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(thumbnailPath).data.publicUrl;
      }

      // 3. Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      // 4. Create database entry
      const mediaData: Partial<Media> = {
        name: metadata.name,
        description: metadata.description,
        type: metadata.type,
        url: publicUrl,
        thumbnail_url: thumbnailUrl || undefined,  // Use undefined for optional fields
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

      const { data: insertData, error: insertError } = await supabase
        .from(this.TABLE_NAME)
        .insert([mediaData])
        .select()
        .single();

      if (insertError) throw insertError;

      return {
        media: insertData as Media,
        thumbnailUrl
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  getMedia(filter?: MediaFilter): Observable<Media[]> {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*');

    // Apply filters
    if (filter) {
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
    }

    return from(
      query.order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Media[];
      }),
      catchError((error) => {
        console.error('Error fetching media:', error);
        return throwError(() => error);
      })
    );
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
  
  // Also update the getVideoDuration method to be more robust
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
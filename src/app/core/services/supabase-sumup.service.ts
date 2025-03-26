// src/app/core/services/supabase-sumup.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError, of, forkJoin } from 'rxjs';
import { supabase } from './supabase.config';
import { Sumup, CreateSumupDto, UpdateSumupDto } from '../../models/sumup.model';
import { SupabaseAuthService } from './supabase-auth.service';
import { Playlist } from '../../models/playlist.model';

@Injectable({
  providedIn: 'root'
})
export class SupabaseSumupService {
  private readonly TABLE_NAME = 'sumups';

  constructor(private authService: SupabaseAuthService) {}
  
  getSumups(): Observable<Sumup[]> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return from(
      supabase
        .from(this.TABLE_NAME)
        .select(`
          *
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Sumup[];
      }),
      catchError(error => {
        console.error('Error fetching sumups:', error);
        return throwError(() => error);
      })
    );
  }

  getSumup(id: string): Observable<Sumup> {
    return from(
      supabase
        .from(this.TABLE_NAME)
        .select(`
          *
        `)
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Sumup;
      }),
      catchError(error => {
        console.error('Error fetching sumup:', error);
        return throwError(() => error);
      })
    );
  }

  getSumupWithPlaylists(id: string): Observable<Sumup> {
    return this.getSumup(id).pipe(
      map(sumup => {
        if (!sumup.playlist_ids || sumup.playlist_ids.length === 0) {
          sumup.playlists = [];
          return sumup;
        }
        
        // Fetch playlists for the sumup
        const playlistObservables = sumup.playlist_ids.map(playlistId => 
          this.getPlaylist(playlistId)
        );
        
        return forkJoin(playlistObservables).pipe(
          map(playlists => {
            sumup.playlists = playlists;
            return sumup;
          })
        );
      }),
      catchError(error => {
        console.error('Error fetching sumup with playlists:', error);
        return throwError(() => error);
      })
    );
  }
  
  private getPlaylist(id: string): Observable<Playlist> {
    return from(
      supabase
        .from('playlists')
        .select(`
          *,
          items:playlist_items(*)
        `)
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapPlaylist(data);
      }),
      catchError(error => {
        console.error(`Error fetching playlist ${id}:`, error);
        return throwError(() => error);
      })
    );
  }
  
  private mapPlaylist(data: any): Playlist {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      duration: data.duration || 0,
      items: (data.items || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        duration: item.duration,
        content: {
          url: item.content_url,
          thumbnail: item.thumbnail_url
        },
        settings: {
          transition: item.transition || 'fade',
          transitionDuration: item.transition_duration || 0.5,
          scaling: item.scaling || 'fit',
          muted: item.muted,
          loop: item.loop
        },
        schedule: null
      })),
      lastModified: data.updated_at,
      createdBy: data.created_by,
      status: data.status,
      tags: data.tags || [],
      settings: data.settings
    };
  }

  async createSumup(sumup: CreateSumupDto): Promise<Sumup> {
    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const { data: sumupData, error: sumupError } = await supabase
        .from(this.TABLE_NAME)
        .insert([{
          name: sumup.name,
          description: sumup.description,
          status: sumup.status || 'draft',
          playlist_ids: sumup.playlist_ids || [],
          created_by: userId
        }])
        .select()
        .single();

      if (sumupError) throw sumupError;

      return sumupData as Sumup;
    } catch (error) {
      console.error('Error creating sumup:', error);
      throw error;
    }
  }

  async updateSumup(id: string, updates: UpdateSumupDto): Promise<Sumup> {
    try {
      const { data: sumupData, error: sumupError } = await supabase
        .from(this.TABLE_NAME)
        .update({
          name: updates.name,
          description: updates.description,
          status: updates.status,
          playlist_ids: updates.playlist_ids,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (sumupError) throw sumupError;

      return sumupData as Sumup;
    } catch (error) {
      console.error('Error updating sumup:', error);
      throw error;
    }
  }

  async deleteSumup(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
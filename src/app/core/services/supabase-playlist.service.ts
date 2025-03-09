// core/services/supabase-playlist.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { supabase } from './supabase.config';
import { Playlist, CreatePlaylistDto, PlaylistItem } from '../../models/playlist.model';
import { SupabaseAuthService } from './supabase-auth.service';

@Injectable({
  providedIn: 'root'
})
export class SupabasePlaylistService {
  private readonly TABLE_NAME = 'playlists';

  constructor(private authService: SupabaseAuthService) {}
  
  // core/services/supabase-playlist.service.ts
  getPlaylists(): Observable<Playlist[]> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return from(
      supabase
        .from(this.TABLE_NAME)
        .select(`
          *,
          items:playlist_items(*)
        `)
        .eq('created_by', userId) // Filter by the user who created the playlist
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapPlaylists(data || []);
      }),
      catchError(error => {
        console.error('Error fetching playlists:', error);
        return throwError(() => error);
      })
    );
  }


  getPlaylist(id: string): Observable<Playlist> {
    return from(
      supabase
        .from(this.TABLE_NAME)
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
        console.error('Error fetching playlist:', error);
        return throwError(() => error);
      })
    );
  }

  getPlaylistsByArea(areaId: string): Observable<Playlist[]> {
    return from(
      supabase
        .from(this.TABLE_NAME)
        .select(`
          *,
          items:playlist_items(*)
        `)
        .eq('area_id', areaId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapPlaylists(data || []);
      }),
      catchError(error => {
        console.error('Error fetching playlists by area:', error);
        return throwError(() => error);
      })
    );
  }
  
  // core/services/supabase-playlist.service.ts
  async createPlaylist(playlist: CreatePlaylistDto): Promise<Playlist> {
    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const { data: playlistData, error: playlistError } = await supabase
        .from(this.TABLE_NAME)
        .insert([{
          name: playlist.name,
          description: playlist.description,
          settings: playlist.settings,
          status: 'draft',
          duration: 0,
          created_by: userId // Use the current user's ID
        }])
        .select()
        .single();

      if (playlistError) throw playlistError;

      // Return the newly created playlist
      return this.mapPlaylist(playlistData);
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  async updatePlaylist(id: string, updates: Partial<Playlist>): Promise<Playlist> {
    try {
      // 1. Update playlist details
      const { data: playlistData, error: playlistError } = await supabase
        .from(this.TABLE_NAME)
        .update({
          name: updates.name,
          description: updates.description,
          status: updates.status,
          settings: updates.settings,
          duration: updates.duration || 0
        })
        .eq('id', id)
        .select()
        .single();

      if (playlistError) throw playlistError;

      // 2. Handle playlist items if provided
      if (updates.items) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from('playlist_items')
          .delete()
          .eq('playlist_id', id);

        if (deleteError) throw deleteError;

        // Insert new items if any
        if (updates.items.length > 0) {
          const itemsToInsert = updates.items.map(item => ({
            playlist_id: id,
            type: item.type,
            name: item.name,
            duration: item.duration,
            content_url: item.content.url,
            thumbnail_url: item.content.thumbnail || null,
            transition: item.settings.transition,
            transition_duration: item.settings.transitionDuration,
            scaling: item.settings.scaling,
            muted: item.settings.muted,
            loop: item.settings.loop
          }));

          const { error: insertError } = await supabase
            .from('playlist_items')
            .insert(itemsToInsert);

          if (insertError) throw insertError;
        }
      }

      // 3. Fetch updated playlist with items
      const { data: finalData, error: finalError } = await supabase
        .from(this.TABLE_NAME)
        .select(`
          *,
          items:playlist_items(*)
        `)
        .eq('id', id)
        .single();

      if (finalError) throw finalError;

      return this.mapPlaylist(finalData);
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }

  async deletePlaylist(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private mapPlaylists(data: any[]): Playlist[] {
    return data.map(item => this.mapPlaylist(item));
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
          transition: item.transition,
          transitionDuration: item.transition_duration,
          scaling: item.scaling,
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

  subscribeToPlaylistUpdates(callback: (playlist: Playlist) => void): void {
    supabase
      .channel('playlist_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.TABLE_NAME
        },
        (payload) => {
          callback(this.mapPlaylist(payload.new));
        }
      )
      .subscribe();
  }
}
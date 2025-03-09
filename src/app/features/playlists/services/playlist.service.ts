import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabasePlaylistService } from '../../../core/services/supabase-playlist.service';
import { Playlist, CreatePlaylistDto, UpdatePlaylistDto, PlaylistItem } from '../../../models/playlist.model';

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  constructor(private supabaseService: SupabasePlaylistService) {}

  getPlaylists(areaId?: string): Observable<Playlist[]> {
    if (areaId) {
      return this.supabaseService.getPlaylistsByArea(areaId);
    }
    return this.supabaseService.getPlaylists();
  }

  getPlaylistsByArea(areaId: string): Observable<Playlist[]> {
    return this.supabaseService.getPlaylistsByArea(areaId);
  }

  getPlaylist(id: string): Observable<Playlist> {
    return this.supabaseService.getPlaylist(id);
  }

  createPlaylist(playlist: CreatePlaylistDto): Observable<Playlist> {
    return from(this.supabaseService.createPlaylist(playlist));
  }

  updatePlaylist(id: string, updates: Partial<Playlist>): Observable<Playlist> {
    return from(this.supabaseService.updatePlaylist(id, updates));
  }

  deletePlaylist(id: string): Observable<void> {
    return from(this.supabaseService.deletePlaylist(id));
  }

  // Realtime updates
  subscribeToUpdates(callback: (playlist: Playlist) => void): void {
    this.supabaseService.subscribeToPlaylistUpdates(callback);
  }

  // Status updates
  updatePlaylistStatus(id: string, status: 'active' | 'draft' | 'archived'): Observable<Playlist> {
    return this.updatePlaylist(id, { status });
  }

  // Statistics methods
  getActivePlaylistsCount(): Observable<number> {
    return new Observable(subscriber => {
      this.getPlaylists().subscribe({
        next: (playlists) => {
          const count = playlists.filter(p => p.status === 'active').length;
          subscriber.next(count);
          subscriber.complete();
        },
        error: (error) => subscriber.error(error)
      });
    });
  }

  getTotalDuration(): Observable<number> {
    return new Observable(subscriber => {
      this.getPlaylists().subscribe({
        next: (playlists) => {
          const totalDuration = playlists.reduce((sum, playlist) => sum + playlist.duration, 0);
          subscriber.next(totalDuration);
          subscriber.complete();
        },
        error: (error) => subscriber.error(error)
      });
    });
  }

  // Handle playlist items through main playlist update
  addItemToPlaylist(playlistId: string, playlist: Playlist, newItem: PlaylistItem): Observable<Playlist> {
    const updatedItems = [...(playlist.items || []), newItem];
    return this.updatePlaylist(playlistId, { 
      ...playlist,
      items: updatedItems,
      duration: updatedItems.reduce((total, item) => total + (item.duration || 0), 0)
    });
  }

  updatePlaylistItems(playlistId: string, playlist: Playlist, updatedItems: PlaylistItem[]): Observable<Playlist> {
    return this.updatePlaylist(playlistId, {
      ...playlist,
      items: updatedItems,
      duration: updatedItems.reduce((total, item) => total + (item.duration || 0), 0)
    });
  }

  removeItemFromPlaylist(playlistId: string, playlist: Playlist, itemId: string): Observable<Playlist> {
    const updatedItems = playlist.items.filter(item => item.id !== itemId);
    return this.updatePlaylist(playlistId, {
      ...playlist,
      items: updatedItems,
      duration: updatedItems.reduce((total, item) => total + (item.duration || 0), 0)
    });
  }

  // Utility method for error handling
  private handleError(error: any): never {
    console.error('Playlist service error:', error);
    throw error;
  }
}
// features/area/services/area.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, tap, shareReplay, switchMap } from 'rxjs/operators';
import { Area, CreateAreaDto } from '../../../models/area.model';
import { supabase } from '../../../core/services/supabase.config';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AreaService {
  // Cache for frequently accessed data
  private areasCache$: Observable<Area[]> | null = null;
  private realtimeChannels = new Map<string, RealtimeChannel>();

  constructor(private authService: SupabaseAuthService) {}

  /**
   * Get all areas with optimized caching and refresh strategy
   */
  // features/area/services/area.service.ts
  getAreas(forceRefresh = false): Observable<Area[]> {
    // Return cached result if available and not forcing refresh
    if (this.areasCache$ && !forceRefresh) {
      return this.areasCache$;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    this.areasCache$ = from(
      supabase
        .from('areas')
        .select(`
          *,
          screens (
            id,
            name,
            status,
            last_ping,
            resolution,
            orientation
          )
        `)
        .eq('user_id', userId)  // Filter by current user ID
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapAreasFromSupabase(data || []);
      }),
      catchError(error => {
        console.error('Error fetching areas:', error);
        this.areasCache$ = null; // Clear cache on error
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: true, windowTime: 30000 })
    );

    return this.areasCache$;
  }

  /**
   * Get a single area by ID with screens and playlists
   */
  getAreaById(id: string): Observable<Area> {
    return from(
      supabase
        .from('areas')
        .select(`
          *,
          screens (
            id,
            name,
            status,
            resolution,
            orientation,
            last_ping,
            current_playlist,
            location,
            tags
          ),
          playlists:screens(id, current_playlist) /* This gets playlists indirectly */
        `)
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapAreaFromSupabase(data);
      }),
      catchError(error => {
        console.error(`Error fetching area ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new area with optimistic UI update support
   */
  // features/area/services/area.service.ts
  createArea(areaData: CreateAreaDto): Observable<Area> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    // Prepare data for insertion
    const newArea = {
      name: areaData.name,
      description: areaData.description,
      location: areaData.location,
      status: 'active',
      user_id: userId, // Set the user ID from the auth service
      screen_count: areaData.screenIds?.length || 0,
      stats: {
        onlineScreens: 0,
        totalScreens: areaData.screenIds?.length || 0,
        activePlaylist: 'No playlist',
        uptime: '99.9%',
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Rest of the method remains the same...
  }

  /**
   * Update an existing area with optimistic UI update support
   */
  updateArea(id: string, updates: Partial<Area>): Observable<Area> {
    // Map from our model to Supabase format
    const updateData: any = {
      name: updates.name,
      description: updates.description,
      location: updates.location,
      status: updates.status
    };
    
    if (updates.stats) {
      updateData.stats = updates.stats;
    }
    
    return from(
      supabase
        .from('areas')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        
        // Clear cache to ensure fresh data on next fetch
        this.areasCache$ = null;
        
        return this.mapAreaFromSupabase(data);
      }),
      catchError(error => {
        console.error(`Error updating area ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete an area and optionally unassign its screens
   */
  deleteArea(id: string, unassignScreens = true): Observable<void> {
    return from(
      supabase.from('areas').select('id').eq('id', id).single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      tap(async () => {
        // If unassignScreens is true, update all screens to set area_id to null
        if (unassignScreens) {
          await supabase
            .from('screens')
            .update({ area_id: null })
            .eq('area_id', id);
        }
      }),
      switchMap(() => 
        from(supabase.from('areas').delete().eq('id', id))
      ),
      map(({ error }) => {
        if (error) throw error;
        
        // Clear cache after deletion
        this.areasCache$ = null;
        
        return void 0;
      }),
      catchError(error => {
        console.error(`Error deleting area ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Set up a realtime subscription for areas and screens
   */
  subscribeToUpdates(callback: (area: Area) => void): RealtimeChannel {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Create a unique channel key
    const channelKey = `area-updates-${userId}`;
    
    // If we already have a channel with this key, return it
    if (this.realtimeChannels.has(channelKey)) {
      return this.realtimeChannels.get(channelKey)!;
    }
    
    // Otherwise, create a new channel
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'areas',
          filter: `user_id=eq.${userId}`
        },
        async (payload: any) => {
          // Handle changes to areas
          if (payload.eventType === 'DELETE') {
            // Area deleted, can't fetch it
            this.areasCache$ = null;
            return;
          }
          
          if (payload.new) {
            try {
              // Fetch the full area with screens
              const { data, error } = await supabase
                .from('areas')
                .select(`
                  *,
                  screens (
                    id,
                    name,
                    status,
                    last_ping,
                    resolution,
                    orientation
                  )
                `)
                .eq('id', payload.new.id)
                .single();
                
              if (!error && data) {
                callback(this.mapAreaFromSupabase(data));
                
                // Update cache if needed
                this.areasCache$ = null;
              }
            } catch (err) {
              console.error('Error in realtime update:', err);
            }
          }
        }
      )
      .subscribe();
      
    // Store the channel
    this.realtimeChannels.set(channelKey, channel);
    
    return channel;
  }

  /**
   * Cleanup method for realtime subscriptions
   */
  unsubscribeFromUpdates(channel: RealtimeChannel): void {
    supabase.removeChannel(channel);
    
    // Remove from our tracked channels
    this.realtimeChannels.forEach((value, key) => {
      if (value === channel) {
        this.realtimeChannels.delete(key);
      }
    });
  }

  /**
   * Helper method to assign screens to an area
   */
  private assignScreensToArea(areaId: string, screenIds: string[]): Observable<void> {
    if (!screenIds.length) return of(void 0);
    
    return from(
      Promise.all(
        screenIds.map(screenId => 
          supabase
            .from('screens')
            .update({ area_id: areaId })
            .eq('id', screenId)
        )
      )
    ).pipe(
      map(() => void 0),
      catchError(error => {
        console.error(`Error assigning screens to area ${areaId}:`, error);
        return throwError(() => error);
      })
    );
  }

  // Helper methods
  private mapAreasFromSupabase(data: any[]): Area[] {
    return data.map(area => this.mapAreaFromSupabase(area));
  }

  private mapAreaFromSupabase(data: any): Area {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      location: data.location,
      status: data.status || 'inactive',
      screenCount: data.screen_count || 0,
      lastUpdated: new Date(data.updated_at),
      stats: {
        onlineScreens: data.screens?.filter((s: any) => s.status === 'online').length || 0,
        totalScreens: data.screens?.length || 0,
        activePlaylist: data.stats?.activePlaylist || 'No playlist',
        uptime: data.stats?.uptime || '99.9%',
        lastUpdated: data.stats?.lastUpdated || data.updated_at
      },
      screens: (data.screens || []).map((screen: any) => ({
        id: screen.id,
        name: screen.name,
        status: screen.status || 'offline',
        resolution: screen.resolution || '1920x1080',
        lastPing: screen.last_ping || 'Never'
      }))
    };
  }
}
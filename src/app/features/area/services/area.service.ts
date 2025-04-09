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
  getAreas(forceRefresh = false): Observable<Area[]> {
    console.log('🔍 AreaService: getAreas called, forceRefresh =', forceRefresh);
    
    // Return cached result if available and not forcing refresh
    if (this.areasCache$ && !forceRefresh) {
      console.log('📦 AreaService: Using cached areas data');
      return this.areasCache$;
    }

    const userId = this.authService.getCurrentUserId();
    console.log('👤 AreaService: User ID is', userId);
    
    if (!userId) {
      console.error('❌ AreaService: No user ID available');
      return throwError(() => new Error('User not authenticated'));
    }

    console.log('🔄 AreaService: Fetching areas from Supabase...');
    
    // Log the raw Supabase query for debugging
    console.log(`📝 AreaService: Supabase query: from('areas').select().eq('user_id', ${userId})`);
    
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
      tap(response => {
        // Log the raw response
        console.log('📊 AreaService: Raw Supabase response:', response);
        
        if (response.error) {
          console.error('❌ AreaService: Supabase error:', response.error);
        } else {
          console.log(`✅ AreaService: Got ${response.data?.length || 0} areas from Supabase`);
        }
      }),
      map(({ data, error }) => {
        if (error) {
          console.error('❌ AreaService: Error mapping data:', error);
          throw error;
        }
        
        const mappedAreas = this.mapAreasFromSupabase(data || []);
        console.log('🔄 AreaService: Mapped areas:', mappedAreas);
        return mappedAreas;
      }),
      catchError(error => {
        console.error('❌ AreaService: Error fetching areas:', error);
        this.areasCache$ = null; // Clear cache on error
        
        // FALLBACK: If user_id query fails, try without filtering
        console.log('🔍 AreaService: Attempting fallback query without user filtering');
        return from(
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
            .order('created_at', { ascending: false })
        ).pipe(
          tap(response => {
            console.log('📊 AreaService: Fallback query response:', response);
          }),
          map(({ data, error }) => {
            if (error) throw error;
            const mappedAreas = this.mapAreasFromSupabase(data || []);
            console.log('🔄 AreaService: Fallback query found', mappedAreas.length, 'areas');
            return mappedAreas;
          }),
          catchError(fallbackError => {
            console.error('❌ AreaService: Fallback query also failed:', fallbackError);
            return throwError(() => fallbackError);
          })
        );
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
  createArea(data: CreateAreaDto | { area: CreateAreaDto, screenIds?: string[] }): Observable<Area> {
    const userId = this.authService.getCurrentUserId();
    
    console.log('🔍 AreaService: Creating area with data:', data);
    
    if (!userId) {
      console.error('❌ AreaService: No user ID available');
      return throwError(() => new Error('User not authenticated'));
    }

    // Extract the area object if nested
    const areaData: CreateAreaDto = 'area' in data ? data.area : data;
    
    // Handle screenIds safely - ensure it's an array
    const screenIds: string[] = 'screenIds' in data ? 
                              (data.screenIds || []) : 
                              ('area' in data && data.screenIds ? data.screenIds : []);
    
    console.log('📝 AreaService: Processed area data:', { areaData, screenIds, userId });

    // Use safe length access with default of 0
    const screenCount = screenIds?.length || 0;

    // Prepare data for insertion
    const newArea = {
      name: areaData.name,
      description: areaData.description,
      location: areaData.location,
      status: 'active',
      user_id: userId,
      screen_count: screenCount,
      stats: {
        onlineScreens: 0,
        totalScreens: screenCount,
        activePlaylist: 'No playlist',
        uptime: '99.9%',
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('📝 AreaService: Inserting area:', newArea);

    // Insert area first, then assign screens if any
    return from(
      supabase
        .from('areas')
        .insert([newArea])
        .select()
        .single()
    ).pipe(
      tap(response => {
        console.log('📊 AreaService: Insert area response:', response);
      }),
      switchMap(({ data, error }) => {
        if (error) {
          console.error('❌ AreaService: Error inserting area:', error);
          throw error;
        }
        
        console.log('✅ AreaService: Area created successfully:', data);
        const createdArea = this.mapAreaFromSupabase(data);
        
        // Clear cache to ensure fresh data
        this.areasCache$ = null;
        
        // If there are any screen IDs, assign them to this area
        if (screenIds && screenIds.length > 0) {
          return this.assignScreensToArea(createdArea.id, screenIds).pipe(
            map(() => createdArea),
            catchError(assignError => {
              console.warn('⚠️ AreaService: Error assigning screens to area:', assignError);
              // Return the area anyway, even if screen assignment failed
              return of(createdArea);
            })
          );
        }
        
        return of(createdArea);
      }),
      catchError(error => {
        console.error('❌ AreaService: Error creating area:', error);
        return throwError(() => error);
      })
    );
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
    console.log('🔍 AreaService: Mapping area from Supabase data:', data);
    
    if (!data) {
      console.error('❌ AreaService: Attempted to map null/undefined area data');
      // Return a fallback area object
      return {
        id: 'error',
        name: 'Error: Missing Data',
        description: 'This area was created due to a data mapping error',
        location: 'Unknown',
        screenCount: 0,
        status: 'inactive',
        lastUpdated: new Date(),
        stats: {
          onlineScreens: 0,
          totalScreens: 0,
          activePlaylist: 'No playlist',
          uptime: '0%',
          lastUpdated: new Date().toISOString()
        },
        screens: []
      };
    }
    
    try {
      // Log keys present in the data object
      console.log('🔑 Area data keys:', Object.keys(data));
      
      // Safely extract fields with fallbacks
      const id = data.id || 'missing-id-' + Date.now();
      const name = data.name || 'Unnamed Area';
      const description = data.description || '';
      const location = data.location || 'Unknown Location';
      const status = data.status || 'inactive';
      const screenCount = data.screen_count || 0;
      const lastUpdated = data.updated_at ? new Date(data.updated_at) : new Date();
      
      // Handle stats object safely
      const stats = {
        onlineScreens: data.screens?.filter((s: any) => s?.status === 'online')?.length || 0,
        totalScreens: data.screens?.length || 0,
        activePlaylist: data.stats?.activePlaylist || 'No playlist',
        uptime: data.stats?.uptime || '99.9%',
        lastUpdated: data.stats?.lastUpdated || data.updated_at || new Date().toISOString()
      };
      
      // Parse screens array
      let screens: any[] = [];
      if (Array.isArray(data.screens)) {
        screens = data.screens.map((screen: any) => ({
          id: screen?.id || 'missing-screen-id',
          name: screen?.name || 'Unnamed Screen',
          status: screen?.status || 'offline',
          resolution: screen?.resolution || '1920x1080',
          lastPing: screen?.last_ping || 'Never'
        }));
      }
      
      // Create the area object
      const area: Area = {
        id,
        name, 
        description,
        location,
        status,
        screenCount,
        lastUpdated,
        stats,
        screens
      };
      
      console.log('✅ AreaService: Successfully mapped area:', area);
      return area;
    } catch (error) {
      console.error('❌ AreaService: Error mapping area:', error);
      // Return a fallback area object in case of error
      return {
        id: data.id || 'error-' + Date.now(),
        name: data.name || 'Error: Mapping Failed',
        description: 'This area encountered a mapping error',
        location: data.location || 'Unknown',
        screenCount: 0,
        status: 'inactive',
        lastUpdated: new Date(),
        stats: {
          onlineScreens: 0,
          totalScreens: 0,
          activePlaylist: 'No playlist',
          uptime: '0%',
          lastUpdated: new Date().toISOString()
        },
        screens: []
      };
    }
  }
}
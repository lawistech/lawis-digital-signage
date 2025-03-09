// core/services/supabase.service.ts
import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Observable, from, map } from 'rxjs';
import { supabase } from './supabase.config';
import { Area, CreateAreaDto } from '../../models/area.model';
import { SupabaseAuthService } from './supabase-auth.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
    constructor(private authService: SupabaseAuthService) {}



    getAreas(): Observable<Area[]> {
      const userId = this.authService.getCurrentUser()?.id;
      
      return from(
        supabase
          .from('areas')
          .select(`
            *,
            screens (
              id,
              name,
              status
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ).pipe(
        map(({ data, error }) => {
          if (error) throw error;
          return this.mapAreasFromSupabase(data || []);
        })
      );
    }

  getAreaById(id: string): Observable<Area> {
    return from(
      supabase
        .from('areas')
        .select(`
          *,
          screens (
            id,
            name,
            status
          )
        `)
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapAreaFromSupabase(data);
      })
    );
  }

  
  createArea(data: { area: CreateAreaDto, screenIds?: string[] }): Observable<Area> {
    const userId = this.authService.getCurrentUser()?.id;
    
    return from(
      supabase
        .from('areas')
        .insert([{
          name: data.area.name,
          description: data.area.description,
          location: data.area.location,
          status: 'active',
          user_id: userId,
          screen_count: data.screenIds?.length || 0,
          stats: {
            onlineScreens: 0,
            totalScreens: data.screenIds?.length || 0,
            activePlaylist: 'No playlist',
            uptime: '99.9%',
            lastUpdated: new Date().toISOString()
          }
        }])
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapAreaFromSupabase(data);
      })
    );
  }

  updateArea(id: string, updates: Partial<Area>): Observable<Area> {
    return from(
      supabase
        .from('areas')
        .update({
          name: updates.name,
          description: updates.description,
          location: updates.location,
          status: updates.status,
          stats: updates.stats
        })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapAreaFromSupabase(data);
      })
    );
  }

  deleteArea(id: string): Observable<void> {
    return from(
      supabase
        .from('areas')
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  // Realtime subscriptions
  subscribeToAreas(callback: (area: Area) => void): RealtimeChannel {
    return supabase
      .channel('areas-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'areas',
        } as any,
        async (payload: any) => {
          if (payload.new) {
            const { data, error } = await supabase
              .from('areas')
              .select(`
                *,
                screens (
                  id,
                  name,
                  status
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              callback(this.mapAreaFromSupabase(data));
            }
          }
        }
      )
      .subscribe();
  }

  // Cleanup method for realtime subscriptions
  unsubscribeFromChannel(channel: RealtimeChannel): void {
    supabase.removeChannel(channel);
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
      status: data.status,
      screenCount: data.screen_count || 0,
      lastUpdated: new Date(data.updated_at),
      stats: {
        onlineScreens: data.screens?.filter((s: any) => s.status === 'online').length || 0,
        totalScreens: data.screens?.length || 0,
        activePlaylist: data.stats?.activePlaylist || 'No playlist',
        uptime: data.stats?.uptime || '99.9%',
        lastUpdated: data.stats?.lastUpdated || data.updated_at
      },
      screens: data.screens?.map((screen: any) => ({
        id: screen.id,
        name: screen.name,
        status: screen.status,
        resolution: screen.resolution || '1920x1080',
        lastPing: screen.last_ping || 'Never'
      })) || []
    };
  }
}
// supabase-screen.service.ts
import { Injectable } from '@angular/core';
import { from, Observable, map, catchError, throwError, of, switchMap } from 'rxjs';
import { supabase } from '../../core/services/supabase.config';
import { PlaylistSchedule, PlaylistScheduleBase, Screen } from '../../models/screen.model';

@Injectable({
  providedIn: 'root',
})
export class SupabaseScreenService {
  private table = 'screens';

  getScreens(): Observable<Screen[]> {
    return from(
      supabase
        .from(this.table)
        .select(`
          *,
          areas (
            id,
            name,
            location,
            status
          )
        `)
        .order('created_at', { ascending: false })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data as Screen[];
      }),
      catchError((error) => {
        console.error('Error fetching screens:', error);
        return throwError(() => error);
      })
    );
  }

  // Verify registration code
  verifyRegistrationCode(code: string): Observable<any> {
    return from(
      supabase
        .from('pending_registrations')
        .select('*')
        .eq('registration_code', code)
        .eq('is_claimed', false)
        .single()
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError((error) => {
        console.error('Error verifying registration code:', error);
        return throwError(() => new Error('Invalid registration code or already claimed'));
      })
    );
  }

  // Mark registration as claimed
  markRegistrationAsClaimed(code: string, screenId: string): Observable<boolean> {
    return from(
      supabase
        .from('pending_registrations')
        .update({
          is_claimed: true,
          device_id: screenId,
          claimed_at: new Date().toISOString()
        })
        .eq('registration_code', code)
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError((error) => {
        console.error('Error marking registration as claimed:', error);
        return throwError(() => error);
      })
    );
  }

  getScreensByArea(areaId: string): Observable<Screen[]> {
    return from(
      supabase
        .from(this.table)
        .select(`
          *,
          areas (
            id,
            name,
            location,
            status
          )
        `)
        .eq('area_id', areaId)
        .order('created_at', { ascending: false })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data as Screen[];
      }),
      catchError((error) => {
        console.error('Error fetching screens by area:', error);
        return throwError(() => error);
      })
    );
  }

  getScreen(id: string): Observable<Screen> {
    return from(
      supabase
        .from(this.table)
        .select(`
          *,
          areas (
            id,
            name,
            location,
            status
          )
        `)
        .eq('id', id)
        .single()
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data as Screen;
      }),
      catchError((error) => {
        console.error('Error fetching screen:', error);
        return throwError(() => error);
      })
    );
  }

  // This is a partial update focusing on the createScreen method
// in supabase-screen.service.ts

createScreen(screen: Omit<Screen, 'id' | 'created_at' | 'updated_at'>, registrationCode?: string): Observable<Screen> {
  // Convert the data to match Supabase schema
  const screenData = {
    name: screen.name,
    channel_id: screen.channel_id,
    channel_name: screen.channel_name,
    area_id: screen.area_id,
    status: screen.status,
    resolution: screen.resolution,
    orientation: screen.orientation,
    last_ping: new Date().toISOString(),
    current_playlist: screen.current_playlist || null,
    current_playlist_started_at: screen.current_playlist ? new Date().toISOString() : null,
    next_playlist: screen.next_playlist || null,
    schedule: screen.schedule || null,
    hardware: screen.hardware,
    network: screen.network,
    location: screen.location,
    settings: screen.settings,
    analytics: screen.analytics,
    maintenance: screen.maintenance,
    tags: screen.tags || []
  };

  console.log('Creating screen with data:', screenData);

  return from(
    supabase
      .from(this.table)
      .insert([screenData])
      .select()
      .single()
  ).pipe(
    switchMap((response) => {
      if (response.error) {
        throw response.error;
      }
      
      const createdScreen = response.data as Screen;
      
      // If we have a registration code and a valid screen ID, mark as claimed
      if (registrationCode && createdScreen.id) {
        // Return a new Observable that completes with the screen after claiming
        return from(
          supabase
            .from('pending_registrations')
            .update({
              is_claimed: true,
              device_id: createdScreen.id,
              claimed_at: new Date().toISOString()
            })
            .eq('registration_code', registrationCode)
        ).pipe(
          map(claimResponse => {
            if (claimResponse.error) {
              console.warn('Error marking registration as claimed:', claimResponse.error);
              // Continue anyway since the screen was created successfully
            }
            return createdScreen;
          })
        );
      }
      
      return of(createdScreen);
    }),
    catchError((error) => {
      console.error('Error creating screen:', error);
      return throwError(() => new Error('Failed to create screen: ' + error.message));
    })
  );
}

  updateScreen(id: string, updates: Partial<Screen>): Observable<Screen> {
    return from(
      supabase
        .from(this.table)
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          areas (
            id,
            name,
            location,
            status
          )
        `)
        .single()
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data as Screen;
      }),
      catchError((error) => {
        console.error('Error updating screen:', error);
        return throwError(() => error);
      })
    );
  }

  deleteScreen(id: string): Observable<void> {
    return from(
      supabase.from(this.table).delete().eq('id', id)
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return void 0;
      }),
      catchError((error) => {
        console.error('Error deleting screen:', error);
        return throwError(() => error);
      })
    );
  }

  // Real-time updates
  subscribeToScreenUpdates(callback: (screen: Screen) => void): void {
    supabase
      .channel('screen_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.table,
        },
        (payload) => {
          callback(payload.new as Screen);
        }
      )
      .subscribe();
  }

  // Subscribe to pending registrations
  subscribeToPendingRegistrations(callback: (registration: any) => void): void {
    supabase
      .channel('pending_registrations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_registrations',
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  }
   
  // Update current playlist from schedule
  async updateCurrentPlaylistFromSchedule(screenId: string): Promise<void> {
    try {
      const { data: screen, error: getError } = await supabase
        .from('screens')
        .select('*')
        .eq('id', screenId)
        .single();

      if (getError) throw getError;
      
      // If there are no upcoming schedules, clear the current playlist
      if (!screen.schedule?.upcoming || screen.schedule.upcoming.length === 0) {
        console.log(`No schedules found for screen ${screenId}, clearing current playlist`);
        
        const { error: clearError } = await supabase
          .from('screens')
          .update({
            current_playlist: null,
            current_playlist_started_at: null,
            schedule: {
              current: null,
              upcoming: []
            }
          })
          .eq('id', screenId);

        if (clearError) throw clearError;
        return;
      }

      const now = new Date();
      const currentTime = now.toTimeString().split(':').slice(0, 2).join(':');
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });

      console.log(`Current day: ${currentDay}, current time: ${currentTime}`);

      // Sort schedules by priority first, then start_time
      const sortedSchedules = [...screen.schedule.upcoming].sort((a, b) => {
        // First sort by priority (lower number = higher priority)
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // Then sort by start_time
        return a.start_time.localeCompare(b.start_time);
      });

      // Find the currently active schedule that matches the current day
      const activeSchedule = sortedSchedules.find(schedule => {
        // Check if schedule has days_of_week and if it should run on current day
        const isValidDay = schedule.days_of_week?.includes(currentDay);
        const isInTimeRange = currentTime >= schedule.start_time && currentTime <= schedule.end_time;
        
        console.log(`Schedule ${schedule.playlist_id}: day valid=${isValidDay}, time valid=${isInTimeRange}`);
        
        return isValidDay && isInTimeRange;
      });

      // If we found an active schedule and it's different from current playlist
      if (activeSchedule && activeSchedule.playlist_id !== screen.current_playlist) {
        console.log(`Activating schedule for playlist ${activeSchedule.playlist_id}`);
        
        const { error: updateError } = await supabase
          .from('screens')
          .update({
            current_playlist: activeSchedule.playlist_id,
            current_playlist_started_at: new Date().toISOString(),
            schedule: {
              ...screen.schedule,
              current: activeSchedule
            }
          })
          .eq('id', screenId);

        if (updateError) throw updateError;
      }
      // If no active schedule found, clear current playlist
      else if (!activeSchedule && screen.current_playlist) {
        console.log('No active schedule found, clearing current playlist');
        
        const { error: clearError } = await supabase
          .from('screens')
          .update({
            current_playlist: null,
            current_playlist_started_at: null,
            schedule: {
              ...screen.schedule,
              current: null
            }
          })
          .eq('id', screenId);

        if (clearError) throw clearError;
      }

    } catch (error) {
      console.error('Error updating current playlist:', error);
      throw error;
    }
  }

  // Increase check frequency for more accurate schedule transitions
  startScheduleChecker(screenId: string): void {
    setInterval(() => {
      this.updateCurrentPlaylistFromSchedule(screenId);
    }, 30000); // Check every 30 seconds
  }

  async addScheduleToScreen(screenId: string, schedule: PlaylistSchedule): Promise<void> {
    try {
      const { data: screen, error: getError } = await supabase
        .from('screens')
        .select('schedule')
        .eq('id', screenId)
        .single();

      if (getError) throw getError;

      const currentSchedule = screen.schedule || { current: null, upcoming: [] };
      const updatedSchedule = {
        ...currentSchedule,
        upcoming: [...currentSchedule.upcoming, {
          playlist_id: schedule.playlist_id,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          priority: schedule.priority
        }]
      };

      const { error: updateError } = await supabase
        .from('screens')
        .update({ schedule: updatedSchedule })
        .eq('id', screenId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error adding schedule:', error);
      throw error;
    }
  }

  async removeScheduleFromScreen(screenId: string, scheduleIndex: number): Promise<void> {
    try {
      const { data: screen, error: getError } = await supabase
        .from('screens')
        .select('schedule')
        .eq('id', screenId)
        .single();

      if (getError) throw getError;

      const currentSchedule = screen.schedule || { current: null, upcoming: [] };
      const updatedUpcoming = [...currentSchedule.upcoming];
      updatedUpcoming.splice(scheduleIndex, 1);

      const updatedSchedule = {
        ...currentSchedule,
        upcoming: updatedUpcoming
      };

      const { error: updateError } = await supabase
        .from('screens')
        .update({ schedule: updatedSchedule })
        .eq('id', screenId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error removing schedule:', error);
      throw error;
    }
  }

  async updateScreenSchedule(screenId: string, schedule: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('screens')
        .update({ schedule })
        .eq('id', screenId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating screen schedule:', error);
      throw error;
    }
  }

  // Get pending registrations
  getPendingRegistrations(): Observable<any[]> {
    return from(
      supabase
        .from('pending_registrations')
        .select('*')
        .eq('is_claimed', false)
        .order('created_at', { ascending: false })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError((error) => {
        console.error('Error fetching pending registrations:', error);
        return throwError(() => error);
      })
    );
  }

  // Delete pending registration
  deletePendingRegistration(id: string): Observable<void> {
    return from(
      supabase.from('pending_registrations').delete().eq('id', id)
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return void 0;
      }),
      catchError((error) => {
        console.error('Error deleting pending registration:', error);
        return throwError(() => error);
      })
    );
  }
}
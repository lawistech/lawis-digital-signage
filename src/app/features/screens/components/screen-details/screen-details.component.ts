// Updated screen-details.component.ts with all necessary type fixes

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlaylistSchedule, PlaylistScheduleBase, Screen } from '../../../../models/screen.model';
import { ScreenService } from '../../services/screen.service';
import { ScreenStatusHeaderComponent } from './screen-status-header/screen-status-header.component';
import { CurrentPlaylistCardComponent } from './current-playlist-card/current-playlist-card.component';
import { ScheduleCardComponent } from './schedule-card/schedule-card.component';
import { ScreenInfoCardComponent } from './screen-info-card/screen-info-card.component';
import { AddScheduleFormComponent } from './add-schedule-form/add-schedule-form.component';
import { Playlist } from '../../../../models/playlist.model';
import { PlaylistService } from '../../../playlists/services/playlist.service';
import { interval, Subject, takeUntil } from 'rxjs';
import { PlaylistDetailsDialogComponent } from './playlist-details-dialog/playlist-details-dialog.component';
import { PlaylistPreviewDialogComponent } from '../../../playlists/components/playlist-preview-dialog/playlist-preview-dialog.component';
import { supabase } from '../../../../core/services/supabase.config';

@Component({
  selector: 'app-screen-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScreenStatusHeaderComponent,
    CurrentPlaylistCardComponent,
    ScheduleCardComponent,
    ScreenInfoCardComponent,
    AddScheduleFormComponent,
    PlaylistDetailsDialogComponent,
    PlaylistPreviewDialogComponent
  ],
  templateUrl: './screen-details.component.html',
})
export class ScreenDetailsComponent implements OnInit {
  screen: Screen | null = null;
  loading = true;
  error: string | null = null;
  showAddSchedule = false;
  showPreviewDialog = false;
  selectedPlaylist: Playlist | null = null;
  playlist: Playlist | null = null;
  showPlaylistDetails = false;
  showEditSchedule = false;
  editingSchedule: PlaylistScheduleBase | null = null;
  showDeleteConfirm = false;
  scheduleToDelete: PlaylistScheduleBase | null = null;

  private destroy$ = new Subject<void>();
  private refreshInterval$ = interval(10000); // Poll every 10 seconds
  private scheduleChecker: any;

  availablePlaylists = [
    { id: 'PL1', name: 'Welcome Messages' },
    { id: 'PL2', name: 'Daily Announcements' },
    { id: 'PL3', name: 'Event Updates' },
    { id: 'PL4', name: 'Emergency Notices' },
  ];

  constructor(
    private route: ActivatedRoute,
    private screenService: ScreenService,
    private playlistService: PlaylistService, 
    private router: Router 
  ) {}

  ngOnInit(): void {
    this.loadScreen();
    this.setupAutoRefresh();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.screenService.getScreen(id).subscribe({
        next: (screen) => {
          this.screen = screen;
        },
        error: (error) => {
          console.error('Error loading screen:', error);
        }
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions and checkers
    if (this.screen) {
      this.screenService.stopScheduleChecker(this.screen.id);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  retryLoading(): void {
    this.loadScreen();
  }

  private setupAutoRefresh(): void {
    const screenId = this.route.snapshot.paramMap.get('id');
    if (screenId) {
      this.refreshInterval$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.refreshScreen(screenId);
      });
    }
  }

  private refreshScreen(screenId: string): void {
    this.screenService.getScreen(screenId).subscribe({
      next: (updatedScreen) => {
        this.screen = updatedScreen;
      },
      error: (error) => {
        console.error('Error refreshing screen:', error);
      }
    });
  }

  loadScreen(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loading = true;
      this.error = null;
      this.screenService.getScreen(id).subscribe({
        next: (screen) => {
          this.screen = screen;
          this.loading = false;
          
          // Start schedule checker if there are upcoming schedules
          if (screen.schedule?.upcoming?.length) {
            this.screenService.startScheduleChecker(screen.id);
            this.screenService.updateCurrentPlaylistFromSchedule(screen.id);
          }
        },
        error: (error) => {
          console.error('Error loading screen:', error);
          this.error = 'Failed to load screen details. Please try again.';
          this.loading = false;
        },
      });
    }
  }

  // Improve handleAddSchedule to update current playlist immediately
handleAddSchedule(schedule: PlaylistSchedule): void {
  if (this.screen) {
    // Create a properly typed schedule object with default empty array
    const currentSchedule = this.screen.schedule || { current: null, upcoming: [] };
    
    const baseSchedule: PlaylistScheduleBase = {
      playlist_id: schedule.playlist_id,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      priority: schedule.priority,
      days_of_week: schedule.days_of_week  
    };

    // Create a new upcoming array to ensure it's properly typed
    const updatedUpcoming = [...(currentSchedule.upcoming || []), baseSchedule];

    // Check if the new schedule should be activated immediately
    const now = new Date();
    const currentTime = now.toTimeString().split(':').slice(0, 2).join(':');
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    const shouldActivateImmediately = 
      schedule.days_of_week.includes(currentDay) &&
      currentTime >= schedule.start_time && 
      currentTime <= schedule.end_time;

    if (shouldActivateImmediately) {
      // If the schedule should start immediately, update the current playlist directly
      this.screenService
        .updateScreen(this.screen.id, {
          current_playlist: schedule.playlist_id,
          current_playlist_started_at: new Date().toISOString(),
          schedule: {
            current: baseSchedule,
            upcoming: updatedUpcoming
          }
        })
        .subscribe({
          next: (updatedScreen) => {
            console.log('Schedule added and playlist activated immediately');
            this.screen = updatedScreen;
            this.showAddSchedule = false;
          },
          error: (error) => {
            console.error('Error adding and activating schedule:', error);
          },
        });
    } else {
      // If the schedule doesn't apply now, just update the upcoming list
      this.screenService
        .updateScreen(this.screen.id, {
          schedule: {
            current: currentSchedule.current,
            upcoming: updatedUpcoming
          }
        })
        .subscribe({
          next: (updatedScreen) => {
            console.log('Schedule added successfully');
            this.screen = updatedScreen;
            this.showAddSchedule = false;
            
            // Check if the new schedule should be current based on other criteria
            // (like having highest priority among eligible schedules)
            this.screenService.updateCurrentPlaylistFromSchedule(this.screen.id);
          },
          error: (error) => {
            console.error('Error adding schedule:', error);
          },
        });
    }
  }
}

  getPlaylistName(playlistId: string): string {
    this.playlistService.getPlaylist(playlistId).subscribe({
      next: (playlist) => {
        console.log("playlist get name");
        console.log(playlist);
        this.playlist = playlist;
      },
      error: (error) => {
        console.error('Error loading playlist:', error);
      },
    });

    return 'Unknown Playlist';
  }

  getPriorityClass(priority: number): string {
    switch (priority) {
      case 1:
        return 'bg-red-100 text-red-800';
      case 2:
        return 'bg-yellow-100 text-yellow-800';
      case 3:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatTime(time: string): string {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  

  // Improve the deleteSchedule method to ensure current playlist is cleared when all schedules are deleted
deleteSchedule(scheduleToDelete: PlaylistScheduleBase): void {
  if (this.screen?.schedule) {
    // Create a properly typed filtered array of upcoming schedules
    const updatedUpcoming = (this.screen.schedule.upcoming || []).filter(
      schedule => 
        schedule.playlist_id !== scheduleToDelete.playlist_id ||
        schedule.start_time !== scheduleToDelete.start_time
    );

    // Create a properly typed updated schedule object
    const updatedSchedule = {
      current: this.screen.schedule.current,
      upcoming: updatedUpcoming
    };

    // Check if we're deleting the last schedule
    if (updatedUpcoming.length === 0) {
      // If this is the last schedule, clear the current playlist too
      this.screenService.updateScreen(this.screen.id, {
        current_playlist: null,
        current_playlist_started_at: null,
        schedule: {
          current: null,
          upcoming: []
        }
      }).subscribe({
        next: (updatedScreen) => {
          this.screen = updatedScreen;
          console.log('Last schedule deleted and playlist cleared');
        },
        error: (error) => {
          console.error('Error deleting schedule:', error);
        }
      });
    }
    // Check if we're deleting the currently active schedule
    else if (
      this.screen.schedule.current && 
      this.screen.schedule.current.playlist_id === scheduleToDelete.playlist_id && 
      this.screen.schedule.current.start_time === scheduleToDelete.start_time
    ) {
      // If deleting the currently active schedule, clear current and check for new applicable schedule
      this.screenService.updateScreen(this.screen.id, {
        current_playlist: null,
        current_playlist_started_at: null,
        schedule: updatedSchedule
      }).subscribe({
        next: (updatedScreen) => {
          this.screen = updatedScreen;
          console.log('Current schedule deleted and playlist cleared');
          
          // Check if another schedule should now be active
          this.screenService.updateCurrentPlaylistFromSchedule(this.screen.id);
        },
        error: (error) => {
          console.error('Error deleting current schedule:', error);
        }
      });
    }
    else {
      // Just update the schedule as normal
      this.screenService.updateScreen(this.screen.id, {
        schedule: updatedSchedule
      }).subscribe({
        next: (updatedScreen) => {
          this.screen = updatedScreen;
          console.log('Schedule deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting schedule:', error);
        }
      });
    }
  }
}

  viewPlaylist(): void {
    if (this.screen?.current_playlist) {
      console.log('Viewing playlist:', this.screen.current_playlist);
    }
  }

  assignPlaylist(playlist: Playlist) {
    if (this.screen) {
      this.screenService.updateScreen(this.screen.id, {
        current_playlist: playlist.id,
        current_playlist_started_at: new Date().toISOString()
      }).subscribe({
        next: (updatedScreen) => {
          this.screen = updatedScreen;
        },
        error: (error) => {
          console.error('Error assigning playlist:', error);
        }
      });
    }
  }

  handlePlayStatusChange(isPlaying: boolean) {
    if (this.screen) {
      // Here you would typically send a command to your actual screen device
      console.log(`${isPlaying ? 'Playing' : 'Pausing'} playlist on screen ${this.screen.id}`);
    }
  }

  openAssignPlaylistDialog() {
    if (this.screen?.current_playlist) {
      this.showPlaylistDetails = true;
    } else {
      // Handle case when no playlist is assigned
      console.log('No playlist currently assigned');
    }
  }

  viewPlaylistDetails(playlist: Playlist) {
    this.selectedPlaylist = playlist;
    this.showPreviewDialog = true;
  }

  closePreviewDialog(): void {
    this.showPreviewDialog = false;
    this.selectedPlaylist = null;
  }

  handlePlaylistAssigned(playlist: Playlist) {
    if (this.screen) {
      this.screenService.updateScreen(this.screen.id, {
        current_playlist: playlist.id,
        current_playlist_started_at: new Date().toISOString()
      }).subscribe({
        next: (updatedScreen) => {
          this.screen = updatedScreen;
          this.showPlaylistDetails = false;
        },
        error: (error) => {
          console.error('Error assigning playlist:', error);
        }
      });
    }
  }

  handleUpdateSchedule(updatedSchedule: PlaylistSchedule): void {
    if (this.screen && this.editingSchedule) {
      console.log('Updating schedule with days:', updatedSchedule.days_of_week);
      
      // Find and update the specific schedule in the upcoming array
      // Make sure to handle possibly undefined upcoming
      const upcoming = this.screen.schedule?.upcoming || [];
      const updatedUpcoming = upcoming.map(schedule => 
        schedule.playlist_id === this.editingSchedule?.playlist_id &&
        schedule.start_time === this.editingSchedule?.start_time
          ? {
              playlist_id: updatedSchedule.playlist_id,
              start_time: updatedSchedule.start_time,
              end_time: updatedSchedule.end_time,
              priority: updatedSchedule.priority,
              days_of_week: updatedSchedule.days_of_week // Make sure to include days_of_week
            }
          : schedule
      );

      // Create the updated schedule object with explicit current property
      const updatedScheduleObj = {
        current: this.screen.schedule?.current || null,
        upcoming: updatedUpcoming
      };

      // Check if we're editing the currently active schedule
      const isEditingCurrentSchedule = this.screen.schedule?.current &&
          this.screen.schedule.current.playlist_id === this.editingSchedule.playlist_id &&
          this.screen.schedule.current.start_time === this.editingSchedule.start_time;

      // If we're editing the current schedule, we may need to clear the current playlist
      if (isEditingCurrentSchedule) {
        const now = new Date();
        const currentTime = now.toTimeString().split(':').slice(0, 2).join(':');
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Check if the updated schedule would still be active now
        const stillActive = updatedSchedule.days_of_week.includes(currentDay) &&
                          currentTime >= updatedSchedule.start_time && 
                          currentTime <= updatedSchedule.end_time;
        
        if (!stillActive) {
          // If the schedule would no longer be active, clear the current playlist
          this.screenService.updateScreen(this.screen.id, {
            current_playlist: null,
            current_playlist_started_at: null,
            schedule: updatedScheduleObj
          }).subscribe({
            next: (updatedScreen) => {
              this.screen = updatedScreen;
              this.showEditSchedule = false;
              this.editingSchedule = null;
              
              // Check if any other schedule should be current
              this.screenService.updateCurrentPlaylistFromSchedule(this.screen.id);
            },
            error: (error) => {
              console.error('Error updating schedule:', error);
            }
          });
          return;
        }
      }

      // If we're not editing the current schedule or it would still be active,
      // just update the schedule normally
      this.screenService.updateScreen(this.screen.id, {
        schedule: updatedScheduleObj
      }).subscribe({
        next: (updatedScreen) => {
          this.screen = updatedScreen;
          this.showEditSchedule = false;
          this.editingSchedule = null;
          
          // Check if the updated schedule should be current
          this.screenService.updateCurrentPlaylistFromSchedule(this.screen.id);
        },
        error: (error) => {
          console.error('Error updating schedule:', error);
        }
      });
    }
  }

  // Add a method to explicitly clear the current playlist
  clearCurrentPlaylist(): void {
    if (this.screen) {
      // Ensure we use a properly typed schedule object
      const updatedSchedule = {
        current: null,
        upcoming: this.screen.schedule?.upcoming || []
      };
      
      this.screenService.updateScreen(this.screen.id, {
        current_playlist: null,
        current_playlist_started_at: null,
        schedule: updatedSchedule
      }).subscribe({
        next: (updatedScreen) => {
          this.screen = updatedScreen;
          console.log('Current playlist cleared');
        },
        error: (error) => {
          console.error('Error clearing current playlist:', error);
        }
      });
    }
  }

  // Update the editSchedule method
  editSchedule(schedule: PlaylistScheduleBase): void {
    this.editingSchedule = schedule;
    this.showEditSchedule = true;
  }

  initiateDelete(schedule: PlaylistScheduleBase): void {
    this.scheduleToDelete = schedule;
    this.showDeleteConfirm = true;
  }

  async confirmDelete(): Promise<void> {
    if (this.scheduleToDelete && this.screen?.schedule) {
      try {
        // Create a properly typed filtered array for upcoming schedules
        const updatedUpcoming = (this.screen.schedule.upcoming || []).filter(
          schedule => !(
            schedule.playlist_id === this.scheduleToDelete?.playlist_id &&
            schedule.start_time === this.scheduleToDelete?.start_time &&
            schedule.end_time === this.scheduleToDelete?.end_time
          )
        );

        // Create a properly typed schedule object
        const updatedSchedule = {
          current: this.screen.schedule.current || null,
          upcoming: updatedUpcoming
        };

        // Check if this was the last schedule and we're deleting it
        const isLastSchedule = updatedUpcoming.length === 0;
        
        // Check if the deleted schedule was the current one
        const isDeletingCurrentSchedule = this.screen.schedule?.current &&
            this.screen.schedule.current.playlist_id === this.scheduleToDelete.playlist_id &&
            this.screen.schedule.current.start_time === this.scheduleToDelete.start_time &&
            this.screen.schedule.current.end_time === this.scheduleToDelete.end_time;

        // If deleting last schedule or current schedule, clear the current playlist
        if (isLastSchedule || isDeletingCurrentSchedule) {
          // Clear current playlist and update schedule
          await this.screenService.updateScreen(this.screen.id, {
            current_playlist: null,
            current_playlist_started_at: null,
            schedule: {
              current: null,
              upcoming: updatedUpcoming
            }
          }).toPromise();
        } else {
          // Just update the schedule
          await this.screenService.updateScreen(
            this.screen.id,
            { schedule: updatedSchedule }
          ).toPromise();
          
          // Check for next applicable schedule if needed
          if (isDeletingCurrentSchedule) {
            await this.screenService.updateCurrentPlaylistFromSchedule(this.screen.id);
          }
        }

        // Reload screen to get the latest state
        this.loadScreen();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        // Optionally add error handling/notification here
      } finally {
        // Clean up by closing the dialog and clearing the schedule to delete
        this.showDeleteConfirm = false;
        this.scheduleToDelete = null;
      }
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.scheduleToDelete = null;
  }

  // Add a refresh method to the component to handle UI updates
refreshScreenData(): void {
  if (!this.screen) return;
  
  // First, update the current playlist based on schedules
  this.screenService.updateCurrentPlaylistFromSchedule(this.screen.id).then(() => {
    // Then reload the screen data to get the updated information
    this.screenService.getScreen(this.screen!.id).subscribe({
      next: (updatedScreen) => {
        this.screen = updatedScreen;
        console.log('Screen data refreshed with updated playlist information');
      },
      error: (error) => {
        console.error('Error refreshing screen data:', error);
      }
    });
  }).catch(error => {
    console.error('Error updating current playlist:', error);
  });
}

// Update onScheduleAdded method to refresh data
onScheduleAdded(): void {
  this.showAddSchedule = false;
  this.refreshScreenData();
}


// Add this timezone handling method to the supabase-screen.service.ts

// Helper method to get the user's local time format for schedule checks
private getCurrentLocalTime(): { currentTime: string, currentDay: string } {
  const now = new Date();
  
  // Get time in 24-hour format (HH:MM) using the user's local timezone
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;
  
  // Get day of week in English (Monday, Tuesday, etc.) using the user's local timezone
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  return { currentTime, currentDay };
}

// Update the updateCurrentPlaylistFromSchedule method to use local timezone
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

    // Get the user's local time and day
    const { currentTime, currentDay } = this.getCurrentLocalTime();

    console.log(`Current day: ${currentDay}, current time: ${currentTime} (local timezone)`);

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
}
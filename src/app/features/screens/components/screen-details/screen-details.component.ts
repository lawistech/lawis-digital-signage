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


  handleAddSchedule(schedule: PlaylistSchedule): void {
    if (this.screen) {
      if (!this.screen.schedule) {
        this.screen.schedule = {
          current: null,
          upcoming: []
        };
      }

      const baseSchedule: PlaylistScheduleBase = {
        playlist_id: schedule.playlist_id,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        priority: schedule.priority,
        days_of_week: schedule.days_of_week  
      };

      this.screen.schedule.upcoming = [
        ...this.screen.schedule.upcoming,
        baseSchedule
      ];

      this.screenService
        .updateScreen(this.screen.id, {
          schedule: this.screen.schedule,
        })
        .subscribe({
          next: () => {
            console.log('Schedule updated successfully');
            this.showAddSchedule = false;
            // Check if the new schedule should start immediately
            this.screenService.updateCurrentPlaylistFromSchedule(this.screen!.id);
          },
          error: (error) => {
            console.error('Error updating schedule:', error);
          },
        });
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

  onScheduleAdded(): void {
    this.showAddSchedule = false;
    // Optionally refresh the screen data
    this.loadScreen();
  }

 
  // Update this method in your screen-details.component.ts

deleteSchedule(scheduleToDelete: PlaylistScheduleBase): void {
  if (this.screen?.schedule) {
    const updatedSchedule = {
      ...this.screen.schedule,
      upcoming: this.screen.schedule.upcoming.filter(
        schedule => 
          schedule.playlist_id !== scheduleToDelete.playlist_id ||
          schedule.start_time !== scheduleToDelete.start_time
      )
    };

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

 // Update this method in your ScreenDetailsComponent
handleUpdateSchedule(updatedSchedule: PlaylistSchedule): void {
  if (this.screen && this.editingSchedule) {
    console.log('Updating schedule with days:', updatedSchedule.days_of_week);
    
    // Find and update the specific schedule in the upcoming array
    const updatedUpcoming = this.screen.schedule?.upcoming.map(schedule => 
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
    ) || [];

    // Create the updated schedule object with explicit current property
    const updatedScheduleObj = {
      current: this.screen.schedule?.current || null,
      upcoming: updatedUpcoming
    };

    // Update the screen with the new schedule
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
// Add this method to handle edit button clicks
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
      // Filter out the schedule to be deleted
      const updatedUpcoming = this.screen.schedule.upcoming.filter(
        schedule => !(
          schedule.playlist_id === this.scheduleToDelete?.playlist_id &&
          schedule.start_time === this.scheduleToDelete?.start_time &&
          schedule.end_time === this.scheduleToDelete?.end_time
        )
      );

      // Create the properly typed schedule object
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
}
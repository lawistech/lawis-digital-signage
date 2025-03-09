import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlaylistScheduleBase } from '../../../../../models/screen.model';
import { PlaylistService } from '../../../../playlists/services/playlist.service';

@Component({
  selector: 'app-schedule-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-medium">Playlist Schedule</h2>
        <button
          (click)="onAddSchedule.emit()"
          class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md text-sm hover:bg-blue-100 flex items-center gap-1"
        >
          <span class="material-icons text-sm">add</span>
          Add Schedule
        </button>
      </div>

      @if (schedules.length) {
        <div class="space-y-4">
          @for (schedule of schedules; track schedule; let i = $index) {
            <div class="border rounded-lg p-4">
              <div class="flex justify-between items-start">
                <div>
                  @if (loading) {
                    <div class="animate-pulse">
                      <div class="h-4 w-32 bg-gray-200 rounded"></div>
                      <div class="h-3 w-24 bg-gray-100 rounded mt-2"></div>
                    </div>
                  } @else {
                    <h3 class="font-medium">{{ playlistNames[schedule.playlist_id] || 'Unknown Playlist' }}</h3>
                    <p class="text-sm text-gray-500">
                      {{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}
                    </p>
                    <!-- Days display -->
                    <div class="mt-2 flex flex-wrap gap-1">
                      @if (schedule.days_of_week && schedule.days_of_week.length > 0) {
                        @for (day of schedule.days_of_week; track day) {
                          <span class="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                            {{ day.slice(0, 3) }}
                          </span>
                        }
                      } @else {
                        <span class="text-xs text-gray-500">No days selected</span>
                      }
                    </div>
                  }
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-1 text-xs rounded-full"
                    [class]="getPriorityClass(schedule.priority)"
                  >
                    Priority {{ schedule.priority }}
                  </span>
                  <button
                    (click)="onEditSchedule.emit(schedule)"
                    class="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit schedule"
                  >
                    <span class="material-icons">edit</span>
                  </button>
                  <button
                    (click)="onDeleteSchedule.emit(schedule)"
                    class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete schedule"
                  >
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="text-center py-8 text-gray-500">No scheduled playlists</div>
      }
    </div>
  `
})
export class ScheduleCardComponent implements OnInit, OnChanges {
  @Input() schedules: PlaylistScheduleBase[] = [];
  @Output() onAddSchedule = new EventEmitter<void>();
  @Output() onEditSchedule = new EventEmitter<PlaylistScheduleBase>();
  @Output() onDeleteSchedule = new EventEmitter<PlaylistScheduleBase>();

  playlistNames: { [key: string]: string } = {};
  loading = false;

  constructor(private playlistService: PlaylistService) {}

  ngOnInit() {
    this.loadPlaylistNames();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['schedules']) {
      this.loadPlaylistNames();
    }
  }

  private loadPlaylistNames() {
    if (!this.schedules.length) return;

    // Debug the schedules
    console.log('Schedules in card:', this.schedules);
    
    this.loading = true;
    const playlistIds = [...new Set(this.schedules.map(s => s.playlist_id))];
    let loadedCount = 0;

    playlistIds.forEach(id => {
      if (!this.playlistNames[id]) {
        this.playlistService.getPlaylist(id).subscribe({
          next: (playlist) => {
            this.playlistNames[id] = playlist.name;
          },
          error: (error) => {
            console.error(`Error loading playlist ${id}:`, error);
            this.playlistNames[id] = 'Unknown Playlist';
          },
          complete: () => {
            loadedCount++;
            if (loadedCount === playlistIds.length) {
              this.loading = false;
            }
          }
        });
      } else {
        loadedCount++;
        if (loadedCount === playlistIds.length) {
          this.loading = false;
        }
      }
    });
  }

  formatTime(time: string): string {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return time;
    }
  }

  getPriorityClass(priority: number): string {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
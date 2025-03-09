import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlaylistSchedule, PlaylistScheduleBase } from '../../../../../models/screen.model';
import { Playlist } from '../../../../../models/playlist.model';
import { PlaylistService } from '../../../../playlists/services/playlist.service';

@Component({
  selector: 'app-add-schedule-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-schedule-form.component.html',
})
export class AddScheduleFormComponent implements OnInit {
  @Input() editMode = false;
  @Input() initialSchedule: PlaylistScheduleBase | null = null;
  @Output() onSubmit = new EventEmitter<PlaylistSchedule>();
  @Output() onCancel = new EventEmitter<void>();

  scheduleForm: FormGroup;
  availablePlaylists: Playlist[] = [];
  loading = false;
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  selectedDays: string[] = [];

  constructor(
    private fb: FormBuilder,
    private playlistService: PlaylistService
  ) {
    this.scheduleForm = this.fb.group({
      playlist_id: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      priority: [2, Validators.required],
      days_of_week: [[]]
    });
  }

  ngOnInit() {
    this.loadPlaylists();

    if (this.editMode && this.initialSchedule) {
      this.scheduleForm.patchValue({
        playlist_id: this.initialSchedule.playlist_id,
        start_time: this.initialSchedule.start_time,
        end_time: this.initialSchedule.end_time,
        priority: this.initialSchedule.priority
      });
      
      // Initialize selectedDays from initialSchedule
      if (this.initialSchedule.days_of_week) {
        this.selectedDays = [...this.initialSchedule.days_of_week];
        console.log('Initial days:', this.selectedDays);
      }
    }
  }

  loadPlaylists() {
    this.loading = true;
    this.playlistService.getPlaylists().subscribe({
      next: (playlists) => {
        this.availablePlaylists = playlists;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading playlists:', error);
        this.loading = false;
      }
    });
  }

  isDaySelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }

  onDayChange(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const day = checkbox.value;
    
    if (checkbox.checked) {
      if (!this.selectedDays.includes(day)) {
        this.selectedDays.push(day);
      }
    } else {
      this.selectedDays = this.selectedDays.filter(d => d !== day);
    }
    
    // Update the form control with the new selectedDays array
    this.scheduleForm.get('days_of_week')?.setValue(this.selectedDays);
    console.log('Updated days:', this.selectedDays);
  }

  handleSubmit() {
    if (this.scheduleForm.valid) {
      const formValues = this.scheduleForm.value;
      const selectedPlaylist = this.availablePlaylists.find(p => p.id === formValues.playlist_id);
      
      if (!selectedPlaylist) {
        console.error('Selected playlist not found');
        return;
      }

      // Make sure we're using the selectedDays array for days_of_week
      const schedule: PlaylistSchedule = {
        playlist_id: formValues.playlist_id,
        playlist_name: selectedPlaylist.name,
        start_time: formValues.start_time,
        end_time: formValues.end_time,
        days_of_week: this.selectedDays,  // Use the array we've been tracking
        priority: formValues.priority
      };

      console.log('Submitting schedule:', schedule);
      this.onSubmit.emit(schedule);
    }
  }
}
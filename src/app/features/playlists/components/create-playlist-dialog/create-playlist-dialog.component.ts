// create-playlist-dialog.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PlaylistService } from '../../services/playlist.service';

@Component({
  selector: 'app-create-playlist-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-playlist-dialog.component.html',
})
export class CreatePlaylistDialogComponent {
  @Output() onCreate = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  playlistForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private playlistService: PlaylistService
  ) {
    this.playlistForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      duration: [10],
      visibility: ['public'],
      autoPlay: [true],
    });
  }

  handleSubmit(): void {
    if (this.playlistForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      this.playlistService
        .createPlaylist({
          ...this.playlistForm.value,
          settings: {
            autoPlay: this.playlistForm.value.autoPlay,
            defaultDuration: this.playlistForm.value.duration,
            loop: false,
            defaultMuted: true,
            transition: { type: 'fade', duration: 0.5 },
            scheduling: { enabled: false, priority: 1 },
          },
        })
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.onCreate.emit();
          },
          error: (error) => {
            console.error('Error creating playlist:', error);
            this.isSubmitting = false;
          },
        });
    }
  }
}

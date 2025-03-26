// src/app/features/sumups/components/sumup-details/sumup-details.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Sumup } from '../../../../models/sumup.model';
import { SumupService } from '../../services/sumup.service';
import { PlaylistService } from '../../../playlists/services/playlist.service';
import { Playlist } from '../../../../models/playlist.model';
import { finalize, forkJoin } from 'rxjs';

@Component({
  selector: 'app-sumup-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './sumup-details.component.html',
})
export class SumupDetailsComponent implements OnInit {
  sumupId: string | null = null;
  sumup: Sumup | null = null;
  availablePlaylists: Playlist[] = [];
  selectedPlaylists: Playlist[] = [];
  loading = true;
  savingChanges = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  editForm: FormGroup;
  isEditMode = false;
  showAddPlaylistDialog = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private sumupService: SumupService,
    private playlistService: PlaylistService
  ) {
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['draft']
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.sumupId = params.get('id');
      if (this.sumupId) {
        this.loadSumup();
      } else {
        this.error = 'No sumup ID provided.';
        this.loading = false;
      }
    });
  }

  loadSumup(): void {
    if (!this.sumupId) return;

    this.loading = true;
    this.error = null;

    // Load sumup and available playlists simultaneously
    forkJoin({
      sumup: this.sumupService.getSumupWithPlaylists(this.sumupId),
      playlists: this.playlistService.getPlaylists()
    }).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (result) => {
        this.sumup = result.sumup;
        this.availablePlaylists = result.playlists;
        
        // Initialize form with sumup data
        this.editForm.patchValue({
          name: this.sumup.name,
          description: this.sumup.description || '',
          status: this.sumup.status
        });
        
        // Set selected playlists
        this.selectedPlaylists = this.sumup.playlists || [];
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.error = 'Failed to load sumup details. Please try again.';
      }
    });
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    
    if (!this.isEditMode && this.sumup) {
      // Reset form when exiting edit mode
      this.editForm.patchValue({
        name: this.sumup.name,
        description: this.sumup.description || '',
        status: this.sumup.status
      });
    }
  }

  saveChanges(): void {
    if (!this.sumupId || !this.editForm.valid || this.savingChanges) return;

    this.savingChanges = true;
    this.error = null;
    this.successMessage = null;

    this.sumupService.updateSumup(this.sumupId, {
      name: this.editForm.value.name,
      description: this.editForm.value.description,
      status: this.editForm.value.status,
      playlist_ids: this.selectedPlaylists.map(p => p.id)
    }).pipe(
      finalize(() => {
        this.savingChanges = false;
      })
    ).subscribe({
      next: (updatedSumup) => {
        this.sumup = updatedSumup;
        this.isEditMode = false;
        this.successMessage = 'Sumup updated successfully!';
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
        
        // Reload sumup with playlists
        this.loadSumup();
      },
      error: (error) => {
        console.error('Error updating sumup:', error);
        this.error = 'Failed to update sumup. Please try again.';
      }
    });
  }

  addPlaylist(): void {
    this.showAddPlaylistDialog = true;
  }

  getUnselectedPlaylists(): Playlist[] {
    if (!this.selectedPlaylists.length) return this.availablePlaylists;
    
    const selectedIds = this.selectedPlaylists.map(p => p.id);
    return this.availablePlaylists.filter(p => !selectedIds.includes(p.id));
  }

  onPlaylistSelected(playlist: Playlist): void {
    if (!this.selectedPlaylists.some(p => p.id === playlist.id)) {
      this.selectedPlaylists = [...this.selectedPlaylists, playlist];
      
      if (this.sumupId && this.sumup) {
        // Update playlist IDs in the sumup
        const playlist_ids = this.selectedPlaylists.map(p => p.id);
        
        this.savingChanges = true;
        this.sumupService.updateSumup(this.sumupId, { playlist_ids }).pipe(
          finalize(() => {
            this.savingChanges = false;
          })
        ).subscribe({
          next: (updatedSumup) => {
            this.sumup = updatedSumup;
            this.successMessage = 'Playlist added successfully!';
            
            setTimeout(() => {
              this.successMessage = null;
            }, 3000);
          },
          error: (error) => {
            console.error('Error adding playlist:', error);
            this.error = 'Failed to add playlist. Please try again.';
            
            // Remove the playlist from the selected list if the update failed
            this.selectedPlaylists = this.selectedPlaylists.filter(p => p.id !== playlist.id);
          }
        });
      }
    }
    
    this.showAddPlaylistDialog = false;
  }

  removePlaylist(playlist: Playlist): void {
    if (!this.sumupId || !this.sumup) return;
    
    this.selectedPlaylists = this.selectedPlaylists.filter(p => p.id !== playlist.id);
    const playlist_ids = this.selectedPlaylists.map(p => p.id);
    
    this.savingChanges = true;
    this.sumupService.updateSumup(this.sumupId, { playlist_ids }).pipe(
      finalize(() => {
        this.savingChanges = false;
      })
    ).subscribe({
      next: (updatedSumup) => {
        this.sumup = updatedSumup;
        this.successMessage = 'Playlist removed successfully!';
        
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (error) => {
        console.error('Error removing playlist:', error);
        this.error = 'Failed to remove playlist. Please try again.';
        
        // Add the playlist back to the selected list if the update failed
        this.loadSumup();
      }
    });
  }

  deleteSumup(): void {
    if (!this.sumupId || !window.confirm('Are you sure you want to delete this sumup? This action cannot be undone.')) {
      return;
    }

    this.savingChanges = true;
    this.sumupService.deleteSumup(this.sumupId).pipe(
      finalize(() => {
        this.savingChanges = false;
      })
    ).subscribe({
      next: () => {
        this.router.navigate(['/sumups']);
      },
      error: (error) => {
        console.error('Error deleting sumup:', error);
        this.error = 'Failed to delete sumup. Please try again.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/sumups']);
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getStatusColor(status: string | undefined): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
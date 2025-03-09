import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Playlist } from '../../models/playlist.model';
import { PlaylistService } from './services/playlist.service';
import { PlaylistCardComponent } from './components/playlist-card/playlist-card.component';
import { CreatePlaylistDialogComponent } from './components/create-playlist-dialog/create-playlist-dialog.component';
import { PlaylistPreviewDialogComponent } from './components/playlist-preview-dialog/playlist-preview-dialog.component';

@Component({
  selector: 'app-playlists',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PlaylistCardComponent,
    CreatePlaylistDialogComponent,
    PlaylistPreviewDialogComponent,
  ],
  templateUrl: './playlists.component.html',
})
export class PlaylistsComponent implements OnInit {
  playlists: Playlist[] = [];
  loading = true;
  error: string | null = null;
  searchQuery = '';
  showCreateDialog = false;
  showPreviewDialog = false;
  selectedPlaylist: Playlist | null = null;

  // Stats for the overview
  stats = {
    totalPlaylists: 0,
    activePlaylists: 0,
    totalDuration: 0,
    lastUpdated: ''
  };

  constructor(
    private playlistService: PlaylistService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPlaylists();
  }

  loadPlaylists(): void {
    this.loading = true;
    this.error = null;

    this.playlistService.getPlaylists().pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (playlists) => {
        this.playlists = playlists;
        this.updateStats();
      },
      error: (error) => {
        console.error('Error loading playlists:', error);
        this.error = 'Failed to load playlists. Please try again.';
      }
    });
  }

  private updateStats(): void {
    this.stats = {
      totalPlaylists: this.playlists.length,
      activePlaylists: this.playlists.filter(p => p.status === 'active').length,
      totalDuration: this.playlists.reduce((total, p) => total + p.duration, 0),
      lastUpdated: this.getLastUpdatedDate()
    };
  }

  private getLastUpdatedDate(): string {
    if (this.playlists.length === 0) return '-';
    const dates = this.playlists.map(p => new Date(p.lastModified));
    const mostRecent = new Date(Math.max(...dates.map(d => d.getTime())));
    return mostRecent.toLocaleDateString();
  }

  get filteredPlaylists(): Playlist[] {
    const query = this.searchQuery.toLowerCase();
    return this.playlists.filter(
      (playlist) =>
        playlist.name.toLowerCase().includes(query) ||
        playlist.description?.toLowerCase().includes(query) ||
        playlist.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  get activePlaylists(): number {
    return this.playlists.filter((p) => p.status === 'active').length;
  }

  get totalDuration(): number {
    return this.playlists.reduce(
      (total, playlist) => total + playlist.duration,
      0
    );
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  createPlaylist(): void {
    this.showCreateDialog = true;
  }

  handleCreatePlaylist(playlist: Playlist): void {
    this.loadPlaylists(); // Reload all playlists after creation
    this.showCreateDialog = false;
  }

  previewPlaylist(playlist: Playlist): void {
    this.selectedPlaylist = playlist;
    this.showPreviewDialog = true;
  }

  editPlaylist(playlist: Playlist): void {
    this.router.navigate(['/playlists', playlist.id]);
  }

  deletePlaylist(playlist: Playlist): void {
    if (confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      this.playlistService.deletePlaylist(playlist.id).subscribe({
        next: () => {
          this.playlists = this.playlists.filter((p) => p.id !== playlist.id);
          this.updateStats();
        },
        error: (error) => {
          console.error('Error deleting playlist:', error);
          // Show error notification
        },
      });
    }
  }

  closePreviewDialog(): void {
    this.showPreviewDialog = false;
    this.selectedPlaylist = null;
  }

  getPlaylistTypeIcon(status: string): string {
    switch (status) {
      case 'active':
        return 'play_circle';
      case 'draft':
        return 'edit_note';
      case 'archived':
        return 'archive';
      default:
        return 'playlist_play';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'draft':
        return 'bg-gray-500';
      case 'archived':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  }

  // Error handling helper
  handleError(error: any): void {
    console.error('Error:', error);
    // Implement error handling/notification
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const updatedDate = new Date(date);
    const seconds = Math.floor((now.getTime() - updatedDate.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  // Sorting methods
  sortByName(): void {
    this.playlists.sort((a, b) => a.name.localeCompare(b.name));
  }

  sortByDate(): void {
    this.playlists.sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  sortByStatus(): void {
    this.playlists.sort((a, b) => a.status.localeCompare(b.status));
  }

  // Filter methods
  filterByStatus(status: 'active' | 'draft' | 'archived'): void {
    this.playlists = this.playlists.filter(p => p.status === status);
  }

  resetFilters(): void {
    this.loadPlaylists();
    this.searchQuery = '';
  }
}
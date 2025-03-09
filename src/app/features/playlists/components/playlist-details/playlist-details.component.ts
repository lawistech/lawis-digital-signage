import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { PlaylistPreviewDialogComponent } from '../playlist-preview-dialog/playlist-preview-dialog.component';
import { PlaylistService } from '../../services/playlist.service';
import { Playlist, PlaylistItem } from '../../../../models/playlist.model';
import { AddContentDialogComponent } from '../add-content-dialog/add-content-dialog.component';
import { EditPlaylistItemDialogComponent } from '../edit-playlist-item-dialog/edit-playlist-item-dialog.component';

@Component({
  selector: 'app-playlist-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DragDropModule,
    PlaylistPreviewDialogComponent,
    AddContentDialogComponent,
    EditPlaylistItemDialogComponent
  ],
  templateUrl: './playlist-details.component.html',
})
export class PlaylistDetailsComponent implements OnInit {
  playlist: Playlist | null = null;
  showAddContent = false;
  showPreviewDialog = false;
  selectedPlaylist: Playlist | null = null;
  currentPlaylist: Playlist | null = null;
  showEditDialog = false;
  editingItem: PlaylistItem | null = null;

  constructor(
    private route: ActivatedRoute,
    private playlistService: PlaylistService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPlaylist(id);
    }
  }

  loadPlaylist(id: string): void {
    this.playlistService.getPlaylist(id).subscribe({
      next: (playlist) => {
        this.playlist = playlist;
      },
      error: (error) => {
        console.error('Error loading playlist:', error);
      },
    });
  }

  previewPlaylist(): void {
    this.selectedPlaylist = this.playlist;
    this.showPreviewDialog = true;
  }
  
  publishPlaylist(): void {
    if (this.playlist) {
      const newStatus = this.playlist.status === 'active' ? 'draft' : 'active';
      this.playlistService
        .updatePlaylistStatus(this.playlist.id, newStatus)
        .subscribe({
          next: (updatedPlaylist) => {
            this.playlist = updatedPlaylist;
          },
          error: (error) => {
            console.error('Error updating playlist status:', error);
          },
        });
    }
  }

  editItem(item: PlaylistItem): void {
    this.editingItem = item;
    this.showEditDialog = true;
  }

  handleEditSave(editedItem: Partial<PlaylistItem>): void {
    if (this.playlist && this.editingItem) {
      // Update the item in the playlist
      this.playlist.items = this.playlist.items.map(item => 
        item.id === this.editingItem?.id 
          ? { 
              ...item, 
              duration: editedItem.duration || item.duration,
              settings: {
                ...item.settings,
                ...editedItem.settings
              }
            }
          : item
      );
  
      // Update the playlist duration
      this.playlist.duration = this.playlist.items.reduce(
        (total, item) => total + item.duration, 0
      );
  
      // Update the playlist in the backend
      this.playlistService.updatePlaylist(this.playlist.id, this.playlist)
        .subscribe({
          next: (updatedPlaylist) => {
            this.playlist = updatedPlaylist;
            this.showEditDialog = false;
            this.editingItem = null;
          },
          error: (error) => {
            console.error('Error updating playlist:', error);
          }
        });
    }
  }

  deleteItem(item: PlaylistItem): void {
    if (
      this.playlist &&
      confirm('Are you sure you want to delete this item?')
    ) {
      this.playlist.items = this.playlist.items.filter((i) => i.id !== item.id);
      this.updatePlaylist();
    }
  }

  drop(event: CdkDragDrop<PlaylistItem[]>): void {
    if (this.playlist && this.playlist.items) {
      const items = [...this.playlist.items];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      this.playlist.items = items;
      this.updatePlaylist();
    }
  }

  updatePlaylist(): void {
    if (this.playlist) {
      this.playlistService
        .updatePlaylist(this.playlist.id, this.playlist)
        .subscribe({
          next: (updatedPlaylist) => {
            this.playlist = updatedPlaylist;
          },
          error: (error) => {
            console.error('Error updating playlist:', error);
          },
        });
    }
  }

  getStatusColor(status: string | undefined): string {
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

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  closePreviewDialog(): void {
    this.showPreviewDialog = false;
    this.selectedPlaylist = null;
  }

  getTotalDuration(): number {
    return (
      this.playlist?.items.reduce((total, item) => total + item.duration, 0) ||
      0
    );
  }

  // Updated to handle multiple items
  handleAddContent(items: PlaylistItem[]): void {
    if (this.playlist && items.length > 0) {
      // Ensure items array exists and is properly structured
      const currentItems = Array.isArray(this.playlist.items) ? this.playlist.items : [];
      
      // Create a new playlist object with the added items
      const updatedPlaylist: Playlist = {
        ...this.playlist,
        items: [...currentItems, ...items].map(playlistItem => ({
          ...playlistItem,
          content: {
            url: playlistItem.content?.url || '',
            thumbnail: playlistItem.content?.thumbnail
          },
          settings: {
            transition: playlistItem.settings?.transition || 'fade',
            transitionDuration: playlistItem.settings?.transitionDuration || 0.5,
            scaling: playlistItem.settings?.scaling || 'fit',
            muted: playlistItem.settings?.muted || false,
            loop: playlistItem.settings?.loop || false
          }
        }))
      };

      // Calculate new total duration
      updatedPlaylist.duration = updatedPlaylist.items.reduce(
        (total, playlistItem) => total + (playlistItem.duration || 0),
        0
      );

      // Update the playlist in Supabase
      this.playlistService.updatePlaylist(this.playlist.id, updatedPlaylist)
        .subscribe({
          next: (result) => {
            this.playlist = result;
            this.showAddContent = false;
          },
          error: (error) => {
            console.error('Error updating playlist:', error);
          }
        });
    }
  }
}
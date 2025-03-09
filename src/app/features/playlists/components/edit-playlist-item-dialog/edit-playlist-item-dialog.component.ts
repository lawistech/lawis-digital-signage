// edit-playlist-item-dialog.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlaylistItem } from '../../../../models/playlist.model';

@Component({
  selector: 'app-edit-playlist-item-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-playlist-item-dialog.component.html'
})
export class EditPlaylistItemDialogComponent {
  @Input({ required: true }) item!: PlaylistItem;
  @Output() save = new EventEmitter<Partial<PlaylistItem>>();
  @Output() cancel = new EventEmitter<void>();

  editedItem: Partial<PlaylistItem>;

  constructor() {
    this.editedItem = {
      duration: this.item?.duration || 10,
      settings: {
        transition: this.item?.settings?.transition || 'fade',
        transitionDuration: this.item?.settings?.transitionDuration || 0.5,
        scaling: this.item?.settings?.scaling || 'fit',
        muted: this.item?.settings?.muted || false,
        loop: this.item?.settings?.loop || false
      }
    };
  }

  ngOnInit() {
    this.editedItem = {
      duration: this.item.duration,
      settings: { ...this.item.settings }
    };
  }

  handleSave(): void {
    this.save.emit(this.editedItem);
  }
}
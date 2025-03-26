// src/app/features/sumups/components/sumup-card/sumup-card.component.ts
import { Component, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Sumup } from '../../../../models/sumup.model';
import { SumupService } from '../../services/sumup.service';

@Component({
  selector: 'app-sumup-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sumup-card.component.html'
})
export class SumupCardComponent {
  @Input({ required: true }) sumup!: Sumup;
  @Output() edit = new EventEmitter<Sumup>();
  @Output() delete = new EventEmitter<Sumup>();
  
  showMenu = false;

  constructor(private sumupService: SumupService) {}

  toggleMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  onEdit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showMenu = false;
    this.edit.emit(this.sumup);
  }

  onToggleStatus(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showMenu = false;
    
    this.sumupService.toggleSumupStatus(this.sumup.id, this.sumup)
      .subscribe({
        next: (updatedSumup) => {
          this.sumup = updatedSumup;
        },
        error: (error) => {
          console.error('Error toggling sumup status:', error);
        }
      });
  }

  onDelete(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showMenu = false;
    
    this.delete.emit(this.sumup);
  }

  getPlaylistCount(): number {
    return this.sumup.playlist_ids?.length || 0;
  }

  getStatusColor(status: string | undefined): string {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-yellow-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  }

  // Click outside handler for menu
  @HostListener('document:click')
  onClickOutside(): void {
    if (this.showMenu) {
      this.showMenu = false;
    }
  }
}
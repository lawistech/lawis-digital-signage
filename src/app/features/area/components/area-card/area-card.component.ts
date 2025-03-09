// area-card.component.ts
import { Component, HostListener, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Area } from '../../../../models/area.model';
import { AreaFacade } from '../../../../core/state/area-state/area.facade';

@Component({
  selector: 'app-area-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './area-card.component.html'
})
export class AreaCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) area!: Area;
  @Output() edit = new EventEmitter<Area>();
  @Output() delete = new EventEmitter<string>();
  
  showMenu = false;
  private destroy$ = new Subject<void>();

  constructor(private areaFacade: AreaFacade) {}

  ngOnInit(): void {
    // Subscribe to any area updates
    this.areaFacade.areas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(areas => {
        const updatedArea = areas.find(a => a.id === this.area.id);
        if (updatedArea) {
          this.area = updatedArea;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  onEdit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showMenu = false;
    this.edit.emit(this.area); // Emit the area object
  }

  onToggleStatus(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showMenu = false;
    
    this.areaFacade.toggleAreaStatus(this.area.id);
  }

  onDelete(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showMenu = false;
    
    if (confirm('Are you sure you want to delete this area?')) {
      this.delete.emit(this.area.id); // Emit the area ID
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
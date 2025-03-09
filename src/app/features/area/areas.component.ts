// areas.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, map, takeUntil } from 'rxjs';
import { Area, CreateAreaDto } from '../../models/area.model';
import { CreateAreaDialogData } from './models/area-dialog.model';
import { Screen } from '../../models/screen.model';

import { AreaCardComponent } from './components/area-card/area-card.component';
import { AreaNameDialogComponent } from './components/dialogs/area-name-dialog.component';
import { AreaFacade } from '../../core/state/area-state/area.facade';
import { ScreenService } from '../screens/services/screen.service';
import { AreaScreensDialogComponent } from "./components/dialogs/area-screens-dialog.component";

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    AreaCardComponent,
    AreaNameDialogComponent,
    AreaScreensDialogComponent
  ],
  templateUrl: './areas.component.html',
})

export class AreasComponent implements OnInit, OnDestroy {
  areas$: Observable<Area[]> = this.areaFacade.areas$;
  loading$ = this.areaFacade.loading$;
  error$ = this.areaFacade.error$;
  
  // Stats observables
  activeAreasCount$ = this.areaFacade.getActiveAreasCount();
  totalScreensCount$ = this.areaFacade.getTotalScreensCount();
  onlineScreensCount$ = this.areaFacade.getOnlineScreensCount();

  searchQuery = '';
  showNameDialog = false;
  showScreensDialog = false;
  tempAreaData: Partial<CreateAreaDialogData> | null = null;
  availableScreens: Screen[] = [];  
  showWelcomeBanner = false;

  private destroy$ = new Subject<void>();

  constructor(
    private areaFacade: AreaFacade,
    private screenService: ScreenService
  ) {}

  ngOnInit(): void {
    this.areaFacade.loadAreas();
    this.loadAvailableScreens();
    
    // Add some helpful feedback if no areas exist
    this.areas$.pipe(takeUntil(this.destroy$)).subscribe(areas => {
      if (areas.length === 0) {
        // Maybe display a welcome message for new users with no areas
        this.showWelcomeBanner = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCreateDialog(): void {
    this.showNameDialog = true;
  }

  closeDialogs(): void {
    this.showNameDialog = false;
    this.showScreensDialog = false;
    this.tempAreaData = null;
  }

  private loadAvailableScreens(): void {
    this.screenService.getScreens().subscribe(screens => {
      // Filter out screens that are already assigned to areas
      this.availableScreens = screens.filter(screen => !screen.area_id);
    });
  }

  onNameDialogNext(data: Partial<CreateAreaDialogData>): void {
    this.tempAreaData = data;
    this.showNameDialog = false;
    this.showScreensDialog = true;
  }

  onCreateArea(data: { screenIds: string[] } & Partial<CreateAreaDialogData>): void {
    if (!data.name || !data.location) {
      console.error('Missing required area data');
      return;
    }
    
    // Check if screenIds is defined, if not set it to an empty array
    const screenIds = data.screenIds || [];
    
    const newArea: CreateAreaDto = {
      name: data.name,
      description: data.description,
      location: data.location,
      screenIds: screenIds // Make sure this property exists in CreateAreaDto
    };

    console.log('Creating area with data:', newArea);

    this.areaFacade.createArea(newArea).subscribe({
      next: () => {
        this.closeDialogs();
        this.loadAvailableScreens();
      },
      error: (error) => {
        console.error('Error creating area:', error);
      },
    });
  }

  editArea(area: Area): void {
    console.log('Editing area:', area);
  }

  deleteArea(id: string): void {
    if (confirm('Are you sure you want to delete this area?')) {
      this.areaFacade.deleteArea(id).subscribe({
        next: () => {
          this.loadAvailableScreens();
        },
        error: (error) => {
          console.error('Error deleting area:', error);
        },
      });
    }
  }

  // Create a filtered areas observable
  get filteredAreas$(): Observable<Area[]> {
    return this.areas$.pipe(
      map(areas => {
        const query = this.searchQuery.toLowerCase();
        return areas.filter(
          (area) =>
            area.name.toLowerCase().includes(query) ||
            area.location.toLowerCase().includes(query) ||
            area.description?.toLowerCase().includes(query)
        );
      })
    );
  }
}
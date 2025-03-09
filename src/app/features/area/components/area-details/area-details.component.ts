// src/app/features/areas/components/area-details/area-details.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, combineLatest, of, from } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { switchMap, takeUntil, map, catchError, finalize, tap } from 'rxjs/operators';

import { Area } from '../../../../models/area.model';
import { Screen } from '../../../../models/screen.model';
import { AreaService } from '../../services/area.service';
import { AreaScreensDialogComponent } from '../dialogs/area-screens-dialog.component';
import { ScreenCardComponent } from '../../../screens/components/screen-card/screen-card.component';
import { PlaylistService } from '../../../playlists/services/playlist.service';
import { Playlist } from '../../../../models/playlist.model';
import { ScreenService } from '../../../screens/services/screen.service';

@Component({
  selector: 'app-area-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    AreaScreensDialogComponent,
    ScreenCardComponent
  ],
  templateUrl: './area-details.component.html'
})
export class AreaDetailsComponent implements OnInit, OnDestroy {
  area: Area | null = null;
  screens: Screen[] = [];
  playlists: Playlist[] = [];
  loading = true;
  error: string | null = null;
  showAddScreenDialog = false;
  searchQuery = '';
  
  // Stats and performance properties
  stats = {
    online: 0,
    offline: 0,
    maintenance: 0,
    error: 0,
    total: 0
  };
  private areaId: string | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private areaService: AreaService,
    private screenService: ScreenService,
    private playlistService: PlaylistService
  ) {}

  ngOnInit(): void {
    this.initializeData();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Unsubscribe from realtime channel
    if (this.realtimeChannel) {
      this.areaService.unsubscribeFromUpdates(this.realtimeChannel);
    }
  }

  private initializeData(): void {
    this.loading = true;
    this.error = null;
    
    const id = this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      map(params => params.get('id'))
    );
    
    id.subscribe(areaId => {
      if (!areaId) {
        this.error = 'No area ID provided';
        this.loading = false;
        return;
      }
      
      this.areaId = areaId;
      
      // Load area details
      this.areaService.getAreaById(areaId).pipe(
        catchError(error => {
          console.error('Error loading area:', error);
          this.error = 'Failed to load area details. Please try again.';
          return of(null);
        })
      ).subscribe(area => {
        this.area = area;
        
        // If we successfully loaded the area, get screens
        if (area) {
          this.loadScreens(areaId);
          this.loadPlaylists(areaId);
          this.setupRealtimeSubscription();
        } else if (!this.error) {
          this.error = 'Area not found';
        }
        
        this.loading = false;
      });
    });
  }
  
  private loadScreens(areaId: string): void {
    this.screenService.getScreens().pipe(
      map(screens => screens.filter(screen => screen.area_id === areaId)),
      takeUntil(this.destroy$)
    ).subscribe(screens => {
      this.screens = screens;
      this.updateStats();
    });
  }
  
  private loadPlaylists(areaId: string): void {
    this.playlistService.getPlaylists().pipe(
      takeUntil(this.destroy$)
    ).subscribe(playlists => {
      this.playlists = playlists;
    });
  }

  // Set up realtime subscriptions to Supabase
  private setupRealtimeSubscription(): void {
    if (!this.areaId) return;

    // Use the AreaService's subscription method
    this.realtimeChannel = this.areaService.subscribeToUpdates((updatedArea) => {
      if (updatedArea.id === this.areaId) {
        console.log('Area update received:', updatedArea);
        this.area = updatedArea;
        
        // Also refresh screens as they might have been updated
        this.refreshScreens();
      }
    });
  }

  private refreshScreens(): void {
    if (!this.areaId) return;
    
    this.screenService.getScreens().pipe(
      map(screens => screens.filter(screen => screen.area_id === this.areaId)),
      takeUntil(this.destroy$)
    ).subscribe(screens => {
      this.screens = screens;
      this.updateStats();
    });
  }

  // Calculate screen statistics
  private updateStats(): void {
    this.stats = {
      online: this.screens.filter(s => s.status === 'online').length,
      offline: this.screens.filter(s => s.status === 'offline').length,
      maintenance: this.screens.filter(s => s.status === 'maintenance').length,
      error: this.screens.filter(s => s.status === 'error').length,
      total: this.screens.length
    };
  }

  // Toggle area status with optimistic UI update
  toggleAreaStatus(): void {
    if (!this.area) return;
    
    const newStatus = this.area.status === 'active' ? 'inactive' : 'active';
    
    // Optimistic update
    const originalStatus = this.area.status;
    this.area = { ...this.area, status: newStatus };
    
    this.areaService.updateArea(this.area.id, { status: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedArea) => {
          this.area = updatedArea;
        },
        error: (error) => {
          console.error('Error updating area status:', error);
          // Revert optimistic update on error
          if (this.area) {
            this.area = { ...this.area, status: originalStatus };
          }
          this.error = 'Failed to update area status. Please try again.';
        }
      });
  }

  refreshData(): void {
    this.initializeData();
  }

  openAddScreenDialog(): void {
    this.showAddScreenDialog = true;
  }

  closeAddScreenDialog(refreshData: boolean = false): void {
    this.showAddScreenDialog = false;
    if (refreshData) {
      this.refreshData();
    }
  }

  editScreen(screen: Screen): void {
    this.router.navigate(['/screens', screen.id]);
  }

  getStatusColor(status: 'active' | 'inactive'): string {
    return status === 'active' ? 'bg-green-500' : 'bg-gray-400';
  }

  getScreenStatusCount(status: string): number {
    return this.screens.filter(screen => screen.status === status).length;
  }

  goBack(): void {
    this.router.navigate(['/areas']);
  }

  get filteredScreens(): Screen[] {
    if (!this.searchQuery.trim()) return this.screens;
    
    const query = this.searchQuery.toLowerCase();
    return this.screens.filter(
      (screen) =>
        screen.name.toLowerCase().includes(query) ||
        screen.status.toLowerCase().includes(query) ||
        (screen.tags && screen.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }

  addScreenToArea(screenId: string): void {
    if (!this.areaId) return;
    
    this.screenService.updateScreen(screenId, { area_id: this.areaId }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error adding screen to area:', error);
        this.error = 'Failed to add screen to area. Please try again.';
        return of(null);
      })
    ).subscribe(updatedScreen => {
      if (updatedScreen) {
        // Check if screen already exists in our list
        if (!this.screens.some(s => s.id === updatedScreen.id)) {
          this.screens = [...this.screens, updatedScreen];
          this.updateStats();
        }
      }
    });
  }
}
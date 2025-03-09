// core/state/area.facade.ts
import { Injectable } from '@angular/core';
import { Observable, catchError, finalize, map, tap } from 'rxjs';
import { AreaStateService } from './area-state.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AreaService } from '../../../features/area/services/area.service';
import { Area, CreateAreaDto } from '../../../models/area.model';

@Injectable({
  providedIn: 'root'
})
export class AreaFacade {
  areas$ = this.areaState.selectAreas();
  selectedArea$ = this.areaState.selectSelectedArea();
  loading$ = this.areaState.selectLoading();
  error$ = this.areaState.selectError();
  private realtimeChannel: RealtimeChannel | null = null;

  constructor(
    private areaService: AreaService,
    private areaState: AreaStateService
  ) {
    this.setupRealtimeSubscription();
  }

  // Load all areas
  loadAreas(): void {
    this.areaState.setLoading(true);
    this.areaService.getAreas().pipe(
      tap(areas => this.areaState.setAreas(areas)),
      catchError(error => {
        this.areaState.setError(error.message);
        throw error;
      }),
      finalize(() => this.areaState.setLoading(false))
    ).subscribe();
  }

  // Create new area
  createArea(area: CreateAreaDto & { screenIds?: string[] }): Observable<Area> {
    this.areaState.setLoading(true);
    return this.areaService.createArea(area).pipe(
      tap(newArea => {
        this.areaState.addArea(newArea);
      }),
      catchError(error => {
        this.areaState.setError(error.message);
        throw error;
      }),
      finalize(() => this.areaState.setLoading(false))
    );
  }

  // Update existing area
  updateArea(id: string, updates: Partial<Area>): Observable<Area> {
    this.areaState.setLoading(true);
    return this.areaService.updateArea(id, updates).pipe(
      tap(updatedArea => {
        this.areaState.updateArea(id, updatedArea);
      }),
      catchError(error => {
        this.areaState.setError(error.message);
        throw error;
      }),
      finalize(() => this.areaState.setLoading(false))
    );
  }

  // Delete area
  deleteArea(id: string): Observable<void> {
    this.areaState.setLoading(true);
    return this.areaService.deleteArea(id).pipe(
      tap(() => {
        this.areaState.removeArea(id);
      }),
      catchError(error => {
        this.areaState.setError(error.message);
        throw error;
      }),
      finalize(() => this.areaState.setLoading(false))
    );
  }

  // Toggle area status
  toggleAreaStatus(id: string): void {
    const area = this.areaState.getAreaById(id);
    if (area) {
      const newStatus = area.status === 'active' ? 'inactive' : 'active';
      this.updateArea(id, { status: newStatus }).subscribe();
    }
  }

  // Helper methods for counts and filtering
  getActiveAreasCount(): Observable<number> {
    return this.areas$.pipe(
      map(areas => areas.filter(area => area.status === 'active').length)
    );
  }

  getTotalScreensCount(): Observable<number> {
    return this.areas$.pipe(
      map(areas => areas.reduce((total, area) => total + area.stats.totalScreens, 0))
    );
  }

  getOnlineScreensCount(): Observable<number> {
    return this.areas$.pipe(
      map(areas => areas.reduce((total, area) => total + area.stats.onlineScreens, 0))
    );
  }

  // Setup realtime subscription
  private setupRealtimeSubscription(): void {
    this.realtimeChannel = this.areaService.subscribeToUpdates((area) => {
      if (area) {
        const existingArea = this.areaState.getAreaById(area.id);
        if (existingArea) {
          this.areaState.updateArea(area.id, area);
        } else {
          this.areaState.addArea(area);
        }
      }
    });
  }

  // Cleanup
  cleanup(): void {
    if (this.realtimeChannel) {
      this.areaService.unsubscribeFromUpdates(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  // Set selected area
  selectArea(area: Area | null): void {
    this.areaState.setSelectedArea(area);
  }

  // Clear selected area
  clearSelectedArea(): void {
    this.areaState.setSelectedArea(null);
  }

  // Get areas by status
  getAreasByStatus(status: 'active' | 'inactive'): Observable<Area[]> {
    return this.areas$.pipe(
      map(areas => areas.filter(area => area.status === status))
    );
  }

  // Clear any error state
  clearError(): void {
    this.areaState.setError(null);
  }
}
// core/state/area-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Area } from '../../../models/area.model';

interface AreaState {
  areas: Area[];
  selectedArea: Area | null;
  loading: boolean;
  error: string | null;
}

const initialState: AreaState = {
  areas: [],
  selectedArea: null,
  loading: false,
  error: null
};

@Injectable({
  providedIn: 'root'
})
export class AreaStateService {
  private state = new BehaviorSubject<AreaState>(initialState);

  // Selectors
  selectAreas(): Observable<Area[]> {
    return new Observable<Area[]>(observer => {
      this.state.subscribe(state => observer.next(state.areas));
    });
  }

  selectSelectedArea(): Observable<Area | null> {
    return new Observable<Area | null>(observer => {
      this.state.subscribe(state => observer.next(state.selectedArea));
    });
  }

  selectLoading(): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.state.subscribe(state => observer.next(state.loading));
    });
  }

  selectError(): Observable<string | null> {
    return new Observable<string | null>(observer => {
      this.state.subscribe(state => observer.next(state.error));
    });
  }

  // Actions
  setAreas(areas: Area[]): void {
    this.state.next({
      ...this.state.value,
      areas
    });
  }

  setSelectedArea(area: Area | null): void {
    this.state.next({
      ...this.state.value,
      selectedArea: area
    });
  }

  addArea(area: Area): void {
    this.state.next({
      ...this.state.value,
      areas: [...this.state.value.areas, area]
    });
  }

  updateArea(id: string, updatedArea: Area): void {
    this.state.next({
      ...this.state.value,
      areas: this.state.value.areas.map(area => 
        area.id === id ? { ...area, ...updatedArea } : area
      )
    });
  }

  removeArea(id: string): void {
    this.state.next({
      ...this.state.value,
      areas: this.state.value.areas.filter(area => area.id !== id)
    });
  }

  setLoading(loading: boolean): void {
    this.state.next({
      ...this.state.value,
      loading
    });
  }

  setError(error: string | null): void {
    this.state.next({
      ...this.state.value,
      error
    });
  }

  // Helper methods
  getAreaById(id: string): Area | undefined {
    return this.state.value.areas.find(area => area.id === id);
  }
}
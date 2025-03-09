// screen.service.ts
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { CreateScreenDto, Screen } from '../../../models/screen.model';
import { SupabaseScreenService } from '../../../core/services/supabase-screen.service';

@Injectable({
  providedIn: 'root',
})
export class ScreenService {
  // Change the type to NodeJS.Timeout
  private scheduleCheckers = new Map<string, NodeJS.Timeout>();

  constructor(private supabaseService: SupabaseScreenService) {}

  getScreens(): Observable<Screen[]> {
    return this.supabaseService.getScreens();
  }

  getScreen(id: string): Observable<Screen> {
    return this.supabaseService.getScreen(id);
  }

  createScreen(screen: CreateScreenDto): Observable<Screen> {
    return this.supabaseService.createScreen(screen);
  }

  updateScreen(id: string, updates: Partial<Screen>): Observable<Screen> {
    return this.supabaseService.updateScreen(id, updates);
  }

  deleteScreen(id: string): Observable<void> {
    return this.supabaseService.deleteScreen(id);
  }

  // Add schedule checking methods
  async updateCurrentPlaylistFromSchedule(screenId: string): Promise<void> {
    return this.supabaseService.updateCurrentPlaylistFromSchedule(screenId);
  }

  startScheduleChecker(screenId: string): void {
    this.stopScheduleChecker(screenId);
  
    // Check immediately
    this.updateCurrentPlaylistFromSchedule(screenId);
  
    // Check every 30 seconds to ensure smooth transitions
    const intervalId = setInterval(() => {
      this.updateCurrentPlaylistFromSchedule(screenId);
    }, 30000); // 30 seconds
  
    this.scheduleCheckers.set(screenId, intervalId);
  }

  stopScheduleChecker(screenId: string): void {
    const intervalId = this.scheduleCheckers.get(screenId);
    if (intervalId) {
      clearInterval(intervalId);
      this.scheduleCheckers.delete(screenId);
    }
  }

  // Clean up all schedule checkers
  cleanupScheduleCheckers(): void {
    this.scheduleCheckers.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.scheduleCheckers.clear();
  }
}
// src/app/features/sumups/services/sumup.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, throwError, catchError } from 'rxjs';
import { Sumup, CreateSumupDto, UpdateSumupDto } from '../../../models/sumup.model';
import { SupabaseSumupService } from '../../../core/services/supabase-sumup.service';

@Injectable({
  providedIn: 'root'
})
export class SumupService {
  constructor(private supabaseSumupService: SupabaseSumupService) {}

  getSumups(): Observable<Sumup[]> {
    return this.supabaseSumupService.getSumups();
  }

  getSumup(id: string): Observable<Sumup> {
    return this.supabaseSumupService.getSumup(id);
  }

  getSumupWithPlaylists(id: string): Observable<Sumup> {
    return this.supabaseSumupService.getSumupWithPlaylists(id);
  }

  createSumup(sumup: CreateSumupDto): Observable<Sumup> {
    return from(this.supabaseSumupService.createSumup(sumup)).pipe(
      catchError(error => {
        console.error('Error creating sumup:', error);
        return throwError(() => error);
      })
    );
  }

  updateSumup(id: string, updates: UpdateSumupDto): Observable<Sumup> {
    return from(this.supabaseSumupService.updateSumup(id, updates)).pipe(
      catchError(error => {
        console.error('Error updating sumup:', error);
        return throwError(() => error);
      })
    );
  }

  deleteSumup(id: string): Observable<void> {
    return from(this.supabaseSumupService.deleteSumup(id)).pipe(
      catchError(error => {
        console.error('Error deleting sumup:', error);
        return throwError(() => error);
      })
    );
  }

  toggleSumupStatus(id: string, sumup: Sumup): Observable<Sumup> {
    const newStatus = sumup.status === 'active' ? 'inactive' : 'active';
    return this.updateSumup(id, { status: newStatus });
  }
}
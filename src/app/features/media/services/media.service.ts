import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private apiUrl = `test/media`;

  constructor(private http: HttpClient) {}

  getMedia(): Observable<any[]> {
    // Implement actual API call
    return of([]);
  }

  uploadMedia(files: File[]): Observable<any[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    return this.http.post<any[]>(`${this.apiUrl}/upload`, formData);
  }

  deleteMedia(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

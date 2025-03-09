import { Injectable } from '@angular/core';
import { StateService } from './state.service';
import { AreaService } from '../../features/area/services/area.service';
import { ScreenService } from '../../features/screens/services/screen.service';
import { PlaylistService } from '../../features/playlists/services/playlist.service';
import { catchError, finalize, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FacadeService {
  constructor(
    private state: StateService,
    private areaService: AreaService,
    private screenService: ScreenService,
    private playlistService: PlaylistService
  ) {}

  // Areas
  loadAreas(): void {
    this.state.setLoading('areas', true);
    this.areaService
      .getAreas()
      .pipe(
        tap((areas) => this.state.setAreas(areas)),
        catchError((error) => {
          this.state.setError('areas', error.message);
          return of([]);
        }),
        finalize(() => this.state.setLoading('areas', false))
      )
      .subscribe();
  }

  createArea(area: any) {
    this.state.setLoading('areas', true);
    return this.areaService.createArea(area).pipe(
      tap((newArea) => this.state.addArea(newArea)),
      catchError((error) => {
        this.state.setError('areas', error.message);
        return of(null);
      }),
      finalize(() => this.state.setLoading('areas', false))
    );
  }

  // Screens
  loadScreens(): void {
    this.state.setLoading('screens', true);
    this.screenService
      .getScreens()
      .pipe(
        tap((screens) => this.state.setScreens(screens)),
        catchError((error) => {
          this.state.setError('screens', error.message);
          return of([]);
        }),
        finalize(() => this.state.setLoading('screens', false))
      )
      .subscribe();
  }

  createScreen(screen: any) {
    this.state.setLoading('screens', true);
    return this.screenService.createScreen(screen).pipe(
      tap((newScreen) => this.state.addScreen(newScreen)),
      catchError((error) => {
        this.state.setError('screens', error.message);
        return of(null);
      }),
      finalize(() => this.state.setLoading('screens', false))
    );
  }

  // Playlists
  loadPlaylists(): void {
    this.state.setLoading('playlists', true);
    this.playlistService
      .getPlaylists()
      .pipe(
        tap((playlists) => this.state.setPlaylists(playlists)),
        catchError((error) => {
          this.state.setError('playlists', error.message);
          return of([]);
        }),
        finalize(() => this.state.setLoading('playlists', false))
      )
      .subscribe();
  }

  createPlaylist(playlist: any) {
    this.state.setLoading('playlists', true);
    return this.playlistService.createPlaylist(playlist).pipe(
      tap((newPlaylist) => this.state.addPlaylist(newPlaylist)),
      catchError((error) => {
        this.state.setError('playlists', error.message);
        return of(null);
      }),
      finalize(() => this.state.setLoading('playlists', false))
    );
  }
}
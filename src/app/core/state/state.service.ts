
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Area } from '../../models/area.model';
import { Screen } from '../../models/screen.model';
import { Playlist } from '../../models/playlist.model';

interface AppState {
  areas: Area[];
  screens: Screen[];
  playlists: Playlist[];
  loading: {
    areas: boolean;
    screens: boolean;
    playlists: boolean;
  };
  error: {
    areas: string | null;
    screens: string | null;
    playlists: string | null;
  };
}

const initialState: AppState = {
  areas: [],
  screens: [],
  playlists: [],
  loading: {
    areas: false,
    screens: false,
    playlists: false,
  },
  error: {
    areas: null,
    screens: null,
    playlists: null,
  },
};

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private state = new BehaviorSubject<AppState>(initialState);

  // Areas
  getAreas(): Observable<Area[]> {
    return this.state.pipe(map((state) => state.areas));
  }

  getArea(id: string): Observable<Area | undefined> {
    return this.state.pipe(
      map((state) => state.areas.find((area) => area.id === id))
    );
  }

  setAreas(areas: Area[]): void {
    this.state.next({
      ...this.state.value,
      areas,
    });
  }

  addArea(area: Area): void {
    this.state.next({
      ...this.state.value,
      areas: [...this.state.value.areas, area],
    });
  }

  updateArea(id: string, area: Partial<Area>): void {
    const areas = this.state.value.areas.map((a) =>
      a.id === id ? { ...a, ...area } : a
    );
    this.state.next({
      ...this.state.value,
      areas,
    });
  }

  deleteArea(id: string): void {
    this.state.next({
      ...this.state.value,
      areas: this.state.value.areas.filter((a) => a.id !== id),
    });
  }

  // Screens
  getScreens(): Observable<Screen[]> {
    return this.state.pipe(map((state) => state.screens));
  }

  getScreen(id: string): Observable<Screen | undefined> {
    return this.state.pipe(
      map((state) => state.screens.find((screen) => screen.id === id))
    );
  }

  setScreens(screens: Screen[]): void {
    this.state.next({
      ...this.state.value,
      screens,
    });
  }

  addScreen(screen: Screen): void {
    this.state.next({
      ...this.state.value,
      screens: [...this.state.value.screens, screen],
    });
  }

  updateScreen(id: string, screen: Partial<Screen>): void {
    const screens = this.state.value.screens.map((s) =>
      s.id === id ? { ...s, ...screen } : s
    );
    this.state.next({
      ...this.state.value,
      screens,
    });
  }

  deleteScreen(id: string): void {
    this.state.next({
      ...this.state.value,
      screens: this.state.value.screens.filter((s) => s.id !== id),
    });
  }

  // Playlists
  getPlaylists(): Observable<Playlist[]> {
    return this.state.pipe(map((state) => state.playlists));
  }

  getPlaylist(id: string): Observable<Playlist | undefined> {
    return this.state.pipe(
      map((state) => state.playlists.find((playlist) => playlist.id === id))
    );
  }

  setPlaylists(playlists: Playlist[]): void {
    this.state.next({
      ...this.state.value,
      playlists,
    });
  }

  addPlaylist(playlist: Playlist): void {
    this.state.next({
      ...this.state.value,
      playlists: [...this.state.value.playlists, playlist],
    });
  }

  updatePlaylist(id: string, playlist: Partial<Playlist>): void {
    const playlists = this.state.value.playlists.map((p) =>
      p.id === id ? { ...p, ...playlist } : p
    );
    this.state.next({
      ...this.state.value,
      playlists,
    });
  }

  deletePlaylist(id: string): void {
    this.state.next({
      ...this.state.value,
      playlists: this.state.value.playlists.filter((p) => p.id !== id),
    });
  }

  // Loading States
  setLoading(key: keyof AppState['loading'], loading: boolean): void {
    this.state.next({
      ...this.state.value,
      loading: {
        ...this.state.value.loading,
        [key]: loading,
      },
    });
  }

  getLoading(key: keyof AppState['loading']): Observable<boolean> {
    return this.state.pipe(map((state) => state.loading[key]));
  }

  // Error States
  setError(key: keyof AppState['error'], error: string | null): void {
    this.state.next({
      ...this.state.value,
      error: {
        ...this.state.value.error,
        [key]: error,
      },
    });
  }

  getError(key: keyof AppState['error']): Observable<string | null> {
    return this.state.pipe(map((state) => state.error[key]));
  }
}

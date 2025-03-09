import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'areas',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/components/login/login.component')
          .then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/components/register/register.component')
          .then(m => m.RegisterComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/components/reset-password/reset-password.component')
          .then(m => m.ResetPasswordComponent)
      },
      {
        path: 'callback',
        loadComponent: () => import('./features/auth/components/auth-callback/auth-callback.component')
          .then(m => m.AuthCallbackComponent)
      }
    ]
  },
  {
    path: 'areas',
    canActivate: [() => new AuthGuard().canActivate()], 
    loadComponent: () => import('./features/area/areas.component')
      .then(m => m.AreasComponent)
  },
  {
    path: 'areas/:id',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/area/components/area-details/area-details.component').then(m => m.AreaDetailsComponent)
  },
  {
    path: 'screens',
    canActivate: [() => new AuthGuard().canActivate()],
    loadComponent: () => import('./features/screens/components/screens.component')
      .then(m => m.ScreensComponent)
  },
  {
    path: 'screens/:id',
    canActivate: [() => new AuthGuard().canActivate()],
    loadComponent: () => import('./features/screens/components/screen-details/screen-details.component')
      .then(m => m.ScreenDetailsComponent)
  },
  {
    path: 'playlists',
    canActivate: [() => new AuthGuard().canActivate()],
    loadComponent: () => import('./features/playlists/playlists.component')
      .then(m => m.PlaylistsComponent)
  },
  {
    path: 'playlists/:id',
    canActivate: [() => new AuthGuard().canActivate()],
    loadComponent: () => import('./features/playlists/components/playlist-details/playlist-details.component')
      .then(m => m.PlaylistDetailsComponent)
  },
  {
    path: 'media',
    canActivate: [() => new AuthGuard().canActivate()],
    loadComponent: () => import('./features/media/media.component')
      .then(m => m.MediaComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./shared/components/unauthorized/unauthorized.component')
      .then(m => m.UnauthorizedComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component')
      .then(m => m.NotFoundComponent)
  }
];
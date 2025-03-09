// layout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationItem } from './navigation.interface';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit, OnDestroy {
  isSidebarOpen = false;
  isAuthenticated = false;
  private resizeListener: () => void;

  navigationItems: NavigationItem[] = [
    { path: '/areas', label: 'Areas', icon: 'dashboard' },
    { path: '/screens', label: 'Screens', icon: 'monitor' },
    { path: '/playlists', label: 'Playlists', icon: 'playlist_play' },
    { path: '/media', label: 'Media', icon: 'movie' },
  ];

  constructor(private authService: SupabaseAuthService) {
    this.resizeListener = () => {
      if (window.innerWidth >= 1024) {
        this.isSidebarOpen = true;
      } else {
        this.isSidebarOpen = false;
      }
    };
  }

  ngOnInit(): void {
    // Check authentication status
    this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
    });

    // Initialize sidebar state based on screen size
    this.resizeListener();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  logout(): void {
    // Implement logout logic using SupabaseAuthService
    this.authService.signOut();
  }
}
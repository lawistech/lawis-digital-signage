// shared/components/layout/layout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationItem } from './navigation.interface';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { User } from '@supabase/supabase-js';
import { ProfileComponent } from '../profile/profile.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ProfileComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit, OnDestroy {
  isSidebarOpen = false;
  isAuthenticated = false;
  currentUser: User | null = null;
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
    // Check authentication status and get user info
    this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.currentUser = user;
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
    this.authService.signOut().subscribe({
      next: () => {
        // Redirect is handled in the auth service
      },
      error: (error) => {
        console.error('Error during logout:', error);
      }
    });
  }
  
  // Helper method to get user's email or name for display
  getUserDisplayName(): string {
    if (!this.currentUser) return '';
    
    // Use user metadata if available
    if (this.currentUser.user_metadata && this.currentUser.user_metadata['name']) {
      return this.currentUser.user_metadata['name'];
    }
    
    // Fall back to email
    return this.currentUser.email || '';
  }
  
  // Helper to get first letter of name/email for avatar
  getUserInitial(): string {
    const displayName = this.getUserDisplayName();
    return displayName ? displayName.charAt(0).toUpperCase() : '?';
  }
}
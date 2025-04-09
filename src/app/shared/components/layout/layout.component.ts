// shared/components/layout/layout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NavigationItem } from './navigation.interface';
import { SupabaseAuthService, UserProfile } from '../../../core/services/supabase-auth.service';
import { User } from '@supabase/supabase-js';
import { Subject, filter, takeUntil } from 'rxjs';

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
  currentUser: User | null = null;
  userProfile: UserProfile | null = null;
  currentRoute: string = '';
  private destroy$ = new Subject<void>();
  private resizeListener: () => void;

  // Base navigation items without the conditional ones
  private baseNavigationItems: NavigationItem[] = [
    { path: '/areas', label: 'Areas', icon: 'dashboard', notifications: 0 },
    { path: '/screens', label: 'Screens', icon: 'monitor', notifications: 0 },
    { path: '/playlists', label: 'Playlists', icon: 'playlist_play', notifications: 0 },
    { path: '/media', label: 'Media', icon: 'movie', notifications: 0 },
  ];

  // Calculated navigation items property based on user email
  get navigationItems(): NavigationItem[] {
    // Create a copy of the base items to work with
    const items = [...this.baseNavigationItems];
    
    // Add sumups only for the specific admin email
    if (this.currentUser?.email === 'admin1@resay.co.uk') {
      // Insert at the appropriate position (after playlists)
      items.splice(3, 0, { 
        path: '/sumups', 
        label: 'Sumups', 
        icon: 'view_carousel', 
        notifications: 0 
      });
    }
    
    return items;
  }

  constructor(
    private authService: SupabaseAuthService,
    private router: Router
  ) {
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
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.isAuthenticated = !!user;
      this.currentUser = user;
    });

    // Subscribe to user profile changes
    this.authService.userProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.userProfile = profile;
      });

    // Track current route for active state
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.currentRoute = event.urlAfterRedirects || event.url;
      
      // Close sidebar on navigation on mobile
      if (window.innerWidth < 1024) {
        this.isSidebarOpen = false;
      }
      
      // For demo purposes, update mock notifications
      this.updateMockNotifications();
    });

    // Initialize sidebar state based on screen size
    this.resizeListener();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
    this.destroy$.next();
    this.destroy$.complete();
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
  
  getUserDisplayName(): string {
    if (this.userProfile?.name) {
      return this.userProfile.name;
    }
    
    return this.currentUser?.email || 'User';
  }
  
  getUserInitial(): string {
    const displayName = this.getUserDisplayName();
    return displayName ? displayName.charAt(0).toUpperCase() : '?';
  }
  
  isActiveRoute(path: string): boolean {
    // For the specific case of profile links
    if (path === '/profile') {
      // Only highlight "Account" when exactly on the profile page, not on subpages
      return this.currentRoute === '/profile';
    } 
    else if (path === '/profile/plan') {
      // Only highlight "Subscription" when on the plan page
      return this.currentRoute === '/profile/plan';
    }
    // For other routes (areas, screens, etc.), maintain existing behavior
    else {
      // Check exact matches first
      if (this.currentRoute === path) {
        return true;
      }
      
      // Then check child routes (e.g., /areas/123 should highlight "Areas")
      return this.currentRoute.startsWith(`${path}/`);
    }
  }
  
  formatStorage(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  getUsagePercentage(usage: number, limit: number): number {
    const percentage = (usage / limit) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  }

  getUsageBarClass(usage: number, limit: number): string {
    const percentage = (usage / limit) * 100;
    
    if (percentage >= 90) {
      return 'bg-red-500'; // Critical
    } else if (percentage >= 75) {
      return 'bg-amber-500'; // Warning
    } else {
      return 'bg-blue-500'; // Good
    }
  }
  
  getNotificationCount(path: string): number {
    const item = this.navigationItems.find(item => item.path === path);
    return item && item.notifications !== undefined ? item.notifications : 0;
  }
  
  // For demo purposes only - in real app, this would be replaced with actual notifications
  private updateMockNotifications(): void {
    // Reset all notifications for base items
    this.baseNavigationItems.forEach(item => item.notifications = 0);
    
    // Add some mock notifications based on the route
    if (this.currentRoute.includes('areas')) {
      const screensItem = this.baseNavigationItems.find(item => item.path === '/screens');
      if (screensItem) screensItem.notifications = 2;
    } else if (this.currentRoute.includes('screens')) {
      const playlistsItem = this.baseNavigationItems.find(item => item.path === '/playlists');
      if (playlistsItem) playlistsItem.notifications = 1;
    }
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { SupabaseAuthService } from './core/services/supabase-auth.service';
import { filter, take } from 'rxjs/operators';
import { LayoutComponent } from './shared/components/layout/layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LayoutComponent],
  template: `
    <!-- Use layout component for normal routes, but not for preview and auth routes -->
    <ng-container *ngIf="!isPublicRoute; else directOutlet">
      <app-layout *ngIf="isAuthenticated; else directOutlet">
        <router-outlet></router-outlet>
      </app-layout>
    </ng-container>
    
    <ng-template #directOutlet>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'Digital Signage';
  isAuthenticated = false;
  isPublicRoute = false;
  
  constructor(
    private authService: SupabaseAuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check authentication status on load
    this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
      
      // If not authenticated and not on an auth page or public route, redirect to login
      if (!this.isAuthenticated && !this.isPublicRoute) {
        this.router.events.pipe(
          filter(event => event instanceof NavigationEnd),
          take(1)
        ).subscribe((event: any) => {
          const currentUrl = event.urlAfterRedirects || event.url;
          if (!currentUrl.includes('/auth/') && !currentUrl.includes('/preview/')) {
            this.router.navigate(['/auth/login']);
          }
        });
      }
    });
    
    // Listen to route changes to determine if we're on a public route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const currentUrl = event.urlAfterRedirects || event.url;
      this.isPublicRoute = currentUrl.includes('/preview/');
    });
  }
}
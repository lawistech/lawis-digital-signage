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
    <app-layout *ngIf="isAuthenticated; else directRouter">
      <router-outlet></router-outlet>
    </app-layout>
    
    <ng-template #directRouter>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'Digital Signage';
  isAuthenticated = false;

  constructor(
    private authService: SupabaseAuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check authentication status on load
    this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
      
      // If not authenticated and not on an auth page, redirect to login
      if (!this.isAuthenticated) {
        this.router.events.pipe(
          filter(event => event instanceof NavigationEnd),
          take(1)
        ).subscribe((event: any) => {
          const currentUrl = event.urlAfterRedirects || event.url;
          if (!currentUrl.includes('/auth/')) {
            this.router.navigate(['/auth/login']);
          }
        });
      }
    });
  }
}
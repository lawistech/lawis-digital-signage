import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseAuthService } from '../../../../core/services/supabase-auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10">
          <div class="text-center">
            <span class="material-icons text-4xl text-blue-500 animate-spin">
              refresh
            </span>
            <p class="mt-4 text-gray-600">
              Completing authentication...
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: SupabaseAuthService
  ) {}

  ngOnInit() {
    // Handle the auth callback (email verification, OAuth, etc.)
    this.route.queryParams.subscribe(params => {
      const { access_token, refresh_token, error } = params;
      
      if (error) {
        // Handle auth error
        this.router.navigate(['/auth/login'], {
          queryParams: { error: error }
        });
        return;
      }
      
      if (access_token && refresh_token) {
        // Handle token-based auth callback
        this.authService.handleAuthCallback(access_token, refresh_token)
          .subscribe({
            next: () => this.router.navigate(['/']),
            error: (error) => {
              console.error('Auth callback error:', error);
              this.router.navigate(['/auth/login'], {
                queryParams: { error: 'Failed to complete authentication' }
              });
            }
          });
      } else {
        // No tokens found, redirect to login
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
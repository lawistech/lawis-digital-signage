// src/app/shared/components/profile/profile.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseAuthService, UserProfile } from '../../../core/services/supabase-auth.service';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-4 border-t border-gray-200">
      <div class="flex flex-col space-y-4">
        <!-- Profile Summary -->
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            <div class="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-medium">
              {{ getUserInitial() }}
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 truncate">{{ getUserDisplayName() }}</p>
            <p class="text-xs text-gray-500">{{ userProfile?.plan || 'Free Plan' }}</p>
          </div>
        </div>

        <!-- Usage Limits -->
        <div class="space-y-3">
          <!-- Screens Usage -->
          <div>
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Screens</span>
              <span>{{ userProfile?.screenUsage || 0 }} / {{ userProfile?.screenLimit || 5 }}</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-300"
                [class]="getUsageBarClass(userProfile?.screenUsage || 0, userProfile?.screenLimit || 5)"
                [style.width.%]="getUsagePercentage(userProfile?.screenUsage || 0, userProfile?.screenLimit || 5)"
              ></div>
            </div>
          </div>
          
          <!-- Storage Usage -->
          <div>
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Storage</span>
              <span>{{ formatStorage(userProfile?.storageUsage || 0) }} / {{ formatStorage(userProfile?.storageLimit || 500 * 1024 * 1024) }}</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-300"
                [class]="getUsageBarClass(userProfile?.storageUsage || 0, userProfile?.storageLimit || 500 * 1024 * 1024)"
                [style.width.%]="getUsagePercentage(userProfile?.storageUsage || 0, userProfile?.storageLimit || 500 * 1024 * 1024)"
              ></div>
            </div>
          </div>
        </div>

        <!-- Account Links -->
        <div class="pt-2 space-y-1">
          <a 
            routerLink="/profile" 
            class="flex items-center px-3 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
          >
            <span class="material-icons text-gray-400 mr-2 text-sm">account_circle</span>
            Account Settings
          </a>
          <a 
            routerLink="/profile/plan" 
            class="flex items-center px-3 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
          >
            <span class="material-icons text-gray-400 mr-2 text-sm">upgrade</span>
            Upgrade Plan
          </a>
        </div>

        <!-- Sign Out Button -->
        <button
          (click)="logout()"
          class="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
        >
          <span class="material-icons text-gray-400 mr-2 text-sm">logout</span>
          Sign out
        </button>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  userProfile: UserProfile | null = null;

  constructor(private authService: SupabaseAuthService) {}

  ngOnInit(): void {
    // Subscribe to user profile changes
    this.authService.userProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.userProfile = profile;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getUserDisplayName(): string {
    return this.userProfile?.name || this.authService.getCurrentUser()?.email || 'User';
  }

  getUserInitial(): string {
    const displayName = this.getUserDisplayName();
    return displayName ? displayName.charAt(0).toUpperCase() : '?';
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
      return 'bg-green-500'; // Good
    }
  }

  logout(): void {
    this.authService.signOut().subscribe();
  }
}
// src/app/features/profile/profile-settings.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupabaseAuthService, UserProfile } from '../../core/services/supabase-auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8">
      <h1 class="text-2xl font-semibold text-gray-900 mb-6">Account Settings</h1>
      
      <!-- Profile details -->
      <div class="mb-8">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
        
        <form [formGroup]="profileForm" (ngSubmit)="onSaveProfile()" class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input 
              type="text" 
              id="name" 
              formControlName="name"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              id="email" 
              formControlName="email"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              [disabled]="true"
            />
            <p class="mt-1 text-sm text-gray-500">Email cannot be changed</p>
          </div>
          
          <div>
            <label for="company" class="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input 
              type="text" 
              id="company" 
              formControlName="company"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div class="pt-4 flex items-center justify-between">
            <div>
              @if (profileUpdateSuccess) {
                <p class="text-sm text-green-600">
                  <span class="material-icons align-middle text-sm mr-1">check_circle</span>
                  Profile updated successfully!
                </p>
              }
              @if (profileUpdateError) {
                <p class="text-sm text-red-600">
                  <span class="material-icons align-middle text-sm mr-1">error</span>
                  {{ profileUpdateError }}
                </p>
              }
            </div>
            <button 
              type="submit" 
              [disabled]="!profileForm.valid || profileForm.pristine || isSubmittingProfile"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              @if (isSubmittingProfile) {
                <span class="material-icons animate-spin mr-2 text-sm">refresh</span>
              }
              Save Changes
            </button>
          </div>
        </form>
      </div>
      
      <!-- Subscription details -->
      <div class="mb-8">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Subscription</h2>
        
        <div class="bg-blue-50 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-medium text-gray-900">{{ userProfile?.plan || 'Free Plan' }}</h3>
              <p class="text-sm text-gray-600">{{ getPlanDescription() }}</p>
            </div>
            <div>
              <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
          
          <ul class="text-sm text-gray-600 space-y-2 mb-6">
            <li class="flex items-center">
              <span class="material-icons text-green-500 mr-2 text-sm">check_circle</span>
              Up to {{ userProfile?.screenLimit || 5 }} screens
            </li>
            <li class="flex items-center">
              <span class="material-icons text-green-500 mr-2 text-sm">check_circle</span>
              {{ formatStorage(userProfile?.storageLimit || 500 * 1024 * 1024) }} storage
            </li>
            <li class="flex items-center">
              <span class="material-icons text-green-500 mr-2 text-sm">check_circle</span>
              {{ getPlanFeature() }}
            </li>
          </ul>
          
          <a 
            routerLink="/profile/plan" 
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <span class="material-icons mr-2 text-sm">upgrade</span>
            Upgrade Plan
          </a>
        </div>
      </div>
      
      <!-- Change Password -->
      <div>
        <h2 class="text-lg font-medium text-gray-900 mb-4">Security</h2>
        
        <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="space-y-4">
          <div>
            <label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input 
              type="password" 
              id="currentPassword" 
              formControlName="currentPassword"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input 
              type="password" 
              id="newPassword" 
              formControlName="newPassword"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              formControlName="confirmPassword"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            @if (passwordForm.hasError('passwordMismatch') && 
                 passwordForm.get('confirmPassword')?.touched) {
              <p class="mt-1 text-sm text-red-600">Passwords do not match</p>
            }
          </div>
          
          <div class="pt-4 flex items-center justify-between">
            <div>
              @if (passwordUpdateSuccess) {
                <p class="text-sm text-green-600">
                  <span class="material-icons align-middle text-sm mr-1">check_circle</span>
                  Password changed successfully!
                </p>
              }
              @if (passwordUpdateError) {
                <p class="text-sm text-red-600">
                  <span class="material-icons align-middle text-sm mr-1">error</span>
                  {{ passwordUpdateError }}
                </p>
              }
            </div>
            <button 
              type="submit" 
              [disabled]="!passwordForm.valid || isSubmittingPassword"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              @if (isSubmittingPassword) {
                <span class="material-icons animate-spin mr-2 text-sm">refresh</span>
              }
              Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ProfileSettingsComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  userProfile: UserProfile | null = null;
  
  // UI state
  isSubmittingProfile = false;
  isSubmittingPassword = false;
  profileUpdateSuccess = false;
  profileUpdateError: string | null = null;
  passwordUpdateSuccess = false;
  passwordUpdateError: string | null = null;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private authService: SupabaseAuthService
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      company: ['']
    });
    
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }
  
  ngOnInit(): void {
    // Subscribe to user profile changes
    this.authService.userProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.userProfile = profile;
        
        // Only update form if we have a profile and form is pristine
        if (profile && this.profileForm.pristine) {
          this.profileForm.patchValue({
            name: profile.name || '',
            company: profile.company || ''
          });
        }
      });
    
    // Get email from user
    const user = this.authService.getCurrentUser();
    if (user?.email) {
      this.profileForm.patchValue({
        email: user.email
      });
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    
    return null;
  }
  
  onSaveProfile(): void {
    if (this.profileForm.valid && !this.isSubmittingProfile) {
      this.isSubmittingProfile = true;
      this.profileUpdateSuccess = false;
      this.profileUpdateError = null;
      
      const profileData = {
        name: this.profileForm.value.name,
        company: this.profileForm.value.company
      };
      
      this.authService.updateUserProfile(profileData).subscribe({
        next: () => {
          this.isSubmittingProfile = false;
          this.profileUpdateSuccess = true;
          
          // Hide success message after 3 seconds
          setTimeout(() => {
            this.profileUpdateSuccess = false;
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.isSubmittingProfile = false;
          this.profileUpdateError = 'Failed to update profile. Please try again.';
        }
      });
    }
  }
  
  onChangePassword(): void {
    if (this.passwordForm.valid && !this.isSubmittingPassword) {
      this.isSubmittingPassword = true;
      this.passwordUpdateSuccess = false;
      this.passwordUpdateError = null;
      
      const { currentPassword, newPassword } = this.passwordForm.value;
      
      this.authService.changePassword(currentPassword, newPassword).subscribe({
        next: () => {
          this.isSubmittingPassword = false;
          this.passwordUpdateSuccess = true;
          this.passwordForm.reset();
          
          // Hide success message after 3 seconds
          setTimeout(() => {
            this.passwordUpdateSuccess = false;
          }, 3000);
        },
        error: (error) => {
          console.error('Error changing password:', error);
          this.isSubmittingPassword = false;
          
          if (error.message?.includes('Invalid login credentials')) {
            this.passwordUpdateError = 'Current password is incorrect.';
          } else {
            this.passwordUpdateError = 'Failed to change password. Please try again.';
          }
        }
      });
    }
  }
  
  formatStorage(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
  
  getPlanDescription(): string {
    const plan = this.userProfile?.plan || 'Free Plan';
    
    switch (plan) {
      case 'Free Plan':
        return 'Basic digital signage features';
      case 'Pro Plan':
        return 'Advanced features for growing businesses';
      case 'Enterprise Plan':
        return 'Full features for large-scale deployments';
      default:
        return 'Digital signage features';
    }
  }
  
  getPlanFeature(): string {
    const plan = this.userProfile?.plan || 'Free Plan';
    
    switch (plan) {
      case 'Free Plan':
        return 'Basic content scheduling';
      case 'Pro Plan':
        return 'Advanced scheduling & content templates';
      case 'Enterprise Plan':
        return 'Custom branding & API access';
      default:
        return 'Content management';
    }
  }
}
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SupabaseAuthService } from '../../../../core/services/supabase-auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="text-center text-3xl font-extrabold text-gray-900">
          Create a new account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Join Digital Signage
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 transform transition-all hover:scale-[1.01]">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
            @if (error) {
              <div class="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <span class="material-icons text-red-400">error_outline</span>
                  </div>
                  <div class="ml-3">
                    <p>{{ error }}</p>
                  </div>
                </div>
              </div>
            }

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div class="mt-1">
                <div class="relative rounded-md shadow-sm">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="material-icons text-gray-400 text-sm">mail</span>
                  </div>
                  <input
                    id="email"
                    type="email"
                    formControlName="email"
                    required
                    class="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your email"
                  />
                </div>
                @if (registerForm.get('email')?.touched && registerForm.get('email')?.errors?.['required']) {
                  <p class="mt-1 text-sm text-red-600">Email is required</p>
                }
                @if (registerForm.get('email')?.touched && registerForm.get('email')?.errors?.['email']) {
                  <p class="mt-1 text-sm text-red-600">Please enter a valid email</p>
                }
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div class="mt-1">
                <div class="relative rounded-md shadow-sm">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="material-icons text-gray-400 text-sm">lock</span>
                  </div>
                  <input
                    id="password"
                    type="password"
                    formControlName="password"
                    required
                    class="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Create a password"
                  />
                </div>
                @if (registerForm.get('password')?.touched && registerForm.get('password')?.errors?.['required']) {
                  <p class="mt-1 text-sm text-red-600">Password is required</p>
                }
                @if (registerForm.get('password')?.touched && registerForm.get('password')?.errors?.['minlength']) {
                  <p class="mt-1 text-sm text-red-600">Password must be at least 6 characters</p>
                }
              </div>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div class="mt-1">
                <div class="relative rounded-md shadow-sm">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="material-icons text-gray-400 text-sm">lock</span>
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    formControlName="confirmPassword"
                    required
                    class="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Confirm your password"
                  />
                </div>
                @if (registerForm.get('confirmPassword')?.touched && registerForm.get('confirmPassword')?.errors?.['required']) {
                  <p class="mt-1 text-sm text-red-600">Please confirm your password</p>
                }
                @if (registerForm.errors?.['passwordMismatch'] && registerForm.get('confirmPassword')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Passwords don't match</p>
                }
              </div>
            </div>

            <div>
              <button
                type="submit"
                [disabled]="!registerForm.valid || loading"
                class="group relative w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (loading) {
                  <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                    <span class="material-icons animate-spin text-sm">refresh</span>
                  </span>
                }
                {{ loading ? 'Creating account...' : 'Create account' }}
              </button>
            </div>
          </form>

          <div class="mt-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>

            <div class="mt-6">
              <a
                routerLink="/auth/login"
                class="w-full flex justify-center py-2.5 px-4 border-2 border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  error: string | null = null;
  success = false;

  constructor(
    private fb: FormBuilder,
    private authService: SupabaseAuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      this.error = null;
      
      const { email, password } = this.registerForm.value;
      
      this.authService.signUp(email, password).subscribe({
        next: (session) => {
          this.loading = false;
          
          if (session) {
            // User was auto-signed in, redirect to dashboard
            this.router.navigate(['/']);
          } else {
            // Email confirmation is required, redirect to login with message
            this.router.navigate(['/auth/login'], {
              queryParams: { 
                message: 'Please check your email to confirm your account.'
              }
            });
          }
        },
        error: (error) => {
          this.error = error.message || 'Failed to create account. Please try again.';
          this.loading = false;
        }
      });
    }
  }
}
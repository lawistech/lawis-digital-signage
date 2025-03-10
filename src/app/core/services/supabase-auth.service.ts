// core/services/supabase-auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, from, map, of, tap } from 'rxjs';
import { supabase } from './supabase.config';
import { AuthSession, User } from '@supabase/supabase-js';

export interface UserProfile {
  name?: string;
  company?: string;
  avatarUrl?: string;
  plan?: string;
  screenLimit?: number;
  storageLimit?: number;
  screenUsage?: number;
  storageUsage?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseAuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  
  user$ = this.userSubject.asObservable();
  userProfile$ = this.userProfileSubject.asObservable();

  constructor(private router: Router) {
    // Initialize user from session
    this.loadUser();

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      this.userSubject.next(user);

      if (event === 'SIGNED_OUT') {
        this.userProfileSubject.next(null);
        this.router.navigate(['/auth/login']);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (user) {
          this.loadUserProfile(user.id);
        }
        
        if (event === 'SIGNED_IN') {
          const returnUrl = localStorage.getItem('returnUrl') || '/';
          localStorage.removeItem('returnUrl');
          this.router.navigate([returnUrl]);
        }
      }
    });
  }

  async loadUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      this.userSubject.next(user);
      
      if (user) {
        this.loadUserProfile(user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      this.userSubject.next(null);
      this.userProfileSubject.next(null);
    }
  }

  private async loadUserProfile(userId: string) {
    try {
      // Attempt to get profile from user_profiles table
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "row not found" error
        console.error('Error loading user profile:', error);
      }
      
      const user = this.userSubject.value;
      
      // Handle access to user_metadata safely
      const userMetadata = user?.user_metadata || {};
      
      // Default profile with free plan limits
      const profile: UserProfile = {
        name: userMetadata.name,
        company: userMetadata.company,
        avatarUrl: userMetadata.avatar_url,
        plan: 'Free Plan',
        screenLimit: 5,
        storageLimit: 1024 * 1024 * 500, // 500 MB
        screenUsage: 0,
        storageUsage: 0
      };
      
      // If we got data from profiles table, override defaults
      if (data) {
        profile.name = data.name || profile.name;
        profile.company = data.company || profile.company;
        profile.avatarUrl = data.avatar_url || profile.avatarUrl;
        profile.plan = data.plan || profile.plan;
        profile.screenLimit = data.screen_limit || profile.screenLimit;
        profile.storageLimit = data.storage_limit || profile.storageLimit;
        profile.screenUsage = data.screen_usage || profile.screenUsage;
        profile.storageUsage = data.storage_usage || profile.storageUsage;
      }
      
      this.userProfileSubject.next(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set default profile
      this.userProfileSubject.next({
        plan: 'Free Plan',
        screenLimit: 5,
        storageLimit: 1024 * 1024 * 500, // 500 MB
        screenUsage: 0,
        storageUsage: 0
      });
    }
  }

  signIn(email: string, password: string): Observable<AuthSession | null> {
    return from(
      supabase.auth.signInWithPassword({ email, password })
    ).pipe(
      map(({ data: { session }, error }) => {
        if (error) throw error;
        return session;
      }),
      catchError((error) => {
        console.error('Error signing in:', error);
        throw error;
      })
    );
  }

  signUp(email: string, password: string): Observable<AuthSession | null> {
    return from(
      supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
    ).pipe(
      map(({ data: { session }, error }) => {
        if (error) throw error;
        return session;
      }),
      catchError((error) => {
        console.error('Error signing up:', error);
        throw error;
      })
    );
  }

  resetPassword(email: string): Observable<void> {
    return from(
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return;
      }),
      catchError((error) => {
        console.error('Error resetting password:', error);
        throw error;
      })
    );
  }

  handleAuthCallback(accessToken: string, refreshToken: string): Observable<void> {
    return from(
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return;
      }),
      catchError((error) => {
        console.error('Error handling auth callback:', error);
        throw error;
      })
    );
  }
  
  signOut(): Observable<void> {
    return from(supabase.auth.signOut()).pipe(
      map(({ error }) => {
        if (error) throw error;
        this.userSubject.next(null);
        this.userProfileSubject.next(null);
        this.router.navigate(['/auth/login']);
      }),
      catchError((error) => {
        console.error('Error during sign out:', error);
        throw error;
      })
    );
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  getCurrentProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.userSubject.value;
  }

  saveReturnUrl(url: string): void {
    if (url && url !== '/auth/login' && !url.startsWith('/auth/')) {
      localStorage.setItem('returnUrl', url);
    }
  }

  getCurrentUserId(): string | null {
    const user = this.getCurrentUser();
    return user?.id || null;
  }
  
  updateUserProfile(profile: Partial<UserProfile>): Observable<UserProfile> {
    const user = this.getCurrentUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }
    
    // First update the user metadata in auth
    return from(
      supabase.auth.updateUser({
        data: {
          name: profile.name,
          company: profile.company
        }
      })
    ).pipe(
      switchMap(() => {
        // Now update or insert profile record
        return from(
          supabase
            .from('user_profiles')
            .upsert({
              user_id: user.id,
              name: profile.name,
              company: profile.company,
              avatar_url: profile.avatarUrl,
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
        );
      }),
      map(({ data, error }) => {
        if (error) throw error;
        
        // Get current profile and merge with updates
        const currentProfile = this.userProfileSubject.value || {};
        const updatedProfile = {
          ...currentProfile,
          name: profile.name || currentProfile.name,
          company: profile.company || currentProfile.company,
          avatarUrl: profile.avatarUrl || currentProfile.avatarUrl
        };
        
        // Update the profile subject
        this.userProfileSubject.next(updatedProfile);
        
        return updatedProfile;
      }),
      catchError((error) => {
        console.error('Error updating profile:', error);
        throw error;
      })
    );
  }
  
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    // First verify the current password
    const user = this.getCurrentUser();
    if (!user || !user.email) {
      return throwError(() => new Error('User not authenticated'));
    }
    
    return from(
      // First verify the current password works
      supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })
    ).pipe(
      switchMap(() => {
        // If that worked, now update to the new password
        return from(
          supabase.auth.updateUser({ password: newPassword })
        );
      }),
      map(({ error }) => {
        if (error) throw error;
        return;
      }),
      catchError((error) => {
        console.error('Error changing password:', error);
        throw error;
      })
    );
  }
}

// Helper function for observables
function throwError(errorFactory: () => Error): Observable<never> {
  return new Observable(observer => {
    observer.error(errorFactory());
  });
}

function switchMap<T, R>(project: (value: T) => Observable<R>) {
  return function<S extends Observable<T>>(source: S): Observable<R> {
    return new Observable<R>(observer => {
      const subscription = source.subscribe({
        next(value) {
          let innerSubscription: any;
          try {
            const innerObservable = project(value);
            innerSubscription = innerObservable.subscribe({
              next: val => observer.next(val),
              error: err => observer.error(err),
              complete: () => observer.complete()
            });
          } catch (err) {
            observer.error(err);
            return;
          }
          
          return () => {
            innerSubscription?.unsubscribe();
          };
        },
        error(err) { observer.error(err); },
        complete() { observer.complete(); }
      });
      
      return () => {
        subscription.unsubscribe();
      };
    });
  };
}
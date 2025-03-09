// core/services/supabase-auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, from, map, of, tap } from 'rxjs';
import { supabase } from './supabase.config';
import { AuthSession, User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseAuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private router: Router) {
    // Initialize user from session
    this.loadUser();

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      this.userSubject.next(user);

      if (event === 'SIGNED_OUT') {
        this.router.navigate(['/auth/login']);
      } else if (event === 'SIGNED_IN') {
        const returnUrl = localStorage.getItem('returnUrl') || '/';
        localStorage.removeItem('returnUrl');
        this.router.navigate([returnUrl]);
      }
    });
  }

  async loadUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      this.userSubject.next(session?.user ?? null);
    } catch (error) {
      console.error('Error loading user:', error);
      this.userSubject.next(null);
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

  isAuthenticated(): boolean {
    return !!this.userSubject.value;
  }

  saveReturnUrl(url: string): void {
    if (url && url !== '/auth/login' && !url.startsWith('/auth/')) {
      localStorage.setItem('returnUrl', url);
    }
  }
}
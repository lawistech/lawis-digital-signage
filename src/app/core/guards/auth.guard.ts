// core/guards/auth.guard.ts
import { Injectable, inject } from '@angular/core';
import { 
  Router, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot,
  UrlTree 
} from '@angular/router';
import { SupabaseAuthService } from '../services/supabase-auth.service';
import { Observable, map, take } from 'rxjs';

export type UserRole = 'admin' | 'user' | 'guest';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  private router = inject(Router);
  private authService = inject(SupabaseAuthService);

  canActivate(
    route?: ActivatedRouteSnapshot,
    state?: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.authService.user$.pipe(
      take(1),
      map(user => {
        // Check if user exists
        if (!user) {
          return this.router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state?.url }
          });
        }

        // If roles are required, check them
        const requiredRoles = route?.data['roles'] as UserRole[];
        if (requiredRoles && !this.hasRequiredRole(user, requiredRoles)) {
          // Redirect to unauthorized page or dashboard
          return this.router.createUrlTree(['/unauthorized']);
        }

        return true;
      })
    );
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.canActivate(route, state);
  }

  private hasRequiredRole(user: any, requiredRoles: UserRole[]): boolean {
    // Get user role from Supabase user metadata
    const userRole = user?.user_metadata?.role as UserRole;
    return requiredRoles.includes(userRole);
  }
}
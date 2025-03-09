import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SupabaseAuthService } from '../../../../core/services/supabase-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./login.component.html"
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error: string | null = null;
  message: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: SupabaseAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Check for message in query params (e.g., from registration page)
    this.route.queryParams.subscribe(params => {
      this.message = params['message'] || null;
      
      // Save return URL for after login
      const returnUrl = params['returnUrl'];
      if (returnUrl) {
        this.authService.saveReturnUrl(returnUrl);
      }
    });

    // If already authenticated, redirect to home
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.error = null;
      
      const { email, password } = this.loginForm.value;
      
      this.authService.signIn(email, password).subscribe({
        next: () => {
          // Redirect happens in auth service via onAuthStateChange
        },
        error: (error) => {
          this.error = error.message || 'Failed to sign in. Please check your credentials.';
          this.loading = false;
        }
      });
    }
  }
}
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-page">
      <section class="hero">
        <p class="eyebrow">Campus Planner</p>
        <h1>Turn floor outlines into schedulable spaces.</h1>
        <p class="muted">
          Upload a cadastral image, trace rooms inside the GeoJSON footprint, and book the result in one-hour slots.
        </p>
      </section>

      <section class="card auth-card">
        <div class="auth-switch">
          <button type="button" [class.ghost]="mode() !== 'login'" (click)="mode.set('login')">Login</button>
          <button type="button" [class.ghost]="mode() !== 'register'" (click)="mode.set('register')">Register</button>
        </div>

        @if (error()) {
          <p class="message error">{{ error() }}</p>
        }

        @if (mode() === 'login') {
          <form [formGroup]="loginForm" (ngSubmit)="submitLogin()">
            <label>
              Email
              <input type="email" formControlName="email" autocomplete="email" />
            </label>
            @if (showLoginError('email')) {
              <p class="field-error">Enter a valid email address.</p>
            }

            <label>
              Password
              <input type="password" formControlName="password" autocomplete="current-password" />
            </label>
            @if (showLoginError('password')) {
              <p class="field-error">Password must contain at least 8 characters.</p>
            }

            <button type="submit" [disabled]="loading() || loginForm.invalid">Enter workspace</button>
          </form>
        } @else {
          <form [formGroup]="registerForm" (ngSubmit)="submitRegister()">
            <label>
              Display name
              <input type="text" formControlName="displayName" autocomplete="name" />
            </label>
            @if (showRegisterError('displayName')) {
              <p class="field-error">Display name must contain at least 2 characters.</p>
            }

            <label>
              Email
              <input type="email" formControlName="email" autocomplete="email" />
            </label>
            @if (showRegisterError('email')) {
              <p class="field-error">Enter a valid email address.</p>
            }

            <label>
              Password
              <input type="password" formControlName="password" autocomplete="new-password" />
            </label>
            @if (showRegisterError('password')) {
              <p class="field-error">Password must contain at least 8 characters.</p>
            }

            <button type="submit" [disabled]="loading() || registerForm.invalid">Create account</button>
          </form>
        }
      </section>
    </div>
  `,
  styles: `
    .auth-page {
      min-height: 100vh;
      padding: 2rem;
      display: grid;
      grid-template-columns: 1.2fr minmax(320px, 440px);
      gap: 2rem;
      align-items: center;
    }

    .hero {
      padding: 3rem;
    }

    .hero h1 {
      font-size: clamp(2.5rem, 4vw, 4.5rem);
      line-height: 0.96;
      margin: 0 0 1rem;
      max-width: 12ch;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 0.75rem;
      color: var(--accent);
      margin: 0 0 1rem;
    }

    .auth-card {
      padding: 1.5rem;
      display: grid;
      gap: 1rem;
    }

    .auth-switch {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    form {
      display: grid;
      gap: 0.9rem;
    }

    .field-error {
      margin: -0.45rem 0 0;
      font-size: 0.88rem;
      color: #7f1d1d;
    }

    @media (max-width: 900px) {
      .auth-page {
        grid-template-columns: 1fr;
      }

      .hero {
        padding: 1rem 0;
      }
    }
  `,
})
export class AuthPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly registerForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected async submitLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.error.set('Enter a valid email and a password with at least 8 characters.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.loginForm.getRawValue());
      await this.router.navigate(['/']);
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async submitRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.error.set('Complete all fields before creating an account.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.register(this.registerForm.getRawValue());
      await this.router.navigate(['/']);
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private extractMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const payload = (error as { error?: { message?: string } }).error;
      if (payload?.message) {
        return payload.message;
      }
    }

    return 'Request failed.';
  }

  protected showLoginError(controlName: 'email' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  protected showRegisterError(controlName: 'displayName' | 'email' | 'password'): boolean {
    const control = this.registerForm.controls[controlName];
    return !!control && control.invalid && (control.touched || control.dirty);
  }
}

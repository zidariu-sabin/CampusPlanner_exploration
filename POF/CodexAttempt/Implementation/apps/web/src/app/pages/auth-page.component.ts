import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { ButtonDirective } from '../ui';

type AuthMode = 'login' | 'register' | 'invite';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonDirective],
  template: `
    <div class="grid min-h-screen items-center gap-8 p-4 sm:p-8 lg:grid-cols-[1.2fr_minmax(320px,440px)]">
      <section class="grid gap-5 lg:px-10">
        <div class="flex items-center gap-3">
          <div class="grid h-12 w-12 place-items-center rounded-lg bg-strong text-lg font-black text-white">
            CP
          </div>
          <p class="text-xs font-bold uppercase tracking-widest text-strong-2">Campus Planner</p>
        </div>
        <h1
          class="max-w-[16ch] text-[clamp(2rem,3.4vw,3.4rem)] font-bold leading-[1.04] tracking-tight text-ink"
        >
          Turn floor outlines into schedulable spaces.
        </h1>
        <p class="max-w-[46ch] text-[15px] leading-relaxed text-muted">
          Create an organization, model campuses and configurable spaces, and book rooms or outdoor
          areas in one-hour slots.
        </p>
      </section>

      <section class="grid gap-4 rounded-lg border border-line bg-panel p-5 shadow-panel">
        <div class="grid grid-cols-3 gap-1.5 rounded-lg border border-line bg-panel-soft p-1.5">
          @for (tab of tabs; track tab.mode) {
            <button
              type="button"
              class="rounded-md px-2 py-2 text-xs font-bold transition-colors"
              [class]="mode() === tab.mode ? 'bg-strong text-white' : 'bg-transparent text-muted hover:text-ink'"
              (click)="setMode(tab.mode)"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        @if (error()) {
          <p class="message error">{{ error() }}</p>
        }

        @if (mode() === 'login') {
          <form class="grid gap-3.5" [formGroup]="loginForm" (ngSubmit)="submitLogin()">
            <label>
              Email
              <input type="email" formControlName="email" autocomplete="email" />
            </label>
            @if (showLoginError('email')) {
              <p class="text-xs font-semibold text-red">Enter a valid email address.</p>
            }

            <label>
              Password
              <input type="password" formControlName="password" autocomplete="current-password" />
            </label>
            @if (showLoginError('password')) {
              <p class="text-xs font-semibold text-red">Password must contain at least 8 characters.</p>
            }

            <button uiBtn class="mt-1 w-full" type="submit" [disabled]="loading() || loginForm.invalid">
              Enter workspace
            </button>
          </form>
        } @else if (mode() === 'register') {
          <form class="grid gap-3.5" [formGroup]="registerForm" (ngSubmit)="submitRegister()">
            <label>
              Organization name
              <input type="text" formControlName="organizationName" autocomplete="organization" />
            </label>
            @if (showRegisterError('organizationName')) {
              <p class="text-xs font-semibold text-red">Organization name must contain at least 2 characters.</p>
            }

            <label>
              Display name
              <input type="text" formControlName="displayName" autocomplete="name" />
            </label>
            @if (showRegisterError('displayName')) {
              <p class="text-xs font-semibold text-red">Display name must contain at least 2 characters.</p>
            }

            <label>
              Email
              <input type="email" formControlName="email" autocomplete="email" />
            </label>
            @if (showRegisterError('email')) {
              <p class="text-xs font-semibold text-red">Enter a valid email address.</p>
            }

            <label>
              Password
              <input type="password" formControlName="password" autocomplete="new-password" />
            </label>
            @if (showRegisterError('password')) {
              <p class="text-xs font-semibold text-red">Password must contain at least 8 characters.</p>
            }

            <p class="text-xs text-muted">You become the organization owner and can invite your team.</p>

            <button uiBtn class="mt-1 w-full" type="submit" [disabled]="loading() || registerForm.invalid">
              Create organization
            </button>
          </form>
        } @else {
          <form class="grid gap-3.5" [formGroup]="inviteForm" (ngSubmit)="submitInvite()">
            <label>
              Invite token
              <input type="text" formControlName="inviteToken" class="font-mono" />
            </label>
            @if (showInviteError('inviteToken')) {
              <p class="text-xs font-semibold text-red">Paste the invite token you received.</p>
            }

            <label>
              Display name
              <input type="text" formControlName="displayName" autocomplete="name" />
            </label>
            @if (showInviteError('displayName')) {
              <p class="text-xs font-semibold text-red">Display name must contain at least 2 characters.</p>
            }

            <label>
              Email
              <input type="email" formControlName="email" autocomplete="email" />
            </label>
            @if (showInviteError('email')) {
              <p class="text-xs font-semibold text-red">Enter a valid email address.</p>
            }

            <label>
              Password
              <input type="password" formControlName="password" autocomplete="new-password" />
            </label>
            @if (showInviteError('password')) {
              <p class="text-xs font-semibold text-red">Password must contain at least 8 characters.</p>
            }

            <button uiBtn class="mt-1 w-full" type="submit" [disabled]="loading() || inviteForm.invalid">
              Join organization
            </button>
          </form>
        }
      </section>
    </div>
  `,
  styles: ``,
})
export class AuthPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly mode = signal<AuthMode>('login');
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly tabs: ReadonlyArray<{ mode: AuthMode; label: string }> = [
    { mode: 'login', label: 'Sign in' },
    { mode: 'register', label: 'Create org' },
    { mode: 'invite', label: 'Join invite' },
  ];

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly registerForm = this.fb.nonNullable.group({
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly inviteForm = this.fb.nonNullable.group({
    inviteToken: ['', [Validators.required, Validators.minLength(8)]],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    if (this.auth.isLoggedIn()) {
      void this.router.navigateByUrl(this.redirectTarget());
      return;
    }

    const inviteToken = this.route.snapshot.queryParamMap.get('invite');
    if (inviteToken) {
      this.mode.set('invite');
      this.inviteForm.patchValue({ inviteToken });
    }
  }

  protected setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set('');
  }

  protected async submitLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.error.set('Enter a valid email and a password with at least 8 characters.');
      return;
    }

    await this.run(() => this.auth.login(this.loginForm.getRawValue()));
  }

  protected async submitRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.error.set('Complete all fields before creating an organization.');
      return;
    }

    await this.run(() => this.auth.register(this.registerForm.getRawValue()));
  }

  protected async submitInvite(): Promise<void> {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      this.error.set('Complete all fields, including the invite token.');
      return;
    }

    await this.run(() => this.auth.registerWithInvite(this.inviteForm.getRawValue()));
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await action();
      await this.router.navigateByUrl(this.redirectTarget());
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

  protected showRegisterError(
    controlName: 'organizationName' | 'displayName' | 'email' | 'password',
  ): boolean {
    const control = this.registerForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  protected showInviteError(
    controlName: 'inviteToken' | 'displayName' | 'email' | 'password',
  ): boolean {
    const control = this.inviteForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  private redirectTarget(): string {
    return this.route.snapshot.queryParamMap.get('redirectTo') || '/';
  }
}

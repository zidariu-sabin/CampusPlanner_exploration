import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthResponseDto, UserSummaryDto } from '@campus/contracts';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './api';

interface SessionState {
  token: string;
  user: UserSummaryDto;
}

const STORAGE_KEY = 'campus-planner-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenState = signal<string | null>(null);
  readonly user = signal<UserSummaryDto | null>(null);
  readonly token = computed(() => this.tokenState());
  readonly isLoggedIn = computed(() => !!this.tokenState());
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  constructor() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SessionState;
      this.tokenState.set(parsed.token);
      this.user.set(parsed.user);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async login(payload: { email: string; password: string }): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponseDto>(apiUrl('/auth/login'), payload),
    );
    this.setSession(response);
  }

  async register(payload: { email: string; password: string; displayName: string }): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponseDto>(apiUrl('/auth/register'), payload),
    );
    this.setSession(response);
  }

  async refreshMe(): Promise<void> {
    if (!this.tokenState()) {
      return;
    }

    try {
      const me = await firstValueFrom(this.http.get<UserSummaryDto>(apiUrl('/auth/me')));
      this.user.set(me);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: this.tokenState(),
          user: me,
        }),
      );
    } catch {
      this.logout(false);
    }
  }

  logout(redirect = true): void {
    this.tokenState.set(null);
    this.user.set(null);
    localStorage.removeItem(STORAGE_KEY);
    if (redirect) {
      void this.router.navigate(['/login']);
    }
  }

  private setSession(response: AuthResponseDto): void {
    this.tokenState.set(response.token);
    this.user.set(response.user);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: response.token,
        user: response.user,
      }),
    );
  }
}


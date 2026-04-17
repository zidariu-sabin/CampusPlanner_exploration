import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <header class="shell-header">
        <div>
          <p class="eyebrow">Campus Planner</p>
          <a routerLink="/" class="brand">Map-first room scheduling</a>
        </div>

        <nav class="shell-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Maps</a>
          @if (auth.isAdmin()) {
            <a routerLink="/maps/new" routerLinkActive="active">Create Map</a>
          }
        </nav>

        <div class="shell-user">
          <div>
            <strong>{{ auth.user()?.displayName }}</strong>
            <div class="muted">{{ auth.user()?.role }}</div>
          </div>
          <button class="ghost" type="button" (click)="auth.logout()">Logout</button>
        </div>
      </header>

      <main class="shell-main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .shell {
      min-height: 100vh;
      padding: 1.5rem;
      display: grid;
      gap: 1.5rem;
    }

    .shell-header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 1rem;
      align-items: center;
      padding: 1rem 1.2rem;
      border-radius: 28px;
      background: rgba(255, 250, 241, 0.9);
      box-shadow: var(--shadow);
      border: 1px solid rgba(255, 255, 255, 0.65);
    }

    .brand {
      font-size: 1.35rem;
      font-weight: 700;
      text-decoration: none;
    }

    .eyebrow {
      margin: 0 0 0.2rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.75rem;
      color: var(--brand-strong);
    }

    .shell-nav {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .shell-nav a {
      text-decoration: none;
      padding: 0.6rem 0.9rem;
      border-radius: 999px;
      color: var(--ink-soft);
    }

    .shell-nav a.active {
      background: rgba(14, 116, 144, 0.12);
      color: var(--brand-strong);
    }

    .shell-user {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .shell-main {
      padding-bottom: 2rem;
    }

    @media (max-width: 900px) {
      .shell-header {
        grid-template-columns: 1fr;
      }

      .shell-nav {
        justify-content: start;
      }

      .shell-user {
        justify-content: space-between;
      }
    }
  `,
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
}


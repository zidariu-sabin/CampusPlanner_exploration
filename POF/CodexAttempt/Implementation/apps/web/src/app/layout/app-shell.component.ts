import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../core/auth.service';

interface NavItem {
  label: string;
  link: string;
  exact: boolean;
}

const MEMBER_NAV: NavItem[] = [
  { label: 'Dashboard', link: '/', exact: true },
  { label: 'Map view', link: '/map', exact: false },
  { label: 'Book a room', link: '/book', exact: false },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', link: '/admin/dashboard', exact: false },
  { label: 'Spaces setup', link: '/admin/spaces', exact: false },
  { label: 'Settings', link: '/admin/settings', exact: false },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand-block" routerLink="/">
          <div class="brand-mark">CP</div>
          <div class="brand-copy">
            <p class="eyebrow">{{ auth.organization()?.name || 'Workspace' }}</p>
            <strong class="brand-name">Campus Planner</strong>
          </div>
        </a>

        <nav class="topnav" aria-label="Primary">
          @for (item of navItems(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact }"
            >
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="topbar-right">
          @if (auth.isAdmin()) {
            <div class="role-toggle view-switch" aria-label="Switch view">
              <button type="button" [class.active]="!adminMode()" (click)="switchView('member')">
                Member view
              </button>
              <button type="button" [class.active]="adminMode()" (click)="switchView('admin')">
                Admin panel
              </button>
            </div>
          }
          <button class="secondary-action" type="button" (click)="auth.logout()">Sign out</button>
        </div>
      </header>

      <main class="workspace">
        <header class="workspace-header">
          <div>
            <p class="eyebrow">Current screen · {{ viewLabel() }} view</p>
            <h2>{{ screenTitle() }}</h2>
          </div>
          <div class="tenant-chip">
            <span class="avatar">{{ initials() }}</span>
            {{ auth.user()?.displayName }} · {{ roleLabel() }}
          </div>
        </header>

        <router-outlet />
      </main>
    </div>
  `,
  styles: ``,
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly currentUrl = signal(this.router.url);

  protected readonly adminMode = computed(() => this.currentUrl().startsWith('/admin'));

  protected readonly navItems = computed<NavItem[]>(() =>
    this.adminMode() ? ADMIN_NAV : MEMBER_NAV,
  );

  protected readonly viewLabel = computed(() => (this.adminMode() ? 'admin' : 'member'));

  protected readonly roleLabel = computed(() => (this.auth.isAdmin() ? 'Admin' : 'Member'));

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.displayName ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '–';
    }
    const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0];
    return letters.toUpperCase();
  });

  protected readonly screenTitle = computed(() => titleForUrl(this.currentUrl()));

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }

  protected switchView(view: 'member' | 'admin'): void {
    void this.router.navigateByUrl(view === 'admin' ? '/admin/dashboard' : '/');
  }
}

function titleForUrl(url: string): string {
  const path = url.split('?')[0];

  if (path === '/' || path === '') {
    return 'Dashboard';
  }
  if (path.startsWith('/map')) {
    return 'Map view';
  }
  if (path.startsWith('/bookings')) {
    return 'Booking detail';
  }
  if (path.startsWith('/book')) {
    return 'Room booking';
  }
  if (path.startsWith('/admin/dashboard')) {
    return 'Admin dashboard';
  }
  if (path.startsWith('/admin/campuses')) {
    return 'Campus configuration';
  }
  if (path.startsWith('/admin/spaces')) {
    return 'Space configuration';
  }
  if (path.startsWith('/admin/settings')) {
    return 'Organization settings';
  }
  if (path.includes('/floors') || path.includes('/buildings')) {
    return 'Floor editor';
  }

  return 'Campus Planner';
}

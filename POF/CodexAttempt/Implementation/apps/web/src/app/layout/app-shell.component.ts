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
import { ButtonDirective } from '../ui';

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
  imports: [ButtonDirective, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen">
      <header class="sticky top-0 z-20 border-b border-line bg-panel/90 backdrop-blur-sm">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <a class="order-1 flex items-center gap-3" routerLink="/">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-strong text-sm font-black text-white">
              CP
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold uppercase tracking-widest text-strong-2">
                {{ auth.organization()?.name || 'Workspace' }}
              </p>
              <strong class="block truncate text-base font-bold tracking-tight text-ink">
                Campus Planner
              </strong>
            </div>
          </a>

          <nav
            class="order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:order-2 sm:mx-0 sm:w-auto sm:flex-1 sm:justify-center sm:px-0"
            aria-label="Primary"
          >
            @for (item of navItems(); track item.link) {
              <a
                class="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-muted transition-colors hover:bg-panel-soft hover:text-ink"
                [routerLink]="item.link"
                routerLinkActive="bg-green-soft !text-green"
                [routerLinkActiveOptions]="{ exact: item.exact }"
              >
                {{ item.label }}
              </a>
            }
          </nav>

          <div class="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0">
            @if (auth.isAdmin()) {
              <div
                class="flex rounded-lg border border-line bg-panel-soft p-1"
                role="group"
                aria-label="Switch view"
              >
                <button
                  type="button"
                  class="rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
                  [class]="
                    !adminMode() ? 'bg-strong text-white' : 'bg-transparent text-muted hover:bg-panel hover:text-ink'
                  "
                  (click)="switchView('member')"
                >
                  Member view
                </button>
                <button
                  type="button"
                  class="rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
                  [class]="adminMode() ? 'bg-strong text-white' : 'bg-transparent text-muted hover:bg-panel hover:text-ink'"
                  (click)="switchView('admin')"
                >
                  Admin panel
                </button>
              </div>
            }
            <button uiBtn="secondary" type="button" (click)="auth.logout()">Sign out</button>
          </div>
        </div>
      </header>

      <main class="w-full px-4 py-5 sm:px-6">
        <header
          class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel px-5 py-4 shadow-panel"
        >
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-widest text-strong-2">
              Current screen · {{ viewLabel() }} view
            </p>
            <h2 class="text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
              {{ screenTitle() }}
            </h2>
          </div>
          <div
            class="flex items-center gap-2.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-muted"
          >
            <span class="grid h-7 w-7 place-items-center rounded-full bg-blue-soft text-xs font-black text-blue">
              {{ initials() }}
            </span>
            <span class="truncate">{{ auth.user()?.displayName }} · {{ roleLabel() }}</span>
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

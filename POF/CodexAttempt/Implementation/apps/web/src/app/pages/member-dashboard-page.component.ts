import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookableResourceDto, MeetingDto } from '@campus/contracts';
import { DateTime } from 'luxon';

import { AuthService } from '../core/auth.service';
import { MeetingsService } from '../core/meetings.service';
import { ResourcesService } from '../core/resources.service';
import {
  BadgeComponent,
  ButtonDirective,
  EmptyStateComponent,
  MetricComponent,
  PanelComponent,
  RouteStepsComponent,
} from '../ui';

@Component({
  selector: 'app-member-dashboard-page',
  standalone: true,
  imports: [
    RouterLink,
    ButtonDirective,
    PanelComponent,
    MetricComponent,
    BadgeComponent,
    EmptyStateComponent,
    RouteStepsComponent,
  ],
  template: `
    <div class="grid content-start gap-4">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="text-muted">Loading your meetings…</p>
      } @else {
        <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <app-metric label="Today" [value]="todayCount()" />
          <app-metric label="This week" [value]="weekCount()" />
          <app-metric label="My bookings" [value]="myBookingsCount()" />
          <app-metric label="Next starts in" [value]="nextStartsIn()" tone="warn" />
        </section>

        <section class="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.55fr)]">
          <app-panel heading="My planned meetings" sub="What is planned and where to find it">
            <a panelAction uiBtn="secondary" routerLink="/book">Book a room</a>
            <div class="grid gap-2.5">
              @for (meeting of upcomingMeetings(); track meeting.id; let first = $first) {
                <a
                  class="grid gap-3 rounded-lg border border-line bg-panel p-3 text-left text-ink transition-colors hover:border-green hover:bg-green-soft/40 focus-visible:border-green focus-visible:outline-none sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                  [routerLink]="['/bookings', meeting.id]"
                >
                  <div
                    class="min-w-16 rounded-lg px-3 py-2 text-center text-sm font-extrabold"
                    [class]="first ? 'bg-amber-soft text-amber' : 'bg-green-soft text-green'"
                  >
                    {{ hourLabel(meeting) }}
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-base font-bold">{{ meeting.title }}</h3>
                    <p class="my-1 text-sm text-muted">{{ locationLabel(meeting) }}</p>
                    <div class="flex flex-wrap gap-2">
                      <app-badge>{{ dayLabel(meeting) }}</app-badge>
                      <app-badge [tone]="isOrganizer(meeting) ? 'neutral' : 'warn'">
                        {{ isOrganizer(meeting) ? 'Booked by me' : 'Invited' }}
                      </app-badge>
                    </div>
                  </div>
                  <span uiBtn="secondary">Details</span>
                </a>
              } @empty {
                <app-empty-state
                  title="No planned meetings yet"
                  message="Book your first room to see it appear here."
                />
                <a uiBtn routerLink="/book">Book your first room</a>
              }
            </div>
          </app-panel>

          <app-panel heading="Next meeting route" [sub]="nextRouteSubtitle()">
            <div class="grid gap-4">
              <app-route-steps [steps]="nextRouteSteps()" />
              <a uiBtn class="justify-self-start" routerLink="/map">Open map view</a>
            </div>
          </app-panel>
        </section>
      }
    </div>
  `,
  styles: ``,
})
export class MemberDashboardPageComponent {
  private readonly meetingsService = inject(MeetingsService);
  private readonly resourcesService = inject(ResourcesService);
  protected readonly auth = inject(AuthService);

  protected readonly meetings = signal<MeetingDto[]>([]);
  protected readonly resources = signal<BookableResourceDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  private readonly resourcesById = computed(() => {
    const map = new Map<string, BookableResourceDto>();
    for (const resource of this.resources()) {
      map.set(resource.id, resource);
    }
    return map;
  });

  protected readonly upcomingMeetings = computed(() => {
    const now = Date.now();
    return this.meetings()
      .filter((meeting) => Date.parse(meeting.endsAtUtc) > now)
      .sort((a, b) => a.startsAtUtc.localeCompare(b.startsAtUtc));
  });

  constructor() {
    void this.load();
  }

  protected todayCount(): number {
    const today = DateTime.now().toISODate();
    return this.meetings().filter((meeting) => meeting.localDate === today).length;
  }

  protected weekCount(): number {
    const now = DateTime.now();
    return this.meetings().filter((meeting) =>
      DateTime.fromISO(meeting.localDate).hasSame(now, 'week'),
    ).length;
  }

  protected myBookingsCount(): number {
    const me = this.auth.user();
    return me ? this.meetings().filter((meeting) => meeting.createdBy.id === me.id).length : 0;
  }

  protected nextStartsIn(): string {
    const next = this.upcomingMeetings()[0];
    if (!next) {
      return '—';
    }

    const diffMs = Date.parse(next.startsAtUtc) - Date.now();
    if (diffMs <= 0) {
      return 'now';
    }

    const totalMinutes = Math.round(diffMs / 60_000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  protected isOrganizer(meeting: MeetingDto): boolean {
    return meeting.createdBy.id === this.auth.user()?.id;
  }

  protected hourLabel(meeting: MeetingDto): string {
    return `${String(meeting.hour).padStart(2, '0')}:00`;
  }

  protected dayLabel(meeting: MeetingDto): string {
    return DateTime.fromISO(meeting.localDate).toFormat('ccc d LLL');
  }

  protected nextRouteSubtitle(): string {
    const next = this.upcomingMeetings()[0];
    if (!next) {
      return 'No upcoming meeting to route to';
    }
    return this.locationLabel(next);
  }

  protected nextRouteSteps(): string[] {
    const next = this.upcomingMeetings()[0];
    if (!next) {
      return ['Book a room to get step-by-step directions to your next meeting.'];
    }

    const resource = this.resourcesById().get(next.bookableResourceId);
    if (!resource) {
      return ['Open the map view to locate your next meeting.'];
    }

    const steps = [`Enter the ${resource.campusName} campus.`];
    if (resource.campusPlaceName && resource.campusPlaceName !== resource.name) {
      steps.push(`Walk to ${resource.campusPlaceName}.`);
    }
    if (resource.floorLabel) {
      steps.push(`Take the stairs or elevator to ${resource.floorLabel}.`);
    }
    steps.push(`${resource.name} is reserved for ${this.hourLabel(next)}.`);
    return steps;
  }

  protected locationLabel(meeting: MeetingDto): string {
    const resource = this.resourcesById().get(meeting.bookableResourceId);
    if (!resource) {
      return 'Location unavailable';
    }

    const parts = [resource.name, resource.campusName];
    if (resource.floorLabel) {
      parts.push(resource.floorLabel);
    }
    return parts.join(' · ');
  }

  private async load(): Promise<void> {
    try {
      const [meetings, resources] = await Promise.all([
        this.meetingsService.mine(),
        this.resourcesService.list(),
      ]);
      this.meetings.set(meetings);
      this.resources.set(resources);
    } catch (error) {
      this.error.set(extractMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}

function extractMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'error' in error) {
    const message = (error as { error?: { message?: string } }).error?.message;
    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Request failed.';
}

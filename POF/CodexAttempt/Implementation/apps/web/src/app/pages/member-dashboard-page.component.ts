import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookableResourceDto, MeetingDto } from '@campus/contracts';
import { DateTime } from 'luxon';

import { AuthService } from '../core/auth.service';
import { MeetingsService } from '../core/meetings.service';
import { ResourcesService } from '../core/resources.service';

@Component({
  selector: 'app-member-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="screen-shell">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading your meetings...</p>
      } @else {
        <section class="metrics-grid">
          <article class="metric">
            <span>Today</span>
            <strong>{{ todayCount() }}</strong>
          </article>
          <article class="metric">
            <span>This week</span>
            <strong>{{ weekCount() }}</strong>
          </article>
          <article class="metric">
            <span>My bookings</span>
            <strong>{{ myBookingsCount() }}</strong>
          </article>
          <article class="metric metric-warn">
            <span>Next starts in</span>
            <strong>{{ nextStartsIn() }}</strong>
          </article>
        </section>

        <section class="two-column">
          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>My planned meetings</h3>
                <p>What is planned and where to find it</p>
              </div>
              <a class="secondary-action" routerLink="/book">Book a room</a>
            </header>
            <div class="panel-body">
              <div class="card-list">
                @for (meeting of upcomingMeetings(); track meeting.id; let first = $first) {
                  <a class="member-meeting-card" [routerLink]="['/bookings', meeting.id]">
                    <div class="meeting-time" [class.meeting-time-warn]="first">
                      {{ hourLabel(meeting) }}
                    </div>
                    <div>
                      <h3>{{ meeting.title }}</h3>
                      <p>{{ locationLabel(meeting) }}</p>
                      <div class="status-row">
                        <span class="badge">{{ dayLabel(meeting) }}</span>
                        <span class="badge" [class.badge-warn]="!isOrganizer(meeting)">
                          {{ isOrganizer(meeting) ? 'Booked by me' : 'Invited' }}
                        </span>
                      </div>
                    </div>
                    <span class="secondary-action as-static-action">Details</span>
                  </a>
                } @empty {
                  <div class="inline-form-title">
                    <strong>No planned meetings yet</strong>
                    <span>Book your first room to see it appear here.</span>
                  </div>
                  <a class="primary-action" routerLink="/book">Book your first room</a>
                }
              </div>
            </div>
          </section>

          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>Next meeting route</h3>
                <p>{{ nextRouteSubtitle() }}</p>
              </div>
            </header>
            <div class="panel-body">
              <div class="route-steps">
                @for (step of nextRouteSteps(); track $index) {
                  <div class="route-step">
                    <span>{{ $index + 1 }}</span>
                    <p>{{ step }}</p>
                  </div>
                }
              </div>
              <a class="primary-action" routerLink="/map">Open map view</a>
            </div>
          </section>
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

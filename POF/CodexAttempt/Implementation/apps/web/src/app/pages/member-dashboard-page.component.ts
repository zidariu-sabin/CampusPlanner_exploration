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
    <div class="page">
      <section class="section-header">
        <div>
          <h1>Hello, {{ auth.user()?.displayName || 'there' }}</h1>
          <p class="muted">Your planned meetings and how to get to them.</p>
        </div>
      </section>

      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading your meetings...</p>
      } @else {
        <section class="metrics-grid">
          <article class="card metric">
            <strong class="metric-value">{{ todayCount() }}</strong>
            <span class="muted">Meetings today</span>
          </article>
          <article class="card metric">
            <strong class="metric-value">{{ weekCount() }}</strong>
            <span class="muted">This week</span>
          </article>
          <article class="card metric">
            <strong class="metric-value">{{ myBookingsCount() }}</strong>
            <span class="muted">My bookings</span>
          </article>
          <article class="card metric">
            <strong class="metric-value">{{ nextStartsIn() }}</strong>
            <span class="muted">Next starts in</span>
          </article>
        </section>

        <section class="dashboard-grid">
          <article class="card panel">
            <div class="section-header">
              <div>
                <h2>My planned meetings</h2>
                <p class="muted">Upcoming bookings you organize or are invited to.</p>
              </div>
            </div>

            <div class="meeting-list">
              @for (meeting of upcomingMeetings(); track meeting.id) {
                <a class="meeting-row" [routerLink]="['/bookings', meeting.id]">
                  <span class="mono meeting-time">{{ timeLabel(meeting) }}</span>
                  <span class="meeting-main">
                    <strong>{{ meeting.title }}</strong>
                    <span class="muted">{{ locationLabel(meeting) }}</span>
                  </span>
                  <span class="chip" [class.invited]="!isOrganizer(meeting)">
                    {{ isOrganizer(meeting) ? 'organizer' : 'invited' }}
                  </span>
                </a>
              } @empty {
                <div class="empty-state">
                  <p class="muted">No planned meetings yet.</p>
                  <a class="button" routerLink="/book">Book your first room</a>
                </div>
              }
            </div>
          </article>

          <div class="side-cards">
            <article class="card panel">
              <h2>Campus map</h2>
              <p class="muted">
                Explore campuses, buildings, and floors to find rooms and outdoor spaces.
              </p>
              <a class="button" routerLink="/map">Open map view</a>
            </article>

            <article class="card panel">
              <h2>Need a space?</h2>
              <p class="muted">Compare available rooms and book a one-hour slot.</p>
              <a class="button ghost" routerLink="/book">Book a room</a>
            </article>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
    }

    .metric {
      padding: 1.1rem 1.25rem;
      display: grid;
      gap: 0.3rem;
    }

    .metric-value {
      font-size: 1.45rem;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .panel {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }

    .side-cards {
      display: grid;
      gap: 1rem;
    }

    .meeting-list {
      display: grid;
      gap: 0.7rem;
    }

    .meeting-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1rem;
      border: 1px solid var(--line);
      border-radius: 18px;
      text-decoration: none;
      background: rgba(255, 255, 255, 0.55);
      transition: border-color 120ms ease, transform 120ms ease;
    }

    .meeting-row:hover {
      border-color: var(--brand);
      transform: translateY(-1px);
    }

    .meeting-time {
      font-size: 0.85rem;
      color: var(--ink-soft);
      white-space: nowrap;
    }

    .meeting-main {
      display: grid;
      gap: 0.15rem;
      min-width: 0;
    }

    .chip.invited {
      background: rgba(194, 65, 12, 0.1);
      color: var(--accent);
    }

    .empty-state {
      display: grid;
      gap: 0.8rem;
      justify-items: start;
      padding: 0.5rem 0;
    }

    @media (max-width: 980px) {
      .metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
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

  protected timeLabel(meeting: MeetingDto): string {
    const date = DateTime.fromISO(meeting.localDate);
    const hour = String(meeting.hour).padStart(2, '0');
    return `${date.toFormat('ccc d LLL')} · ${hour}:00`;
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

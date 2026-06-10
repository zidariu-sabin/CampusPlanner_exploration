import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookableResourceDto, FloorMapDto, MeetingDto } from '@campus/contracts';
import { DateTime } from 'luxon';

import { MapPreviewComponent } from '../components/map-preview.component';
import { AuthService } from '../core/auth.service';
import { MapsService } from '../core/maps.service';
import { MeetingsService } from '../core/meetings.service';
import { ResourcesService } from '../core/resources.service';

@Component({
  selector: 'app-booking-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MapPreviewComponent],
  template: `
    <div class="page">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading booking...</p>
      } @else if (meeting(); as meeting) {
        <section class="section-header">
          <div>
            <h1>{{ meeting.title }}</h1>
            <p class="muted">{{ localTimeLabel() }}</p>
          </div>
          <div class="chips">
            <span class="chip confirmed">Confirmed</span>
            @if (resource(); as resource) {
              <span class="chip">
                {{ resource.kind === 'room' ? 'room' : 'outdoor space' }}
              </span>
            }
          </div>
        </section>

        <section class="detail-grid">
          <article class="card panel">
            <h2>Booking summary</h2>

            <div class="info-rows">
              <div class="info-row">
                <span class="muted">Campus</span>
                <strong>{{ resource()?.campusName || '—' }}</strong>
              </div>
              <div class="info-row">
                <span class="muted">Space</span>
                <strong>{{ resource()?.campusPlaceName || resource()?.name || '—' }}</strong>
              </div>
              <div class="info-row">
                <span class="muted">Floor</span>
                <strong>{{ resource()?.floorLabel || '—' }}</strong>
              </div>
              <div class="info-row">
                <span class="muted">Room / space</span>
                <strong>{{ resource()?.name || 'Unknown location' }}</strong>
              </div>
              <div class="info-row">
                <span class="muted">Organizer</span>
                <strong>{{ meeting.createdBy.displayName }}</strong>
              </div>
            </div>

            @if (meeting.description) {
              <p>{{ meeting.description }}</p>
            } @else {
              <p class="muted">No description.</p>
            }

            <div>
              <h3>Participants</h3>
              <div class="chips participant-chips">
                @for (participant of meeting.participants; track participant.id) {
                  <span class="chip">{{ participant.displayName }}</span>
                } @empty {
                  <span class="muted">No additional participants.</span>
                }
              </div>
            </div>

            <div class="actions">
              <a class="button ghost" routerLink="/">Back to dashboard</a>
              @if (canCancel()) {
                <button
                  type="button"
                  class="danger"
                  [disabled]="cancelling()"
                  (click)="cancelBooking()"
                >
                  {{ cancelling() ? 'Cancelling...' : 'Cancel booking' }}
                </button>
              }
            </div>
          </article>

          <article class="card panel">
            <h2>Room location</h2>
            @if (floorMap(); as map) {
              <app-map-preview [map]="map" [compact]="true" [selectedRoomId]="meeting.roomId" />
            } @else if (loadingMap()) {
              <p class="muted">Loading floor map...</p>
            } @else {
              <p class="muted">No indoor map is available for this booking.</p>
            }
          </article>
        </section>

        <section class="card panel">
          <div class="section-header">
            <div>
              <h2>Route instructions</h2>
              <p class="muted">Static guidance derived from the booking location.</p>
            </div>
          </div>

          <ol class="route-steps">
            @for (step of routeSteps(); track $index) {
              <li>{{ step }}</li>
            }
          </ol>

          <div class="actions">
            <button type="button" disabled>Start navigation</button>
            <span class="muted">Live indoor navigation is not available yet.</span>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .detail-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .panel {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }

    .chip.confirmed {
      background: rgba(21, 128, 61, 0.12);
      color: #166534;
    }

    .info-rows {
      display: grid;
      gap: 0.45rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.55rem 0.8rem;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.55);
    }

    .participant-chips {
      margin-top: 0.5rem;
    }

    .actions {
      display: flex;
      gap: 0.8rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .route-steps {
      margin: 0;
      padding-left: 1.3rem;
      display: grid;
      gap: 0.5rem;
    }

    @media (max-width: 980px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class BookingDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly meetingsService = inject(MeetingsService);
  private readonly resourcesService = inject(ResourcesService);
  private readonly mapsService = inject(MapsService);
  private readonly auth = inject(AuthService);

  protected readonly meeting = signal<MeetingDto | null>(null);
  protected readonly resources = signal<BookableResourceDto[]>([]);
  protected readonly floorMap = signal<FloorMapDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadingMap = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly error = signal('');

  protected readonly resource = computed(() => {
    const meeting = this.meeting();
    return meeting
      ? (this.resources().find((resource) => resource.id === meeting.bookableResourceId) ?? null)
      : null;
  });

  constructor() {
    void this.load();
  }

  protected localTimeLabel(): string {
    const meeting = this.meeting();
    if (!meeting) {
      return '';
    }

    const timezone = this.resource()?.timezone;
    const start = DateTime.fromISO(meeting.localDate, { zone: timezone ?? 'utc' }).set({
      hour: meeting.hour,
    });
    const day = start.toFormat('cccc, d LLLL yyyy');
    const range = `${start.toFormat('HH:00')}–${start.plus({ hours: 1 }).toFormat('HH:00')}`;
    return timezone ? `${day} · ${range} (${timezone})` : `${day} · ${range}`;
  }

  protected canCancel(): boolean {
    const meeting = this.meeting();
    const me = this.auth.user();
    if (!meeting || !me) {
      return false;
    }

    return meeting.createdBy.id === me.id || this.auth.isAdmin();
  }

  protected routeSteps(): string[] {
    const resource = this.resource();
    if (!resource) {
      return ['Location details are unavailable for this booking.'];
    }

    const steps = [`Enter the ${resource.campusName} campus.`];

    if (resource.kind === 'campus_place') {
      steps.push(`Head to the ${resource.name} outdoor space.`);
    } else {
      if (resource.campusPlaceName) {
        steps.push(`Walk to the ${resource.campusPlaceName} building.`);
      }
      if (resource.floorLabel) {
        steps.push(`Take the stairs or elevator to ${resource.floorLabel}.`);
      }
      steps.push(`Find room ${resource.name}.`);
    }

    return steps;
  }

  protected async cancelBooking(): Promise<void> {
    const meeting = this.meeting();
    if (!meeting || !confirm('Cancel this booking? This cannot be undone.')) {
      return;
    }

    this.cancelling.set(true);
    this.error.set('');

    try {
      await this.meetingsService.delete(meeting.id);
      await this.router.navigate(['/']);
    } catch (error) {
      this.error.set(extractMessage(error));
      this.cancelling.set(false);
    }
  }

  private async load(): Promise<void> {
    const meetingId = this.route.snapshot.paramMap.get('meetingId');
    if (!meetingId) {
      this.error.set('Missing booking id.');
      this.loading.set(false);
      return;
    }

    try {
      const [meeting, resources] = await Promise.all([
        this.meetingsService.get(meetingId),
        this.resourcesService.list(),
      ]);
      this.meeting.set(meeting);
      this.resources.set(resources);
      await this.loadFloorMap(meeting);
    } catch (error) {
      this.error.set(extractMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFloorMap(meeting: MeetingDto): Promise<void> {
    if (!meeting.floorMapId) {
      return;
    }

    this.loadingMap.set(true);
    try {
      this.floorMap.set(await this.mapsService.get(meeting.floorMapId));
    } catch {
      // The map is optional context; the booking detail still renders without it.
      this.floorMap.set(null);
    } finally {
      this.loadingMap.set(false);
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

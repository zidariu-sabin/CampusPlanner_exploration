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
    <div class="screen-shell">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading booking...</p>
      } @else if (meeting(); as meeting) {
        <section class="map-layout">
          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>Room location</h3>
                <p>{{ resource()?.campusName || 'Indoor route preview' }}</p>
              </div>
            </header>
            <div class="panel-body">
              @if (floorMap(); as map) {
                <app-map-preview [map]="map" [compact]="true" [selectedRoomId]="meeting.roomId" />
              } @else if (loadingMap()) {
                <p class="muted">Loading floor map...</p>
              } @else {
                <p class="muted">No indoor map is available for this booking.</p>
              }
            </div>
          </section>

          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>{{ meeting.title }}</h3>
                <p>{{ localTimeLabel() }}</p>
              </div>
            </header>
            <div class="panel-body">
              <div class="booking-summary">
                <span class="badge badge-good">Confirmed</span>
                <span class="badge">{{ resource()?.name || 'Unknown location' }}</span>
                @if (resource()?.floorLabel) {
                  <span class="badge">{{ resource()!.floorLabel }}</span>
                }
              </div>

              <div class="booking-detail-card">
                <div><span>Campus</span><strong>{{ resource()?.campusName || '—' }}</strong></div>
                <div>
                  <span>Space</span>
                  <strong>{{ resource()?.campusPlaceName || resource()?.name || '—' }}</strong>
                </div>
                <div><span>Floor</span><strong>{{ resource()?.floorLabel || '—' }}</strong></div>
                <div><span>Room</span><strong>{{ resource()?.name || '—' }}</strong></div>
                <div><span>Organizer</span><strong>{{ meeting.createdBy.displayName }}</strong></div>
                <div><span>Guests</span><strong>{{ guestNames(meeting) }}</strong></div>
              </div>

              @if (meeting.description) {
                <p class="muted">{{ meeting.description }}</p>
              }

              <div class="route-steps">
                @for (step of routeSteps(); track $index) {
                  <div class="route-step">
                    <span>{{ $index + 1 }}</span>
                    <p>{{ step }}</p>
                  </div>
                }
              </div>

              <button class="primary-action" type="button" disabled>Start navigation</button>

              <div class="detail-actions">
                <a class="secondary-action" routerLink="/">Back to dashboard</a>
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
            </div>
          </section>
        </section>
      }
    </div>
  `,
  styles: `
    .detail-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 4px;
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

  protected guestNames(meeting: MeetingDto): string {
    const names = meeting.participants.map((participant) => participant.displayName);
    return names.length > 0 ? names.join(', ') : 'No additional guests';
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

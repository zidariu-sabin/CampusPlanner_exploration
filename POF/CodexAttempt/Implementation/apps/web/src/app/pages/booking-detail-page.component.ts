import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BookableResourceDto,
  CampusDto,
  CampusSummaryDto,
  FloorMapDto,
  MeetingDto,
} from '@campus/contracts';
import { DateTime } from 'luxon';

import { MemberMapboxViewComponent } from '../components/member-mapbox-view.component';
import { AuthService } from '../core/auth.service';
import { CampusesService } from '../core/campuses.service';
import { MapsService } from '../core/maps.service';
import { MeetingsService } from '../core/meetings.service';
import { ResourcesService } from '../core/resources.service';
import { BadgeComponent, ButtonDirective, PanelComponent, RouteStepsComponent } from '../ui';

@Component({
  selector: 'app-booking-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    MemberMapboxViewComponent,
    PanelComponent,
    BadgeComponent,
    RouteStepsComponent,
    ButtonDirective,
  ],
  template: `
    <div class="grid content-start gap-4">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="text-sm text-muted">Loading booking…</p>
      } @else if (meeting(); as meeting) {
        <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(320px,34%,400px)] lg:items-start">
          <app-panel heading="Room location" [sub]="locationSubtitle()">
            @if (loadingMap()) {
              <app-badge panelAction>Loading floor…</app-badge>
            }
            <app-member-mapbox-view
              [campuses]="campuses()"
              [selectedCampus]="mapCampus()"
              [floorMap]="floorMap()"
              [selectedCampusId]="mapCampus()?.id ?? null"
              [selectedPlaceId]="resource()?.campusPlaceId ?? null"
              [selectedRoomId]="meeting.roomId"
            />
          </app-panel>

          <app-panel [heading]="meeting.title" [sub]="localTimeLabel()">
            <div class="grid gap-3">
              <div class="flex flex-wrap gap-2">
                <app-badge tone="good">Confirmed</app-badge>
                <app-badge>{{ resource()?.name || 'Unknown location' }}</app-badge>
                @if (resource()?.floorLabel) {
                  <app-badge>{{ resource()!.floorLabel }}</app-badge>
                }
              </div>

              <div class="grid gap-2.5 rounded-lg border border-line bg-panel p-3 text-sm">
                <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                  <span class="font-semibold text-muted">Campus</span><strong>{{ resource()?.campusName || '—' }}</strong>
                </div>
                <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                  <span class="font-semibold text-muted">Space</span>
                  <strong>{{ resource()?.campusPlaceName || resource()?.name || '—' }}</strong>
                </div>
                <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                  <span class="font-semibold text-muted">Floor</span><strong>{{ resource()?.floorLabel || '—' }}</strong>
                </div>
                <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                  <span class="font-semibold text-muted">Room</span><strong>{{ resource()?.name || '—' }}</strong>
                </div>
                <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                  <span class="font-semibold text-muted">Organizer</span><strong>{{ meeting.createdBy.displayName }}</strong>
                </div>
                <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                  <span class="font-semibold text-muted">Guests</span><strong>{{ guestNames(meeting) }}</strong>
                </div>
              </div>

              @if (meeting.description) {
                <p class="text-sm text-muted">{{ meeting.description }}</p>
              }

              <app-route-steps [steps]="routeSteps()" />

              <button uiBtn class="w-full" type="button" disabled>Start navigation</button>

              <div class="flex flex-wrap items-center gap-2">
                <a uiBtn="secondary" routerLink="/">Back to dashboard</a>
                @if (canCancel()) {
                  <button uiBtn="danger" type="button" [disabled]="cancelling()" (click)="cancelBooking()">
                    {{ cancelling() ? 'Cancelling…' : 'Cancel booking' }}
                  </button>
                }
              </div>
            </div>
          </app-panel>
        </section>
      }
    </div>
  `,
  styles: ``,
})
export class BookingDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly meetingsService = inject(MeetingsService);
  private readonly resourcesService = inject(ResourcesService);
  private readonly mapsService = inject(MapsService);
  private readonly campusesService = inject(CampusesService);
  private readonly auth = inject(AuthService);

  protected readonly meeting = signal<MeetingDto | null>(null);
  protected readonly resources = signal<BookableResourceDto[]>([]);
  protected readonly campuses = signal<CampusSummaryDto[]>([]);
  protected readonly mapCampus = signal<CampusDto | null>(null);
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
      const [meeting, resources, campuses] = await Promise.all([
        this.meetingsService.get(meetingId),
        this.resourcesService.list(),
        this.campusesService.list(),
      ]);
      this.meeting.set(meeting);
      this.resources.set(resources);
      this.campuses.set(campuses);
      await Promise.all([this.loadFloorMap(meeting), this.loadMapCampus()]);
    } catch (error) {
      this.error.set(extractMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected locationSubtitle(): string {
    const resource = this.resource();
    if (!resource) {
      return 'Where to find this booking';
    }
    const parts = [resource.campusName];
    if (resource.campusPlaceName && resource.campusPlaceName !== resource.name) {
      parts.push(resource.campusPlaceName);
    }
    if (resource.floorLabel) {
      parts.push(resource.floorLabel);
    }
    return `${parts.join(' · ')} — the booked room is highlighted.`;
  }

  private async loadMapCampus(): Promise<void> {
    const resource = this.resource();
    if (!resource) {
      return;
    }
    try {
      this.mapCampus.set(await this.campusesService.get(resource.campusId));
    } catch {
      // The campus overlay is optional context; the map still shows all campuses.
      this.mapCampus.set(null);
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

import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BookableResourceDto,
  CampusDto,
  CampusSummaryDto,
  FloorMapDto,
  MeetingDto,
  UserSummaryDto,
} from '@campus/contracts';
import { DateTime } from 'luxon';

import { MemberMapboxViewComponent } from '../components/member-mapbox-view.component';
import { AuthService } from '../core/auth.service';
import { CampusesService } from '../core/campuses.service';
import { FloorsService } from '../core/floors.service';
import { MapsService } from '../core/maps.service';
import { MeetingsService } from '../core/meetings.service';
import { ResourcesService } from '../core/resources.service';
import { UsersService } from '../core/users.service';
import { BadgeComponent, ButtonDirective, EmptyStateComponent, PanelComponent } from '../ui';

const SLOT_HOURS = Array.from({ length: 12 }, (_, index) => index + 8); // 08:00 .. 19:00 starts

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [
    FormsModule,
    ScrollingModule,
    MemberMapboxViewComponent,
    PanelComponent,
    BadgeComponent,
    EmptyStateComponent,
    ButtonDirective,
  ],
  template: `
    <div class="grid content-start gap-4">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="text-sm text-muted">Loading available spaces…</p>
      } @else {
        <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(320px,32%,380px)] lg:items-start">
          <div class="grid gap-4">
          <app-panel heading="Choose a space" [sub]="spacesSubtitle()" [flush]="true">
            <div class="border-b border-line p-3">
              <div class="relative">
                <svg
                  class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  aria-hidden="true"
                >
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="m10.5 10.5 3.5 3.5" stroke-linecap="round" />
                </svg>
                <input
                  type="search"
                  class="w-full rounded-lg border border-line bg-panel py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-strong focus:outline-none"
                  placeholder="Search by name, campus, or floor"
                  aria-label="Search spaces"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="onSearchChange($event)"
                />
              </div>
              @if (mapFilter(); as filter) {
                <div class="mt-2 flex items-center gap-2 text-xs">
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-green-soft py-1 pl-2.5 pr-1.5 font-bold text-green">
                    <span class="max-w-52 truncate">{{ filter.label }}</span>
                    <button
                      type="button"
                      class="grid h-4 w-4 place-items-center rounded-full text-sm leading-none hover:bg-green/15"
                      (click)="clearMapFilter()"
                      aria-label="Show all spaces"
                    >
                      ×
                    </button>
                  </span>
                  <span class="text-muted">picked on the map</span>
                </div>
              }
            </div>

            @if (filteredResources().length > 0) {
              <cdk-virtual-scroll-viewport [itemSize]="rowHeight" class="h-64">
                <div
                  *cdkVirtualFor="let resource of filteredResources(); trackBy: trackResource"
                  class="h-[76px] px-3 pt-2.5"
                >
                  <button
                    type="button"
                    class="flex h-full w-full items-center gap-3 rounded-lg border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong/40"
                    [class]="
                      resource.id === selectedResource()?.id
                        ? 'border-green bg-green-soft/40'
                        : 'border-line bg-panel hover:border-strong/40 hover:bg-panel-soft'
                    "
                    [attr.aria-pressed]="resource.id === selectedResource()?.id"
                    (click)="pickResource(resource)"
                  >
                    <span
                      class="h-2 w-2 flex-none rounded-full"
                      [class]="resource.kind === 'room' ? 'bg-green' : 'bg-amber'"
                    ></span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-bold text-ink">{{ resource.name }}</span>
                      <span class="block truncate text-xs text-muted">
                        {{ resource.kind === 'room' ? 'Room' : 'Outdoor space' }} ·
                        {{ resourceLocation(resource) }}
                      </span>
                    </span>
                    @if (resource.id === selectedResource()?.id) {
                      <svg
                        class="h-4 w-4 flex-none text-green"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.2"
                        aria-hidden="true"
                      >
                        <path d="m3 8.5 3.5 3.5L13 4.5" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    } @else {
                      <svg
                        class="h-4 w-4 flex-none text-muted/60"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        aria-hidden="true"
                      >
                        <path d="m6 3.5 4.5 4.5L6 12.5" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    }
                  </button>
                </div>
              </cdk-virtual-scroll-viewport>
            } @else {
              <div class="grid gap-3 p-4">
                <app-empty-state
                  [title]="hasListFilters() ? 'No matching spaces' : 'No bookable spaces yet'"
                  [message]="
                    hasListFilters()
                      ? 'Try a different name, or widen the area picked on the map.'
                      : 'Rooms and outdoor spaces appear here once an admin configures them.'
                  "
                />
                @if (hasListFilters()) {
                  <button uiBtn="secondary" class="justify-self-center" type="button" (click)="clearListFilters()">
                    Show all spaces
                  </button>
                }
              </div>
            }
          </app-panel>

          <app-panel
            heading="Find on the map"
            sub="Click a campus, building, or room — the list narrows to what's inside it."
          >
            <app-member-mapbox-view
              [campuses]="campuses()"
              [selectedCampus]="mapCampus()"
              [floorMap]="floorMap()"
              [selectedCampusId]="mapCampus()?.id ?? null"
              [selectedPlaceId]="mapPlaceId()"
              [selectedRoomId]="selectedResource()?.roomId ?? null"
              (campusSelected)="onMapCampusSelected($event)"
              (placeSelected)="onMapPlaceSelected($event)"
              (roomSelected)="onMapRoomSelected($event)"
            />
          </app-panel>
          </div>

          @if (selectedResource(); as resource) {
            <app-panel [heading]="'Book ' + resource.name" [sub]="resourceLocation(resource)">
              <div class="grid gap-3">
                <div class="flex flex-wrap gap-2">
                  <app-badge tone="good">{{ resource.timezone }}</app-badge>
                  @if (resource.floorLabel) {
                    <app-badge>{{ resource.floorLabel }}</app-badge>
                  }
                  <app-badge>{{ resource.kind === 'room' ? 'Room' : 'Outdoor space' }}</app-badge>
                </div>

                <label>
                  Date
                  <input type="date" [(ngModel)]="selectedDate" (change)="onDateChange()" />
                </label>

                <strong class="text-xs font-black uppercase tracking-wider text-strong-2">Time slots</strong>
                @if (loadingSlots()) {
                  <p class="text-sm text-muted">Checking availability…</p>
                } @else {
                  <div class="grid grid-cols-4 gap-2">
                    @for (hour of slotHours; track hour) {
                      <button
                        type="button"
                        class="rounded-lg border py-2.5 text-sm font-bold transition-colors"
                        [class]="slotClass(hour)"
                        [disabled]="isBusy(hour)"
                        (click)="selectedHour.set(hour)"
                      >
                        {{ slotLabel(hour) }}
                      </button>
                    }
                  </div>
                }

                <label>
                  Meeting title
                  <input [(ngModel)]="title" placeholder="Team sync" />
                </label>
                <label>
                  Description
                  <textarea [(ngModel)]="description" placeholder="Optional agenda"></textarea>
                </label>

                <strong class="text-xs font-black uppercase tracking-wider text-strong-2">Participants</strong>
                <div class="grid gap-2">
                  @for (user of invitableUsers(); track user.id) {
                    <label
                      class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3"
                    >
                      <span class="text-sm font-bold text-ink">{{ user.displayName }} · {{ user.email }}</span>
                      <input
                        type="checkbox"
                        class="h-4 w-4 accent-strong"
                        [checked]="participantIds().has(user.id)"
                        (change)="toggleParticipant(user.id)"
                      />
                    </label>
                  } @empty {
                    <p class="text-sm text-muted">No other members to invite.</p>
                  }
                </div>

                @if (conflictError()) {
                  <p class="message error">{{ conflictError() }}</p>
                }

                <div class="grid gap-2.5 rounded-lg border border-line bg-panel p-3 text-sm">
                  <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                    <span class="font-semibold text-muted">Room</span><strong>{{ resource.name }}</strong>
                  </div>
                  <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                    <span class="font-semibold text-muted">Floor</span>
                    <strong>{{ resource.floorLabel || resource.campusPlaceName || '—' }}</strong>
                  </div>
                  <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                    <span class="font-semibold text-muted">Organizer</span><strong>{{ organizerName() }}</strong>
                  </div>
                  @if (selectedHour() !== null) {
                    <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                      <span class="font-semibold text-muted">Slot</span>
                      <strong>{{ selectedDate }} · {{ hourLabel(selectedHour()!) }}</strong>
                    </div>
                  }
                </div>

                <button
                  uiBtn
                  class="w-full"
                  type="button"
                  [disabled]="!canConfirm() || saving()"
                  (click)="confirm()"
                >
                  {{ saving() ? 'Booking…' : 'Confirm booking' }}
                </button>
              </div>
            </app-panel>
          } @else {
            <app-panel heading="Select a space" sub="Choose a room or outdoor space to see availability">
              <app-empty-state
                title="No space selected"
                message="Pick a room or outdoor space from the list to review its open slots."
              />
            </app-panel>
          }
        </section>
      }
    </div>
  `,
  styles: ``,
})
export class BookingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resourcesService = inject(ResourcesService);
  private readonly meetingsService = inject(MeetingsService);
  private readonly usersService = inject(UsersService);
  private readonly mapsService = inject(MapsService);
  private readonly campusesService = inject(CampusesService);
  private readonly floorsService = inject(FloorsService);
  private readonly auth = inject(AuthService);

  protected readonly slotHours = SLOT_HOURS;

  protected readonly resources = signal<BookableResourceDto[]>([]);
  protected readonly users = signal<UserSummaryDto[]>([]);
  protected readonly meetings = signal<MeetingDto[]>([]);
  protected readonly floorMap = signal<FloorMapDto | null>(null);
  protected readonly participantIds = signal<Set<string>>(new Set());
  protected readonly selectedHour = signal<number | null>(null);

  protected readonly loading = signal(true);
  protected readonly loadingSlots = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly conflictError = signal('');

  private readonly resourceId = signal<string | null>(null);

  protected selectedDate = DateTime.now().toISODate() ?? '2026-01-01';
  protected title = '';
  protected description = '';

  /** Fixed row slot height (button + gap) — must match the template's h-[76px]. */
  protected readonly rowHeight = 76;
  protected readonly searchQuery = signal('');
  private readonly listViewport = viewChild(CdkVirtualScrollViewport);
  private revealedSelection = false;

  // Map state: what the embedded campus map shows, and the area filter it
  // applies to the list when the user clicks a campus or building on it.
  protected readonly campuses = signal<CampusSummaryDto[]>([]);
  protected readonly mapCampus = signal<CampusDto | null>(null);
  protected readonly mapPlaceId = signal<string | null>(null);
  protected readonly mapFilter = signal<{
    campusId: string;
    placeId: string | null;
    label: string;
  } | null>(null);

  protected readonly selectedResource = computed(() => {
    const id = this.resourceId();
    return id ? (this.resources().find((resource) => resource.id === id) ?? null) : null;
  });

  protected readonly filteredResources = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const area = this.mapFilter();
    return this.resources().filter((resource) => {
      if (area && resource.campusId !== area.campusId) {
        return false;
      }
      if (area?.placeId && resource.campusPlaceId !== area.placeId) {
        return false;
      }
      return (
        !query ||
        resource.name.toLowerCase().includes(query) ||
        this.resourceLocation(resource).toLowerCase().includes(query)
      );
    });
  });

  protected readonly trackResource = (_index: number, resource: BookableResourceDto): string =>
    resource.id;

  protected readonly invitableUsers = computed(() => {
    const me = this.auth.user();
    return this.users().filter((user) => user.id !== me?.id);
  });

  private readonly busyHours = computed(() => new Set(this.meetings().map((meeting) => meeting.hour)));

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.resourceId.set(params.get('resourceId'));
        this.selectedHour.set(null);
        this.conflictError.set('');
        void this.syncSelection();
      });

    void this.loadInitial();

    // On a deep link (/book/:id) scroll the virtual list so the current
    // selection is visible instead of leaving it stranded below the fold.
    effect(() => {
      const viewport = this.listViewport();
      const selected = this.selectedResource();
      if (!viewport || !selected || this.revealedSelection) {
        return;
      }
      this.revealedSelection = true;
      const index = this.filteredResources().findIndex((resource) => resource.id === selected.id);
      if (index > 2) {
        viewport.scrollToIndex(index - 1);
      }
    });
  }

  protected spacesSubtitle(): string {
    const total = this.resources().length;
    const shown = this.filteredResources().length;
    return this.searchQuery().trim()
      ? `${shown} of ${total} spaces match`
      : `${total} bookable spaces in your organization`;
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.listViewport()?.scrollToIndex(0);
  }

  protected hasListFilters(): boolean {
    return !!this.searchQuery().trim() || !!this.mapFilter();
  }

  protected clearListFilters(): void {
    this.mapFilter.set(null);
    this.onSearchChange('');
  }

  protected clearMapFilter(): void {
    this.mapFilter.set(null);
    this.listViewport()?.scrollToIndex(0);
  }

  // ---- Map → list wiring --------------------------------------------------

  protected async onMapCampusSelected(campusId: string): Promise<void> {
    const campus = await this.loadMapCampus(campusId);
    if (!campus) {
      return;
    }
    this.mapPlaceId.set(null);
    this.floorMap.set(null);
    this.mapFilter.set({ campusId, placeId: null, label: campus.name });
    this.listViewport()?.scrollToIndex(0);
  }

  protected async onMapPlaceSelected(placeId: string): Promise<void> {
    const campus = this.mapCampus();
    const place = campus?.places.find((candidate) => candidate.id === placeId);
    if (!campus || !place) {
      return;
    }

    this.mapPlaceId.set(placeId);
    this.mapFilter.set({ campusId: campus.id, placeId, label: `${campus.name} · ${place.name}` });
    this.listViewport()?.scrollToIndex(0);

    // A whole-space resource (e.g. outdoor area) is picked directly.
    if (place.bookableResourceId) {
      const resource = this.resources().find((item) => item.id === place.bookableResourceId);
      if (resource) {
        this.pickResource(resource);
        return;
      }
    }

    // A building: reveal its first mapped floor so rooms become clickable.
    if (place.buildingId) {
      try {
        const floors = await this.floorsService.listForBuilding(place.buildingId);
        this.floorMap.set(floors.length > 0 ? await this.mapsService.get(floors[0].id) : null);
      } catch {
        this.floorMap.set(null);
      }
    }
  }

  protected onMapRoomSelected(roomId: string): void {
    const resource = this.resources().find((item) => item.roomId === roomId);
    if (resource) {
      this.pickResource(resource);
    }
  }

  private async loadMapCampus(campusId: string): Promise<CampusDto | null> {
    const current = this.mapCampus();
    if (current?.id === campusId) {
      return current;
    }
    try {
      const campus = await this.campusesService.get(campusId);
      this.mapCampus.set(campus);
      return campus;
    } catch {
      // The map is companion context; the list keeps working without it.
      return null;
    }
  }

  private async syncMapToResource(resource: BookableResourceDto): Promise<void> {
    await this.loadMapCampus(resource.campusId);
    this.mapPlaceId.set(resource.campusPlaceId);
  }

  protected pickResource(resource: BookableResourceDto): void {
    void this.router.navigate(['/book', resource.id]);
  }

  protected onDateChange(): void {
    this.selectedHour.set(null);
    this.conflictError.set('');
    void this.syncSelection();
  }

  protected resourceLocation(resource: BookableResourceDto): string {
    const parts = [resource.campusName];
    if (resource.campusPlaceName && resource.campusPlaceName !== resource.name) {
      parts.push(resource.campusPlaceName);
    }
    if (resource.floorLabel) {
      parts.push(resource.floorLabel);
    }
    return parts.join(' · ');
  }

  protected hourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`;
  }

  protected slotLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  protected organizerName(): string {
    return this.auth.user()?.displayName ?? 'You';
  }

  protected isBusy(hour: number): boolean {
    return this.busyHours().has(hour);
  }

  protected slotClass(hour: number): string {
    if (this.isBusy(hour)) {
      return 'border-line bg-panel-soft text-muted line-through';
    }
    if (this.selectedHour() === hour) {
      return 'border-strong bg-strong text-white';
    }
    return 'border-line bg-panel text-ink hover:border-strong';
  }

  protected toggleParticipant(userId: string): void {
    const next = new Set(this.participantIds());
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    this.participantIds.set(next);
  }

  protected canConfirm(): boolean {
    return !!this.selectedResource() && this.selectedHour() !== null && this.title.trim().length > 0;
  }

  protected async confirm(): Promise<void> {
    const resource = this.selectedResource();
    const hour = this.selectedHour();
    if (!resource || hour === null) {
      return;
    }

    this.saving.set(true);
    this.conflictError.set('');
    this.error.set('');

    try {
      const meeting = await this.meetingsService.create({
        bookableResourceId: resource.id,
        title: this.title.trim(),
        description: this.description.trim(),
        localDate: this.selectedDate,
        hour,
        participantUserIds: Array.from(this.participantIds()),
      });
      await this.router.navigate(['/bookings', meeting.id]);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.conflictError.set(
          extractMessage(error) || 'This slot was just booked by someone else. Pick another one.',
        );
        this.selectedHour.set(null);
        await this.loadSlots();
      } else {
        this.conflictError.set(extractMessage(error));
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async loadInitial(): Promise<void> {
    try {
      const [resources, users, campuses] = await Promise.all([
        this.resourcesService.list(),
        this.usersService.list(),
        this.campusesService.list(),
      ]);
      this.resources.set(resources);
      this.users.set(users);
      this.campuses.set(campuses);
    } catch (error) {
      this.error.set(extractMessage(error));
    } finally {
      this.loading.set(false);
    }

    await this.syncSelection();
  }

  private async syncSelection(): Promise<void> {
    const resource = this.selectedResource();
    if (!resource) {
      this.meetings.set([]);
      this.floorMap.set(null);
      return;
    }

    await Promise.all([
      this.loadSlots(),
      this.loadFloorMap(resource),
      this.syncMapToResource(resource),
    ]);
  }

  private async loadSlots(): Promise<void> {
    const resource = this.selectedResource();
    if (!resource) {
      return;
    }

    this.loadingSlots.set(true);
    try {
      this.meetings.set(await this.meetingsService.list(resource.id, this.selectedDate));
    } catch (error) {
      this.error.set(extractMessage(error));
    } finally {
      this.loadingSlots.set(false);
    }
  }

  private async loadFloorMap(resource: BookableResourceDto): Promise<void> {
    if (!resource.floorMapId) {
      this.floorMap.set(null);
      return;
    }

    if (this.floorMap()?.id === resource.floorMapId) {
      return;
    }

    this.floorMap.set(null);
    try {
      this.floorMap.set(await this.mapsService.get(resource.floorMapId));
    } catch {
      // The floor preview is optional context; booking still works without it.
      this.floorMap.set(null);
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

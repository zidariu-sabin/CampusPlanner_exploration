import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  CampusDto,
  CampusPlaceDto,
  CampusSummaryDto,
  FloorMapDto,
  FloorMapSummaryDto,
  RoomSearchResultDto,
} from '@campus/contracts';

import { MemberMapboxViewComponent } from '../components/member-mapbox-view.component';
import { CampusesService } from '../core/campuses.service';
import { FloorsService } from '../core/floors.service';
import { MapsService } from '../core/maps.service';
import { BadgeComponent, ButtonDirective, EmptyStateComponent, PanelComponent } from '../ui';

@Component({
  selector: 'app-member-map-page',
  standalone: true,
  imports: [
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

      <section class="grid gap-4 lg:grid-cols-[clamp(280px,26%,340px)_minmax(0,1fr)] lg:items-start">
        <app-panel heading="Map selector" [sub]="selectorSubtitle()">
          <div class="grid gap-4">
            <div class="grid gap-2 rounded-lg border border-line bg-panel-muted p-3 text-xs">
              @for (row of summaryRows(); track row.label) {
                <div class="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
                  <span class="font-bold text-muted">{{ row.label }}</span>
                  <strong class="truncate">{{ row.value }}</strong>
                </div>
              }
            </div>

            <div class="grid gap-2">
              <strong class="text-xs font-black uppercase tracking-wider text-strong-2">Campuses</strong>
              @if (loadingCampuses()) {
                <p class="text-sm text-muted">Loading campuses…</p>
              }
              @for (campus of campuses(); track campus.id) {
                <button
                  type="button"
                  class="grid gap-1 rounded-lg border p-2.5 text-left text-ink transition-colors"
                  [class]="campus.id === selectedCampus()?.id ? 'border-green bg-green-soft' : 'border-line bg-panel hover:bg-panel-soft'"
                  (click)="selectCampus(campus)"
                >
                  <strong class="text-sm">{{ campus.name }}</strong>
                  <span class="text-xs text-muted">{{ campus.placeCount }} spaces · {{ campus.roomCount }} rooms</span>
                </button>
              } @empty {
                @if (!loadingCampuses()) {
                  <p class="text-sm text-muted">No campuses configured yet.</p>
                }
              }
            </div>

            @if (selectedCampus()) {
              <div class="grid gap-2">
                <strong class="text-xs font-black uppercase tracking-wider text-strong-2">Spaces</strong>
                @if (loadingPlaces()) {
                  <p class="text-sm text-muted">Loading spaces…</p>
                }
                @for (place of places(); track place.id) {
                  <button
                    type="button"
                    class="grid gap-1 rounded-lg border p-2.5 text-left text-ink transition-colors"
                    [class]="place.id === selectedPlace()?.id ? 'border-green bg-green-soft' : 'border-line bg-panel hover:bg-panel-soft'"
                    (click)="selectPlace(place)"
                  >
                    <strong class="text-sm">{{ place.name }}</strong>
                    <span class="text-xs capitalize text-muted">{{ typeLabel(place) }}{{ place.bookable ? ' · bookable' : '' }}</span>
                  </button>
                } @empty {
                  @if (!loadingPlaces()) {
                    <p class="text-sm text-muted">This campus has no spaces yet.</p>
                  }
                }
              </div>
            }

            @if (selectedPlace(); as place) {
              @if (place.buildingId) {
                <div class="grid gap-2.5 rounded-lg border border-line bg-panel-muted p-3">
                  <strong class="text-sm">Floors</strong>
                  @if (loadingFloors()) {
                    <p class="text-sm text-muted">Loading floors…</p>
                  }
                  <div class="flex flex-wrap gap-1.5">
                    @for (floor of floors(); track floor.id) {
                      <button
                        type="button"
                        class="rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors"
                        [class]="floor.id === selectedFloor()?.id ? 'border-strong bg-strong text-white' : 'border-line bg-panel text-muted hover:text-ink'"
                        (click)="selectFloor(floor)"
                      >
                        {{ floor.floorLabel }}
                      </button>
                    }
                  </div>
                  @if (selectedFloor(); as floor) {
                    <p class="text-xs text-muted">{{ floor.roomCount }} rooms on this floor</p>
                  } @else if (!loadingFloors() && floors().length === 0) {
                    <p class="text-xs text-muted">No floors mapped for this building yet.</p>
                  }
                </div>
              } @else if (place.bookable && place.bookableResourceId) {
                <app-empty-state title="Outdoor space" message="This space is bookable as a whole." />
                <button uiBtn type="button" (click)="bookResource(place.bookableResourceId)">
                  Book {{ place.name }}
                </button>
              }
            }

            @if (selectedFloor(); as floor) {
              <div class="grid gap-2.5">
                <div class="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3">
                  <span class="text-sm">Available rooms on this floor</span>
                  <app-badge tone="good">{{ floor.roomCount }} rooms</app-badge>
                </div>
                <div class="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3">
                  <span class="text-sm">Selected layer</span>
                  <app-badge>{{ floor.floorLabel }} rooms</app-badge>
                </div>
              </div>
            }
          </div>
        </app-panel>

        <app-panel [heading]="canvasTitle()" [sub]="canvasSubtitle()">
          @if (loadingFloorMap()) {
            <app-badge panelAction>Loading floor…</app-badge>
          } @else if (selectedCampus()) {
            <app-badge panelAction tone="good">{{ selectedCampus()!.placeCount }} spaces</app-badge>
          } @else {
            <app-badge panelAction>{{ campuses().length }} campuses</app-badge>
          }

          <div class="grid gap-3">
            <div class="relative z-[5]">
              <div class="relative flex items-center">
                <svg
                  class="pointer-events-none absolute left-3 h-4 w-4 text-muted"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  aria-hidden="true"
                >
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M11 11l3 3" stroke-linecap="round" />
                </svg>
                <input
                  type="text"
                  placeholder="Search for a room…"
                  autocomplete="off"
                  class="w-full rounded-lg border border-line bg-panel py-2.5 pl-9 pr-9 text-sm text-ink focus:border-strong focus:outline-none focus:ring-2 focus:ring-strong/15"
                  [value]="searchTerm()"
                  (input)="onSearchInput($any($event.target).value)"
                  (focus)="searchOpen.set(true)"
                  (blur)="closeSearch()"
                />
                @if (searchTerm()) {
                  <button
                    type="button"
                    class="absolute right-2 grid h-5 w-5 place-items-center rounded-full border-0 bg-panel-soft p-0 text-base leading-none text-ink hover:bg-line"
                    (click)="clearSearch()"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                }
              </div>

              @if (searchOpen() && searchTerm().trim().length >= 2) {
                <div
                  class="absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-72 overflow-y-auto rounded-lg border border-line bg-panel p-1.5 shadow-panel"
                >
                  @if (searching()) {
                    <p class="px-3 py-2.5 text-sm text-muted">Searching…</p>
                  } @else if (searchResults().length === 0) {
                    <p class="px-3 py-2.5 text-sm text-muted">No rooms match “{{ searchTerm() }}”.</p>
                  } @else {
                    @for (result of searchResults(); track result.roomId) {
                      <button
                        type="button"
                        class="flex w-full flex-col gap-0.5 rounded-md border-0 bg-transparent px-3 py-2 text-left hover:bg-panel-soft"
                        (mousedown)="$event.preventDefault()"
                        (click)="goToRoom(result)"
                      >
                        <strong class="text-sm text-ink">{{ result.roomName }}</strong>
                        <span class="text-xs text-muted">{{ result.campusName }} · {{ result.campusPlaceName }} · {{ result.floorLabel }}</span>
                      </button>
                    }
                  }
                </div>
              }
            </div>

            <app-member-mapbox-view
              [campuses]="campuses()"
              [selectedCampus]="selectedCampus()"
              [floorMap]="floorMap()"
              [selectedCampusId]="selectedCampus()?.id ?? null"
              [selectedPlaceId]="selectedPlace()?.id ?? null"
              [selectedRoomId]="selectedRoomId()"
              (campusSelected)="onCampusSelected($event)"
              (placeSelected)="onPlaceSelected($event)"
              (roomSelected)="onRoomSelected($event)"
            />

            @if (selectedRoom(); as room) {
              <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel-muted p-3">
                <div>
                  <strong>{{ room.name }}</strong>
                  <p class="text-sm text-muted">{{ floorMap()?.campusPlaceName }} · {{ floorMap()?.floorLabel }}</p>
                </div>
                @if (room.bookableResourceId) {
                  <button uiBtn type="button" (click)="bookResource(room.bookableResourceId)">Book this room</button>
                } @else {
                  <span class="text-sm text-muted">This room is not bookable.</span>
                }
              </div>
            }
          </div>
        </app-panel>
      </section>
    </div>
  `,
  styles: ``,
})
export class MemberMapPageComponent {
  private readonly campusesService = inject(CampusesService);
  private readonly floorsService = inject(FloorsService);
  private readonly mapsService = inject(MapsService);
  private readonly router = inject(Router);

  protected readonly campuses = signal<CampusSummaryDto[]>([]);
  protected readonly selectedCampus = signal<CampusDto | null>(null);
  protected readonly selectedPlace = signal<CampusPlaceDto | null>(null);
  protected readonly floors = signal<FloorMapSummaryDto[]>([]);
  protected readonly selectedFloor = signal<FloorMapSummaryDto | null>(null);
  protected readonly floorMap = signal<FloorMapDto | null>(null);
  protected readonly selectedRoomId = signal<string | null>(null);

  protected readonly loadingCampuses = signal(true);
  protected readonly loadingPlaces = signal(false);
  protected readonly loadingFloors = signal(false);
  protected readonly loadingFloorMap = signal(false);
  protected readonly error = signal('');

  protected readonly searchTerm = signal('');
  protected readonly searchResults = signal<RoomSearchResultDto[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchOpen = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchSeq = 0;

  protected readonly places = computed(() => this.selectedCampus()?.places ?? []);

  protected readonly selectedRoom = computed(() => {
    const roomId = this.selectedRoomId();
    return roomId ? (this.floorMap()?.rooms.find((room) => room.id === roomId) ?? null) : null;
  });

  constructor() {
    void this.loadCampuses();
  }

  protected async selectCampus(campus: CampusSummaryDto): Promise<void> {
    if (this.selectedCampus()?.id === campus.id) {
      return;
    }

    this.error.set('');
    this.selectedPlace.set(null);
    this.floors.set([]);
    this.clearFloorSelection();
    this.loadingPlaces.set(true);

    try {
      this.selectedCampus.set(await this.campusesService.get(campus.id));
    } catch (error) {
      this.error.set(extractMessage(error));
    } finally {
      this.loadingPlaces.set(false);
    }
  }

  protected async selectPlace(place: CampusPlaceDto): Promise<void> {
    if (this.selectedPlace()?.id === place.id) {
      return;
    }

    this.error.set('');
    this.selectedPlace.set(place);
    this.floors.set([]);
    this.clearFloorSelection();

    if (!place.buildingId) {
      return;
    }

    this.loadingFloors.set(true);
    try {
      const floors = await this.floorsService.listForBuilding(place.buildingId);
      this.floors.set(floors);
      // Reveal the first floor's rooms immediately so the layer is visible on selection.
      if (floors.length > 0) {
        await this.selectFloor(floors[0]);
      }
    } catch (error) {
      this.error.set(extractMessage(error));
    } finally {
      this.loadingFloors.set(false);
    }
  }

  protected async selectFloor(floor: FloorMapSummaryDto): Promise<void> {
    if (this.selectedFloor()?.id === floor.id) {
      return;
    }

    this.error.set('');
    this.selectedFloor.set(floor);
    this.selectedRoomId.set(null);
    this.loadingFloorMap.set(true);

    try {
      this.floorMap.set(await this.mapsService.get(floor.id));
    } catch (error) {
      this.floorMap.set(null);
      this.error.set(extractMessage(error));
    } finally {
      this.loadingFloorMap.set(false);
    }
  }

  protected onRoomSelected(roomId: string): void {
    this.selectedRoomId.set(roomId);
  }

  protected onCampusSelected(campusId: string): void {
    const campus = this.campuses().find((item) => item.id === campusId);
    if (campus) {
      void this.selectCampus(campus);
    }
  }

  protected onPlaceSelected(placeId: string): void {
    const place = this.places().find((item) => item.id === placeId);
    if (place) {
      void this.selectPlace(place);
    }
  }

  // ---- Room search -------------------------------------------------------

  protected onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.searchOpen.set(true);

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }

    const term = value.trim();
    if (term.length < 2) {
      this.searchResults.set([]);
      this.searching.set(false);
      return;
    }

    this.searching.set(true);
    this.searchTimer = setTimeout(() => void this.runSearch(term), 250);
  }

  private async runSearch(term: string): Promise<void> {
    const seq = ++this.searchSeq;
    try {
      const results = await this.campusesService.searchRooms(term);
      if (seq === this.searchSeq) {
        this.searchResults.set(results);
      }
    } catch {
      if (seq === this.searchSeq) {
        this.searchResults.set([]);
      }
    } finally {
      if (seq === this.searchSeq) {
        this.searching.set(false);
      }
    }
  }

  protected closeSearch(): void {
    // Defer so a result click registers before the dropdown is hidden on blur.
    setTimeout(() => this.searchOpen.set(false), 150);
  }

  protected clearSearch(): void {
    this.searchSeq++;
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.searching.set(false);
    this.searchOpen.set(false);
  }

  protected async goToRoom(result: RoomSearchResultDto): Promise<void> {
    this.searchTerm.set(result.roomName);
    this.searchResults.set([]);
    this.searchOpen.set(false);
    this.error.set('');

    if (this.selectedCampus()?.id !== result.campusId) {
      const campus = this.campuses().find((item) => item.id === result.campusId);
      if (campus) {
        await this.selectCampus(campus);
      }
    }

    if (this.selectedPlace()?.id !== result.campusPlaceId) {
      const place = this.places().find((item) => item.id === result.campusPlaceId);
      if (place) {
        await this.selectPlace(place);
      }
    }

    if (this.selectedFloor()?.id !== result.floorMapId) {
      const floor = this.floors().find((item) => item.id === result.floorMapId);
      if (floor) {
        await this.selectFloor(floor);
      }
    }

    this.selectedRoomId.set(result.roomId);
  }

  protected canvasTitle(): string {
    const floor = this.selectedFloor();
    const place = this.selectedPlace();
    const campus = this.selectedCampus();
    if (place && floor) {
      return `${place.name} · ${floor.floorLabel}`;
    }
    if (campus) {
      return campus.name;
    }
    return 'Organization map';
  }

  protected canvasSubtitle(): string {
    if (this.selectedFloor()) {
      return 'Click a room to see its details or book it.';
    }
    if (this.selectedCampus()) {
      return 'Click a building or space to drill into its floors and rooms.';
    }
    return 'Click a campus to load its spaces and rooms.';
  }

  protected bookResource(resourceId: string | null): void {
    if (resourceId) {
      void this.router.navigate(['/book', resourceId]);
    }
  }

  protected typeLabel(place: CampusPlaceDto): string {
    return place.type.replace(/_/g, ' ');
  }

  protected selectorSubtitle(): string {
    const floor = this.selectedFloor();
    const place = this.selectedPlace();
    const campus = this.selectedCampus();
    if (place && floor) {
      return `${place.name} · ${floor.floorLabel}`;
    }
    if (place) {
      return place.name;
    }
    if (campus) {
      return campus.name;
    }
    return 'Choose a campus to inspect';
  }

  protected summaryRows(): { label: string; value: string }[] {
    return [
      { label: 'Campus', value: this.selectedCampus()?.name || 'None selected' },
      { label: 'Space', value: this.selectedPlace()?.name || 'None selected' },
      { label: 'Floor', value: this.selectedFloor()?.floorLabel || 'None selected' },
    ];
  }

  private clearFloorSelection(): void {
    this.selectedFloor.set(null);
    this.floorMap.set(null);
    this.selectedRoomId.set(null);
  }

  private async loadCampuses(): Promise<void> {
    try {
      this.campuses.set(await this.campusesService.list());
    } catch (error) {
      this.error.set(extractMessage(error));
    } finally {
      this.loadingCampuses.set(false);
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

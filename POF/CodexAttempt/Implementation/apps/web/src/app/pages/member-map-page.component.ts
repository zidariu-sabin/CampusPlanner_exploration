import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  CampusDto,
  CampusPlaceDto,
  CampusSummaryDto,
  FloorMapDto,
  FloorMapSummaryDto,
} from '@campus/contracts';

import { MemberMapboxViewComponent } from '../components/member-mapbox-view.component';
import { CampusesService } from '../core/campuses.service';
import { FloorsService } from '../core/floors.service';
import { MapsService } from '../core/maps.service';

@Component({
  selector: 'app-member-map-page',
  standalone: true,
  imports: [CommonModule, MemberMapboxViewComponent],
  template: `
    <div class="screen-shell">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      <section class="map-layout side-first">
        <section class="panel">
          <header class="panel-header">
            <div>
              <h3>Map selector</h3>
              <p>{{ selectorSubtitle() }}</p>
            </div>
          </header>
          <div class="panel-body">
            <div class="selection-summary">
              <div><span>Campus</span><strong>{{ selectedCampus()?.name || 'None selected' }}</strong></div>
              <div><span>Space</span><strong>{{ selectedPlace()?.name || 'None selected' }}</strong></div>
              <div><span>Floor</span><strong>{{ selectedFloor()?.floorLabel || 'None selected' }}</strong></div>
            </div>

            <div class="map-stage-list">
              <strong class="selector-label">Campuses</strong>
              @if (loadingCampuses()) {
                <p class="muted">Loading campuses...</p>
              }
              @for (campus of campuses(); track campus.id) {
                <button
                  type="button"
                  [class.active]="campus.id === selectedCampus()?.id"
                  (click)="selectCampus(campus)"
                >
                  <strong>{{ campus.name }}</strong>
                  <span>{{ campus.placeCount }} spaces · {{ campus.roomCount }} rooms</span>
                </button>
              } @empty {
                @if (!loadingCampuses()) {
                  <p class="muted">No campuses configured yet.</p>
                }
              }
            </div>

            @if (selectedCampus()) {
              <div class="map-stage-list">
                <strong class="selector-label">Spaces</strong>
                @if (loadingPlaces()) {
                  <p class="muted">Loading spaces...</p>
                }
                @for (place of places(); track place.id) {
                  <button
                    type="button"
                    [class.active]="place.id === selectedPlace()?.id"
                    (click)="selectPlace(place)"
                  >
                    <strong>{{ place.name }}</strong>
                    <span>{{ typeLabel(place) }}{{ place.bookable ? ' · bookable' : '' }}</span>
                  </button>
                } @empty {
                  @if (!loadingPlaces()) {
                    <p class="muted">This campus has no spaces yet.</p>
                  }
                }
              </div>
            }

            @if (selectedPlace(); as place) {
              @if (place.buildingId) {
                <div class="floor-selector">
                  <strong>Floors</strong>
                  @if (loadingFloors()) {
                    <p>Loading floors...</p>
                  }
                  <div>
                    @for (floor of floors(); track floor.id) {
                      <button
                        type="button"
                        [class.active]="floor.id === selectedFloor()?.id"
                        (click)="selectFloor(floor)"
                      >
                        {{ floor.floorLabel }}
                      </button>
                    }
                  </div>
                  @if (selectedFloor(); as floor) {
                    <p>{{ floor.roomCount }} rooms on this floor</p>
                  } @else if (!loadingFloors() && floors().length === 0) {
                    <p>No floors mapped for this building yet.</p>
                  }
                </div>
              } @else if (place.bookable && place.bookableResourceId) {
                <div class="inline-form-title">
                  <strong>Outdoor space</strong>
                  <span>This space is bookable as a whole.</span>
                </div>
                <button class="primary-action" type="button" (click)="bookResource(place.bookableResourceId)">
                  Book {{ place.name }}
                </button>
              }
            }

            @if (selectedFloor(); as floor) {
              <div class="task-list">
                <div class="task">
                  <span>Available rooms on this floor</span>
                  <span class="badge badge-good">{{ floor.roomCount }} rooms</span>
                </div>
                <div class="task">
                  <span>Selected layer</span>
                  <span class="badge">{{ floor.floorLabel }} rooms</span>
                </div>
              </div>
            }
          </div>
        </section>

        <section class="panel canvas">
          <header class="panel-header">
            <div>
              <h3>{{ canvasTitle() }}</h3>
              <p>{{ canvasSubtitle() }}</p>
            </div>
            @if (loadingFloorMap()) {
              <span class="badge">Loading floor…</span>
            } @else if (selectedCampus()) {
              <span class="badge badge-good">{{ selectedCampus()!.placeCount }} spaces</span>
            } @else {
              <span class="badge">{{ campuses().length }} campuses</span>
            }
          </header>
          <div class="panel-body">
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
              <div class="room-bar">
                <div>
                  <strong>{{ room.name }}</strong>
                  <p class="muted">
                    {{ floorMap()?.campusPlaceName }} · {{ floorMap()?.floorLabel }}
                  </p>
                </div>
                @if (room.bookableResourceId) {
                  <button class="primary-action" type="button" (click)="bookResource(room.bookableResourceId)">
                    Book this room
                  </button>
                } @else {
                  <span class="muted">This room is not bookable.</span>
                }
              </div>
            }
          </div>
        </section>
      </section>
    </div>
  `,
  styles: `
    .canvas {
      min-height: 540px;
    }

    .room-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfc;
    }
  `,
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

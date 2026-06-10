import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  BoundingBox,
  CampusDto,
  CampusPlaceDto,
  CampusSummaryDto,
  FloorMapDto,
  FloorMapSummaryDto,
  getProjectedBoundingBox,
  projectedPolygonToPointsAttribute,
} from '@campus/contracts';

import { MapboxMapViewComponent } from '../components/mapbox-map-view.component';
import { CampusesService } from '../core/campuses.service';
import { FloorsService } from '../core/floors.service';
import { MapsService } from '../core/maps.service';

@Component({
  selector: 'app-member-map-page',
  standalone: true,
  imports: [CommonModule, MapboxMapViewComponent],
  template: `
    <div class="page">
      <section class="section-header">
        <div>
          <h1>Map view</h1>
          <p class="muted">Pick a campus, then a space, then a floor to reveal its rooms.</p>
        </div>
      </section>

      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      <section class="map-layout">
        <aside class="card panel selector">
          <div class="summary">
            <div class="summary-row">
              <span class="muted">Campus</span>
              <strong>{{ selectedCampus()?.name || '—' }}</strong>
            </div>
            <div class="summary-row">
              <span class="muted">Space</span>
              <strong>{{ selectedPlace()?.name || '—' }}</strong>
            </div>
            <div class="summary-row">
              <span class="muted">Floor</span>
              <strong>{{ selectedFloor()?.floorLabel || '—' }}</strong>
            </div>
          </div>

          <div class="option-group">
            <h3>Campuses</h3>
            @if (loadingCampuses()) {
              <p class="muted">Loading campuses...</p>
            }
            @for (campus of campuses(); track campus.id) {
              <button
                type="button"
                class="option"
                [class.selected]="campus.id === selectedCampus()?.id"
                (click)="selectCampus(campus)"
              >
                <strong>{{ campus.name }}</strong>
                <span class="muted">
                  {{ campus.placeCount }} spaces · {{ campus.roomCount }} rooms
                </span>
              </button>
            } @empty {
              @if (!loadingCampuses()) {
                <p class="muted">No campuses configured yet.</p>
              }
            }
          </div>

          @if (selectedCampus()) {
            <div class="option-group">
              <h3>Spaces</h3>
              @if (loadingPlaces()) {
                <p class="muted">Loading spaces...</p>
              }
              @for (place of places(); track place.id) {
                <button
                  type="button"
                  class="option"
                  [class.selected]="place.id === selectedPlace()?.id"
                  (click)="selectPlace(place)"
                >
                  <strong>{{ place.name }}</strong>
                  <span class="option-chips">
                    <span class="chip">{{ typeLabel(place) }}</span>
                    @if (place.bookable) {
                      <span class="chip">bookable</span>
                    }
                  </span>
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
              <div class="option-group">
                <h3>Floors</h3>
                @if (loadingFloors()) {
                  <p class="muted">Loading floors...</p>
                }
                @for (floor of floors(); track floor.id) {
                  <button
                    type="button"
                    class="option"
                    [class.selected]="floor.id === selectedFloor()?.id"
                    (click)="selectFloor(floor)"
                  >
                    <strong>{{ floor.floorLabel }}</strong>
                    <span class="muted">{{ floor.roomCount }} rooms</span>
                  </button>
                } @empty {
                  @if (!loadingFloors()) {
                    <p class="muted">No floors mapped for this building yet.</p>
                  }
                }
              </div>
            } @else if (place.bookable && place.bookableResourceId) {
              <div class="option-group">
                <h3>Outdoor space</h3>
                <p class="muted">This space is bookable as a whole.</p>
                <button type="button" (click)="bookResource(place.bookableResourceId)">
                  Book {{ place.name }}
                </button>
              </div>
            }
          }
        </aside>

        <section class="card panel canvas">
          @if (floorMap(); as map) {
            <div class="section-header">
              <div>
                <h2>{{ map.campusPlaceName }} · {{ map.floorLabel }}</h2>
                <p class="muted">Click a room to book it.</p>
              </div>
            </div>

            <app-mapbox-map-view
              [map]="map"
              [selectedRoomId]="selectedRoomId()"
              (roomSelected)="onRoomSelected($event)"
            />

            @if (selectedRoom(); as room) {
              <div class="room-bar">
                <div>
                  <strong>{{ room.name }}</strong>
                  <p class="muted">{{ map.campusPlaceName }} · {{ map.floorLabel }}</p>
                </div>
                @if (room.bookableResourceId) {
                  <button type="button" (click)="bookResource(room.bookableResourceId)">
                    Book this room
                  </button>
                } @else {
                  <span class="muted">This room is not bookable.</span>
                }
              </div>
            }
          } @else if (loadingFloorMap()) {
            <p class="muted">Loading floor map...</p>
          } @else if (selectedCampus(); as campus) {
            <div class="section-header">
              <div>
                <h2>{{ campus.name }}</h2>
                <p class="muted">Campus spaces. Select a building to see its floors.</p>
              </div>
            </div>

            @if (places().length > 0) {
              <svg class="campus-svg" [attr.viewBox]="campusViewBox()">
                @for (place of places(); track place.id) {
                  <g>
                    <polygon
                      class="place-shape"
                      [class.outdoor]="!place.buildingId"
                      [class.selected]="place.id === selectedPlace()?.id"
                      [attr.points]="placePoints(place)"
                      (click)="selectPlace(place)"
                    />
                    <text class="place-label" [attr.x]="placeLabelX(place)" [attr.y]="placeLabelY(place)">
                      {{ place.name }}
                    </text>
                  </g>
                }
              </svg>
            } @else {
              <p class="muted">Nothing to draw yet for this campus.</p>
            }
          } @else {
            <div class="empty-canvas">
              <h2>Pick a campus</h2>
              <p class="muted">
                The map keeps the parent context in the selection summary while you drill into
                spaces, floors, and rooms.
              </p>
            </div>
          }
        </section>
      </section>
    </div>
  `,
  styles: `
    .map-layout {
      display: grid;
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .panel {
      padding: 1.25rem;
      display: grid;
      gap: 1.1rem;
    }

    .summary {
      display: grid;
      gap: 0.4rem;
      padding: 0.85rem 1rem;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.6);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      font-size: 0.95rem;
    }

    .option-group {
      display: grid;
      gap: 0.55rem;
    }

    .option {
      display: grid;
      gap: 0.2rem;
      justify-items: start;
      text-align: left;
      padding: 0.75rem 0.95rem;
      border-radius: 16px;
      background: white;
      color: var(--ink);
      box-shadow: inset 0 0 0 1px var(--line);
    }

    .option.selected {
      box-shadow: inset 0 0 0 2px var(--brand);
      background: rgba(14, 116, 144, 0.06);
    }

    .option-chips {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .canvas {
      min-height: 540px;
      align-content: start;
    }

    .campus-svg {
      width: 100%;
      min-height: 440px;
      border-radius: 22px;
      background:
        linear-gradient(90deg, rgba(31, 42, 51, 0.04) 1px, transparent 1px),
        linear-gradient(rgba(31, 42, 51, 0.04) 1px, transparent 1px), white;
      background-size: 20px 20px;
      box-shadow: inset 0 0 0 1px rgba(31, 42, 51, 0.08);
    }

    .place-shape {
      fill: rgba(14, 116, 144, 0.18);
      stroke: var(--brand-strong);
      stroke-width: 2;
      cursor: pointer;
      transition: fill 120ms ease, stroke-width 120ms ease;
    }

    .place-shape.outdoor {
      fill: rgba(194, 65, 12, 0.16);
      stroke: var(--accent);
    }

    .place-shape:hover {
      fill-opacity: 0.85;
    }

    .place-shape.selected {
      stroke-width: 4;
    }

    .place-label {
      font-size: 12px;
      fill: #0f172a;
      pointer-events: none;
    }

    .room-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 0.85rem 1rem;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.6);
    }

    .empty-canvas {
      display: grid;
      gap: 0.5rem;
      padding: 3rem 1rem;
      justify-items: center;
      text-align: center;
    }

    @media (max-width: 980px) {
      .map-layout {
        grid-template-columns: 1fr;
      }
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
      this.floors.set(await this.floorsService.listForBuilding(place.buildingId));
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

  protected bookResource(resourceId: string | null): void {
    if (resourceId) {
      void this.router.navigate(['/book', resourceId]);
    }
  }

  protected typeLabel(place: CampusPlaceDto): string {
    return place.type.replace(/_/g, ' ');
  }

  protected campusViewBox(): string {
    const box = this.campusBounds();
    const padX = Math.max(box.width * 0.08, 24);
    const padY = Math.max(box.height * 0.08, 24);
    return `${box.minX - padX} ${box.minY - padY} ${box.width + padX * 2} ${box.height + padY * 2}`;
  }

  protected placePoints(place: CampusPlaceDto): string {
    return projectedPolygonToPointsAttribute(place.footprintGeoJson);
  }

  protected placeLabelX(place: CampusPlaceDto): number {
    return getProjectedBoundingBox(place.footprintGeoJson).minX + 6;
  }

  protected placeLabelY(place: CampusPlaceDto): number {
    const box = getProjectedBoundingBox(place.footprintGeoJson);
    return box.minY + Math.min(Math.max(box.height * 0.3, 14), 22);
  }

  private campusBounds(): BoundingBox {
    const boxes = this.places().map((place) => getProjectedBoundingBox(place.footprintGeoJson));
    if (boxes.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    }

    const minX = Math.min(...boxes.map((box) => box.minX));
    const minY = Math.min(...boxes.map((box) => box.minY));
    const maxX = Math.max(...boxes.map((box) => box.maxX));
    const maxY = Math.max(...boxes.map((box) => box.maxY));

    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
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

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CampusDto,
  CampusPlaceDto,
  CampusSummaryDto,
  FloorMapSummaryDto,
} from '@campus/contracts';

import { CampusesService } from '../core/campuses.service';
import { FloorsService } from '../core/floors.service';

type SpaceConfigPanel = 'select' | 'review';

@Component({
  selector: 'app-space-config-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="screen-shell">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      <section class="step-strip">
        <button type="button" [class.active]="panel() === 'select'" (click)="panel.set('select')">
          <span>1</span>
          <strong>Select space</strong>
          <small>Choose the campus, building, and floor that will receive the plan.</small>
        </button>
        <button
          type="button"
          [disabled]="!selectedFloor()"
          (click)="openEditor('map')"
        >
          <span>2</span>
          <strong>Upload &amp; align</strong>
          <small>Upload the floor image, then scale and rotate it over the footprint.</small>
        </button>
        <button
          type="button"
          [disabled]="!selectedFloor()"
          (click)="openEditor('rooms')"
        >
          <span>3</span>
          <strong>Configure rooms</strong>
          <small>Define rooms and labels on top of the aligned floor image.</small>
        </button>
        <button
          type="button"
          [class.active]="panel() === 'review'"
          [disabled]="!selectedFloor()"
          (click)="panel.set('review')"
        >
          <span>4</span>
          <strong>Review &amp; publish</strong>
          <small>Resolve warnings and make the space available to members.</small>
        </button>
      </section>

      <section class="map-layout">
        <section class="map-panel">
          <svg viewBox="0 0 700 500" role="img" aria-label="Space configuration canvas">
            <path d="M92 74 H612 V410 H465 V456 H92 Z" class="floor-footprint" />
            <path d="M118 184 H580 M118 276 H580 M254 102 V388 M416 102 V388" class="floor-lines" />
            @if (selectedFloor(); as floor) {
              @if (floor.roomCount > 0) {
                <rect x="124" y="110" width="120" height="66" class="room ready" />
                <rect x="263" y="110" width="140" height="66" class="room ready" />
                <rect x="424" y="110" width="134" height="66" class="room selected" />
                <rect x="124" y="200" width="160" height="76" class="room ready" />
                <text x="184" y="149">Room</text>
                <text x="333" y="149">Room</text>
                <text x="491" y="149">Selected</text>
              } @else {
                <rect x="424" y="292" width="132" height="76" class="room warning" />
                <text x="490" y="336">No rooms yet</text>
              }
            }
          </svg>
          <div class="floating-toolbar">
            @if (selectedFloor(); as floor) {
              <span class="badge" [class.badge-good]="floor.roomCount > 0" [class.badge-warn]="floor.roomCount === 0">
                {{ floor.roomCount }} rooms
              </span>
            } @else {
              <span class="badge">Select a floor</span>
            }
          </div>
        </section>

        <div class="side-stack">
          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>Select space</h3>
                <p>Campus → building → floor</p>
              </div>
            </header>
            <div class="panel-body">
              <div class="form-stack">
                <label>
                  Campus
                  <select [ngModel]="selectedCampusId() ?? ''" (ngModelChange)="selectCampus($event || null)">
                    <option value="">Select a campus</option>
                    @for (campus of campuses(); track campus.id) {
                      <option [value]="campus.id">{{ campus.name }}</option>
                    }
                  </select>
                </label>

                <label>
                  Building
                  <select
                    [ngModel]="selectedPlaceId() ?? ''"
                    (ngModelChange)="selectPlace($event || null)"
                    [disabled]="!campus()"
                  >
                    <option value="">Select a building</option>
                    @for (place of buildingPlaces(); track place.id) {
                      <option [value]="place.id">{{ place.name }} · {{ place.floorCount }} floors</option>
                    }
                  </select>
                </label>

                <label>
                  Floor
                  <select
                    [ngModel]="selectedFloorId() ?? ''"
                    (ngModelChange)="selectFloor($event || null)"
                    [disabled]="!selectedPlace()"
                  >
                    <option value="">Select a floor</option>
                    @for (floor of floors(); track floor.id) {
                      <option [value]="floor.id">{{ floor.name }} · {{ floor.floorLabel }}</option>
                    }
                  </select>
                </label>

                @if (loadingFloors()) {
                  <p class="muted">Loading floors...</p>
                } @else if (selectedPlace() && floors().length === 0) {
                  <p class="muted">This building has no floors yet. Create the first one.</p>
                }

                <div class="status-row">
                  @if (selectedPlace(); as place) {
                    <a
                      class="primary-action"
                      [routerLink]="['/admin/buildings', place.buildingId, 'floors', 'new']"
                      [queryParams]="{ campusId: campus()!.id, placeId: place.id }"
                    >
                      New floor
                    </a>
                  }
                  @if (campus(); as campusValue) {
                    <a class="secondary-action" [routerLink]="['/admin/campuses', campusValue.id]">
                      Campus configuration
                    </a>
                  }
                </div>
              </div>
            </div>
          </section>

          @if (panel() === 'review' && selectedFloor(); as floor) {
            <section class="panel">
              <header class="panel-header">
                <div>
                  <h3>Review &amp; publish</h3>
                  <p>{{ floor.name }} · {{ floor.floorLabel }}</p>
                </div>
                <span class="badge" [class.badge-good]="floor.roomCount > 0" [class.badge-warn]="floor.roomCount === 0">
                  {{ floor.roomCount > 0 ? 'Ready' : 'Not ready' }}
                </span>
              </header>
              <div class="panel-body">
                <div class="task-list">
                  <div class="task">
                    <span>Background image</span>
                    <span class="badge" [class.badge-good]="floor.backgroundImageUrl">
                      {{ floor.backgroundImageUrl ? 'Uploaded' : 'Missing' }}
                    </span>
                  </div>
                  <div class="task">
                    <span>Rooms defined</span>
                    <span class="badge" [class.badge-good]="floor.roomCount > 0" [class.badge-warn]="floor.roomCount === 0">
                      {{ floor.roomCount }} rooms
                    </span>
                  </div>
                  <div class="task">
                    <span>Timezone (from campus)</span>
                    <span class="badge">{{ floor.timezone }}</span>
                  </div>
                </div>

                <div class="publish-card">
                  <strong>{{ floor.roomCount > 0 ? 'Live for members' : 'Not ready to publish' }}</strong>
                  <p>
                    @if (floor.roomCount > 0) {
                      Saved rooms are immediately visible to members on the map and available for
                      booking. Publishing is implicit in this version.
                    } @else {
                      Define at least one room in step 3 to make this floor usable for members.
                    }
                  </p>
                  <a class="primary-action" [routerLink]="['/admin/floors', floor.id, 'edit', 'rooms']">
                    Define rooms
                  </a>
                </div>
              </div>
            </section>
          } @else {
            <section class="panel">
              <header class="panel-header">
                <div>
                  <h3>Pipeline overview</h3>
                  <p>How a floor goes from drawing to bookable rooms</p>
                </div>
              </header>
              <div class="panel-body">
                <div class="route-steps">
                  <div class="route-step"><span>1</span><p>Select the campus, building, and floor.</p></div>
                  <div class="route-step"><span>2</span><p>Align the uploaded plan image over the footprint.</p></div>
                  <div class="route-step"><span>3</span><p>Draw room boundaries over the aligned plan.</p></div>
                  <div class="route-step"><span>4</span><p>Review the summary — saved rooms go live immediately.</p></div>
                </div>
                @if (!selectedFloor()) {
                  <p class="muted">Select a floor (or create a new one) to continue with steps 2–4.</p>
                }
              </div>
            </section>
          }
        </div>
      </section>
    </div>
  `,
  styles: ``,
})
export class SpaceConfigPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly campusesService = inject(CampusesService);
  private readonly floorsService = inject(FloorsService);

  protected readonly campuses = signal<CampusSummaryDto[]>([]);
  protected readonly campus = signal<CampusDto | null>(null);
  protected readonly selectedCampusId = signal<string | null>(null);
  protected readonly selectedPlaceId = signal<string | null>(null);
  protected readonly floors = signal<FloorMapSummaryDto[]>([]);
  protected readonly selectedFloorId = signal<string | null>(null);
  protected readonly loadingFloors = signal(false);
  protected readonly error = signal('');
  protected readonly panel = signal<SpaceConfigPanel>('select');

  protected readonly buildingPlaces = computed<CampusPlaceDto[]>(() => {
    const campus = this.campus();
    return campus ? campus.places.filter((place) => place.type === 'building' && place.buildingId) : [];
  });

  protected readonly selectedPlace = computed<CampusPlaceDto | null>(() => {
    const placeId = this.selectedPlaceId();
    return this.buildingPlaces().find((place) => place.id === placeId) ?? null;
  });

  protected readonly selectedFloor = computed<FloorMapSummaryDto | null>(() => {
    const floorId = this.selectedFloorId();
    return this.floors().find((floor) => floor.id === floorId) ?? null;
  });

  constructor() {
    void this.initialize();
  }

  protected async selectCampus(campusId: string | null): Promise<void> {
    this.selectedCampusId.set(campusId);
    this.campus.set(null);
    this.selectedPlaceId.set(null);
    this.floors.set([]);
    this.selectedFloorId.set(null);
    this.panel.set('select');

    if (!campusId) {
      return;
    }

    try {
      this.campus.set(await this.campusesService.get(campusId));
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  protected async selectPlace(placeId: string | null): Promise<void> {
    this.selectedPlaceId.set(placeId);
    this.floors.set([]);
    this.selectedFloorId.set(null);
    this.panel.set('select');

    const place = this.selectedPlace();
    if (!place?.buildingId) {
      return;
    }

    this.loadingFloors.set(true);
    try {
      const floors = await this.floorsService.listForBuilding(place.buildingId);
      this.floors.set(floors);
      this.selectedFloorId.set(floors[0]?.id ?? null);
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.loadingFloors.set(false);
    }
  }

  protected selectFloor(floorId: string | null): void {
    this.selectedFloorId.set(floorId);
    if (!floorId) {
      this.panel.set('select');
    }
  }

  protected openEditor(workflow: 'map' | 'rooms'): void {
    const floor = this.selectedFloor();
    if (!floor) {
      return;
    }
    void this.router.navigate(['/admin/floors', floor.id, 'edit', workflow]);
  }

  private async initialize(): Promise<void> {
    try {
      this.campuses.set(await this.campusesService.list());
    } catch (error) {
      this.error.set(this.extractMessage(error));
      return;
    }

    const queryParams = this.route.snapshot.queryParamMap;
    const campusId = queryParams.get('campusId');
    const placeId = queryParams.get('placeId');

    if (campusId && this.campuses().some((campus) => campus.id === campusId)) {
      await this.selectCampus(campusId);
      if (placeId && this.buildingPlaces().some((place) => place.id === placeId)) {
        await this.selectPlace(placeId);
      }
    }
  }

  private extractMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const apiMessage = (error as { error?: { message?: string | string[] } }).error?.message;
      if (Array.isArray(apiMessage)) {
        return apiMessage.join(' ');
      }
      if (apiMessage) {
        return apiMessage;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Request failed.';
  }
}

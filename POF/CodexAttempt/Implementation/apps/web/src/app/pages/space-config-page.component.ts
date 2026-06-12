import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CampusDto,
  CampusPlaceDto,
  CampusSummaryDto,
  FloorMapDto,
  FloorMapSummaryDto,
} from '@campus/contracts';

import { MapEditorFormComponent } from '../components/map-editor-form.component';
import { MemberMapboxViewComponent } from '../components/member-mapbox-view.component';
import { CampusesService } from '../core/campuses.service';
import { FloorsService } from '../core/floors.service';
import { MapsService } from '../core/maps.service';

type SpaceConfigPanel = 'select' | 'align' | 'review';

@Component({
  selector: 'app-space-config-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MemberMapboxViewComponent,
    MapEditorFormComponent,
  ],
  template: `
    <div class="screen-shell">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      <section class="step-strip">
        <button type="button" [class.active]="panel() === 'select'" (click)="showSelect()">
          <span>1</span>
          <strong>Select space</strong>
          <small>Choose the campus, building, and floor that will receive the plan.</small>
        </button>
        <button
          type="button"
          [class.active]="panel() === 'align'"
          [disabled]="!selectedFloor() && !creatingFloor()"
          (click)="panel.set('align')"
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

      @if (panel() === 'align' && (selectedFloor() || creatingFloor())) {
        <app-map-editor-form
          [embedded]="true"
          [lockFootprint]="true"
          workflow="map"
          [mapId]="selectedFloor()?.id ?? null"
          [buildingId]="creatingFloor() ? (selectedPlace()?.buildingId ?? null) : null"
          [seedCampusId]="creatingFloor() ? (campus()?.id ?? null) : null"
          [seedPlaceId]="creatingFloor() ? (selectedPlace()?.id ?? null) : null"
          (floorSaved)="onFloorSaved($event)"
        />
      } @else {
      <section class="map-layout">
        <section class="panel canvas">
          <header class="panel-header">
            <div>
              <h3>{{ canvasTitle() }}</h3>
              <p>{{ canvasSubtitle() }}</p>
            </div>
            @if (selectedFloor(); as floor) {
              <span class="badge" [class.badge-good]="floor.roomCount > 0" [class.badge-warn]="floor.roomCount === 0">
                {{ floor.roomCount }} rooms
              </span>
            } @else if (campus()) {
              <span class="badge badge-good">{{ buildingPlaces().length }} buildings</span>
            } @else {
              <span class="badge">{{ campuses().length }} campuses</span>
            }
          </header>
          <div class="panel-body">
            <app-member-mapbox-view
              [campuses]="campuses()"
              [selectedCampus]="campus()"
              [floorMap]="floorMap()"
              [selectedCampusId]="selectedCampusId()"
              [selectedPlaceId]="selectedPlaceId()"
              (campusSelected)="selectCampus($event)"
              (placeSelected)="selectPlace($event)"
            />
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
                  @if (selectedPlace()) {
                    <button class="primary-action" type="button" (click)="startNewFloor()">
                      New floor
                    </button>
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
      }
    </div>
  `,
  styles: ``,
})
export class SpaceConfigPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly campusesService = inject(CampusesService);
  private readonly floorsService = inject(FloorsService);
  private readonly mapsService = inject(MapsService);

  protected readonly campuses = signal<CampusSummaryDto[]>([]);
  protected readonly campus = signal<CampusDto | null>(null);
  protected readonly selectedCampusId = signal<string | null>(null);
  protected readonly selectedPlaceId = signal<string | null>(null);
  protected readonly floors = signal<FloorMapSummaryDto[]>([]);
  protected readonly selectedFloorId = signal<string | null>(null);
  protected readonly floorMap = signal<FloorMapDto | null>(null);
  protected readonly loadingFloors = signal(false);
  protected readonly error = signal('');
  protected readonly panel = signal<SpaceConfigPanel>('select');
  protected readonly creatingFloor = signal(false);

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
    if (this.selectedCampusId() === campusId && this.campus()) {
      return;
    }
    this.selectedCampusId.set(campusId);
    this.campus.set(null);
    this.selectedPlaceId.set(null);
    this.floors.set([]);
    this.selectedFloorId.set(null);
    this.floorMap.set(null);
    this.creatingFloor.set(false);
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
    if (this.selectedPlaceId() === placeId && this.floors().length > 0) {
      return;
    }
    this.selectedPlaceId.set(placeId);
    this.floors.set([]);
    this.selectedFloorId.set(null);
    this.floorMap.set(null);
    this.creatingFloor.set(false);
    this.panel.set('select');

    const place = this.selectedPlace();
    if (!place?.buildingId) {
      return;
    }

    this.loadingFloors.set(true);
    try {
      const floors = await this.floorsService.listForBuilding(place.buildingId);
      this.floors.set(floors);
      // Reveal the first floor's rooms on the map immediately.
      if (floors[0]) {
        this.selectFloor(floors[0].id);
      }
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.loadingFloors.set(false);
    }
  }

  protected selectFloor(floorId: string | null): void {
    this.creatingFloor.set(false);
    this.selectedFloorId.set(floorId);
    if (!floorId) {
      this.floorMap.set(null);
      this.panel.set('select');
      return;
    }
    void this.loadFloorMap(floorId);
  }

  protected showSelect(): void {
    this.creatingFloor.set(false);
    this.panel.set('select');
  }

  protected startNewFloor(): void {
    if (!this.selectedPlace()?.buildingId) {
      return;
    }
    this.selectedFloorId.set(null);
    this.floorMap.set(null);
    this.creatingFloor.set(true);
    this.panel.set('align');
  }

  protected async onFloorSaved(map: FloorMapDto): Promise<void> {
    const place = this.selectedPlace();
    if (place?.buildingId) {
      try {
        this.floors.set(await this.floorsService.listForBuilding(place.buildingId));
      } catch (error) {
        this.error.set(this.extractMessage(error));
      }
    }
    // Keep the embedded editor mounted: select the saved floor before leaving create mode.
    this.selectedFloorId.set(map.id);
    this.floorMap.set(map);
    this.creatingFloor.set(false);
  }

  private async loadFloorMap(floorId: string): Promise<void> {
    this.floorMap.set(null);
    try {
      this.floorMap.set(await this.mapsService.get(floorId));
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  protected canvasTitle(): string {
    const floor = this.selectedFloor();
    const place = this.selectedPlace();
    const campus = this.campus();
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
      return 'Rooms defined on the selected floor. Use the pipeline steps to edit them.';
    }
    if (this.campus()) {
      return 'Click a building to load its floors and rooms.';
    }
    return 'Click a campus to load its spaces.';
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

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import {
  BadgeComponent,
  ButtonDirective,
  PanelComponent,
  RouteStepsComponent,
  StepStripComponent,
  type StepItem,
} from '../ui';

type SpaceConfigPanel = 'select' | 'align' | 'rooms' | 'review';

@Component({
  selector: 'app-space-config-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MemberMapboxViewComponent,
    MapEditorFormComponent,
    PanelComponent,
    BadgeComponent,
    ButtonDirective,
    RouteStepsComponent,
    StepStripComponent,
  ],
  template: `
    <div class="grid content-start gap-4">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      <app-step-strip [steps]="steps()" [active]="activeStep()" (select)="onStep($event)" />

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
      } @else if (panel() === 'rooms' && selectedFloor()) {
        <app-map-editor-form
          [embedded]="true"
          workflow="rooms"
          [mapId]="selectedFloor()?.id ?? null"
          (floorSaved)="onFloorSaved($event)"
        />
      } @else {
        <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(320px,32%,380px)] lg:items-start">
          <app-panel [heading]="canvasTitle()" [sub]="canvasSubtitle()">
            @if (selectedFloor(); as floor) {
              <app-badge panelAction [tone]="floor.roomCount > 0 ? 'good' : 'warn'">
                {{ floor.roomCount }} rooms
              </app-badge>
            } @else if (campus()) {
              <app-badge panelAction tone="good">{{ buildingPlaces().length }} buildings</app-badge>
            } @else {
              <app-badge panelAction>{{ campuses().length }} campuses</app-badge>
            }

            <app-member-mapbox-view
              [campuses]="campuses()"
              [selectedCampus]="campus()"
              [floorMap]="floorMap()"
              [selectedCampusId]="selectedCampusId()"
              [selectedPlaceId]="selectedPlaceId()"
              (campusSelected)="selectCampus($event)"
              (placeSelected)="selectPlace($event)"
            />
          </app-panel>

          <div class="grid gap-4">
            <app-panel heading="Select space" sub="Campus → building → floor">
              <div class="grid gap-3">
                <label>
                  Campus
                  <select
                    class="w-full rounded-lg border border-line bg-panel px-3 py-2.5 font-medium text-ink disabled:opacity-60"
                    [ngModel]="selectedCampusId() ?? ''"
                    (ngModelChange)="selectCampus($event || null)"
                  >
                    <option value="">Select a campus</option>
                    @for (campus of campuses(); track campus.id) {
                      <option [value]="campus.id">{{ campus.name }}</option>
                    }
                  </select>
                </label>

                <label>
                  Building
                  <select
                    class="w-full rounded-lg border border-line bg-panel px-3 py-2.5 font-medium text-ink disabled:opacity-60"
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
                    class="w-full rounded-lg border border-line bg-panel px-3 py-2.5 font-medium text-ink disabled:opacity-60"
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
                  <p class="text-sm text-muted">Loading floors…</p>
                } @else if (selectedPlace() && floors().length === 0) {
                  <p class="text-sm text-muted">This building has no floors yet. Create the first one.</p>
                }

                <div class="flex flex-wrap gap-2">
                  @if (selectedPlace()) {
                    <button uiBtn type="button" (click)="startNewFloor()">New floor</button>
                  }
                  @if (campus(); as campusValue) {
                    <a uiBtn="secondary" [routerLink]="['/admin/campuses', campusValue.id]">
                      Campus configuration
                    </a>
                  }
                </div>
              </div>
            </app-panel>

            @if (panel() === 'review' && selectedFloor(); as floor) {
              <app-panel heading="Review & publish" [sub]="floor.name + ' · ' + floor.floorLabel">
                <app-badge panelAction [tone]="floor.roomCount > 0 ? 'good' : 'warn'">
                  {{ floor.roomCount > 0 ? 'Ready' : 'Not ready' }}
                </app-badge>
                <div class="grid gap-3">
                  <div class="grid gap-2.5">
                    <div class="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3">
                      <span class="text-sm">Background image</span>
                      <app-badge [tone]="floor.backgroundImageUrl ? 'good' : 'neutral'">
                        {{ floor.backgroundImageUrl ? 'Uploaded' : 'Missing' }}
                      </app-badge>
                    </div>
                    <div class="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3">
                      <span class="text-sm">Rooms defined</span>
                      <app-badge [tone]="floor.roomCount > 0 ? 'good' : 'warn'">{{ floor.roomCount }} rooms</app-badge>
                    </div>
                    <div class="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3">
                      <span class="text-sm">Timezone (from campus)</span>
                      <app-badge>{{ floor.timezone }}</app-badge>
                    </div>
                  </div>

                  <div class="grid gap-2 rounded-lg border border-line bg-panel p-3.5">
                    <strong>{{ floor.roomCount > 0 ? 'Live for members' : 'Not ready to publish' }}</strong>
                    <p class="text-sm leading-relaxed text-muted">
                      @if (floor.roomCount > 0) {
                        Saved rooms are immediately visible to members on the map and available for
                        booking. Publishing is implicit in this version.
                      } @else {
                        Define at least one room in step 3 to make this floor usable for members.
                      }
                    </p>
                    <button uiBtn type="button" (click)="showRooms()">Define rooms</button>
                  </div>
                </div>
              </app-panel>
            } @else {
              <app-panel heading="Pipeline overview" sub="How a floor goes from drawing to bookable rooms">
                <div class="grid gap-3">
                  <app-route-steps [steps]="pipelineSteps" />
                  @if (!selectedFloor()) {
                    <p class="text-sm text-muted">
                      Select a floor (or create a new one) to continue with steps 2–4.
                    </p>
                  }
                </div>
              </app-panel>
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

  protected readonly steps = computed<StepItem[]>(() => [
    { title: 'Select space', detail: 'Choose the campus, building, and floor that will receive the plan.' },
    {
      title: 'Upload & align',
      detail: 'Upload the floor image, then scale and rotate it over the footprint.',
      disabled: !this.selectedFloor() && !this.creatingFloor(),
    },
    {
      title: 'Configure rooms',
      detail: 'Define rooms and labels on top of the aligned floor image.',
      disabled: !this.selectedFloor(),
    },
    {
      title: 'Review & publish',
      detail: 'Resolve warnings and make the space available to members.',
      disabled: !this.selectedFloor(),
    },
  ]);

  private readonly panelIndex: Record<SpaceConfigPanel, number> = {
    select: 0,
    align: 1,
    rooms: 2,
    review: 3,
  };
  protected readonly activeStep = computed(() => this.panelIndex[this.panel()]);

  protected readonly pipelineSteps = [
    'Select the campus, building, and floor.',
    'Align the uploaded plan image over the footprint.',
    'Draw room boundaries over the aligned plan.',
    'Review the summary — saved rooms go live immediately.',
  ];

  protected onStep(index: number): void {
    switch (index) {
      case 0:
        this.showSelect();
        break;
      case 1:
        this.panel.set('align');
        break;
      case 2:
        this.showRooms();
        break;
      case 3:
        this.panel.set('review');
        break;
    }
  }

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

  protected showRooms(): void {
    if (!this.selectedFloor()) {
      return;
    }
    this.creatingFloor.set(false);
    this.panel.set('rooms');
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

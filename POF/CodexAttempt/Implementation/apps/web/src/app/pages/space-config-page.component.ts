import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
    <div class="page space-config">
      <section class="section-header">
        <div>
          <h1>Spaces setup</h1>
          <p class="muted">
            Turn a building into usable indoor data: pick a floor, align its plan, define rooms,
            and review the result.
          </p>
        </div>
        <div class="chips">
          <span class="chip">Import pipeline</span>
        </div>
      </section>

      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      <nav class="step-strip" aria-label="Import pipeline steps">
        <button
          type="button"
          class="ghost step-button"
          [class.active]="panel() === 'select'"
          (click)="panel.set('select')"
        >
          <span class="step-number">1</span> Select space
        </button>
        <span class="step-divider" aria-hidden="true"></span>
        @if (selectedFloor(); as floor) {
          <a class="button ghost step-button" [routerLink]="['/admin/floors', floor.id, 'edit', 'map']">
            <span class="step-number">2</span> Floor plan & alignment
          </a>
        } @else {
          <button type="button" class="ghost step-button" disabled>
            <span class="step-number">2</span> Floor plan & alignment
          </button>
        }
        <span class="step-divider" aria-hidden="true"></span>
        @if (selectedFloor(); as floor) {
          <a class="button ghost step-button" [routerLink]="['/admin/floors', floor.id, 'edit', 'rooms']">
            <span class="step-number">3</span> Define rooms
          </a>
        } @else {
          <button type="button" class="ghost step-button" disabled>
            <span class="step-number">3</span> Define rooms
          </button>
        }
        <span class="step-divider" aria-hidden="true"></span>
        <button
          type="button"
          class="ghost step-button"
          [class.active]="panel() === 'review'"
          [disabled]="!selectedFloor()"
          (click)="panel.set('review')"
        >
          <span class="step-number">4</span> Review & publish
        </button>
      </nav>

      <section class="grid-2 config-layout">
        <article class="card panel">
          <div>
            <h2>Select space</h2>
            <p class="muted">Campus → building → floor. Steps 2 and 3 open the floor editor.</p>
          </div>

          <label>
            Campus
            <select
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

          <div class="actions">
            @if (selectedPlace(); as place) {
              <a
                class="button"
                [routerLink]="['/admin/buildings', place.buildingId, 'floors', 'new']"
                [queryParams]="{ campusId: campus()!.id, placeId: place.id }"
              >
                New floor
              </a>
            }
            @if (campus(); as campusValue) {
              <a class="button ghost" [routerLink]="['/admin/campuses', campusValue.id]">
                Campus configuration
              </a>
            }
          </div>
        </article>

        @if (panel() === 'review' && selectedFloor(); as floor) {
          <article class="card panel">
            <div class="section-header">
              <div>
                <h2>Review & publish</h2>
                <p class="muted">{{ floor.name }} · {{ floor.floorLabel }}</p>
              </div>
              @if (floor.roomCount > 0) {
                <span class="chip ready-chip">Ready to publish</span>
              } @else {
                <span class="chip">Not ready</span>
              }
            </div>

            <dl class="review-grid">
              <div><dt>Floor name</dt><dd>{{ floor.name }}</dd></div>
              <div><dt>Floor label</dt><dd>{{ floor.floorLabel }}</dd></div>
              <div>
                <dt>Background image</dt>
                <dd>{{ floor.backgroundImageUrl ? 'Uploaded' : 'Missing' }}</dd>
              </div>
              <div><dt>Rooms</dt><dd>{{ floor.roomCount }}</dd></div>
              <div><dt>Timezone</dt><dd>{{ floor.timezone }} (from campus)</dd></div>
            </dl>

            @if (floor.roomCount > 0) {
              <p class="muted">
                Publishing is implicit in this version: saved rooms are immediately visible to
                members on the map and available for booking. No extra publish action is needed.
              </p>
            } @else {
              <p class="muted">
                Define at least one room in step 3 to make this floor usable for members. Rooms
                go live as soon as they are saved — publishing is implicit in this version.
              </p>
            }

            <div class="actions">
              <a class="button ghost" [routerLink]="['/admin/floors', floor.id, 'edit', 'map']">
                Floor plan & alignment
              </a>
              <a class="button ghost" [routerLink]="['/admin/floors', floor.id, 'edit', 'rooms']">
                Define rooms
              </a>
            </div>
          </article>
        } @else {
          <article class="card panel">
            <div>
              <h2>Pipeline overview</h2>
              <p class="muted">How a floor goes from drawing to bookable rooms.</p>
            </div>
            <ol class="pipeline-list">
              <li><strong>Select space</strong> — choose the campus, building, and floor.</li>
              <li>
                <strong>Floor plan & alignment</strong> — set the floor footprint and align the
                uploaded plan image in the editor.
              </li>
              <li><strong>Define rooms</strong> — draw room boundaries over the aligned plan.</li>
              <li>
                <strong>Review & publish</strong> — check the floor summary. Saved rooms go live
                immediately; publishing is implicit in this version.
              </li>
            </ol>
            @if (!selectedFloor()) {
              <p class="muted">Select a floor (or create a new one) to continue with steps 2-4.</p>
            }
          </article>
        }
      </section>
    </div>
  `,
  styles: `
    .space-config {
      display: grid;
      gap: 1.5rem;
    }

    .panel {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
      align-content: start;
    }

    .config-layout {
      align-items: start;
    }

    .step-strip {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .step-button {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      text-decoration: none;
    }

    .step-button.active {
      background: rgba(14, 116, 144, 0.1);
      border-color: rgba(14, 116, 144, 0.35);
      color: var(--ink);
    }

    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 999px;
      background: rgba(14, 116, 144, 0.12);
      color: var(--brand-strong);
      font-weight: 700;
      font-size: 0.8rem;
    }

    .step-divider {
      width: 2rem;
      height: 1px;
      background: rgba(15, 23, 42, 0.18);
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .review-grid {
      margin: 0;
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }

    .review-grid dt {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-soft);
    }

    .review-grid dd {
      margin: 0.2rem 0 0;
      font-weight: 600;
    }

    .ready-chip {
      background: rgba(22, 163, 74, 0.12);
      color: #15803d;
    }

    .pipeline-list {
      margin: 0;
      padding-left: 1.25rem;
      display: grid;
      gap: 0.6rem;
    }
  `,
})
export class SpaceConfigPageComponent {
  private readonly route = inject(ActivatedRoute);
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

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CampusDto,
  CampusPlaceDto,
  CampusPlaceType,
  GeoJsonPolygon,
} from '@campus/contracts';

import { MapboxFootprintPickerComponent } from '../components/mapbox-footprint-picker.component';
import { CampusesService } from '../core/campuses.service';

type CampusConfigStep = 'setup' | 'spaces';

const PLACE_TYPE_OPTIONS: Array<{ value: CampusPlaceType; label: string }> = [
  { value: 'building', label: 'Building' },
  { value: 'sports_field', label: 'Sports field' },
  { value: 'tennis_court', label: 'Tennis court' },
  { value: 'parking', label: 'Parking' },
  { value: 'outdoor_area', label: 'Outdoor area' },
  { value: 'other', label: 'Other' },
];

@Component({
  selector: 'app-campus-config-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MapboxFootprintPickerComponent],
  template: `
    <div class="page campus-config">
      @if (loading()) {
        <p class="muted">Loading campus...</p>
      } @else if (!campus()) {
        <p class="message error">{{ error() || 'Campus not found.' }}</p>
      } @else {
        <section class="section-header">
          <div>
            <h1>{{ campus()!.name }}</h1>
            <p class="muted">
              Campus configuration · {{ campus()!.timezone }} ·
              {{ campus()!.placeCount }} spaces · {{ campus()!.buildingCount }} buildings
            </p>
          </div>
          <div class="chips">
            <span class="chip">{{ campus()!.floorCount }} floors</span>
            <span class="chip">{{ campus()!.roomCount }} rooms</span>
            @if (campus()!.boundaryGeoJson) {
              <span class="chip">Boundary set</span>
            }
          </div>
        </section>

        <nav class="step-strip" aria-label="Campus configuration steps">
          <button
            type="button"
            class="ghost step-button"
            [class.active]="step() === 'setup'"
            (click)="step.set('setup')"
          >
            <span class="step-number">1</span> Campus setup
          </button>
          <span class="step-divider" aria-hidden="true"></span>
          <button
            type="button"
            class="ghost step-button"
            [class.active]="step() === 'spaces'"
            (click)="step.set('spaces')"
          >
            <span class="step-number">2</span> Define spaces
          </button>
        </nav>

        @if (message()) {
          <p class="message success">{{ message() }}</p>
        }

        @if (error()) {
          <p class="message error">{{ error() }}</p>
        }

        @if (step() === 'setup') {
          <section class="grid-2 config-layout">
            <article class="card panel">
              <div>
                <h2>Campus details</h2>
                <p class="muted">
                  Name and timezone apply to every space, floor, and booking inside this campus.
                </p>
              </div>
              <label>Name <input [(ngModel)]="campusName" /></label>
              <label>Timezone <input [(ngModel)]="campusTimezone" placeholder="Europe/Bucharest" /></label>
              <p class="muted">
                The campus boundary drawn on the map is saved together with these details. Spaces
                you define in the next step must stay inside this boundary.
              </p>
              <div class="actions">
                <button type="button" (click)="saveCampus()" [disabled]="savingCampus()">
                  {{ savingCampus() ? 'Saving...' : 'Save campus setup' }}
                </button>
                <button type="button" class="ghost" (click)="step.set('spaces')">
                  Continue to define spaces
                </button>
              </div>
            </article>

            <article class="card panel">
              <div>
                <h2>Campus boundary</h2>
                <p class="muted">Draw or adjust the campus outline on the satellite map.</p>
              </div>
              <app-mapbox-footprint-picker
                [footprint]="campusBoundary()"
                (footprintChange)="campusBoundary.set($event)"
              />
            </article>
          </section>
        } @else {
          <section class="grid-2 config-layout">
            <article class="card panel">
              <div class="section-header">
                <div>
                  <h2>Campus spaces</h2>
                  <p class="muted">Buildings and bookable outdoor resources inside the campus.</p>
                </div>
                <button type="button" class="ghost" (click)="startNewPlace()">New space</button>
              </div>

              @if (campus()!.places.length === 0) {
                <p class="muted">No spaces yet. Create the first building or outdoor space.</p>
              }

              <div class="place-list">
                @for (place of campus()!.places; track place.id) {
                  <div class="place-item" [class.selected]="editingPlaceId() === place.id">
                    <div class="place-item-main">
                      <strong>{{ place.name }}</strong>
                      <div class="chips">
                        <span class="chip">{{ placeTypeLabel(place.type) }}</span>
                        @if (place.bookable) {
                          <span class="chip">Bookable</span>
                        }
                        @if (place.type === 'building') {
                          <span class="chip">{{ place.floorCount }} floors</span>
                        }
                      </div>
                    </div>
                    <div class="place-item-actions">
                      <button type="button" class="ghost" (click)="startEditPlace(place)">
                        Edit
                      </button>
                      @if (place.type === 'building') {
                        <a
                          class="button ghost"
                          routerLink="/admin/spaces"
                          [queryParams]="{ campusId: campus()!.id, placeId: place.id }"
                        >
                          Floors & rooms setup
                        </a>
                      }
                      <button type="button" class="danger" (click)="deletePlace(place)">
                        Delete
                      </button>
                    </div>
                  </div>
                }
              </div>
            </article>

            <article class="card panel">
              <div>
                <h2>{{ editingPlaceId() ? 'Edit space' : 'New space' }}</h2>
                <p class="muted">
                  The space footprint must stay inside the campus boundary. The API rejects
                  footprints that cross the boundary, and the error is shown here.
                </p>
              </div>

              <label>Name <input [(ngModel)]="placeName" /></label>
              <label>
                Type
                <select [ngModel]="placeType()" (ngModelChange)="setPlaceType($event)">
                  @for (option of placeTypeOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              @if (placeType() !== 'building') {
                <label class="check-option">
                  <input type="checkbox" [(ngModel)]="placeBookable" />
                  Bookable by members
                </label>
              } @else {
                <p class="muted">
                  Buildings are not directly bookable — rooms inside their floors are.
                </p>
              }

              <app-mapbox-footprint-picker
                [footprint]="placeFootprint()"
                (footprintChange)="placeFootprint.set($event)"
              />

              <div class="actions">
                <button type="button" (click)="savePlace()" [disabled]="savingPlace()">
                  {{ savingPlace() ? 'Saving...' : editingPlaceId() ? 'Save space' : 'Create space' }}
                </button>
                @if (editingPlaceId()) {
                  <button type="button" class="ghost" (click)="startNewPlace()">Cancel edit</button>
                }
              </div>
            </article>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .campus-config {
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

    .place-list {
      display: grid;
      gap: 0.85rem;
    }

    .place-item {
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 1rem;
      display: grid;
      gap: 0.75rem;
    }

    .place-item.selected {
      border-color: rgba(14, 116, 144, 0.35);
      background: rgba(14, 116, 144, 0.05);
    }

    .place-item-main {
      display: grid;
      gap: 0.5rem;
    }

    .place-item-actions {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .check-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .check-option input {
      width: auto;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }
  `,
})
export class CampusConfigPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly campusesService = inject(CampusesService);

  protected readonly placeTypeOptions = PLACE_TYPE_OPTIONS;

  protected readonly campus = signal<CampusDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly step = signal<CampusConfigStep>('setup');

  protected readonly savingCampus = signal(false);
  protected readonly savingPlace = signal(false);

  protected campusName = '';
  protected campusTimezone = '';
  protected readonly campusBoundary = signal<GeoJsonPolygon | null>(null);

  protected readonly editingPlaceId = signal<string | null>(null);
  protected placeName = '';
  protected readonly placeType = signal<CampusPlaceType>('building');
  protected placeBookable = false;
  protected readonly placeFootprint = signal<GeoJsonPolygon | null>(null);

  private readonly campusId = computed(() => this.route.snapshot.paramMap.get('campusId'));

  constructor() {
    void this.load();
  }

  protected placeTypeLabel(type: CampusPlaceType): string {
    return PLACE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
  }

  protected setPlaceType(type: CampusPlaceType): void {
    this.placeType.set(type);
    if (type === 'building') {
      this.placeBookable = false;
    }
  }

  protected startNewPlace(): void {
    this.editingPlaceId.set(null);
    this.placeName = '';
    this.placeType.set('building');
    this.placeBookable = false;
    this.placeFootprint.set(this.campusBoundary());
  }

  protected startEditPlace(place: CampusPlaceDto): void {
    this.editingPlaceId.set(place.id);
    this.placeName = place.name;
    this.placeType.set(place.type);
    this.placeBookable = place.bookable;
    this.placeFootprint.set(place.footprintGeoJson);
  }

  protected async saveCampus(): Promise<void> {
    const campusId = this.campusId();
    if (!campusId) {
      return;
    }

    if (!this.campusName.trim()) {
      this.error.set('The campus name is required.');
      return;
    }

    this.error.set('');
    this.message.set('');
    this.savingCampus.set(true);

    try {
      const updated = await this.campusesService.update(campusId, {
        name: this.campusName.trim(),
        timezone: this.campusTimezone.trim() || undefined,
        boundaryGeoJson: this.campusBoundary(),
      });
      this.campus.set(updated);
      this.applyCampus(updated);
      this.message.set('Campus setup saved.');
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.savingCampus.set(false);
    }
  }

  protected async savePlace(): Promise<void> {
    const campusId = this.campusId();
    if (!campusId) {
      return;
    }

    if (!this.placeName.trim()) {
      this.error.set('The space name is required.');
      return;
    }

    const footprint = this.placeFootprint();
    if (!footprint) {
      this.error.set('Draw the space footprint on the map before saving.');
      return;
    }

    this.error.set('');
    this.message.set('');
    this.savingPlace.set(true);

    try {
      const payload = {
        name: this.placeName.trim(),
        type: this.placeType(),
        bookable: this.placeType() === 'building' ? false : this.placeBookable,
        footprintGeoJson: footprint,
      };
      const placeId = this.editingPlaceId();
      const saved = placeId
        ? await this.campusesService.updatePlace(campusId, placeId, payload)
        : await this.campusesService.createPlace(campusId, payload);

      await this.refreshCampus(campusId);
      this.startEditPlace(saved);
      this.message.set(placeId ? 'Space updated.' : 'Space created.');
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.savingPlace.set(false);
    }
  }

  protected async deletePlace(place: CampusPlaceDto): Promise<void> {
    const campusId = this.campusId();
    if (!campusId || !confirm(`Delete the space "${place.name}"? This cannot be undone.`)) {
      return;
    }

    this.error.set('');
    this.message.set('');

    try {
      await this.campusesService.deletePlace(campusId, place.id);
      if (this.editingPlaceId() === place.id) {
        this.startNewPlace();
      }
      await this.refreshCampus(campusId);
      this.message.set('Space deleted.');
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  private async load(): Promise<void> {
    const campusId = this.campusId();
    if (!campusId) {
      this.error.set('Missing campus id.');
      this.loading.set(false);
      return;
    }

    try {
      const campus = await this.campusesService.get(campusId);
      this.campus.set(campus);
      this.applyCampus(campus);
      this.placeFootprint.set(campus.boundaryGeoJson);
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshCampus(campusId: string): Promise<void> {
    const campus = await this.campusesService.get(campusId);
    this.campus.set(campus);
    this.applyCampus(campus);
  }

  private applyCampus(campus: CampusDto): void {
    this.campusName = campus.name;
    this.campusTimezone = campus.timezone;
    this.campusBoundary.set(campus.boundaryGeoJson);
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

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
    <div class="screen-shell">
      @if (loading()) {
        <p class="muted">Loading campus...</p>
      } @else if (!campus()) {
        <p class="message error">{{ error() || 'Campus not found.' }}</p>
      } @else {
        <section class="step-strip">
          <button type="button" [class.active]="step() === 'setup'" (click)="step.set('setup')">
            <span>1</span>
            <strong>Campus setup</strong>
            <small>Set the campus name, timezone, and footprint boundary on the map.</small>
          </button>
          <button type="button" [class.active]="step() === 'spaces'" (click)="step.set('spaces')">
            <span>2</span>
            <strong>Define spaces</strong>
            <small>Add buildings and outdoor resources inside the campus boundary.</small>
          </button>
        </section>

        @if (message()) {
          <p class="message success">{{ message() }}</p>
        }

        @if (error()) {
          <p class="message error">{{ error() }}</p>
        }

        @if (step() === 'setup') {
          <section class="map-layout">
            <section class="panel">
              <header class="panel-header">
                <div>
                  <h3>Campus boundary</h3>
                  <p>Draw or adjust the campus outline on the satellite map</p>
                </div>
              </header>
              <div class="panel-body">
                <app-mapbox-footprint-picker
                  [footprint]="campusBoundary()"
                  (footprintChange)="campusBoundary.set($event)"
                />
              </div>
            </section>

            <section class="panel">
              <header class="panel-header">
                <div>
                  <h3>Campus definition</h3>
                  <p>Name and timezone apply to every space and booking</p>
                </div>
                <button class="secondary-action" type="button" (click)="saveCampus()" [disabled]="savingCampus()">
                  {{ savingCampus() ? 'Saving...' : 'Save' }}
                </button>
              </header>
              <div class="panel-body">
                <div class="form-stack">
                  <label>Campus name <input [(ngModel)]="campusName" /></label>
                  <label>Timezone <input [(ngModel)]="campusTimezone" placeholder="Europe/Bucharest" /></label>
                  <div class="inline-form-title">
                    <strong>Footprint</strong>
                    <span>
                      The boundary drawn on the map is saved with these details. Spaces you define
                      next must stay inside this boundary.
                    </span>
                  </div>
                  <button class="primary-action" type="button" (click)="step.set('spaces')">
                    Continue to define spaces
                  </button>
                </div>
              </div>
            </section>
          </section>
        } @else {
          <section class="map-layout side-first">
            <div class="side-stack">
              <section class="panel">
                <header class="panel-header">
                  <div>
                    <h3>{{ editingPlaceId() ? 'Edit space' : 'New space' }}</h3>
                    <p>Footprints must stay inside the campus boundary</p>
                  </div>
                  <button class="secondary-action" type="button" (click)="savePlace()" [disabled]="savingPlace()">
                    {{ savingPlace() ? 'Saving...' : editingPlaceId() ? 'Save space' : 'Create space' }}
                  </button>
                </header>
                <div class="panel-body">
                  <div class="form-stack">
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
                        <span>Bookable by members</span>
                        <input type="checkbox" [(ngModel)]="placeBookable" />
                      </label>
                    } @else {
                      <p class="muted">Buildings are not directly bookable — rooms inside their floors are.</p>
                    }
                    @if (editingPlaceId()) {
                      <button class="secondary-action" type="button" (click)="startNewPlace()">Cancel edit</button>
                    }
                  </div>
                </div>
              </section>

              <section class="panel">
                <header class="panel-header">
                  <div>
                    <h3>Campus spaces</h3>
                    <p>Other spaces in this campus</p>
                  </div>
                  <button class="secondary-action" type="button" (click)="startNewPlace()">New space</button>
                </header>
                <div class="panel-body">
                  @if (campus()!.places.length === 0) {
                    <p class="muted">No spaces yet. Create the first building or outdoor space.</p>
                  }
                  <div class="card-list">
                    @for (place of campus()!.places; track place.id) {
                      <article class="compact-card place-item" [class.is-selected]="editingPlaceId() === place.id">
                        <div>
                          <h3>{{ place.name }}</h3>
                          <p>
                            {{ placeTypeLabel(place.type) }}
                            @if (place.type === 'building') {
                              · {{ place.floorCount }} floors
                            } @else if (place.bookable) {
                              · Bookable
                            }
                          </p>
                          <div class="status-row place-actions">
                            <button type="button" class="secondary-action" (click)="startEditPlace(place)">Edit</button>
                            @if (place.type === 'building') {
                              <a
                                class="secondary-action"
                                routerLink="/admin/spaces"
                                [queryParams]="{ campusId: campus()!.id, placeId: place.id }"
                              >
                                Floors &amp; rooms
                              </a>
                            }
                            <button type="button" class="danger" (click)="deletePlace(place)">Delete</button>
                          </div>
                        </div>
                      </article>
                    }
                  </div>
                </div>
              </section>
            </div>

            <section class="panel">
              <header class="panel-header">
                <div>
                  <h3>Space localization</h3>
                  <p>Drag the footprint to position it inside the campus boundary</p>
                </div>
              </header>
              <div class="panel-body">
                <app-mapbox-footprint-picker
                  [footprint]="placeFootprint()"
                  (footprintChange)="placeFootprint.set($event)"
                />
              </div>
            </section>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .place-item.is-selected {
      border-color: var(--green);
      background: var(--green-soft);
    }

    .place-item h3 {
      font-size: 15px;
    }

    .place-actions {
      margin-top: 10px;
    }

    .check-option {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
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

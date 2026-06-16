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
import {
  ButtonDirective,
  EmptyStateComponent,
  PanelComponent,
  StepStripComponent,
  type StepItem,
} from '../ui';

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
  imports: [
    FormsModule,
    RouterLink,
    MapboxFootprintPickerComponent,
    PanelComponent,
    EmptyStateComponent,
    ButtonDirective,
    StepStripComponent,
  ],
  template: `
    <div class="grid content-start gap-4">
      @if (loading()) {
        <p class="text-sm text-muted">Loading campus…</p>
      } @else if (!campus()) {
        <p class="message error">{{ error() || 'Campus not found.' }}</p>
      } @else {
        <app-step-strip
          [steps]="steps"
          [active]="step() === 'setup' ? 0 : 1"
          (select)="step.set($event === 0 ? 'setup' : 'spaces')"
        />

        @if (message()) {
          <p class="message success">{{ message() }}</p>
        }
        @if (error()) {
          <p class="message error">{{ error() }}</p>
        }

        @if (step() === 'setup') {
          <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(320px,32%,380px)] lg:items-start">
            <app-panel heading="Campus boundary" sub="Draw or adjust the campus outline on the satellite map">
              <app-mapbox-footprint-picker
                [footprint]="campusBoundary()"
                (footprintChange)="campusBoundary.set($event)"
              />
            </app-panel>

            <app-panel heading="Campus definition" sub="Name and timezone apply to every space and booking">
              <button panelAction uiBtn="secondary" type="button" (click)="saveCampus()" [disabled]="savingCampus()">
                {{ savingCampus() ? 'Saving…' : 'Save' }}
              </button>
              <div class="grid gap-3">
                <label>Campus name <input [(ngModel)]="campusName" /></label>
                <label>Timezone <input [(ngModel)]="campusTimezone" placeholder="Europe/Bucharest" /></label>
                <app-empty-state
                  title="Footprint"
                  message="The boundary drawn on the map is saved with these details. Spaces you define next must stay inside this boundary."
                />
                <button uiBtn type="button" (click)="step.set('spaces')">Continue to define spaces</button>
              </div>
            </app-panel>
          </section>
        } @else {
          <section class="grid gap-4 lg:grid-cols-[clamp(300px,32%,360px)_minmax(0,1fr)] lg:items-start">
            <div class="grid gap-4">
              <app-panel
                [heading]="editingPlaceId() ? 'Edit space' : 'New space'"
                sub="Footprints must stay inside the campus boundary"
              >
                <button panelAction uiBtn="secondary" type="button" (click)="savePlace()" [disabled]="savingPlace()">
                  {{ savingPlace() ? 'Saving…' : editingPlaceId() ? 'Save space' : 'Create space' }}
                </button>
                <div class="grid gap-3">
                  <label>Name <input [(ngModel)]="placeName" /></label>
                  <label>
                    Type
                    <select
                      class="w-full rounded-lg border border-line bg-panel px-3 py-2.5 font-medium text-ink"
                      [ngModel]="placeType()"
                      (ngModelChange)="setPlaceType($event)"
                    >
                      @for (option of placeTypeOptions; track option.value) {
                        <option [value]="option.value">{{ option.label }}</option>
                      }
                    </select>
                  </label>
                  @if (placeType() !== 'building') {
                    <label class="flex items-center justify-between gap-2.5">
                      <span>Bookable by members</span>
                      <input type="checkbox" class="h-4 w-4 accent-strong" [(ngModel)]="placeBookable" />
                    </label>
                  } @else {
                    <p class="text-sm text-muted">
                      Buildings are not directly bookable — rooms inside their floors are.
                    </p>
                  }
                  @if (editingPlaceId()) {
                    <button uiBtn="secondary" type="button" (click)="startNewPlace()">Cancel edit</button>
                  }
                </div>
              </app-panel>

              <app-panel heading="Campus spaces" sub="Other spaces in this campus">
                <button panelAction uiBtn="secondary" type="button" (click)="startNewPlace()">New space</button>
                @if (campus()!.places.length === 0) {
                  <p class="text-sm text-muted">No spaces yet. Create the first building or outdoor space.</p>
                }
                <div class="grid gap-2.5">
                  @for (place of campus()!.places; track place.id) {
                    <article
                      class="rounded-lg border p-3"
                      [class]="editingPlaceId() === place.id ? 'border-green bg-green-soft' : 'border-line bg-panel'"
                    >
                      <h3 class="text-base font-bold">{{ place.name }}</h3>
                      <p class="text-sm text-muted">
                        {{ placeTypeLabel(place.type) }}@if (place.type === 'building') {
                          · {{ place.floorCount }} floors
                        } @else if (place.bookable) {
                          · Bookable
                        }
                      </p>
                      <div class="mt-2.5 flex flex-wrap gap-2">
                        <button uiBtn="secondary" type="button" (click)="startEditPlace(place)">Edit</button>
                        @if (place.type === 'building') {
                          <a
                            uiBtn="secondary"
                            routerLink="/admin/spaces"
                            [queryParams]="{ campusId: campus()!.id, placeId: place.id }"
                          >
                            Floors &amp; rooms
                          </a>
                        }
                        <button uiBtn="danger" type="button" (click)="deletePlace(place)">Delete</button>
                      </div>
                    </article>
                  }
                </div>
              </app-panel>
            </div>

            <app-panel heading="Space localization" sub="Drag the footprint to position it inside the campus boundary">
              <app-mapbox-footprint-picker
                [footprint]="placeFootprint()"
                [referenceFootprint]="campusBoundary()"
                [selectableFootprints]="otherSpaces()"
                (footprintChange)="placeFootprint.set($event)"
                (footprintSelected)="onMapSpaceSelected($event)"
              />
            </app-panel>
          </section>
        }
      }
    </div>
  `,
  styles: ``,
})
export class CampusConfigPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly campusesService = inject(CampusesService);

  protected readonly placeTypeOptions = PLACE_TYPE_OPTIONS;

  protected readonly steps: StepItem[] = [
    { title: 'Campus setup', detail: 'Set the campus name, timezone, and footprint boundary on the map.' },
    { title: 'Define spaces', detail: 'Add buildings and outdoor resources inside the campus boundary.' },
  ];

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

  /** All campus spaces except the one currently being edited, shown as non-editable outlines. */
  protected readonly otherSpaces = computed(() => {
    const campus = this.campus();
    const editingId = this.editingPlaceId();
    if (!campus) {
      return [];
    }
    return campus.places
      .filter((place) => place.id !== editingId)
      .map((place) => ({
        id: place.id,
        footprint: place.footprintGeoJson,
        name: place.name,
        building: !!place.buildingId,
      }));
  });

  constructor() {
    void this.load();
  }

  protected onMapSpaceSelected(placeId: string): void {
    const place = this.campus()?.places.find((item) => item.id === placeId);
    if (place) {
      this.startEditPlace(place);
    }
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
    // Start empty so the user draws the space inside the campus boundary, which
    // is shown as a non-editable reference outline on the picker.
    this.placeFootprint.set(null);
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
      this.placeFootprint.set(null);
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

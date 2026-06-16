import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CampusSummaryDto, FloorMapSummaryDto } from '@campus/contracts';

import { CampusesService } from '../core/campuses.service';
import { MapsService } from '../core/maps.service';
import { BadgeComponent, ButtonDirective, MetricComponent, PanelComponent } from '../ui';

interface AttentionItem {
  label: string;
  hint: string;
  tag: string;
  urgent: boolean;
  link: string[];
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonDirective,
    PanelComponent,
    MetricComponent,
    BadgeComponent,
  ],
  template: `
    <div class="grid content-start gap-4">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (showAddCampus()) {
        <app-panel heading="Add campus" sub="Create a new campus and start configuring its footprint.">
          <button panelAction uiBtn="secondary" type="button" (click)="toggleAddCampus()">Close</button>
          <form
            class="grid gap-3 md:grid-cols-[1.4fr_1fr_auto] md:items-end"
            [formGroup]="campusForm"
            (ngSubmit)="createCampus()"
          >
            <label>
              Campus name
              <input type="text" formControlName="name" placeholder="North Campus" />
            </label>
            <label>
              Timezone
              <input type="text" formControlName="timezone" placeholder="Europe/Bucharest" />
            </label>
            <button uiBtn type="submit" [disabled]="creating() || campusForm.invalid">
              {{ creating() ? 'Creating…' : 'Create campus' }}
            </button>
          </form>
        </app-panel>
      }

      @if (loading()) {
        <p class="text-sm text-muted">Loading dashboard…</p>
      } @else {
        <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <app-metric label="Campuses" [value]="campuses().length" />
          <app-metric label="Floor maps" [value]="maps().length" />
          <app-metric label="Rooms" [value]="totalRooms()" />
          <app-metric label="Open issues" [value]="attentionItems().length" tone="warn" />
        </section>

        <section class="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.55fr)]">
          <app-panel heading="Campus portfolio" sub="Operational status by site">
            <button panelAction uiBtn="secondary" type="button" (click)="toggleAddCampus()">
              {{ showAddCampus() ? 'Close' : 'Add campus' }}
            </button>
            <div class="grid gap-2.5">
              @if (campuses().length === 0) {
                <p class="text-sm text-muted">
                  No campuses yet. Use “Add campus” to start configuring your portfolio.
                </p>
              }
              @for (campus of campuses(); track campus.id) {
                <a
                  class="grid gap-2.5 rounded-lg border border-line bg-panel p-3 text-ink transition-colors hover:border-green hover:bg-green-soft/30"
                  [routerLink]="['/admin/campuses', campus.id]"
                >
                  <div>
                    <h3 class="text-base font-bold">{{ campus.name }}</h3>
                    <p class="mt-0.5 text-sm text-muted">
                      {{ campus.buildingCount }} buildings · {{ campus.floorCount }} floors ·
                      {{ campus.roomCount }} rooms
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <app-badge [tone]="isConfigured(campus) ? 'good' : 'warn'">
                      {{ isConfigured(campus) ? 'Published' : 'Draft' }}
                    </app-badge>
                    <app-badge [tone]="issueCount(campus) > 0 ? 'warn' : 'neutral'">
                      {{ issueCount(campus) }} issues
                    </app-badge>
                  </div>
                </a>
              }
            </div>
          </app-panel>

          <app-panel heading="Attention queue" sub="Work that blocks publishing">
            <div class="grid gap-2.5">
              @if (attentionItems().length === 0) {
                <p class="message success">Nothing needs attention. The portfolio is fully configured.</p>
              }
              @for (item of attentionItems(); track item.label) {
                <a
                  class="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3 text-ink transition-colors hover:border-green hover:bg-green-soft/30"
                  [routerLink]="item.link"
                  [title]="item.hint"
                >
                  <span class="text-sm">{{ item.label }}</span>
                  <app-badge [tone]="item.urgent ? 'warn' : 'neutral'">{{ item.tag }}</app-badge>
                </a>
              }
            </div>
          </app-panel>
        </section>
      }
    </div>
  `,
  styles: ``,
})
export class AdminDashboardPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly campusesService = inject(CampusesService);
  private readonly mapsService = inject(MapsService);

  protected readonly campuses = signal<CampusSummaryDto[]>([]);
  protected readonly maps = signal<FloorMapSummaryDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected readonly error = signal('');
  protected readonly showAddCampus = signal(false);

  protected readonly campusForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    timezone: ['Europe/Bucharest', [Validators.required]],
  });

  protected readonly totalBuildings = computed(() =>
    this.campuses().reduce((sum, campus) => sum + campus.buildingCount, 0),
  );

  protected readonly totalRooms = computed(() =>
    this.campuses().reduce((sum, campus) => sum + campus.roomCount, 0),
  );

  protected readonly attentionItems = computed<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    for (const campus of this.campuses()) {
      if (!campus.boundaryGeoJson) {
        items.push({
          label: `Configure campus bounds for ${campus.name}`,
          hint: 'Draw the campus boundary on the map to anchor its spaces.',
          tag: 'Geometry',
          urgent: true,
          link: ['/admin/campuses', campus.id],
        });
      }

      if (campus.placeCount === 0) {
        items.push({
          label: `Add configurable spaces to ${campus.name}`,
          hint: 'No buildings, fields or other spaces are defined yet.',
          tag: 'Spaces',
          urgent: false,
          link: ['/admin/campuses', campus.id],
        });
      }
    }

    for (const map of this.maps()) {
      if (map.roomCount === 0) {
        items.push({
          label: `Define rooms for ${map.campusPlaceName} ${map.name}`,
          hint: 'This floor map has no rooms and cannot be booked.',
          tag: 'Import',
          urgent: false,
          link: ['/admin/floors', map.id, 'edit', 'rooms'],
        });
      }
    }

    return items;
  });

  protected issueCount(campus: CampusSummaryDto): number {
    let count = 0;
    if (!campus.boundaryGeoJson) {
      count += 1;
    }
    if (campus.placeCount === 0) {
      count += 1;
    }
    return count;
  }

  constructor() {
    void this.load();
  }

  protected toggleAddCampus(): void {
    this.showAddCampus.update((open) => !open);
  }

  protected isConfigured(campus: CampusSummaryDto): boolean {
    return !!campus.boundaryGeoJson && campus.floorCount > 0 && campus.roomCount > 0;
  }

  protected async createCampus(): Promise<void> {
    if (this.campusForm.invalid) {
      this.campusForm.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    this.error.set('');
    try {
      const created = await this.campusesService.create(this.campusForm.getRawValue());
      await this.router.navigate(['/admin/campuses', created.id]);
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.creating.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [campuses, maps] = await Promise.all([this.campusesService.list(), this.mapsService.list()]);
      this.campuses.set(campuses);
      this.maps.set(maps);
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private extractMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const payload = (error as { error?: { message?: string } }).error;
      if (payload?.message) {
        return payload.message;
      }
    }

    return 'Request failed.';
  }
}

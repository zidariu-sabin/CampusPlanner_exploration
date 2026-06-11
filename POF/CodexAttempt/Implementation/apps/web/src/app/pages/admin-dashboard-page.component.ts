import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CampusSummaryDto, FloorMapSummaryDto } from '@campus/contracts';

import { CampusesService } from '../core/campuses.service';
import { MapsService } from '../core/maps.service';

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
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="screen-shell">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (showAddCampus()) {
        <section class="panel">
          <header class="panel-header">
            <div>
              <h3>Add campus</h3>
              <p>Create a new campus and start configuring its footprint.</p>
            </div>
            <button class="secondary-action" type="button" (click)="toggleAddCampus()">Close</button>
          </header>
          <div class="panel-body">
            <form class="add-campus" [formGroup]="campusForm" (ngSubmit)="createCampus()">
              <label>
                Campus name
                <input type="text" formControlName="name" placeholder="North Campus" />
              </label>
              <label>
                Timezone
                <input type="text" formControlName="timezone" placeholder="Europe/Bucharest" />
              </label>
              <button class="primary-action" type="submit" [disabled]="creating() || campusForm.invalid">
                {{ creating() ? 'Creating…' : 'Create campus' }}
              </button>
            </form>
          </div>
        </section>
      }

      @if (loading()) {
        <p class="muted">Loading dashboard…</p>
      } @else {
        <section class="metrics-grid">
          <article class="metric">
            <span>Campuses</span>
            <strong>{{ campuses().length }}</strong>
          </article>
          <article class="metric">
            <span>Floor maps</span>
            <strong>{{ maps().length }}</strong>
          </article>
          <article class="metric">
            <span>Rooms</span>
            <strong>{{ totalRooms() }}</strong>
          </article>
          <article class="metric metric-warn">
            <span>Open issues</span>
            <strong>{{ attentionItems().length }}</strong>
          </article>
        </section>

        <section class="two-column">
          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>Campus portfolio</h3>
                <p>Operational status by site</p>
              </div>
              <button class="secondary-action" type="button" (click)="toggleAddCampus()">
                {{ showAddCampus() ? 'Close' : 'Add campus' }}
              </button>
            </header>
            <div class="panel-body">
              @if (campuses().length === 0) {
                <p class="muted">No campuses yet. Use “Add campus” to start configuring your portfolio.</p>
              }

              <div class="card-list">
                @for (campus of campuses(); track campus.id) {
                  <a class="campus-card" [routerLink]="['/admin/campuses', campus.id]">
                    <div>
                      <h3>{{ campus.name }}</h3>
                      <p>
                        {{ campus.buildingCount }} buildings · {{ campus.floorCount }} floors ·
                        {{ campus.roomCount }} rooms
                      </p>
                    </div>
                    <div class="status-row">
                      <span class="badge" [class.badge-good]="isConfigured(campus)" [class.badge-warn]="!isConfigured(campus)">
                        {{ isConfigured(campus) ? 'Published' : 'Draft' }}
                      </span>
                      <span class="badge" [class.badge-warn]="issueCount(campus) > 0">
                        {{ issueCount(campus) }} issues
                      </span>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>

          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>Attention queue</h3>
                <p>Work that blocks publishing</p>
              </div>
            </header>
            <div class="panel-body">
              @if (attentionItems().length === 0) {
                <p class="message success">Nothing needs attention. The portfolio is fully configured.</p>
              }

              <div class="task-list">
                @for (item of attentionItems(); track item.label) {
                  <a class="task" [routerLink]="item.link" [title]="item.hint">
                    <span>{{ item.label }}</span>
                    <span class="badge" [class.badge-warn]="item.urgent">{{ item.tag }}</span>
                  </a>
                }
              </div>
            </div>
          </section>
        </section>
      }
    </div>
  `,
  styles: `
    .add-campus {
      display: grid;
      grid-template-columns: 1.4fr 1fr auto;
      gap: 12px;
      align-items: end;
    }

    .add-campus button {
      align-self: end;
    }

    @media (max-width: 900px) {
      .add-campus {
        grid-template-columns: 1fr;
      }
    }
  `,
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

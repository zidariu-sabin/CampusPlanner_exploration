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
  link: string[];
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page admin-dashboard">
      <section class="section-header">
        <div>
          <h1>Admin dashboard</h1>
          <p class="muted">Portfolio health, floor coverage and setup tasks for your organization.</p>
        </div>
        <button type="button" (click)="toggleAddCampus()">
          {{ showAddCampus() ? 'Close' : 'Add campus' }}
        </button>
      </section>

      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (showAddCampus()) {
        <form class="card add-campus" [formGroup]="campusForm" (ngSubmit)="createCampus()">
          <label>
            Campus name
            <input type="text" formControlName="name" placeholder="North Campus" />
          </label>
          <label>
            Timezone
            <input type="text" formControlName="timezone" placeholder="Europe/Bucharest" />
          </label>
          <button type="submit" [disabled]="creating() || campusForm.invalid">
            {{ creating() ? 'Creating…' : 'Create campus' }}
          </button>
        </form>
      }

      @if (loading()) {
        <p class="muted">Loading dashboard…</p>
      } @else {
        <section class="metrics-grid">
          <article class="card metric">
            <span class="metric-value">{{ campuses().length }}</span>
            <span class="muted">Campuses</span>
          </article>
          <article class="card metric">
            <span class="metric-value">{{ totalBuildings() }}</span>
            <span class="muted">Buildings</span>
          </article>
          <article class="card metric">
            <span class="metric-value">{{ maps().length }}</span>
            <span class="muted">Floor maps</span>
          </article>
          <article class="card metric">
            <span class="metric-value">{{ totalRooms() }}</span>
            <span class="muted">Rooms</span>
          </article>
        </section>

        <section class="grid-2 dashboard-panels">
          <article class="card panel">
            <div class="section-header">
              <h2>Campus portfolio</h2>
              <span class="chip">{{ campuses().length }} campuses</span>
            </div>

            @if (campuses().length === 0) {
              <p class="muted">No campuses yet. Use "Add campus" to start configuring your portfolio.</p>
            }

            <div class="campus-list">
              @for (campus of campuses(); track campus.id) {
                <a class="campus-card" [routerLink]="['/admin/campuses', campus.id]">
                  <div class="campus-card-head">
                    <strong>{{ campus.name }}</strong>
                    <span class="badge" [class.success]="isConfigured(campus)" [class.warn]="!isConfigured(campus)">
                      {{ isConfigured(campus) ? 'configured' : 'draft' }}
                    </span>
                  </div>
                  <div class="campus-stats muted">
                    <span>{{ campus.placeCount }} spaces</span>
                    <span>{{ campus.buildingCount }} buildings</span>
                    <span>{{ campus.floorCount }} floors</span>
                    <span>{{ campus.roomCount }} rooms</span>
                  </div>
                </a>
              }
            </div>
          </article>

          <article class="card panel">
            <div class="section-header">
              <h2>Attention queue</h2>
              <span class="chip">{{ attentionItems().length }} open</span>
            </div>

            @if (attentionItems().length === 0) {
              <p class="message success">Nothing needs attention. The portfolio is fully configured.</p>
            }

            <div class="attention-list">
              @for (item of attentionItems(); track item.label) {
                <a class="attention-row" [routerLink]="item.link">
                  <strong>{{ item.label }}</strong>
                  <span class="muted">{{ item.hint }}</span>
                </a>
              }
            </div>
          </article>
        </section>
      }
    </div>
  `,
  styles: `
    .admin-dashboard {
      display: grid;
      gap: 1.5rem;
    }

    .add-campus {
      padding: 1.25rem;
      display: grid;
      grid-template-columns: 1.4fr 1fr auto;
      gap: 1rem;
      align-items: end;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
    }

    .metric {
      padding: 1.25rem;
      display: grid;
      gap: 0.25rem;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 700;
    }

    .panel {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
      align-content: start;
    }

    .dashboard-panels {
      align-items: start;
    }

    .campus-list,
    .attention-list {
      display: grid;
      gap: 0.75rem;
    }

    .campus-card,
    .attention-row {
      display: grid;
      gap: 0.45rem;
      padding: 0.9rem 1rem;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.6);
      text-decoration: none;
      transition: transform 120ms ease, box-shadow 120ms ease;
    }

    .campus-card:hover,
    .attention-row:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 28px rgba(31, 42, 51, 0.1);
    }

    .campus-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .campus-stats {
      display: flex;
      gap: 0.9rem;
      flex-wrap: wrap;
      font-size: 0.88rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .badge.success {
      background: rgba(21, 128, 61, 0.12);
      color: #166534;
    }

    .badge.warn {
      background: rgba(194, 65, 12, 0.12);
      color: var(--accent);
    }

    @media (max-width: 900px) {
      .metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

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
          link: ['/admin/campuses', campus.id],
        });
      }

      if (campus.placeCount === 0) {
        items.push({
          label: `Add configurable spaces to ${campus.name}`,
          hint: 'No buildings, fields or other spaces are defined yet.',
          link: ['/admin/campuses', campus.id],
        });
      }
    }

    for (const map of this.maps()) {
      if (map.roomCount === 0) {
        items.push({
          label: `Define rooms for ${map.campusPlaceName} ${map.name}`,
          hint: 'This floor map has no rooms and cannot be booked.',
          link: ['/admin/floors', map.id, 'edit', 'rooms'],
        });
      }
    }

    return items;
  });

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

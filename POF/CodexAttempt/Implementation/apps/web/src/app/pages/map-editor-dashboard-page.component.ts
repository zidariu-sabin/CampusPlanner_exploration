import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FloorMapDto } from '@campus/contracts';

import { MapPreviewComponent } from '../components/map-preview.component';
import { MapsService } from '../core/maps.service';

@Component({
  selector: 'app-map-editor-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MapPreviewComponent],
  template: `
    <div class="screen-shell">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading floor...</p>
      } @else if (map()) {
        <section class="map-layout">
          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>{{ map()!.name }}</h3>
                <p>{{ map()!.floorLabel }} · {{ map()!.campusPlaceName }}</p>
              </div>
              <div class="status-row">
                <span class="badge" [class.badge-good]="map()!.roomCount > 0">
                  {{ map()!.roomCount }} rooms
                </span>
                @if (map()!.backgroundImageUrl) {
                  <span class="badge">Background image</span>
                }
              </div>
            </header>
            <div class="panel-body">
              <app-map-preview [map]="map()!" />
            </div>
          </section>

          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>Floor editor</h3>
                <p>Align the plan, then define rooms</p>
              </div>
            </header>
            <div class="panel-body">
              <p class="muted">
                Configure the floor plan and alignment first, then define room boundaries over the
                saved footprint.
              </p>
              <div class="dashboard-actions">
                <a class="primary-action" [routerLink]="['/admin/floors', map()!.id, 'edit', 'map']">
                  Floor plan &amp; alignment
                </a>
                <a class="primary-action" [routerLink]="['/admin/floors', map()!.id, 'edit', 'rooms']">
                  Define rooms
                </a>
                <a class="secondary-action" routerLink="/admin/spaces">Back to spaces setup</a>
              </div>
            </div>
          </section>
        </section>
      }
    </div>
  `,
  styles: `
    .dashboard-actions {
      display: grid;
      gap: 10px;
      align-content: start;
    }
  `,
})
export class MapEditorDashboardPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly mapsService = inject(MapsService);

  protected readonly map = signal<FloorMapDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const mapId = this.route.snapshot.paramMap.get('mapId');
    if (!mapId) {
      this.error.set('Missing floor map id.');
      this.loading.set(false);
      return;
    }

    try {
      this.map.set(await this.mapsService.get(mapId));
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error && 'error' in error) {
      return (error as { error?: { message?: string } }).error?.message ?? 'Request failed.';
    }

    return 'Request failed.';
  }
}

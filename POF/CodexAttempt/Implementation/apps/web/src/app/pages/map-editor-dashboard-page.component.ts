import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MapDto } from '@campus/contracts';

import { MapPreviewComponent } from '../components/map-preview.component';
import { MapsService } from '../core/maps.service';

@Component({
  selector: 'app-map-editor-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MapPreviewComponent],
  template: `
    <div class="page editor-dashboard">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading map...</p>
      } @else if (map()) {
        <section class="section-header">
          <div>
            <h1>{{ map()!.name }}</h1>
            <p class="muted">{{ map()!.floorLabel }} · {{ map()!.timezone }}</p>
          </div>
          <div class="chips">
            <span class="chip">{{ map()!.roomCount }} rooms</span>
            @if (map()!.backgroundImageUrl) {
              <span class="chip">Background image</span>
            }
          </div>
        </section>

        <section class="grid-2 editor-dashboard-grid">
          <article class="card preview-card">
            <app-map-preview [map]="map()!" />
          </article>

          <article class="card panel action-panel">
            <div>
              <h2>Map Editor</h2>
              <p class="muted">
                Configure the digital map first, then define room boundaries over the saved
                footprint.
              </p>
            </div>

            <div class="dashboard-actions">
              <a class="button" [routerLink]="['/maps', map()!.id, 'edit', 'map']">
                Configure map
              </a>
              <a class="button" [routerLink]="['/maps', map()!.id, 'edit', 'rooms']">
                Define rooms
              </a>
              <a class="button ghost" [routerLink]="['/maps', map()!.id, 'book']">
                Open booking view
              </a>
              <a class="button ghost" routerLink="/">Back to maps</a>
            </div>
          </article>
        </section>
      }
    </div>
  `,
  styles: `
    .editor-dashboard,
    .action-panel,
    .dashboard-actions {
      display: grid;
      gap: 1.25rem;
    }

    .editor-dashboard-grid {
      align-items: start;
    }

    .preview-card,
    .action-panel {
      padding: 1.25rem;
    }

    .dashboard-actions {
      align-content: start;
    }
  `,
})
export class MapEditorDashboardPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly mapsService = inject(MapsService);

  protected readonly map = signal<MapDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const mapId = this.route.snapshot.paramMap.get('mapId');
    if (!mapId) {
      this.error.set('Missing map id.');
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

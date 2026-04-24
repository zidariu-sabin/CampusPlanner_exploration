import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MapDto } from '@campus/contracts';

import { MapPreviewComponent } from '../components/map-preview.component';
import { AuthService } from '../core/auth.service';
import { downloadMapSvg } from '../core/map-svg-export';
import { MapsService } from '../core/maps.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MapPreviewComponent],
  template: `
    <div class="page">
      <section class="section-header">
        <div>
          <h1>Maps</h1>
          <p class="muted">Choose a floor map to book rooms or open the editor.</p>
        </div>
        @if (auth.isAdmin()) {
          <a class="button" routerLink="/maps/new">New map</a>
        }
      </section>

      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (message()) {
        <p class="message success">{{ message() }}</p>
      }

      <section class="maps-grid">
        @for (map of maps(); track map.id) {
          <article class="card map-card">
            <div class="map-preview">
              <app-map-preview [map]="map" [compact]="true" />
            </div>
            <div class="map-content">
              <div class="section-header">
                <div>
                  <h2>{{ map.name }}</h2>
                  <p class="muted">{{ map.floorLabel }} · {{ map.timezone }}</p>
                  @if (map.parentMapName) {
                    <p class="muted">Inside {{ map.parentMapName }}</p>
                  }
                </div>
                <div class="chips">
                  <span class="chip">{{ map.roomCount }} rooms</span>
                  @if (map.childMapCount > 0) {
                    <span class="chip">{{ map.childMapCount }} child maps</span>
                  }
                </div>
              </div>

              <div class="actions">
                <a class="button" [routerLink]="['/maps', map.id, 'book']">Book rooms</a>
                <button type="button" class="ghost" (click)="exportSvg(map)">Export SVG</button>
                @if (auth.isAdmin()) {
                  <a class="button ghost" [routerLink]="['/maps', map.id, 'edit']">Edit map</a>
                }
              </div>
            </div>
          </article>
        } @empty {
          <article class="card empty-state">
            <h2>No maps yet</h2>
            <p class="muted">Create the first campus map to start drawing rooms and scheduling meetings.</p>
          </article>
        }
      </section>
    </div>
  `,
  styles: `
    .maps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .map-card {
      overflow: hidden;
      display: grid;
      min-height: 320px;
    }

    .map-preview {
      padding: 1rem 1rem 0;
    }

    .map-content {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .empty-state {
      padding: 2rem;
    }
  `,
})
export class DashboardPageComponent {
  protected readonly auth = inject(AuthService);
  private readonly mapsService = inject(MapsService);

  protected readonly maps = signal<MapDto[]>([]);
  protected readonly error = signal('');
  protected readonly message = signal('');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const summaries = await this.mapsService.list();
      this.maps.set(await Promise.all(summaries.map((map) => this.mapsService.get(map.id))));
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  protected async exportSvg(map: MapDto): Promise<void> {
    this.error.set('');
    this.message.set('');

    try {
      await downloadMapSvg(map);
      this.message.set(`Downloaded ${map.name} as SVG.`);
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error && 'error' in error) {
      return ((error as { error?: { message?: string } }).error?.message) ?? 'Unable to load maps.';
    }
    return 'Unable to load maps.';
  }
}

import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MapSummaryDto } from '@campus/contracts';

import { assetUrl } from '../core/api';
import { AuthService } from '../core/auth.service';
import { MapsService } from '../core/maps.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
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

      <section class="maps-grid">
        @for (map of maps(); track map.id) {
          <article class="card map-card">
            <div class="map-preview">
              @if (assetUrlFor(map.backgroundImageUrl)) {
                <img [src]="assetUrlFor(map.backgroundImageUrl)!" alt="" />
              } @else {
                <div class="placeholder mono">{{ map.floorLabel }}</div>
              }
            </div>
            <div class="map-content">
              <div class="section-header">
                <div>
                  <h2>{{ map.name }}</h2>
                  <p class="muted">{{ map.floorLabel }} · {{ map.timezone }}</p>
                </div>
                <span class="chip">{{ map.roomCount }} rooms</span>
              </div>

              <div class="actions">
                <a class="button" [routerLink]="['/maps', map.id, 'book']">Book rooms</a>
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
      min-height: 180px;
      background: linear-gradient(135deg, rgba(14, 116, 144, 0.08), rgba(194, 65, 12, 0.08));
      display: grid;
      place-items: center;
    }

    .map-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .placeholder {
      font-size: 2rem;
      letter-spacing: 0.12em;
      color: var(--ink-soft);
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

  protected readonly maps = signal<MapSummaryDto[]>([]);
  protected readonly error = signal('');

  constructor() {
    void this.load();
  }

  protected assetUrlFor(path: string | null): string | null {
    return assetUrl(path);
  }

  private async load(): Promise<void> {
    try {
      this.maps.set(await this.mapsService.list());
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  private extractMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      return ((error as { error?: { message?: string } }).error?.message) ?? 'Unable to load maps.';
    }
    return 'Unable to load maps.';
  }
}


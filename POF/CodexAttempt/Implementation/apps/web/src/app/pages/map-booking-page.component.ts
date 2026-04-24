import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MapBookingFormComponent } from '../components/map-booking-form.component';
import { MapsService } from '../core/maps.service';

@Component({
  selector: 'app-map-booking-page',
  standalone: true,
  imports: [CommonModule, MapBookingFormComponent],
  template: `
    <div class="page booking-page">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading maps...</p>
      } @else {
        <div class="form-stack">
          @for (mapId of mapIds(); track mapId; let index = $index) {
            <app-map-booking-form [mapId]="mapId" [embedded]="index > 0" />
          }
        </div>
      }
    </div>
  `,
  styles: `
    .booking-page,
    .form-stack {
      display: grid;
      gap: 1.5rem;
    }
  `,
})
export class MapBookingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly mapsService = inject(MapsService);

  protected readonly mapIds = signal<string[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const mapId = this.route.snapshot.paramMap.get('mapId');
    if (!mapId) {
      this.loading.set(false);
      return;
    }

    this.error.set('');

    try {
      const summaries = await this.mapsService.list();
      const childMapIds = summaries.filter((map) => map.parentMapId === mapId).map((map) => map.id);
      this.mapIds.set([mapId, ...childMapIds]);
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
      return ((error as { error?: { message?: string } }).error?.message) ?? 'Request failed.';
    }
    return 'Request failed.';
  }
}

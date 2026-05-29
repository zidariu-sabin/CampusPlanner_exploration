import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import { closeRing, type GeoJsonPolygon, type GeoJsonPosition } from '@campus/contracts';
import type mapboxglDefault from 'mapbox-gl';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { Feature, Polygon } from 'geojson';

import { environment } from '../../environments/environment';

const SAMPLE_CENTER: [number, number] = [23.830052, 44.297575];
const DEFAULT_ZOOM = 18;

@Component({
  selector: 'app-mapbox-footprint-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="mapbox-picker">
      <div class="picker-header">
        <div>
          <h3>Mapbox footprint</h3>
          <p class="muted">Draw or adjust the real-world footprint before saving.</p>
        </div>
        <span class="chip">Mapbox GL</span>
      </div>

      @if (!hasMapboxToken) {
        <p class="message error">
          Mapbox is not configured. Set environment.mapboxAccessToken to enable the map picker.
        </p>
      } @else {
        <div class="mapbox-actions">
          <button
            type="button"
            class="ghost"
            [class.active]="mode() === 'draw'"
            (click)="startDrawing()"
          >
            Draw footprint
          </button>
          <button
            type="button"
            class="ghost"
            [class.active]="mode() === 'edit'"
            [disabled]="!canEditVertices()"
            (click)="editVertices()"
          >
            Edit vertices
          </button>
          <button type="button" class="ghost" (click)="cancelInteraction()">Cancel</button>
        </div>

        <div #mapContainer class="mapbox-container"></div>

        @if (status()) {
          <p class="muted picker-status">{{ status() }}</p>
        }

        @if (error()) {
          <p class="message error">{{ error() }}</p>
        }
      }
    </section>
  `,
  styles: `
    .mapbox-picker {
      display: grid;
      gap: 0.85rem;
      padding: 0.9rem;
      border: 1px solid var(--line);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.45);
    }

    .picker-header,
    .mapbox-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .picker-header h3,
    .picker-header p,
    .picker-status {
      margin: 0;
    }

    .mapbox-actions {
      justify-content: flex-start;
    }

    .mapbox-actions .active {
      background: rgba(14, 116, 144, 0.1);
      border-color: rgba(14, 116, 144, 0.35);
      color: var(--ink);
    }

    .mapbox-container {
      width: 100%;
      min-height: 360px;
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.06);
    }
  `,
})
export class MapboxFootprintPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() footprint: GeoJsonPolygon | null = null;
  @Output() readonly footprintChange = new EventEmitter<GeoJsonPolygon>();

  @ViewChild('mapContainer')
  private mapContainer?: ElementRef<HTMLDivElement>;

  protected readonly hasMapboxToken = environment.mapboxAccessToken.trim().length > 0;
  protected readonly mode = signal<'idle' | 'draw' | 'edit'>('idle');
  protected readonly status = signal('');
  protected readonly error = signal('');

  private mapboxgl: typeof mapboxglDefault | null = null;
  private map: MapboxMap | null = null;
  private draw: MapboxDraw | null = null;
  private mapLoaded = false;
  private destroyed = false;
  private featureId: string | null = null;
  private lastSyncedFootprint = '';
  private syncingFromInput = false;

  private readonly onDrawChanged = (): void => {
    this.syncFootprintFromDraw();
  };

  ngAfterViewInit(): void {
    void this.initializeMapbox();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('footprint' in changes) {
      this.syncDrawFromInput(false);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (!this.map) {
      return;
    }

    this.map.off('draw.create', this.onDrawChanged);
    this.map.off('draw.update', this.onDrawChanged);
    this.map.remove();
    this.map = null;
    this.draw = null;
    this.mapboxgl = null;
  }

  protected startDrawing(): void {
    if (!this.draw) {
      return;
    }

    this.error.set('');
    this.status.set('Click the map to draw a replacement footprint.');
    this.mode.set('draw');
    this.syncingFromInput = true;
    this.draw.deleteAll();
    this.featureId = null;
    this.syncingFromInput = false;
    this.draw.changeMode('draw_polygon');
  }

  protected editVertices(): void {
    if (!this.draw || !this.featureId) {
      this.error.set('Draw or load a footprint before editing vertices.');
      return;
    }

    this.error.set('');
    this.status.set('Drag vertices to adjust the footprint.');
    this.mode.set('edit');
    this.draw.changeMode('direct_select', { featureId: this.featureId });
  }

  protected cancelInteraction(): void {
    if (!this.draw) {
      return;
    }

    this.error.set('');
    this.status.set('');
    this.mode.set('idle');
    this.syncDrawFromInput(false, true);
  }

  protected canEditVertices(): boolean {
    return !!this.featureId;
  }

  private async initializeMapbox(): Promise<void> {
    if (!this.hasMapboxToken) {
      return;
    }

    const container = this.mapContainer?.nativeElement;
    if (!container) {
      this.error.set('Mapbox container is unavailable.');
      return;
    }

    try {
      const [mapboxglModule, drawModule] = await Promise.all([
        import('mapbox-gl'),
        import('@mapbox/mapbox-gl-draw'),
      ]);
      if (this.destroyed) {
        return;
      }

      this.mapboxgl = mapboxglModule.default;
      const MapboxDrawConstructor = drawModule.default;

      this.mapboxgl.accessToken = environment.mapboxAccessToken;
      this.map = new this.mapboxgl.Map({
        container,
        style: environment.mapboxStyleUrl,
        center: SAMPLE_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      this.draw = new MapboxDrawConstructor({
        displayControlsDefault: false,
        controls: {},
        defaultMode: 'simple_select',
      });

      this.map.addControl(new this.mapboxgl.NavigationControl(), 'top-right');
      this.map.addControl(this.draw);
      this.map.on('load', () => {
        this.mapLoaded = true;
        this.syncDrawFromInput(true);
        this.map?.resize();
      });
      this.map.on('draw.create', this.onDrawChanged);
      this.map.on('draw.update', this.onDrawChanged);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Mapbox could not be loaded.');
    }
  }

  private syncDrawFromInput(fitToFootprint: boolean, force = false): void {
    if (!this.mapLoaded || !this.draw) {
      return;
    }

    const serialized = serializeFootprint(this.footprint);
    if (!force && serialized === this.lastSyncedFootprint) {
      return;
    }

    this.syncingFromInput = true;
    this.draw.deleteAll();
    this.featureId = null;

    if (this.footprint) {
      const ids = this.draw.add(toPolygonFeature(this.footprint));
      this.featureId = ids[0] ?? null;
      if (this.featureId) {
        this.draw.changeMode('simple_select', { featureIds: [this.featureId] });
      }
      if (fitToFootprint) {
        this.fitToFootprint(this.footprint);
      }
    }

    this.lastSyncedFootprint = serialized;
    this.syncingFromInput = false;
  }

  private syncFootprintFromDraw(): void {
    if (this.syncingFromInput || !this.draw) {
      return;
    }

    const data = this.draw.getAll();
    const polygonFeature = data.features.find((feature) => feature.geometry?.type === 'Polygon');
    if (!polygonFeature) {
      return;
    }

    const extraFeatureIds = data.features
      .filter((feature) => feature !== polygonFeature)
      .map((feature) => feature.id)
      .filter((id): id is string | number => id !== undefined);

    if (extraFeatureIds.length > 0) {
      this.syncingFromInput = true;
      this.draw.delete(extraFeatureIds.map((id) => String(id)));
      this.syncingFromInput = false;
    }

    const polygon = normalizePolygonFeature(polygonFeature);
    if (!polygon) {
      this.error.set('The drawn footprint must be a valid polygon.');
      return;
    }

    this.featureId = polygonFeature.id === undefined ? this.featureId : String(polygonFeature.id);
    this.lastSyncedFootprint = serializeFootprint(polygon);
    this.mode.set('idle');
    this.status.set('Footprint updated from Mapbox.');
    this.footprintChange.emit(polygon);
  }

  private fitToFootprint(polygon: GeoJsonPolygon): void {
    const map = this.map;
    const mapboxgl = this.mapboxgl;
    const ring = polygon.coordinates[0] ?? [];
    if (!map || !mapboxgl || ring.length === 0) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    for (const position of ring) {
      if (Number.isFinite(position[0]) && Number.isFinite(position[1])) {
        bounds.extend(position);
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 20, duration: 350 });
    }
  }
}

function toPolygonFeature(polygon: GeoJsonPolygon): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: polygon.coordinates,
    },
  };
}

function normalizePolygonFeature(feature: Feature): GeoJsonPolygon | null {
  const geometry = feature.geometry;
  if (!geometry || geometry.type !== 'Polygon') {
    return null;
  }

  const coordinates = geometry.coordinates
    .map((ring) => normalizeRing(ring))
    .filter((ring) => ring.length >= 4);

  if (coordinates.length === 0) {
    return null;
  }

  return {
    type: 'Polygon',
    coordinates,
  };
}

function normalizeRing(ring: number[][]): GeoJsonPosition[] {
  const positions = ring
    .map((position) => normalizePosition(position))
    .filter((position): position is GeoJsonPosition => !!position);

  if (positions.length < 3) {
    return [];
  }

  return closeRing(positions);
}

function normalizePosition(position: number[]): GeoJsonPosition | null {
  const [longitude, latitude] = position;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return [longitude, latitude];
}

function serializeFootprint(footprint: GeoJsonPolygon | null): string {
  return footprint ? JSON.stringify(footprint) : '';
}

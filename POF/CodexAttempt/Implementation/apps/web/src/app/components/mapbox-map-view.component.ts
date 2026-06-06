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
import { FormsModule } from '@angular/forms';
import {
  getProjectedBoundingBox,
  type GeoJsonPosition,
  type MapDto,
  unprojectGeoJsonPosition,
} from '@campus/contracts';
import type mapboxglDefault from 'mapbox-gl';
import type { GeoJSONSource, ImageSource, Map as MapboxMap, MapMouseEvent } from 'mapbox-gl';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

import { environment } from '../../environments/environment';
import { assetUrl } from '../core/api';

const DEFAULT_CENTER: [number, number] = [23.830052, 44.297575];
const DEFAULT_ZOOM = 18;

type MapStyleKey = 'standard-satellite' | 'streets';

const MAP_STYLES: Array<{ key: MapStyleKey; label: string; url: string }> = [
  {
    key: 'standard-satellite',
    label: 'Satellite',
    url: 'mapbox://styles/mapbox/standard-satellite',
  },
  { key: 'streets', label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
];

const DEFAULT_STYLE_KEY =
  MAP_STYLES.find((style) => style.url === environment.mapboxStyleUrl)?.key ?? 'standard-satellite';

@Component({
  selector: 'app-mapbox-map-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="mapbox-view">
      @if (!hasMapboxToken) {
        <p class="message error">
          Mapbox is not configured. Set MAPBOX_ACCESS_TOKEN in apps/web/.env to enable the map view.
        </p>
      } @else {
        <div class="view-controls">
          <label>
            Style
            <select [ngModel]="selectedStyle()" (ngModelChange)="setMapStyle($event)">
              @for (style of mapStyles; track style.key) {
                <option [value]="style.key">{{ style.label }}</option>
              }
            </select>
          </label>
          <label class="check-option">
            <input
              type="checkbox"
              [ngModel]="showPlanImage()"
              (ngModelChange)="setShowPlanImage($event)"
            />
            Floor plan
          </label>
        </div>

        <div #mapContainer class="mapbox-container"></div>

        @if (error()) {
          <p class="message error">{{ error() }}</p>
        }
      }
    </section>
  `,
  styles: `
    .mapbox-view {
      display: grid;
      gap: 0.85rem;
    }

    .view-controls {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) auto;
      gap: 0.65rem;
      align-items: end;
    }

    .check-option {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-height: 42px;
      padding: 0.55rem 0.65rem;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.68);
      color: var(--ink);
    }

    .check-option input {
      width: auto;
    }

    .mapbox-container {
      width: 100%;
      min-height: 420px;
      border: 1px solid var(--line);
      border-radius: 22px;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.06);
    }

    @media (max-width: 760px) {
      .view-controls {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class MapboxMapViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) map!: MapDto;
  @Input() selectedRoomId: string | null = null;
  @Output() readonly roomSelected = new EventEmitter<string>();

  @ViewChild('mapContainer')
  private mapContainer?: ElementRef<HTMLDivElement>;

  protected readonly hasMapboxToken = environment.mapboxAccessToken.trim().length > 0;
  protected readonly mapStyles = MAP_STYLES;
  protected readonly selectedStyle = signal<MapStyleKey>(DEFAULT_STYLE_KEY);
  protected readonly showPlanImage = signal(true);
  protected readonly error = signal('');

  private readonly idSuffix = Math.random().toString(36).slice(2);
  private readonly footprintSourceId = `booking-footprint-${this.idSuffix}`;
  private readonly footprintLayerId = `booking-footprint-layer-${this.idSuffix}`;
  private readonly roomsSourceId = `booking-rooms-${this.idSuffix}`;
  private readonly roomsFillLayerId = `booking-rooms-fill-${this.idSuffix}`;
  private readonly roomsLineLayerId = `booking-rooms-line-${this.idSuffix}`;
  private readonly planImageSourceId = `booking-plan-image-${this.idSuffix}`;
  private readonly planImageLayerId = `booking-plan-image-layer-${this.idSuffix}`;

  private mapboxgl: typeof mapboxglDefault | null = null;
  private mapInstance: MapboxMap | null = null;
  private mapLoaded = false;
  private destroyed = false;

  private readonly onStyleLoaded = (): void => {
    this.mapLoaded = true;
    this.syncMapLayers(true);
    this.mapInstance?.resize();
  };

  private readonly onRoomClick = (event: MapMouseEvent): void => {
    const roomId = event.features?.[0]?.properties?.['roomId'];
    if (typeof roomId === 'string') {
      this.roomSelected.emit(roomId);
    }
  };

  ngAfterViewInit(): void {
    void this.initializeMapbox();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('map' in changes || 'selectedRoomId' in changes) {
      this.syncMapLayers(false);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (!this.mapInstance) {
      return;
    }

    this.mapInstance.off('style.load', this.onStyleLoaded);
    this.mapInstance.off('click', this.roomsFillLayerId, this.onRoomClick);
    this.mapInstance.remove();
    this.mapInstance = null;
    this.mapboxgl = null;
  }

  protected setMapStyle(key: MapStyleKey): void {
    const style = MAP_STYLES.find((option) => option.key === key);
    if (!style || !this.mapInstance) {
      return;
    }

    this.selectedStyle.set(key);
    this.mapLoaded = false;
    this.mapInstance.setStyle(style.url);
  }

  protected setShowPlanImage(value: boolean): void {
    this.showPlanImage.set(value);
    this.syncPlanImage();
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
      const mapboxglModule = await import('mapbox-gl');
      if (this.destroyed) {
        return;
      }

      this.mapboxgl = mapboxglModule.default;
      this.mapboxgl.accessToken = environment.mapboxAccessToken;
      this.mapInstance = new this.mapboxgl.Map({
        container,
        style: MAP_STYLES.find((style) => style.key === this.selectedStyle())?.url,
        center: this.mapCenter(),
        zoom: DEFAULT_ZOOM,
      });

      this.mapInstance.addControl(new this.mapboxgl.NavigationControl(), 'top-right');
      this.mapInstance.on('style.load', this.onStyleLoaded);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Mapbox could not be loaded.');
    }
  }

  private syncMapLayers(fitToMap: boolean): void {
    if (!this.mapInstance || !this.mapLoaded) {
      return;
    }

    this.syncPlanImage();
    this.syncFootprint();
    this.syncRooms();
    if (fitToMap) {
      this.fitToFootprint();
    }
  }

  private syncPlanImage(): void {
    const map = this.mapInstance;
    if (!map || !this.mapLoaded) {
      return;
    }

    const backgroundUrl = assetUrl(this.map.backgroundImageUrl);
    const coordinates = this.planImageCoordinates();
    const shouldShow = this.showPlanImage() && !!backgroundUrl && !!coordinates;

    if (!shouldShow || !backgroundUrl || !coordinates) {
      this.removePlanImage();
      return;
    }

    const existingSource = map.getSource(this.planImageSourceId) as ImageSource | undefined;
    if (existingSource) {
      existingSource.updateImage({ url: backgroundUrl, coordinates });
    } else {
      map.addSource(this.planImageSourceId, {
        type: 'image',
        url: backgroundUrl,
        coordinates,
      });
    }

    if (!map.getLayer(this.planImageLayerId)) {
      map.addLayer({
        id: this.planImageLayerId,
        type: 'raster',
        source: this.planImageSourceId,
        paint: {
          'raster-opacity': 0.72,
          'raster-fade-duration': 0,
        },
      });
    }
  }

  private syncFootprint(): void {
    const map = this.mapInstance;
    if (!map) {
      return;
    }

    const source = map.getSource(this.footprintSourceId) as GeoJSONSource | undefined;
    const data = {
      type: 'Feature',
      properties: {},
      geometry: this.map.footprintGeoJson,
    } satisfies Feature<Polygon>;

    if (source) {
      source.setData(data);
    } else {
      map.addSource(this.footprintSourceId, { type: 'geojson', data });
      map.addLayer({
        id: this.footprintLayerId,
        type: 'line',
        source: this.footprintSourceId,
        paint: {
          'line-color': '#115e59',
          'line-width': 3,
        },
      });
    }
  }

  private syncRooms(): void {
    const map = this.mapInstance;
    if (!map) {
      return;
    }

    const source = map.getSource(this.roomsSourceId) as GeoJSONSource | undefined;
    const data = this.roomsFeatureCollection();

    if (source) {
      source.setData(data);
    } else {
      map.addSource(this.roomsSourceId, { type: 'geojson', data });
      map.addLayer({
        id: this.roomsFillLayerId,
        type: 'fill',
        source: this.roomsSourceId,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['case', ['get', 'selected'], 0.56, 0.35],
        },
      });
      map.addLayer({
        id: this.roomsLineLayerId,
        type: 'line',
        source: this.roomsSourceId,
        paint: {
          'line-color': ['case', ['get', 'selected'], '#111827', 'rgba(31,42,51,0.72)'],
          'line-width': ['case', ['get', 'selected'], 4, 2],
        },
      });
      map.on('click', this.roomsFillLayerId, this.onRoomClick);
    }
  }

  private removePlanImage(): void {
    const map = this.mapInstance;
    if (!map) {
      return;
    }

    if (map.getLayer(this.planImageLayerId)) {
      map.removeLayer(this.planImageLayerId);
    }
    if (map.getSource(this.planImageSourceId)) {
      map.removeSource(this.planImageSourceId);
    }
  }

  private fitToFootprint(): void {
    const map = this.mapInstance;
    const mapboxgl = this.mapboxgl;
    if (!map || !mapboxgl) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    for (const position of this.map.footprintGeoJson.coordinates[0] ?? []) {
      if (Number.isFinite(position[0]) && Number.isFinite(position[1])) {
        bounds.extend(position);
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 20, duration: 350 });
    }
  }

  private mapCenter(): [number, number] {
    const ring = this.map.footprintGeoJson.coordinates[0] ?? [];
    if (ring.length === 0) {
      return DEFAULT_CENTER;
    }

    const longitude = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
    const latitude = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
    return [longitude, latitude];
  }

  private roomsFeatureCollection(): FeatureCollection<Polygon> {
    return {
      type: 'FeatureCollection',
      features: this.map.rooms.map((room) => ({
        type: 'Feature',
        properties: {
          roomId: room.id,
          name: room.name,
          color: room.color,
          selected: room.id === this.selectedRoomId,
        },
        geometry: room.geometryGeoJson,
      })),
    };
  }

  private planImageCoordinates():
    | [[number, number], [number, number], [number, number], [number, number]]
    | null {
    const bounds = getProjectedBoundingBox(this.map.footprintGeoJson);
    const corners: GeoJsonPosition[] = [
      [bounds.minX, bounds.minY],
      [bounds.maxX, bounds.minY],
      [bounds.maxX, bounds.maxY],
      [bounds.minX, bounds.maxY],
    ];

    return corners.map((corner) => unprojectGeoJsonPosition(corner)) as [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ];
  }
}

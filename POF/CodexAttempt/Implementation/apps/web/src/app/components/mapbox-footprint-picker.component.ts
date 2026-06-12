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
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import {
  closeRing,
  getProjectedBoundingBox,
  type GeoJsonPolygon,
  type GeoJsonPosition,
  unprojectGeoJsonPosition,
} from '@campus/contracts';
// rotationDegrees is consumed directly; quarter-turn conversion is no longer needed.
import type mapboxglDefault from 'mapbox-gl';
import type { GeoJSONSource, ImageSource, Map as MapboxMap, MapMouseEvent } from 'mapbox-gl';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

import {
  getBackgroundImageRect,
  type BackgroundImageEditDraft,
} from '../core/background-image-editor';
import { environment } from '../../environments/environment';

const SAMPLE_CENTER: [number, number] = [23.830052, 44.297575];
const DEFAULT_ZOOM = 18;
const PLAN_IMAGE_SOURCE_ID = 'campus-plan-image';
const PLAN_IMAGE_LAYER_ID = 'campus-plan-image-layer';
const REFERENCE_SOURCE_ID = 'footprint-reference-source';
const REFERENCE_FILL_LAYER_ID = 'footprint-reference-fill';
const REFERENCE_LINE_LAYER_ID = 'footprint-reference-line';
const SPACES_SOURCE_ID = 'footprint-spaces-source';
const SPACES_FILL_LAYER_ID = 'footprint-spaces-fill';
const SPACES_LINE_LAYER_ID = 'footprint-spaces-line';
const SPACES_LABEL_LAYER_ID = 'footprint-spaces-label';

export interface SelectableFootprint {
  id: string;
  footprint: GeoJsonPolygon;
  name?: string;
  building?: boolean;
}

type MapStyleKey = 'standard-satellite' | 'streets';

const MAP_STYLES: Array<{ key: MapStyleKey; label: string; url: string }> = [
  { key: 'streets', label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  {
    key: 'standard-satellite',
    label: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
  },
];

const DEFAULT_STYLE_KEY =
  MAP_STYLES.find((style) => style.url === environment.mapboxStyleUrl)?.key ?? 'streets';

@Component({
  selector: 'app-mapbox-footprint-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          Mapbox is not configured. Set MAPBOX_ACCESS_TOKEN in apps/web/.env to enable the map picker.
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

        <div class="mapbox-layer-grid">
          <label class="style-field">
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

    .mapbox-layer-grid {
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

    .mapbox-actions .active {
      background: rgba(14, 116, 144, 0.1);
      border-color: rgba(14, 116, 144, 0.35);
      color: var(--ink);
    }

    .mapbox-container {
      width: 100%;
      min-height: 480px;
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.06);
    }

    @media (max-width: 760px) {
      .mapbox-layer-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class MapboxFootprintPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() footprint: GeoJsonPolygon | null = null;
  @Input() backgroundUrl: string | null = null;
  @Input() backgroundDraft: BackgroundImageEditDraft | null = null;
  /**
   * Optional non-editable reference outline (e.g. the campus boundary) drawn
   * beneath the editable footprint so the user can position spaces correctly.
   */
  @Input() referenceFootprint: GeoJsonPolygon | null = null;
  /**
   * Other already-defined footprints shown as non-editable but clickable
   * outlines. Clicking one emits `footprintSelected` so the host can make that
   * footprint the editable one.
   */
  @Input() selectableFootprints: SelectableFootprint[] = [];
  @Output() readonly footprintChange = new EventEmitter<GeoJsonPolygon>();
  @Output() readonly footprintSelected = new EventEmitter<string>();

  @ViewChild('mapContainer')
  private mapContainer?: ElementRef<HTMLDivElement>;

  protected readonly hasMapboxToken = environment.mapboxAccessToken.trim().length > 0;
  protected readonly mapStyles = MAP_STYLES;
  protected readonly selectedStyle = signal<MapStyleKey>(DEFAULT_STYLE_KEY);
  protected readonly showPlanImage = signal(true);
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

  private readonly onStyleLoaded = (): void => {
    this.mapLoaded = true;
    this.syncReferenceLayer();
    this.syncSpacesLayer();
    this.syncPlanImageOverlay();
    this.syncDrawFromInput(true, true);
    if (!this.footprint && this.referenceFootprint) {
      this.fitToFootprint(this.referenceFootprint);
    }
    this.map?.resize();
  };

  private readonly onDrawChanged = (): void => {
    this.syncFootprintFromDraw();
  };

  private readonly onSpaceClick = (event: MapMouseEvent): void => {
    const id = event.features?.[0]?.properties?.['footprintId'];
    if (typeof id === 'string') {
      this.footprintSelected.emit(id);
    }
  };

  private readonly onSpaceEnter = (): void => {
    if (this.map) {
      this.map.getCanvas().style.cursor = 'pointer';
    }
  };

  private readonly onSpaceLeave = (): void => {
    if (this.map) {
      this.map.getCanvas().style.cursor = '';
    }
  };

  ngAfterViewInit(): void {
    void this.initializeMapbox();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('footprint' in changes) {
      this.syncDrawFromInput(false);
      this.syncPlanImageOverlay();
    }

    if ('backgroundUrl' in changes || 'backgroundDraft' in changes) {
      this.syncPlanImageOverlay();
    }

    if ('referenceFootprint' in changes) {
      this.syncReferenceLayer();
      if (!this.footprint && this.referenceFootprint) {
        this.fitToFootprint(this.referenceFootprint);
      }
    }

    if ('selectableFootprints' in changes) {
      this.syncSpacesLayer();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (!this.map) {
      return;
    }

    this.map.off('draw.create', this.onDrawChanged);
    this.map.off('draw.update', this.onDrawChanged);
    this.map.off('style.load', this.onStyleLoaded);
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

  protected setMapStyle(key: MapStyleKey): void {
    const style = MAP_STYLES.find((option) => option.key === key);
    if (!style || !this.map) {
      return;
    }

    this.selectedStyle.set(key);
    this.mapLoaded = false;
    this.map.setStyle(style.url);
  }

  protected setShowPlanImage(value: boolean): void {
    this.showPlanImage.set(value);
    this.syncPlanImageOverlay();
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
        style: MAP_STYLES.find((style) => style.key === this.selectedStyle())?.url,
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
      this.map.on('style.load', this.onStyleLoaded);
      this.map.on('draw.create', this.onDrawChanged);
      this.map.on('draw.update', this.onDrawChanged);
      this.map.on('click', SPACES_FILL_LAYER_ID, this.onSpaceClick);
      this.map.on('mouseenter', SPACES_FILL_LAYER_ID, this.onSpaceEnter);
      this.map.on('mouseleave', SPACES_FILL_LAYER_ID, this.onSpaceLeave);
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

  private syncPlanImageOverlay(): void {
    const map = this.map;
    if (!map || !this.mapLoaded) {
      return;
    }

    const coordinates = this.getPlanImageCoordinates();
    const shouldShowImage =
      this.showPlanImage() && !!this.backgroundUrl && !!coordinates;

    if (!shouldShowImage || !this.backgroundUrl || !coordinates) {
      this.removePlanImageOverlay();
      return;
    }

    const existingSource = map.getSource(PLAN_IMAGE_SOURCE_ID) as ImageSource | undefined;
    if (existingSource) {
      existingSource.updateImage({
        url: this.backgroundUrl,
        coordinates,
      });
    } else {
      map.addSource(PLAN_IMAGE_SOURCE_ID, {
        type: 'image',
        url: this.backgroundUrl,
        coordinates,
      });
    }

    if (!map.getLayer(PLAN_IMAGE_LAYER_ID)) {
      map.addLayer({
        id: PLAN_IMAGE_LAYER_ID,
        type: 'raster',
        source: PLAN_IMAGE_SOURCE_ID,
        paint: {
          'raster-opacity': 0.72,
          'raster-fade-duration': 0,
        },
      });
    }
  }

  private removePlanImageOverlay(): void {
    const map = this.map;
    if (!map) {
      return;
    }

    if (map.getLayer(PLAN_IMAGE_LAYER_ID)) {
      map.removeLayer(PLAN_IMAGE_LAYER_ID);
    }
    if (map.getSource(PLAN_IMAGE_SOURCE_ID)) {
      map.removeSource(PLAN_IMAGE_SOURCE_ID);
    }
  }

  private syncReferenceLayer(): void {
    const map = this.map;
    if (!map || !this.mapLoaded) {
      return;
    }

    if (!this.referenceFootprint) {
      this.removeReferenceLayer();
      return;
    }

    const data = {
      type: 'Feature',
      properties: {},
      geometry: this.referenceFootprint,
    } satisfies Feature<Polygon>;

    const source = map.getSource(REFERENCE_SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }

    // Insert beneath the mapbox-gl-draw layers so the editable footprint and its
    // vertices stay interactive and on top of the reference outline.
    const sat = this.selectedStyle() === 'standard-satellite';
    const beforeId = this.firstDrawLayerId();
    map.addSource(REFERENCE_SOURCE_ID, { type: 'geojson', data });
    map.addLayer(
      {
        id: REFERENCE_FILL_LAYER_ID,
        type: 'fill',
        source: REFERENCE_SOURCE_ID,
        paint: { 'fill-color': '#0f766e', 'fill-opacity': sat ? 0.12 : 0.08 },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: REFERENCE_LINE_LAYER_ID,
        type: 'line',
        source: REFERENCE_SOURCE_ID,
        paint: {
          'line-color': sat ? '#ffffff' : '#0f3d3e',
          'line-width': sat ? 3.5 : 2.5,
          'line-dasharray': [2, 1.5],
        },
      },
      beforeId,
    );
  }

  private removeReferenceLayer(): void {
    const map = this.map;
    if (!map) {
      return;
    }
    if (map.getLayer(REFERENCE_LINE_LAYER_ID)) {
      map.removeLayer(REFERENCE_LINE_LAYER_ID);
    }
    if (map.getLayer(REFERENCE_FILL_LAYER_ID)) {
      map.removeLayer(REFERENCE_FILL_LAYER_ID);
    }
    if (map.getSource(REFERENCE_SOURCE_ID)) {
      map.removeSource(REFERENCE_SOURCE_ID);
    }
  }

  private firstDrawLayerId(): string | undefined {
    const map = this.map;
    if (!map) {
      return undefined;
    }
    const layers = map.getStyle()?.layers ?? [];
    return layers.find((layer) => layer.id.startsWith('gl-draw'))?.id;
  }

  private syncSpacesLayer(): void {
    const map = this.map;
    if (!map || !this.mapLoaded) {
      return;
    }

    const data: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: this.selectableFootprints.map((space) => ({
        type: 'Feature',
        properties: {
          footprintId: space.id,
          name: space.name ?? '',
          building: space.building ?? false,
        },
        geometry: space.footprint as Polygon,
      })),
    };

    const source = map.getSource(SPACES_SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }

    const sat = this.selectedStyle() === 'standard-satellite';
    const beforeId = this.firstDrawLayerId();
    map.addSource(SPACES_SOURCE_ID, { type: 'geojson', data });
    map.addLayer(
      {
        id: SPACES_FILL_LAYER_ID,
        type: 'fill',
        source: SPACES_SOURCE_ID,
        paint: {
          'fill-color': ['case', ['get', 'building'], '#0f766e', '#d97706'],
          'fill-opacity': sat ? 0.42 : 0.22,
        },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: SPACES_LINE_LAYER_ID,
        type: 'line',
        source: SPACES_SOURCE_ID,
        paint: {
          'line-color': sat ? '#ffffff' : ['case', ['get', 'building'], '#0f3d3e', '#92400e'],
          'line-width': sat ? 3 : 2,
        },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: SPACES_LABEL_LAYER_ID,
        type: 'symbol',
        source: SPACES_SOURCE_ID,
        layout: { 'text-field': ['get', 'name'], 'text-size': 12 },
        paint: {
          'text-color': sat ? '#ffffff' : '#172026',
          'text-halo-color': sat ? '#0b1f24' : '#ffffff',
          'text-halo-width': sat ? 1.8 : 1.4,
        },
      },
      beforeId,
    );
  }

  private getPlanImageCoordinates():
    | [[number, number], [number, number], [number, number], [number, number]]
    | null {
    if (!this.footprint || !this.backgroundDraft) {
      return null;
    }

    const bounds = getProjectedBoundingBox(this.footprint);
    const rect = getBackgroundImageRect(
      bounds,
      this.backgroundDraft.scale,
      this.backgroundDraft.offsetX,
      this.backgroundDraft.offsetY,
    );
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const rotationRadians = (this.backgroundDraft.rotationDegrees * Math.PI) / 180;
    const corners: GeoJsonPosition[] = [
      [rect.x, rect.y],
      [rect.x + rect.width, rect.y],
      [rect.x + rect.width, rect.y + rect.height],
      [rect.x, rect.y + rect.height],
    ];

    return corners.map((corner) => {
      const rotated = rotatePoint(corner, centerX, centerY, rotationRadians);
      return unprojectGeoJsonPosition(rotated);
    }) as [[number, number], [number, number], [number, number], [number, number]];
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

function rotatePoint(
  point: GeoJsonPosition,
  centerX: number,
  centerY: number,
  rotationRadians: number,
): GeoJsonPosition {
  if (rotationRadians === 0) {
    return point;
  }

  const [x, y] = point;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  const translatedX = x - centerX;
  const translatedY = y - centerY;

  return [
    centerX + translatedX * cos - translatedY * sin,
    centerY + translatedX * sin + translatedY * cos,
  ];
}

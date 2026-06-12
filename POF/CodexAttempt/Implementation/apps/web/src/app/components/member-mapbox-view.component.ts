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
  unprojectGeoJsonPosition,
  type CampusDto,
  type CampusSummaryDto,
  type FloorMapDto,
  type GeoJsonPosition,
} from '@campus/contracts';
import type mapboxglDefault from 'mapbox-gl';
import type {
  GeoJSONSource,
  ImageSource,
  Map as MapboxMap,
  MapMouseEvent,
  Popup,
} from 'mapbox-gl';
import type { FeatureCollection, Polygon } from 'geojson';

import { environment } from '../../environments/environment';
import { assetUrl } from '../core/api';

const DEFAULT_CENTER: [number, number] = [23.830052, 44.297575];
const DEFAULT_ZOOM = 15;

type MapStyleKey = 'standard-satellite' | 'streets';

const MAP_STYLES: Array<{ key: MapStyleKey; label: string; url: string }> = [
  { key: 'streets', label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { key: 'standard-satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
];

const DEFAULT_STYLE_KEY =
  MAP_STYLES.find((style) => style.url === environment.mapboxStyleUrl)?.key ?? 'streets';

@Component({
  selector: 'app-member-mapbox-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="member-map">
      @if (!hasMapboxToken) {
        <p class="message error">
          Mapbox is not configured. Set MAPBOX_ACCESS_TOKEN in apps/web/.env to enable the map view.
        </p>
      } @else {
        <div class="member-map-controls">
          <label>
            Base map
            <select [ngModel]="selectedStyle()" (ngModelChange)="setMapStyle($event)">
              @for (style of mapStyles; track style.key) {
                <option [value]="style.key">{{ style.label }}</option>
              }
            </select>
          </label>
          @if (floorMap) {
            <label class="check-option">
              <span>Floor plan</span>
              <input type="checkbox" [ngModel]="showPlanImage()" (ngModelChange)="setShowPlanImage($event)" />
            </label>
          }
        </div>

        <div #mapContainer class="member-map-canvas"></div>

        @if (error()) {
          <p class="message error">{{ error() }}</p>
        }
      }
    </div>
  `,
  styles: `
    .member-map {
      display: grid;
      gap: 10px;
    }

    .member-map-controls {
      display: flex;
      gap: 10px;
      align-items: end;
      flex-wrap: wrap;
    }

    .member-map-controls label {
      min-width: 160px;
    }

    .member-map-controls .check-option {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .member-map-controls .check-option input {
      width: auto;
    }

    .member-map-canvas {
      width: 100%;
      min-height: 480px;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      background: #e9eef0;
    }
  `,
})
export class MemberMapboxViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() campuses: CampusSummaryDto[] = [];
  @Input() selectedCampus: CampusDto | null = null;
  @Input() floorMap: FloorMapDto | null = null;
  @Input() selectedCampusId: string | null = null;
  @Input() selectedPlaceId: string | null = null;
  @Input() selectedRoomId: string | null = null;

  @Output() readonly campusSelected = new EventEmitter<string>();
  @Output() readonly placeSelected = new EventEmitter<string>();
  @Output() readonly roomSelected = new EventEmitter<string>();

  @ViewChild('mapContainer')
  private mapContainer?: ElementRef<HTMLDivElement>;

  protected readonly hasMapboxToken = environment.mapboxAccessToken.trim().length > 0;
  protected readonly mapStyles = MAP_STYLES;
  protected readonly selectedStyle = signal<MapStyleKey>(DEFAULT_STYLE_KEY);
  protected readonly showPlanImage = signal(true);
  protected readonly error = signal('');

  private readonly idSuffix = Math.random().toString(36).slice(2);
  private readonly campusSourceId = `member-campuses-${this.idSuffix}`;
  private readonly campusFillLayerId = `member-campuses-fill-${this.idSuffix}`;
  private readonly campusLineLayerId = `member-campuses-line-${this.idSuffix}`;
  private readonly campusLabelLayerId = `member-campuses-label-${this.idSuffix}`;
  private readonly placeSourceId = `member-places-${this.idSuffix}`;
  private readonly placeFillLayerId = `member-places-fill-${this.idSuffix}`;
  private readonly placeLineLayerId = `member-places-line-${this.idSuffix}`;
  private readonly placeLabelLayerId = `member-places-label-${this.idSuffix}`;
  private readonly roomSourceId = `member-rooms-${this.idSuffix}`;
  private readonly roomFillLayerId = `member-rooms-fill-${this.idSuffix}`;
  private readonly roomLineLayerId = `member-rooms-line-${this.idSuffix}`;
  private readonly roomLabelLayerId = `member-rooms-label-${this.idSuffix}`;
  private readonly planImageSourceId = `member-plan-image-${this.idSuffix}`;
  private readonly planImageLayerId = `member-plan-image-layer-${this.idSuffix}`;

  private mapboxgl: typeof mapboxglDefault | null = null;
  private mapInstance: MapboxMap | null = null;
  private popup: Popup | null = null;
  private mapLoaded = false;
  private destroyed = false;
  /** Tracks which focus level the camera last fitted so we only re-fit on real changes. */
  private lastFitKey = '';

  private readonly onStyleLoaded = (): void => {
    this.mapLoaded = true;
    this.syncLayers(true);
    this.mapInstance?.resize();
  };

  ngAfterViewInit(): void {
    void this.initializeMapbox();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (Object.keys(changes).length > 0) {
      this.syncLayers(false);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.popup?.remove();
    if (!this.mapInstance) {
      return;
    }
    this.mapInstance.off('style.load', this.onStyleLoaded);
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
    this.lastFitKey = '';
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
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });
      this.popup = new this.mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12 });
      this.mapInstance.addControl(new this.mapboxgl.NavigationControl(), 'top-right');
      this.mapInstance.on('style.load', this.onStyleLoaded);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Mapbox could not be loaded.');
    }
  }

  /** Satellite imagery is busy/low-contrast, so overlays get heavier strokes and white casings. */
  private get satellite(): boolean {
    return this.selectedStyle() === 'standard-satellite';
  }

  private syncLayers(forceFit: boolean): void {
    if (!this.mapInstance || !this.mapLoaded) {
      return;
    }
    this.syncCampuses();
    this.syncPlaces();
    this.syncPlanImage();
    this.syncRooms();
    this.fitToFocus(forceFit);
  }

  // ---- Campus boundaries -------------------------------------------------

  private syncCampuses(): void {
    const map = this.mapInstance;
    if (!map) {
      return;
    }

    const data: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: this.campuses
        .filter((campus) => !!campus.boundaryGeoJson)
        .map((campus) => ({
          type: 'Feature',
          properties: {
            campusId: campus.id,
            name: campus.name,
            selected: campus.id === this.selectedCampusId,
          },
          geometry: campus.boundaryGeoJson as Polygon,
        })),
    };

    const source = map.getSource(this.campusSourceId) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }

    const sat = this.satellite;
    map.addSource(this.campusSourceId, { type: 'geojson', data });
    map.addLayer({
      id: this.campusFillLayerId,
      type: 'fill',
      source: this.campusSourceId,
      paint: {
        'fill-color': '#0f766e',
        'fill-opacity': ['case', ['get', 'selected'], sat ? 0.2 : 0.12, sat ? 0.12 : 0.06],
      },
    });
    map.addLayer({
      id: this.campusLineLayerId,
      type: 'line',
      source: this.campusSourceId,
      paint: {
        'line-color': sat ? '#ffffff' : '#0f3d3e',
        'line-width': ['case', ['get', 'selected'], sat ? 5 : 3.5, sat ? 3 : 1.75],
      },
    });
    map.addLayer({
      id: this.campusLabelLayerId,
      type: 'symbol',
      source: this.campusSourceId,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 13,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': sat ? '#ffffff' : '#0f3d3e',
        'text-halo-color': sat ? '#0b1f24' : '#ffffff',
        'text-halo-width': sat ? 1.8 : 1.5,
      },
    });
    this.registerInteraction(this.campusFillLayerId, 'campus');
  }

  // ---- Campus spaces (buildings / outdoor) -------------------------------

  private syncPlaces(): void {
    const map = this.mapInstance;
    if (!map) {
      return;
    }

    const places = this.selectedCampus?.places ?? [];
    const data: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: places.map((place) => ({
        type: 'Feature',
        properties: {
          placeId: place.id,
          name: place.name,
          building: !!place.buildingId,
          bookable: place.bookable,
          selected: place.id === this.selectedPlaceId,
        },
        geometry: place.footprintGeoJson as Polygon,
      })),
    };

    const source = map.getSource(this.placeSourceId) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }

    const sat = this.satellite;
    map.addSource(this.placeSourceId, { type: 'geojson', data });
    map.addLayer({
      id: this.placeFillLayerId,
      type: 'fill',
      source: this.placeSourceId,
      paint: {
        'fill-color': ['case', ['get', 'building'], '#0f766e', '#d97706'],
        'fill-opacity': ['case', ['get', 'selected'], sat ? 0.72 : 0.55, sat ? 0.48 : 0.28],
      },
    });
    map.addLayer({
      id: this.placeLineLayerId,
      type: 'line',
      source: this.placeSourceId,
      paint: {
        'line-color': sat ? '#ffffff' : ['case', ['get', 'building'], '#0f3d3e', '#92400e'],
        'line-width': ['case', ['get', 'selected'], sat ? 4.5 : 3.5, sat ? 3 : 2],
      },
    });
    map.addLayer({
      id: this.placeLabelLayerId,
      type: 'symbol',
      source: this.placeSourceId,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
      },
      paint: {
        'text-color': sat ? '#ffffff' : '#172026',
        'text-halo-color': sat ? '#0b1f24' : '#ffffff',
        'text-halo-width': sat ? 1.8 : 1.4,
      },
    });
    this.registerInteraction(this.placeFillLayerId, 'place');
  }

  // ---- Floor rooms -------------------------------------------------------

  private syncRooms(): void {
    const map = this.mapInstance;
    if (!map) {
      return;
    }

    const rooms = this.floorMap?.rooms ?? [];
    const data: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: rooms.map((room) => ({
        type: 'Feature',
        properties: {
          roomId: room.id,
          name: room.name,
          color: room.color,
          bookable: !!room.bookableResourceId,
          selected: room.id === this.selectedRoomId,
        },
        geometry: room.geometryGeoJson as Polygon,
      })),
    };

    const source = map.getSource(this.roomSourceId) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }

    const sat = this.satellite;
    map.addSource(this.roomSourceId, { type: 'geojson', data });
    map.addLayer({
      id: this.roomFillLayerId,
      type: 'fill',
      source: this.roomSourceId,
      paint: {
        'fill-color': ['coalesce', ['get', 'color'], '#2563eb'],
        'fill-opacity': ['case', ['get', 'selected'], sat ? 0.78 : 0.6, sat ? 0.52 : 0.32],
      },
    });
    map.addLayer({
      id: this.roomLineLayerId,
      type: 'line',
      source: this.roomSourceId,
      paint: {
        'line-color': ['case', ['get', 'selected'], '#111827', sat ? '#ffffff' : 'rgba(23,32,38,0.7)'],
        'line-width': ['case', ['get', 'selected'], sat ? 5 : 4, sat ? 3 : 2],
      },
    });
    map.addLayer({
      id: this.roomLabelLayerId,
      type: 'symbol',
      source: this.roomSourceId,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
      },
      paint: {
        'text-color': sat ? '#ffffff' : '#0b1f24',
        'text-halo-color': sat ? '#0b1f24' : '#ffffff',
        'text-halo-width': sat ? 1.6 : 1.2,
      },
    });
    this.registerInteraction(this.roomFillLayerId, 'room');
  }

  // ---- Floor plan raster overlay -----------------------------------------

  private syncPlanImage(): void {
    const map = this.mapInstance;
    if (!map || !this.mapLoaded) {
      return;
    }

    const backgroundUrl = this.floorMap ? assetUrl(this.floorMap.backgroundImageUrl) : null;
    const coordinates = this.planImageCoordinates();
    const shouldShow = this.showPlanImage() && !!backgroundUrl && !!coordinates;

    if (!shouldShow || !backgroundUrl || !coordinates) {
      this.removePlanImage();
      return;
    }

    const existing = map.getSource(this.planImageSourceId) as ImageSource | undefined;
    if (existing) {
      existing.updateImage({ url: backgroundUrl, coordinates });
    } else {
      map.addSource(this.planImageSourceId, { type: 'image', url: backgroundUrl, coordinates });
    }

    if (!map.getLayer(this.planImageLayerId)) {
      const beforeId = map.getLayer(this.roomFillLayerId) ? this.roomFillLayerId : undefined;
      map.addLayer(
        {
          id: this.planImageLayerId,
          type: 'raster',
          source: this.planImageSourceId,
          paint: { 'raster-opacity': 0.7, 'raster-fade-duration': 0 },
        },
        beforeId,
      );
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

  private planImageCoordinates():
    | [[number, number], [number, number], [number, number], [number, number]]
    | null {
    if (!this.floorMap) {
      return null;
    }
    const bounds = getProjectedBoundingBox(this.floorMap.footprintGeoJson);
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

  // ---- Interaction -------------------------------------------------------

  private registerInteraction(layerId: string, kind: 'campus' | 'place' | 'room'): void {
    const map = this.mapInstance;
    if (!map) {
      return;
    }

    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('click', layerId, (event: MapMouseEvent) => {
      const properties = event.features?.[0]?.properties;
      if (!properties) {
        return;
      }

      if (kind === 'campus' && typeof properties['campusId'] === 'string') {
        this.campusSelected.emit(properties['campusId']);
        this.showInfoPopup(event, properties['name'], 'Campus');
      } else if (kind === 'place' && typeof properties['placeId'] === 'string') {
        this.placeSelected.emit(properties['placeId']);
        const subtitle = properties['building']
          ? 'Building'
          : properties['bookable']
            ? 'Bookable outdoor space'
            : 'Outdoor space';
        this.showInfoPopup(event, properties['name'], subtitle);
      } else if (kind === 'room' && typeof properties['roomId'] === 'string') {
        this.roomSelected.emit(properties['roomId']);
        const subtitle = properties['bookable'] ? 'Room · bookable' : 'Room';
        this.showInfoPopup(event, properties['name'], subtitle);
      }
    });
  }

  private showInfoPopup(event: MapMouseEvent, name: unknown, subtitle: string): void {
    if (!this.popup || !this.mapInstance || typeof name !== 'string') {
      return;
    }
    const safeName = name.replace(/</g, '&lt;');
    this.popup
      .setLngLat(event.lngLat)
      .setHTML(
        `<div style="font-family:Inter,sans-serif"><strong style="font-size:13px">${safeName}</strong>` +
          `<div style="color:#6c7a82;font-size:11px;font-weight:700">${subtitle}</div></div>`,
      )
      .addTo(this.mapInstance);
  }

  // ---- Camera fitting ----------------------------------------------------

  private fitToFocus(force: boolean): void {
    const map = this.mapInstance;
    const mapboxgl = this.mapboxgl;
    if (!map || !mapboxgl) {
      return;
    }

    let key = '';
    let rings: number[][][] = [];

    if (this.floorMap) {
      key = `floor:${this.floorMap.id}`;
      rings = [this.floorMap.footprintGeoJson.coordinates[0] ?? []];
    } else if (this.selectedCampus?.boundaryGeoJson) {
      key = `campus:${this.selectedCampus.id}`;
      rings = [this.selectedCampus.boundaryGeoJson.coordinates[0] ?? []];
    } else if (this.selectedCampus) {
      key = `campus-places:${this.selectedCampus.id}`;
      rings = this.selectedCampus.places.map((place) => place.footprintGeoJson.coordinates[0] ?? []);
    } else {
      key = `all:${this.campuses.map((campus) => campus.id).join(',')}`;
      rings = this.campuses
        .filter((campus) => !!campus.boundaryGeoJson)
        .map((campus) => (campus.boundaryGeoJson as Polygon).coordinates[0] ?? []);
    }

    if (!force && key === this.lastFitKey) {
      return;
    }
    this.lastFitKey = key;

    const bounds = new mapboxgl.LngLatBounds();
    for (const ring of rings) {
      for (const position of ring) {
        if (Number.isFinite(position[0]) && Number.isFinite(position[1])) {
          bounds.extend(position as [number, number]);
        }
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 56, maxZoom: 20, duration: 400 });
    }
  }
}

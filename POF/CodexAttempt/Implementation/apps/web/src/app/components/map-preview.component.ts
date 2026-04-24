import { Component, input, output } from '@angular/core';
import { GeoJsonPolygon, MapDto, RoomDto, getBoundingBox, polygonToPointsAttribute } from '@campus/contracts';

import { assetUrl } from '../core/api';

@Component({
  selector: 'app-map-preview',
  standalone: true,
  template: `
    <svg class="map-preview-svg" [class.compact]="compact()" [attr.viewBox]="viewBox()">
      @if (backgroundUrl()) {
        <image
          [attr.href]="backgroundUrl()!"
          [attr.x]="bounds().minX"
          [attr.y]="bounds().minY"
          [attr.width]="bounds().width"
          [attr.height]="bounds().height"
          preserveAspectRatio="none"
        />
      }

      <polygon class="footprint" [attr.points]="footprintPoints()" />

      @for (room of map().rooms; track room.id) {
        <g>
          <polygon
            class="room-shape"
            [class.selected]="selectedRoomId() === room.id"
            [attr.points]="pointsForRoom(room.geometryGeoJson)"
            [attr.fill]="room.color"
            [style.cursor]="selectable() ? 'pointer' : 'default'"
            fill-opacity="0.35"
            stroke-width="2"
            (click)="selectRoom(room.id)"
          />
          @if (showLabels()) {
            <text class="room-label" [attr.x]="roomLabelX(room)" [attr.y]="roomLabelY(room)">
              {{ room.name }}
            </text>
          }
        </g>
      }
    </svg>
  `,
  styles: `
    .map-preview-svg {
      width: 100%;
      min-height: 420px;
      border-radius: 22px;
      background:
        linear-gradient(90deg, rgba(31, 42, 51, 0.04) 1px, transparent 1px),
        linear-gradient(rgba(31, 42, 51, 0.04) 1px, transparent 1px),
        white;
      background-size: 20px 20px;
      box-shadow: inset 0 0 0 1px rgba(31, 42, 51, 0.08);
    }

    .map-preview-svg.compact {
      min-height: 220px;
    }

    .footprint {
      fill: rgba(17, 94, 89, 0.08);
      stroke: var(--brand-strong);
      stroke-width: 2.5;
    }

    .room-shape {
      stroke: rgba(31, 42, 51, 0.65);
      transition: stroke 120ms ease, stroke-width 120ms ease, fill-opacity 120ms ease;
    }

    .room-shape.selected {
      stroke: #111827;
      stroke-width: 3;
      fill-opacity: 0.48;
    }

    .room-label {
      font-size: 12px;
      pointer-events: none;
      fill: #0f172a;
    }
  `,
})
export class MapPreviewComponent {
  readonly map = input.required<MapDto>();
  readonly compact = input(false);
  readonly selectable = input(false);
  readonly showLabels = input(true);
  readonly selectedRoomId = input<string | null>(null);
  readonly roomSelected = output<string>();

  protected bounds() {
    return getBoundingBox(this.map().footprintGeoJson);
  }

  protected viewBox(): string {
    const box = this.bounds();
    const padX = Math.max(box.width * 0.08, 24);
    const padY = Math.max(box.height * 0.08, 24);
    return `${box.minX - padX} ${box.minY - padY} ${box.width + padX * 2} ${box.height + padY * 2}`;
  }

  protected footprintPoints(): string {
    return polygonToPointsAttribute(this.map().footprintGeoJson);
  }

  protected pointsForRoom(polygon: GeoJsonPolygon): string {
    return polygonToPointsAttribute(polygon);
  }

  protected backgroundUrl(): string | null {
    return assetUrl(this.map().backgroundImageUrl);
  }

  protected roomLabelX(room: RoomDto): number {
    return getBoundingBox(room.geometryGeoJson).minX + 6;
  }

  protected roomLabelY(room: RoomDto): number {
    const box = getBoundingBox(room.geometryGeoJson);
    return box.minY + Math.min(Math.max(box.height * 0.3, 14), 22);
  }

  protected selectRoom(roomId: string): void {
    if (this.selectable()) {
      this.roomSelected.emit(roomId);
    }
  }
}

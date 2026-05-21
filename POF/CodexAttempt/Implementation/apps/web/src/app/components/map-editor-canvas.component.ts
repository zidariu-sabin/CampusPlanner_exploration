import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, input, output } from '@angular/core';
import {
  EditorRoomModel,
  GeoJsonPolygon,
  GeoJsonPosition,
  createPolygon,
  getBoundingBox,
  getProjectedBoundingBox,
  polygonContainsPolygon,
  polygonToRoomModel,
  projectedPolygonToPointsAttribute,
  projectGeoJsonPolygon,
  projectGeoJsonPosition,
  roomModelToPolygon,
  unprojectGeoJsonPolygon,
  unprojectGeoJsonPosition,
} from '@campus/contracts';

import {
  type BackgroundImageEditDraft,
  type CanvasMode,
  type EditorRectangle,
  clampCropRect,
  createDefaultCropRect,
  createMinimumCropSize,
  getBackgroundImageRect,
  quarterTurnsToDegrees,
} from '../core/background-image-editor';

type RoomInteractionMode = 'drag' | 'resize';
type CropHandle = 'nw' | 'ne' | 'se' | 'sw';

interface RoomInteractionState {
  kind: 'room';
  roomId: string;
  mode: RoomInteractionMode;
  startX: number;
  startY: number;
  initial: EditorRoomModel;
}

interface BackgroundPanInteractionState {
  kind: 'background-pan';
  startX: number;
  startY: number;
  initialOffsetX: number;
  initialOffsetY: number;
}

interface CropMoveInteractionState {
  kind: 'crop-move';
  startX: number;
  startY: number;
  initial: EditorRectangle;
}

interface CropResizeInteractionState {
  kind: 'crop-resize';
  handle: CropHandle;
  startX: number;
  startY: number;
  initial: EditorRectangle;
}

type InteractionState =
  | RoomInteractionState
  | BackgroundPanInteractionState
  | CropMoveInteractionState
  | CropResizeInteractionState;

@Component({
  selector: 'app-map-editor-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (footprint()) {
      <svg #svgCanvas class="editor-svg" [attr.viewBox]="viewBox()">
        <defs>
          <clipPath [attr.id]="backgroundClipPathId">
            <polygon [attr.points]="footprintPoints()" />
          </clipPath>
        </defs>

        @if (backgroundUrl()) {
          @if (canvasMode() === 'crop') {
            <g [attr.clip-path]="'url(#' + backgroundClipPathId + ')'">
              <image
                [attr.href]="backgroundUrl()!"
                [attr.x]="backgroundImageRect().x"
                [attr.y]="backgroundImageRect().y"
                [attr.width]="backgroundImageRect().width"
                [attr.height]="backgroundImageRect().height"
                preserveAspectRatio="none"
                [attr.transform]="backgroundRotationTransform()"
              />
            </g>
          } @else {
            <g [attr.clip-path]="'url(#' + backgroundClipPathId + ')'">
              <svg
                [attr.x]="bounds().minX"
                [attr.y]="bounds().minY"
                [attr.width]="bounds().width"
                [attr.height]="bounds().height"
                [attr.viewBox]="backgroundPreviewViewBox()"
                preserveAspectRatio="none"
              >
                <image
                  [attr.href]="backgroundUrl()!"
                  [attr.x]="backgroundImageRect().x"
                  [attr.y]="backgroundImageRect().y"
                  [attr.width]="backgroundImageRect().width"
                  [attr.height]="backgroundImageRect().height"
                  preserveAspectRatio="none"
                  [attr.transform]="backgroundRotationTransform()"
                />
              </svg>
            </g>
          }
        }

        @if (backgroundUrl() && canvasMode() === 'image') {
          <rect
            class="image-pan-layer"
            [attr.x]="bounds().minX"
            [attr.y]="bounds().minY"
            [attr.width]="bounds().width"
            [attr.height]="bounds().height"
            (pointerdown)="startBackgroundPan($event)"
          />
        }

        <polygon class="footprint" [attr.points]="footprintPoints()" />

        @for (room of rooms(); track room.id) {
          <g>
            <polygon
              class="room-shape"
              [class.invalid]="!isRoomValid(room)"
              [class.selected]="selectedRoomId() === room.id"
              [class.inactive]="canvasMode() !== 'rooms'"
              [attr.points]="pointsForRoom(room)"
              [attr.fill]="room.color"
              [style.pointer-events]="canvasMode() === 'rooms' ? 'auto' : 'none'"
              fill-opacity="0.35"
              stroke-width="2"
              (pointerdown)="startRoomInteraction($event, room, 'drag')"
              (click)="selectedRoomIdChange.emit(room.id)"
            />
            <text
              class="room-label"
              [attr.x]="roomLabelX(room)"
              [attr.y]="roomLabelY(room)"
              [attr.font-size]="labelFontSize()"
            >
              {{ room.name }}
            </text>
            <circle
              class="resize-handle"
              [class.inactive]="canvasMode() !== 'rooms'"
              [style.pointer-events]="canvasMode() === 'rooms' ? 'auto' : 'none'"
              [attr.cx]="roomResizeHandleX(room)"
              [attr.cy]="roomResizeHandleY(room)"
              [attr.r]="handleRadius()"
              (pointerdown)="startRoomInteraction($event, room, 'resize')"
            />
          </g>
        }

        @if (polygonDrawing() && canvasMode() === 'rooms') {
          <rect
            class="polygon-click-layer"
            [attr.x]="bounds().minX"
            [attr.y]="bounds().minY"
            [attr.width]="bounds().width"
            [attr.height]="bounds().height"
            (pointerdown)="addPolygonPoint($event)"
          />
          @if (polygonDraftPoints().length > 0) {
            <polyline class="polygon-draft-line" [attr.points]="draftPointsAttribute()" />
          }
          @for (point of polygonDraftPoints(); track $index) {
            <circle
              class="polygon-draft-point"
              [class.first]="!!$first"
              [attr.cx]="projectedDraftPointX(point)"
              [attr.cy]="projectedDraftPointY(point)"
              [attr.r]="handleRadius()"
              (pointerdown)="onDraftPointPointerDown($event)"
              (dblclick)="completePolygon($event, $first)"
            />
          }
        }

        @if (backgroundUrl() && canvasMode() === 'crop') {
          <g class="crop-overlay">
            <rect
              class="crop-mask"
              [attr.x]="bounds().minX"
              [attr.y]="bounds().minY"
              [attr.width]="bounds().width"
              [attr.height]="displayedCropRect().y - bounds().minY"
            />
            <rect
              class="crop-mask"
              [attr.x]="bounds().minX"
              [attr.y]="displayedCropRect().y"
              [attr.width]="displayedCropRect().x - bounds().minX"
              [attr.height]="displayedCropRect().height"
            />
            <rect
              class="crop-mask"
              [attr.x]="displayedCropRect().x + displayedCropRect().width"
              [attr.y]="displayedCropRect().y"
              [attr.width]="bounds().maxX - (displayedCropRect().x + displayedCropRect().width)"
              [attr.height]="displayedCropRect().height"
            />
            <rect
              class="crop-mask"
              [attr.x]="bounds().minX"
              [attr.y]="displayedCropRect().y + displayedCropRect().height"
              [attr.width]="bounds().width"
              [attr.height]="bounds().maxY - (displayedCropRect().y + displayedCropRect().height)"
            />
            <rect
              class="crop-frame"
              [attr.x]="displayedCropRect().x"
              [attr.y]="displayedCropRect().y"
              [attr.width]="displayedCropRect().width"
              [attr.height]="displayedCropRect().height"
              (pointerdown)="startCropMove($event)"
            />
            @for (handle of cropHandles(); track handle.key) {
              <circle
                class="crop-handle"
                [attr.cx]="handle.cx"
                [attr.cy]="handle.cy"
                [attr.r]="cropHandleRadius()"
                (pointerdown)="startCropResize($event, handle.key)"
              />
            }
          </g>
        }
      </svg>
    } @else {
      <p class="message error">
        The footprint GeoJSON must be a valid Polygon before rooms can be edited.
      </p>
    }
  `,
  styles: `
    .editor-svg {
      width: 100%;
      min-height: 420px;
      border-radius: 22px;
      background:
        linear-gradient(90deg, rgba(31, 42, 51, 0.04) 1px, transparent 1px),
        linear-gradient(rgba(31, 42, 51, 0.04) 1px, transparent 1px), white;
      background-size: 20px 20px;
      box-shadow: inset 0 0 0 1px rgba(31, 42, 51, 0.08);
      touch-action: none;
    }

    .footprint {
      fill: rgba(17, 94, 89, 0.08);
      stroke: var(--brand-strong);
      stroke-width: 2.5;
      vector-effect: non-scaling-stroke;
    }

    .image-pan-layer {
      fill: transparent;
      cursor: grab;
    }

    .room-shape {
      stroke: rgba(31, 42, 51, 0.65);
      cursor: move;
      vector-effect: non-scaling-stroke;
    }

    .room-shape.invalid {
      stroke: var(--danger);
      stroke-dasharray: 8 5;
    }

    .room-shape.selected {
      stroke: #111827;
      stroke-width: 3;
    }

    .room-shape.inactive,
    .resize-handle.inactive {
      opacity: 0.45;
    }

    .room-label {
      pointer-events: none;
      fill: #0f172a;
    }

    .resize-handle {
      fill: white;
      stroke: var(--ink);
      cursor: nwse-resize;
      vector-effect: non-scaling-stroke;
    }

    .polygon-click-layer {
      fill: transparent;
      cursor: crosshair;
    }

    .polygon-draft-line {
      fill: none;
      stroke: #0f172a;
      stroke-width: 2;
      stroke-dasharray: 8 5;
      pointer-events: none;
      vector-effect: non-scaling-stroke;
    }

    .polygon-draft-point {
      fill: white;
      stroke: #0f172a;
      stroke-width: 2;
      cursor: crosshair;
      vector-effect: non-scaling-stroke;
    }

    .polygon-draft-point.first {
      fill: #99f6e4;
      cursor: pointer;
    }

    .crop-mask {
      fill: rgba(15, 23, 42, 0.3);
      pointer-events: none;
    }

    .crop-frame {
      fill: transparent;
      stroke: #0f172a;
      stroke-width: 2;
      stroke-dasharray: 12 6;
      cursor: move;
      vector-effect: non-scaling-stroke;
    }

    .crop-handle {
      fill: white;
      stroke: #0f172a;
      stroke-width: 2;
      cursor: pointer;
      vector-effect: non-scaling-stroke;
    }
  `,
})
export class MapEditorCanvasComponent {
  @ViewChild('svgCanvas')
  private svgCanvas?: ElementRef<SVGSVGElement>;

  protected readonly backgroundClipPathId = `map-editor-clip-${Math.random().toString(36).slice(2)}`;

  readonly footprint = input<GeoJsonPolygon | null>(null);
  readonly rooms = input.required<EditorRoomModel[]>();
  readonly selectedRoomId = input<string | null>(null);
  readonly canvasMode = input.required<CanvasMode>();
  readonly backgroundUrl = input<string | null>(null);
  readonly backgroundDraft = input.required<BackgroundImageEditDraft>();
  readonly polygonDrawing = input(false);
  readonly polygonDraftPoints = input<GeoJsonPosition[]>([]);

  readonly roomsChange = output<EditorRoomModel[]>();
  readonly selectedRoomIdChange = output<string | null>();
  readonly backgroundDraftChange = output<BackgroundImageEditDraft>();
  readonly polygonDraftPointsChange = output<GeoJsonPosition[]>();
  readonly polygonRoomCreated = output<GeoJsonPolygon>();

  private interaction: InteractionState | null = null;

  protected bounds() {
    const polygon = this.footprint();
    return polygon
      ? getProjectedBoundingBox(polygon)
      : { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  protected viewBox(): string {
    const box = this.bounds();
    const padX = Math.max(box.width * 0.08, 24);
    const padY = Math.max(box.height * 0.08, 24);
    return `${box.minX - padX} ${box.minY - padY} ${box.width + padX * 2} ${box.height + padY * 2}`;
  }

  protected footprintPoints(): string {
    const polygon = this.footprint();
    return polygon ? projectedPolygonToPointsAttribute(polygon) : '';
  }

  protected pointsForRoom(room: EditorRoomModel): string {
    return projectedPolygonToPointsAttribute(roomModelToPolygon(room));
  }

  protected roomLabelX(room: EditorRoomModel): number {
    return getProjectedBoundingBox(roomModelToPolygon(room)).minX + 6;
  }

  protected roomLabelY(room: EditorRoomModel): number {
    const box = getProjectedBoundingBox(roomModelToPolygon(room));
    return box.minY + Math.min(Math.max(box.height * 0.3, this.labelFontSize()), box.height * 0.75);
  }

  protected labelFontSize(): number {
    const shortSide = Math.min(this.bounds().width, this.bounds().height);
    return Math.min(Math.max(shortSide * 0.035, 1.8), 6);
  }

  protected handleRadius(): number {
    const shortSide = Math.min(this.bounds().width, this.bounds().height);
    return Math.min(Math.max(shortSide * 0.012, 0.7), 2.5);
  }

  protected cropHandleRadius(): number {
    const shortSide = Math.min(this.bounds().width, this.bounds().height);
    return Math.min(Math.max(shortSide * 0.014, 0.8), 3);
  }

  protected roomResizeHandleX(room: EditorRoomModel): number {
    return getProjectedBoundingBox(roomModelToPolygon(room)).maxX;
  }

  protected roomResizeHandleY(room: EditorRoomModel): number {
    return getProjectedBoundingBox(roomModelToPolygon(room)).maxY;
  }

  protected backgroundImageRect(): EditorRectangle {
    const draft = this.backgroundDraft();
    return getBackgroundImageRect(this.bounds(), draft.scale, draft.offsetX, draft.offsetY);
  }

  protected backgroundRotationTransform(): string {
    const draft = this.backgroundDraft();
    const rectangle = this.backgroundImageRect();
    const centerX = rectangle.x + rectangle.width / 2;
    const centerY = rectangle.y + rectangle.height / 2;
    return `rotate(${quarterTurnsToDegrees(draft.rotationQuarterTurns)} ${centerX} ${centerY})`;
  }

  protected displayedCropRect(): EditorRectangle {
    return clampCropRect(
      this.backgroundDraft().cropRect ?? createDefaultCropRect(this.bounds()),
      this.bounds(),
    );
  }

  protected backgroundPreviewViewBox(): string {
    const crop = this.displayedCropRect();
    return `${crop.x} ${crop.y} ${crop.width} ${crop.height}`;
  }

  protected cropHandles(): Array<{ key: CropHandle; cx: number; cy: number }> {
    const crop = this.displayedCropRect();

    return [
      { key: 'nw', cx: crop.x, cy: crop.y },
      { key: 'ne', cx: crop.x + crop.width, cy: crop.y },
      { key: 'se', cx: crop.x + crop.width, cy: crop.y + crop.height },
      { key: 'sw', cx: crop.x, cy: crop.y + crop.height },
    ];
  }

  protected isRoomValid(room: EditorRoomModel): boolean {
    const polygon = this.footprint();
    return polygon ? polygonContainsPolygon(polygon, roomModelToPolygon(room)) : false;
  }

  protected draftPointsAttribute(): string {
    return projectedPolygonToPointsAttribute(createPolygon(this.polygonDraftPoints()));
  }

  protected projectedDraftPointX(point: GeoJsonPosition): number {
    return projectGeoJsonPosition(point)[0];
  }

  protected projectedDraftPointY(point: GeoJsonPosition): number {
    return projectGeoJsonPosition(point)[1];
  }

  protected startRoomInteraction(
    event: PointerEvent,
    room: EditorRoomModel,
    mode: RoomInteractionMode,
  ): void {
    if (this.canvasMode() !== 'rooms') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = this.toSvgPoint(event);
    if (!point) {
      return;
    }

    this.selectedRoomIdChange.emit(room.id);
    this.interaction = {
      kind: 'room',
      roomId: room.id,
      mode,
      startX: point.x,
      startY: point.y,
      initial: { ...room },
    };
  }

  protected startBackgroundPan(event: PointerEvent): void {
    if (this.canvasMode() !== 'image' || !this.backgroundUrl()) {
      return;
    }

    event.preventDefault();
    const point = this.toSvgPoint(event);
    if (!point) {
      return;
    }

    const draft = this.backgroundDraft();
    this.interaction = {
      kind: 'background-pan',
      startX: point.x,
      startY: point.y,
      initialOffsetX: draft.offsetX,
      initialOffsetY: draft.offsetY,
    };
  }

  protected addPolygonPoint(event: PointerEvent): void {
    if (!this.canAddPolygonPoint()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = this.toSvgPoint(event);
    if (!point) {
      return;
    }

    this.polygonDraftPointsChange.emit([
      ...this.polygonDraftPoints(),
      unprojectGeoJsonPosition([point.x, point.y]),
    ]);
  }

  protected onDraftPointPointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected completePolygon(event: MouseEvent, isFirstPoint: boolean): void {
    if (!isFirstPoint || this.polygonDraftPoints().length < 3) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.polygonRoomCreated.emit(createPolygon(this.polygonDraftPoints()));
  }

  protected startCropMove(event: PointerEvent): void {
    if (this.canvasMode() !== 'crop' || !this.backgroundUrl()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = this.toSvgPoint(event);
    if (!point) {
      return;
    }

    this.interaction = {
      kind: 'crop-move',
      startX: point.x,
      startY: point.y,
      initial: { ...this.displayedCropRect() },
    };
  }

  protected startCropResize(event: PointerEvent, handle: CropHandle): void {
    if (this.canvasMode() !== 'crop' || !this.backgroundUrl()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = this.toSvgPoint(event);
    if (!point) {
      return;
    }

    this.interaction = {
      kind: 'crop-resize',
      handle,
      startX: point.x,
      startY: point.y,
      initial: { ...this.displayedCropRect() },
    };
  }

  @HostListener('document:pointermove', ['$event'])
  protected onPointerMove(event: PointerEvent): void {
    if (!this.interaction) {
      return;
    }

    const point = this.toSvgPoint(event);
    if (!point) {
      return;
    }

    const deltaX = point.x - this.interaction.startX;
    const deltaY = point.y - this.interaction.startY;

    if (this.interaction.kind === 'room') {
      const interaction = this.interaction;
      this.roomsChange.emit(
        this.rooms().map((room) => {
          if (room.id !== interaction.roomId) {
            return room;
          }

          if (interaction.mode === 'drag') {
            const geometryGeoJson = translatePolygon(
              roomModelToPolygon(interaction.initial),
              deltaX,
              deltaY,
            );
            const bounds = getBoundingBox(geometryGeoJson);
            return {
              ...room,
              x: bounds.minX,
              y: bounds.minY,
              width: bounds.width,
              height: bounds.height,
              geometryGeoJson,
            };
          }

          const minimumSize = this.minimumRoomSize();
          const geometryGeoJson = resizePolygon(
            roomModelToPolygon(interaction.initial),
            deltaX,
            deltaY,
            minimumSize,
          );

          return polygonToRoomModel(geometryGeoJson, {
            id: room.id,
            name: room.name,
            color: room.color,
            sortOrder: room.sortOrder,
          });
        }),
      );
      return;
    }

    if (this.interaction.kind === 'background-pan') {
      this.updateBackgroundDraft({
        offsetX: this.interaction.initialOffsetX + deltaX,
        offsetY: this.interaction.initialOffsetY + deltaY,
      });
      return;
    }

    if (this.interaction.kind === 'crop-move') {
      this.updateBackgroundDraft({
        cropRect: clampCropRect(
          {
            ...this.interaction.initial,
            x: this.interaction.initial.x + deltaX,
            y: this.interaction.initial.y + deltaY,
          },
          this.bounds(),
        ),
      });
      return;
    }

    this.updateBackgroundDraft({
      cropRect: this.resizeCropRect(this.interaction.handle, deltaX, deltaY),
    });
  }

  @HostListener('document:pointerup')
  protected onPointerUp(): void {
    this.interaction = null;
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    if (!this.polygonDrawing() || this.polygonDraftPoints().length === 0) {
      return;
    }

    event.preventDefault();
    this.polygonDraftPointsChange.emit([]);
  }

  private canAddPolygonPoint(): boolean {
    return this.canvasMode() === 'rooms' && this.polygonDrawing() && !!this.footprint();
  }

  private minimumRoomSize(): number {
    const shortSide = Math.min(this.bounds().width, this.bounds().height);
    return Math.max(shortSide * 0.04, 2);
  }

  private updateBackgroundDraft(patch: Partial<BackgroundImageEditDraft>): void {
    this.backgroundDraftChange.emit({ ...this.backgroundDraft(), ...patch });
  }

  private resizeCropRect(handle: CropHandle, deltaX: number, deltaY: number): EditorRectangle {
    const initial =
      this.interaction?.kind === 'crop-resize'
        ? this.interaction.initial
        : this.displayedCropRect();
    const bounds = this.bounds();
    const minimumSize = createMinimumCropSize(bounds);
    let left = initial.x;
    let right = initial.x + initial.width;
    let top = initial.y;
    let bottom = initial.y + initial.height;

    if (handle.includes('w')) {
      left = Math.min(left + deltaX, right - minimumSize);
    } else {
      right = Math.max(right + deltaX, left + minimumSize);
    }

    if (handle.includes('n')) {
      top = Math.min(top + deltaY, bottom - minimumSize);
    } else {
      bottom = Math.max(bottom + deltaY, top + minimumSize);
    }

    return clampCropRect(
      {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      },
      bounds,
      minimumSize,
    );
  }

  private toSvgPoint(event: PointerEvent): { x: number; y: number } | null {
    const svg = this.svgCanvas?.nativeElement;
    if (!svg) {
      return null;
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();

    if (!matrix) {
      return null;
    }

    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }
}

function translatePolygon(polygon: GeoJsonPolygon, deltaX: number, deltaY: number): GeoJsonPolygon {
  return unprojectGeoJsonPolygon({
    ...polygon,
    coordinates: projectGeoJsonPolygon(polygon).coordinates.map((ring) =>
      ring.map((point) => [point[0] + deltaX, point[1] + deltaY] as GeoJsonPosition),
    ),
  });
}

function resizePolygon(
  polygon: GeoJsonPolygon,
  deltaX: number,
  deltaY: number,
  minimumSize: number,
): GeoJsonPolygon {
  const projected = projectGeoJsonPolygon(polygon);
  const bounds = getBoundingBox(projected);
  const width = Math.max(minimumSize, bounds.width + deltaX);
  const height = Math.max(minimumSize, bounds.height + deltaY);
  const scaleX = bounds.width === 0 ? 1 : width / bounds.width;
  const scaleY = bounds.height === 0 ? 1 : height / bounds.height;

  return unprojectGeoJsonPolygon({
    ...projected,
    coordinates: projected.coordinates.map((ring) =>
      ring.map(
        (point) =>
          [
            bounds.minX + (point[0] - bounds.minX) * scaleX,
            bounds.minY + (point[1] - bounds.minY) * scaleY,
          ] as GeoJsonPosition,
      ),
    ),
  });
}

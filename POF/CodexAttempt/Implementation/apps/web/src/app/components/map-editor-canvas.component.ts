import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, input, output, signal } from '@angular/core';
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
  DEFAULT_IMAGE_OPACITY,
  clampBackgroundScale,
  clampCropRect,
  createDefaultCropRect,
  createMinimumCropSize,
  getBackgroundImageRect,
} from '../core/background-image-editor';

type RoomInteractionMode = 'drag' | 'resize';
type CropHandle = 'nw' | 'ne' | 'se' | 'sw';
type Corner = 'nw' | 'ne' | 'se' | 'sw';

interface RoomInteractionState {
  kind: 'room';
  roomId: string;
  mode: RoomInteractionMode;
  startX: number;
  startY: number;
  initial: EditorRoomModel;
}

interface ImageMoveInteractionState {
  kind: 'image-move';
  startX: number;
  startY: number;
  initialOffsetX: number;
  initialOffsetY: number;
}

interface ImageScaleInteractionState {
  kind: 'image-scale';
  startX: number;
  startY: number;
  cx: number;
  cy: number;
  initialScale: number;
  initialDist: number;
}

interface ImageRotateInteractionState {
  kind: 'image-rotate';
  startX: number;
  startY: number;
  cx: number;
  cy: number;
  /** Pointer angle (radians) at drag start. */
  startAngle: number;
  /** Image rotation (degrees) at drag start. */
  initialRotation: number;
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
  | ImageMoveInteractionState
  | ImageScaleInteractionState
  | ImageRotateInteractionState
  | CropMoveInteractionState
  | CropResizeInteractionState;

@Component({
  selector: 'app-map-editor-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (footprint()) {
      <svg #svgCanvas class="editor-svg" [attr.viewBox]="viewBox()" (wheel)="onWheel($event)">
        <defs>
          <clipPath [attr.id]="backgroundClipPathId">
            <polygon [attr.points]="footprintPoints()" />
          </clipPath>
        </defs>

        @if (backgroundUrl()) {
          @if (canvasMode() === 'image') {
            <!-- Free-transform alignment: the whole image is shown semi-transparent
                 over the footprint so it can be dragged, scaled, and rotated. -->
            <image
              class="alignment-image"
              [attr.href]="backgroundUrl()!"
              [attr.x]="backgroundImageRect().x"
              [attr.y]="backgroundImageRect().y"
              [attr.width]="backgroundImageRect().width"
              [attr.height]="backgroundImageRect().height"
              [attr.opacity]="imageOpacity()"
              preserveAspectRatio="none"
              [attr.transform]="backgroundRotationTransform()"
            />
          } @else if (canvasMode() === 'crop') {
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

        <polygon class="footprint" [attr.points]="footprintPoints()" />

        @if (backgroundUrl() && canvasMode() === 'image') {
          <g class="image-transform">
            <polygon
              class="image-box"
              [attr.points]="imageBoxPoints()"
              (pointerdown)="startImageMove($event)"
            />
            <line
              class="image-rotate-stem"
              [attr.x1]="rotateStemStart().x"
              [attr.y1]="rotateStemStart().y"
              [attr.x2]="rotateHandle().x"
              [attr.y2]="rotateHandle().y"
            />
            <circle
              class="image-rotate-handle"
              [attr.cx]="rotateHandle().x"
              [attr.cy]="rotateHandle().y"
              [attr.r]="rotateHandleRadius()"
              (pointerdown)="startImageRotate($event)"
            >
              <title>Drag to rotate</title>
            </circle>
            @for (corner of imageCorners(); track corner.key) {
              <circle
                class="image-resize-handle"
                [attr.cx]="corner.x"
                [attr.cy]="corner.y"
                [attr.r]="handleRadius()"
                (pointerdown)="startImageScale($event)"
              />
            }
          </g>
        }

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
              x="0"
              y="0"
              [attr.font-size]="LABEL_BASE_FONT"
              [attr.transform]="roomLabelTransform(room)"
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
      <div class="zoom-ctl">
        <button type="button" (click)="zoomIn()" [disabled]="zoomLevel() >= maxZoom" aria-label="Zoom in" title="Zoom in">+</button>
        <span class="zoom-pct">{{ zoomPercent() }}%</span>
        <button type="button" (click)="zoomOut()" [disabled]="zoomLevel() <= minZoom" aria-label="Zoom out" title="Zoom out">&minus;</button>
        <button type="button" (click)="resetZoom()" [disabled]="zoomLevel() === 1" aria-label="Reset to fit" title="Reset to fit">&#8862;</button>
      </div>
    } @else {
      <p class="message error">
        The footprint GeoJSON must be a valid Polygon before rooms can be edited.
      </p>
    }
  `,
  styles: `
    .editor-svg {
      width: 100%;
      height: 100%;
      border-radius: 22px;
      background:
        linear-gradient(90deg, rgba(31, 42, 51, 0.04) 1px, transparent 1px),
        linear-gradient(rgba(31, 42, 51, 0.04) 1px, transparent 1px), white;
      background-size: 20px 20px;
      box-shadow: inset 0 0 0 1px rgba(31, 42, 51, 0.08);
      touch-action: none;
    }

    /* The SVG renders directly in the host (no wrapper) so it keeps its original
       content-sizing and the surrounding panel grows to fit it (no clipping).
       The host just provides the positioning context for the zoom overlay. */
    :host {
      position: relative;
      display: block;
    }

    .zoom-ctl {
      position: absolute;
      right: 12px;
      top: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 8px 24px rgba(20, 31, 36, 0.12);
    }

    .zoom-ctl button {
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--strong);
      font-size: 16px;
      font-weight: 900;
      line-height: 1;
      cursor: pointer;
    }

    .zoom-ctl button:hover {
      background: var(--panel-soft);
    }

    .zoom-ctl button:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .zoom-pct {
      min-width: 42px;
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      color: var(--muted);
    }

    .footprint {
      fill: rgba(17, 94, 89, 0.08);
      stroke: var(--brand-strong);
      stroke-width: 2.5;
      vector-effect: non-scaling-stroke;
    }

    .alignment-image {
      pointer-events: none;
    }

    .image-box {
      fill: transparent;
      stroke: var(--blue, #2563eb);
      stroke-width: 2;
      stroke-dasharray: 6 4;
      cursor: move;
      vector-effect: non-scaling-stroke;
    }

    .image-rotate-stem {
      stroke: var(--blue, #2563eb);
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }

    .image-rotate-handle {
      fill: var(--blue, #2563eb);
      stroke: white;
      stroke-width: 2;
      cursor: grab;
      vector-effect: non-scaling-stroke;
    }

    .image-resize-handle {
      fill: white;
      stroke: var(--blue, #2563eb);
      stroke-width: 2;
      cursor: nwse-resize;
      vector-effect: non-scaling-stroke;
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

  // ----- Zoom / pan -------------------------------------------------------
  // Zoom is driven entirely through the SVG viewBox. Because pointer→SVG
  // conversion (toSvgPoint) goes through getScreenCTM(), every existing
  // interaction (drag/resize/rotate/crop/draw) keeps working at any zoom with
  // no extra math. zoomLevel 1 = the padded "fit" view; pan is an SVG-unit
  // offset of the view centre, clamped to keep the window inside the fit extent.
  protected readonly maxZoom = 8;
  protected readonly minZoom = 0.4;
  protected readonly zoomLevel = signal(1);
  protected readonly pan = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  /** The padded "fit" view of the footprint, before zoom/pan is applied. */
  private fullView(): { minX: number; minY: number; width: number; height: number } {
    const box = this.bounds();
    const padX = Math.max(box.width * 0.08, 24);
    const padY = Math.max(box.height * 0.08, 24);
    return {
      minX: box.minX - padX,
      minY: box.minY - padY,
      width: box.width + padX * 2,
      height: box.height + padY * 2,
    };
  }

  protected viewBox(): string {
    const full = this.fullView();
    const z = this.zoomLevel();
    const w = full.width / z;
    const h = full.height / z;
    // Clamp pan at render time so the zoomed window never leaves the fit extent,
    // even after the footprint (and therefore bounds) changes underneath us.
    const maxPanX = Math.max(0, (full.width - w) / 2);
    const maxPanY = Math.max(0, (full.height - h) / 2);
    const px = clampNumber(this.pan().x, -maxPanX, maxPanX);
    const py = clampNumber(this.pan().y, -maxPanY, maxPanY);
    const cx = full.minX + full.width / 2 + px;
    const cy = full.minY + full.height / 2 + py;
    return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
  }

  protected zoomPercent(): number {
    return Math.round(this.zoomLevel() * 100);
  }

  protected zoomIn(): void {
    this.applyZoom(this.zoomLevel() * 1.3);
  }

  protected zoomOut(): void {
    this.applyZoom(this.zoomLevel() / 1.3);
  }

  protected resetZoom(): void {
    this.zoomLevel.set(1);
    this.pan.set({ x: 0, y: 0 });
  }

  private applyZoom(z: number): void {
    this.zoomLevel.set(clampNumber(z, this.minZoom, this.maxZoom));
    this.clampPan();
  }

  /** Wheel zoom anchored to the cursor, so the point under it stays put. */
  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const oldZoom = this.zoomLevel();
    const newZoom = clampNumber(oldZoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15), this.minZoom, this.maxZoom);
    if (newZoom === oldZoom) {
      return;
    }

    const focus = this.clientToSvg(event.clientX, event.clientY);
    const full = this.fullView();
    if (focus) {
      const oldW = full.width / oldZoom;
      const oldH = full.height / oldZoom;
      const oldCx = full.minX + full.width / 2 + this.pan().x;
      const oldCy = full.minY + full.height / 2 + this.pan().y;
      const fx = oldW === 0 ? 0.5 : (focus.x - (oldCx - oldW / 2)) / oldW;
      const fy = oldH === 0 ? 0.5 : (focus.y - (oldCy - oldH / 2)) / oldH;
      const newW = full.width / newZoom;
      const newH = full.height / newZoom;
      const newCx = focus.x + newW * (0.5 - fx);
      const newCy = focus.y + newH * (0.5 - fy);
      this.zoomLevel.set(newZoom);
      this.pan.set({
        x: newCx - (full.minX + full.width / 2),
        y: newCy - (full.minY + full.height / 2),
      });
    } else {
      this.zoomLevel.set(newZoom);
    }
    this.clampPan();
  }

  private clampPan(): void {
    const full = this.fullView();
    const z = this.zoomLevel();
    const maxX = Math.max(0, (full.width - full.width / z) / 2);
    const maxY = Math.max(0, (full.height - full.height / z) / 2);
    const p = this.pan();
    this.pan.set({ x: clampNumber(p.x, -maxX, maxX), y: clampNumber(p.y, -maxY, maxY) });
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
    return box.minY + Math.min(Math.max(box.height * 0.3, this.labelFontSize(room)), box.height * 0.75);
  }

  /**
   * The text is drawn at a deliberately large `font-size` ({@link LABEL_BASE_FONT})
   * and visually shrunk via a `scale()` transform. Browsers floor the *computed*
   * font-size at their minimum-font-size setting, which silently ignores small
   * user-unit font sizes; scaling sidesteps that clamp so the label actually
   * tracks the room size.
   */
  protected readonly LABEL_BASE_FONT = 12;

  protected roomLabelTransform(room: EditorRoomModel): string {
    const scale = this.labelFontSize(room) / this.LABEL_BASE_FONT;
    return `translate(${this.roomLabelX(room)} ${this.roomLabelY(room)}) scale(${scale})`;
  }

  /** Label size is keyed off each room's own footprint so it stays inside the shape. */
  protected labelFontSize(room: EditorRoomModel): number {
    const box = getProjectedBoundingBox(roomModelToPolygon(room));
    const shortSide = Math.min(box.width, box.height);
    return Math.min(Math.max(shortSide * 0.16, 0.8), 3);
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
    let transform = `rotate(${draft.rotationDegrees} ${centerX} ${centerY})`;

    // Mirror about the image centre. Applied before the rotation (rightmost in the
    // SVG transform list) to match the backend pipeline (flip → rotate).
    if (draft.flipHorizontal || draft.flipVertical) {
      const scaleX = draft.flipHorizontal ? -1 : 1;
      const scaleY = draft.flipVertical ? -1 : 1;
      transform += ` translate(${centerX} ${centerY}) scale(${scaleX} ${scaleY}) translate(${-centerX} ${-centerY})`;
    }

    return transform;
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

  protected imageOpacity(): number {
    return this.backgroundDraft().opacity ?? DEFAULT_IMAGE_OPACITY;
  }

  protected rotateHandleRadius(): number {
    return this.handleRadius() * 1.25;
  }

  private imageCenter(): { cx: number; cy: number } {
    const box = this.bounds();
    const draft = this.backgroundDraft();
    return {
      cx: box.minX + box.width / 2 + draft.offsetX,
      cy: box.minY + box.height / 2 + draft.offsetY,
    };
  }

  private rotateAround(
    x: number,
    y: number,
    cx: number,
    cy: number,
    degrees: number,
  ): { x: number; y: number } {
    if (degrees === 0) {
      return { x, y };
    }
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = x - cx;
    const dy = y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }

  protected imageCorners(): Array<{ key: Corner; x: number; y: number }> {
    const rect = this.backgroundImageRect();
    const { cx, cy } = this.imageCenter();
    const degrees = this.backgroundDraft().rotationDegrees;
    const corners: Array<{ key: Corner; x: number; y: number }> = [
      { key: 'nw', x: rect.x, y: rect.y },
      { key: 'ne', x: rect.x + rect.width, y: rect.y },
      { key: 'se', x: rect.x + rect.width, y: rect.y + rect.height },
      { key: 'sw', x: rect.x, y: rect.y + rect.height },
    ];
    return corners.map((corner) => {
      const rotated = this.rotateAround(corner.x, corner.y, cx, cy, degrees);
      return { key: corner.key, x: rotated.x, y: rotated.y };
    });
  }

  protected imageBoxPoints(): string {
    return this.imageCorners()
      .map((corner) => `${corner.x},${corner.y}`)
      .join(' ');
  }

  protected rotateStemStart(): { x: number; y: number } {
    const rect = this.backgroundImageRect();
    const { cx, cy } = this.imageCenter();
    const degrees = this.backgroundDraft().rotationDegrees;
    return this.rotateAround(rect.x + rect.width / 2, rect.y, cx, cy, degrees);
  }

  protected rotateHandle(): { x: number; y: number } {
    const rect = this.backgroundImageRect();
    const { cx, cy } = this.imageCenter();
    const degrees = this.backgroundDraft().rotationDegrees;
    const stem = Math.max(this.bounds().height * 0.07, this.handleRadius() * 4);
    return this.rotateAround(rect.x + rect.width / 2, rect.y - stem, cx, cy, degrees);
  }

  protected startImageMove(event: PointerEvent): void {
    if (this.canvasMode() !== 'image' || !this.backgroundUrl()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = this.toSvgPoint(event);
    if (!point) {
      return;
    }

    const draft = this.backgroundDraft();
    this.interaction = {
      kind: 'image-move',
      startX: point.x,
      startY: point.y,
      initialOffsetX: draft.offsetX,
      initialOffsetY: draft.offsetY,
    };
  }

  protected startImageScale(event: PointerEvent): void {
    if (this.canvasMode() !== 'image' || !this.backgroundUrl()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = this.toSvgPoint(event);
    if (!point) {
      return;
    }

    const { cx, cy } = this.imageCenter();
    const initialDist = Math.hypot(point.x - cx, point.y - cy) || 1;
    this.interaction = {
      kind: 'image-scale',
      startX: point.x,
      startY: point.y,
      cx,
      cy,
      initialScale: this.backgroundDraft().scale,
      initialDist,
    };
  }

  protected startImageRotate(event: PointerEvent): void {
    if (this.canvasMode() !== 'image' || !this.backgroundUrl()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = this.toSvgPoint(event);
    if (!point) {
      return;
    }

    const { cx, cy } = this.imageCenter();
    this.interaction = {
      kind: 'image-rotate',
      startX: point.x,
      startY: point.y,
      cx,
      cy,
      startAngle: Math.atan2(point.y - cy, point.x - cx),
      initialRotation: this.backgroundDraft().rotationDegrees,
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

    if (this.interaction.kind === 'image-move') {
      this.updateBackgroundDraft({
        offsetX: this.interaction.initialOffsetX + deltaX,
        offsetY: this.interaction.initialOffsetY + deltaY,
      });
      return;
    }

    if (this.interaction.kind === 'image-scale') {
      const dist = Math.hypot(point.x - this.interaction.cx, point.y - this.interaction.cy);
      const scale = clampBackgroundScale(
        this.interaction.initialScale * (dist / this.interaction.initialDist),
      );
      this.updateBackgroundDraft({ scale });
      return;
    }

    if (this.interaction.kind === 'image-rotate') {
      const angle = Math.atan2(point.y - this.interaction.cy, point.x - this.interaction.cx);
      const deltaDegrees = ((angle - this.interaction.startAngle) * 180) / Math.PI;
      this.updateBackgroundDraft({
        rotationDegrees: this.interaction.initialRotation + deltaDegrees,
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
    return this.clientToSvg(event.clientX, event.clientY);
  }

  private clientToSvg(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = this.svgCanvas?.nativeElement;
    if (!svg) {
      return null;
    }

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM();

    if (!matrix) {
      return null;
    }

    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

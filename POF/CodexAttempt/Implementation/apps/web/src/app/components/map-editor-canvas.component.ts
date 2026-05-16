import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, input, output } from '@angular/core';
import {
  EditorRoomModel,
  GeoJsonPolygon,
  getBoundingBox,
  polygonContainsPolygon,
  polygonToPointsAttribute,
  roomModelToPolygon,
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
            <rect
              class="room-shape"
              [class.invalid]="!isRoomValid(room)"
              [class.selected]="selectedRoomId() === room.id"
              [class.inactive]="canvasMode() !== 'rooms'"
              [attr.x]="room.x"
              [attr.y]="room.y"
              [attr.width]="room.width"
              [attr.height]="room.height"
              [attr.fill]="room.color"
              [style.pointer-events]="canvasMode() === 'rooms' ? 'auto' : 'none'"
              fill-opacity="0.35"
              stroke-width="2"
              (pointerdown)="startRoomInteraction($event, room, 'drag')"
              (click)="selectedRoomIdChange.emit(room.id)"
            />
            <text class="room-label" [attr.x]="room.x + 6" [attr.y]="room.y + 18">
              {{ room.name }}
            </text>
            <circle
              class="resize-handle"
              [class.inactive]="canvasMode() !== 'rooms'"
              [style.pointer-events]="canvasMode() === 'rooms' ? 'auto' : 'none'"
              [attr.cx]="room.x + room.width"
              [attr.cy]="room.y + room.height"
              r="4"
              (pointerdown)="startRoomInteraction($event, room, 'resize')"
            />
          </g>
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
                r="7"
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
    }

    .image-pan-layer {
      fill: transparent;
      cursor: grab;
    }

    .room-shape {
      stroke: rgba(31, 42, 51, 0.65);
      cursor: move;
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
      font-size: 12px;
      pointer-events: none;
      fill: #0f172a;
    }

    .resize-handle {
      fill: white;
      stroke: var(--ink);
      cursor: nwse-resize;
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
    }

    .crop-handle {
      fill: white;
      stroke: #0f172a;
      stroke-width: 2;
      cursor: pointer;
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

  readonly roomsChange = output<EditorRoomModel[]>();
  readonly selectedRoomIdChange = output<string | null>();
  readonly backgroundDraftChange = output<BackgroundImageEditDraft>();

  private interaction: InteractionState | null = null;

  protected bounds() {
    const polygon = this.footprint();
    return polygon
      ? getBoundingBox(polygon)
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
    return polygon ? polygonToPointsAttribute(polygon) : '';
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
            return {
              ...room,
              x: interaction.initial.x + deltaX,
              y: interaction.initial.y + deltaY,
            };
          }

          return {
            ...room,
            width: Math.max(20, interaction.initial.width + deltaX),
            height: Math.max(20, interaction.initial.height + deltaY),
          };
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

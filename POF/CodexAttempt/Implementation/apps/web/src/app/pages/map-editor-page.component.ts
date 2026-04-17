import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EditableRoomInput,
  EditorRoomModel,
  GeoJsonPolygon,
  MapDto,
  createPolygon,
  createRectanglePolygon,
  getBoundingBox,
  polygonContainsPolygon,
  polygonToPointsAttribute,
  polygonToRoomModel,
  roomModelToPolygon,
} from '@campus/contracts';

import { assetUrl } from '../core/api';
import { MapsService } from '../core/maps.service';

type InteractionMode = 'drag' | 'resize';

interface InteractionState {
  roomId: string;
  mode: InteractionMode;
  startX: number;
  startY: number;
  initial: EditorRoomModel;
}

@Component({
  selector: 'app-map-editor-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <section class="section-header">
        <div>
          <h1>{{ mapId() ? 'Edit Map' : 'Create Map' }}</h1>
          <p class="muted">Trace the footprint as GeoJSON, then place axis-aligned rooms inside it.</p>
        </div>
        <div class="chips">
          <span class="chip">SVG editor</span>
          <span class="chip">GeoJSON native</span>
          <span class="chip">Image overlay</span>
        </div>
      </section>

      @if (message()) {
        <p class="message success">{{ message() }}</p>
      }

      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      <section class="grid-2 editor-layout">
        <article class="card panel form-panel">
          <h2>Map settings</h2>
          <label>Name <input [(ngModel)]="name" /></label>
          <label>Floor label <input [(ngModel)]="floorLabel" /></label>
          <label>Timezone <input [(ngModel)]="timezone" /></label>
          <label>
            Footprint GeoJSON
            <textarea [(ngModel)]="footprintText"></textarea>
          </label>
          <label>
            Background image
            <input type="file" accept="image/*" (change)="onBackgroundSelected($event)" />
          </label>
          <div class="actions">
            <button type="button" class="ghost" (click)="loadSampleFootprint()">Use sample footprint</button>
            <button type="button" (click)="saveMap()">Save map</button>
          </div>
        </article>

        <article class="card panel canvas-panel">
          <div class="canvas-header">
            <h2>Editor canvas</h2>
            <div class="actions">
              <button type="button" class="ghost" (click)="addRoom()">Add room</button>
              @if (selectedRoom()) {
                <button type="button" class="danger" (click)="removeSelectedRoom()">Delete room</button>
              }
            </div>
          </div>

          @if (parsedFootprint()) {
            <svg
              #svgCanvas
              class="editor-svg"
              [attr.viewBox]="viewBox()"
            >
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

              @for (room of rooms(); track room.id) {
                <g>
                  <rect
                    class="room-shape"
                    [class.invalid]="!isRoomValid(room)"
                    [class.selected]="selectedRoomId() === room.id"
                    [attr.x]="room.x"
                    [attr.y]="room.y"
                    [attr.width]="room.width"
                    [attr.height]="room.height"
                    [attr.fill]="room.color"
                    fill-opacity="0.35"
                    stroke-width="2"
                    (pointerdown)="startInteraction($event, room, 'drag')"
                    (click)="selectedRoomId.set(room.id)"
                  />
                  <text class="room-label" [attr.x]="room.x + 6" [attr.y]="room.y + 18">{{ room.name }}</text>
                  <circle
                    class="resize-handle"
                    [attr.cx]="room.x + room.width"
                    [attr.cy]="room.y + room.height"
                    r="4"
                    (pointerdown)="startInteraction($event, room, 'resize')"
                  />
                </g>
              }
            </svg>
          } @else {
            <p class="message error">The footprint GeoJSON must be a valid Polygon before rooms can be edited.</p>
          }
        </article>
      </section>

      <section class="grid-2">
        <article class="card panel">
          <div class="section-header">
            <div>
              <h2>Rooms</h2>
              <p class="muted">Name, color, and adjust rectangles directly on the canvas.</p>
            </div>
            <span class="chip">{{ rooms().length }} rooms</span>
          </div>
          <div class="room-list">
            @for (room of rooms(); track room.id) {
              <div class="room-item" [class.selected]="selectedRoomId() === room.id" (click)="selectedRoomId.set(room.id)">
                <div class="room-item-header">
                  <div class="color-swatch" [style.background]="room.color"></div>
                  <strong>{{ room.name }}</strong>
                </div>
                <div class="grid-2 compact">
                  <label>Name <input [(ngModel)]="room.name" /></label>
                  <label>Color <input [(ngModel)]="room.color" /></label>
                  <label>X <input type="number" [(ngModel)]="room.x" /></label>
                  <label>Y <input type="number" [(ngModel)]="room.y" /></label>
                  <label>Width <input type="number" min="1" [(ngModel)]="room.width" /></label>
                  <label>Height <input type="number" min="1" [(ngModel)]="room.height" /></label>
                </div>
              </div>
            }
          </div>
        </article>

        <article class="card panel">
          <h2>Room GeoJSON preview</h2>
          @if (selectedRoom()) {
            <pre class="json-preview">{{ selectedRoomPolygonPreview() }}</pre>
          } @else {
            <p class="muted">Select a room to inspect the polygon that will be sent to the API.</p>
          }
          <div class="actions top-gap">
            <button type="button" (click)="saveRooms()" [disabled]="!mapId() || !allRoomsValid()">Save rooms</button>
            @if (mapId()) {
              <a class="button ghost" [routerLink]="['/maps', mapId(), 'book']">Open booking view</a>
            }
          </div>
        </article>
      </section>
    </div>
  `,
  styles: `
    .panel {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }

    .editor-layout {
      align-items: start;
    }

    .canvas-panel {
      min-height: 520px;
    }

    .canvas-header,
    .actions {
      display: flex;
      gap: 0.75rem;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
    }

    .editor-svg {
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

    .footprint {
      fill: rgba(17, 94, 89, 0.08);
      stroke: var(--brand-strong);
      stroke-width: 2.5;
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

    .room-list {
      display: grid;
      gap: 0.85rem;
    }

    .room-item {
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 1rem;
      display: grid;
      gap: 0.75rem;
    }

    .room-item.selected {
      border-color: rgba(14, 116, 144, 0.35);
      background: rgba(14, 116, 144, 0.05);
    }

    .room-item-header {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .color-swatch {
      width: 14px;
      height: 14px;
      border-radius: 999px;
    }

    .compact {
      gap: 0.75rem;
    }

    .json-preview {
      margin: 0;
      padding: 1rem;
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.04);
      overflow: auto;
      max-height: 360px;
    }

    .top-gap {
      margin-top: auto;
    }
  `,
})
export class MapEditorPageComponent {
  @ViewChild('svgCanvas')
  private svgCanvas?: ElementRef<SVGSVGElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mapsService = inject(MapsService);

  protected readonly mapId = signal<string | null>(this.route.snapshot.paramMap.get('mapId'));
  protected readonly rooms = signal<EditorRoomModel[]>([]);
  protected readonly selectedRoomId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly message = signal('');

  protected name = 'Main Campus Floor';
  protected floorLabel = 'Ground Floor';
  protected timezone = 'Europe/Bucharest';
  protected footprintText = JSON.stringify(
    createPolygon([
      [0, 0],
      [560, 0],
      [560, 360],
      [0, 360],
    ]),
    null,
    2,
  );

  private currentMap: MapDto | null = null;
  private interaction: InteractionState | null = null;
  private backgroundFile: File | null = null;

  constructor() {
    if (this.mapId()) {
      void this.loadMap(this.mapId()!);
    }
  }

  protected loadSampleFootprint(): void {
    this.footprintText = JSON.stringify(
      createPolygon([
        [0, 0],
        [640, 0],
        [640, 180],
        [540, 180],
        [540, 420],
        [0, 420],
      ]),
      null,
      2,
    );
  }

  protected onBackgroundSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.backgroundFile = input.files?.[0] ?? null;
  }

  protected parsedFootprint(): GeoJsonPolygon | null {
    try {
      const parsed = JSON.parse(this.footprintText) as GeoJsonPolygon;
      return parsed.type === 'Polygon' ? parsed : null;
    } catch {
      return null;
    }
  }

  protected bounds() {
    const polygon = this.parsedFootprint();
    return polygon ? getBoundingBox(polygon) : { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  protected viewBox(): string {
    const box = this.bounds();
    const padX = Math.max(box.width * 0.08, 24);
    const padY = Math.max(box.height * 0.08, 24);
    return `${box.minX - padX} ${box.minY - padY} ${box.width + padX * 2} ${box.height + padY * 2}`;
  }

  protected footprintPoints(): string {
    const polygon = this.parsedFootprint();
    return polygon ? polygonToPointsAttribute(polygon) : '';
  }

  protected backgroundUrl(): string | null {
    return assetUrl(this.currentMap?.backgroundImageUrl ?? null);
  }

  protected selectedRoom(): EditorRoomModel | null {
    return this.rooms().find((room) => room.id === this.selectedRoomId()) ?? null;
  }

  protected selectedRoomPolygonPreview(): string {
    const room = this.selectedRoom();
    return room ? JSON.stringify(roomModelToPolygon(room), null, 2) : '';
  }

  protected addRoom(): void {
    const box = this.bounds();
    const room: EditorRoomModel = {
      id: crypto.randomUUID(),
      name: `Room ${this.rooms().length + 1}`,
      color: '#38bdf8',
      x: box.minX + box.width * 0.1,
      y: box.minY + box.height * 0.1,
      width: Math.max(box.width * 0.18, 48),
      height: Math.max(box.height * 0.14, 48),
      sortOrder: this.rooms().length,
    };

    this.rooms.update((rooms) => [...rooms, room]);
    this.selectedRoomId.set(room.id);
  }

  protected removeSelectedRoom(): void {
    const selectedRoomId = this.selectedRoomId();
    if (!selectedRoomId) {
      return;
    }

    this.rooms.update((rooms) => rooms.filter((room) => room.id !== selectedRoomId));
    this.selectedRoomId.set(null);
  }

  protected isRoomValid(room: EditorRoomModel): boolean {
    const polygon = this.parsedFootprint();
    return polygon ? polygonContainsPolygon(polygon, roomModelToPolygon(room)) : false;
  }

  protected allRoomsValid(): boolean {
    return this.rooms().every((room) => this.isRoomValid(room));
  }

  protected startInteraction(event: PointerEvent, room: EditorRoomModel, mode: InteractionMode): void {
    event.preventDefault();
    event.stopPropagation();
    const point = this.toSvgPoint(event);
    if (!point) {
      return;
    }

    this.selectedRoomId.set(room.id);
    this.interaction = {
      roomId: room.id,
      mode,
      startX: point.x,
      startY: point.y,
      initial: { ...room },
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
    this.rooms.update((rooms) =>
      rooms.map((room) => {
        if (room.id !== this.interaction?.roomId) {
          return room;
        }

        if (this.interaction.mode === 'drag') {
          return {
            ...room,
            x: this.interaction.initial.x + deltaX,
            y: this.interaction.initial.y + deltaY,
          };
        }

        return {
          ...room,
          width: Math.max(20, this.interaction.initial.width + deltaX),
          height: Math.max(20, this.interaction.initial.height + deltaY),
        };
      }),
    );
  }

  @HostListener('document:pointerup')
  protected onPointerUp(): void {
    this.interaction = null;
  }

  protected async saveMap(): Promise<void> {
    this.error.set('');
    this.message.set('');

    const footprint = this.parsedFootprint();
    if (!footprint) {
      this.error.set('The footprint GeoJSON is invalid.');
      return;
    }

    try {
      const payload = {
        name: this.name,
        floorLabel: this.floorLabel,
        timezone: this.timezone,
        footprintGeoJson: footprint,
      };

      this.currentMap = this.mapId()
        ? await this.mapsService.update(this.mapId()!, payload)
        : await this.mapsService.create(payload);

      if (!this.mapId()) {
        this.mapId.set(this.currentMap.id);
        await this.router.navigate(['/maps', this.currentMap.id, 'edit']);
      }

      if (this.backgroundFile) {
        this.currentMap = await this.mapsService.uploadBackground(this.currentMap.id, this.backgroundFile);
        this.backgroundFile = null;
      }

      this.message.set('Map saved.');
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  protected async saveRooms(): Promise<void> {
    if (!this.mapId()) {
      this.error.set('Save the map before saving rooms.');
      return;
    }

    if (!this.allRoomsValid()) {
      this.error.set('All rooms must stay inside the footprint polygon.');
      return;
    }

    try {
      this.currentMap = await this.mapsService.replaceRooms(this.mapId()!, {
        rooms: this.rooms().map<EditableRoomInput>((room, index) => ({
          id: room.id,
          name: room.name,
          color: room.color,
          sortOrder: index,
          geometryGeoJson: roomModelToPolygon(room),
        })),
      });

      this.rooms.set(
        this.currentMap.rooms.map((room) =>
          polygonToRoomModel(room.geometryGeoJson, {
            id: room.id,
            name: room.name,
            color: room.color,
            sortOrder: room.sortOrder,
          }),
        ),
      );
      this.message.set('Rooms saved.');
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  private async loadMap(mapId: string): Promise<void> {
    try {
      this.currentMap = await this.mapsService.get(mapId);
      this.name = this.currentMap.name;
      this.floorLabel = this.currentMap.floorLabel;
      this.timezone = this.currentMap.timezone;
      this.footprintText = JSON.stringify(this.currentMap.footprintGeoJson, null, 2);
      this.rooms.set(
        this.currentMap.rooms.map((room) =>
          polygonToRoomModel(room.geometryGeoJson, {
            id: room.id,
            name: room.name,
            color: room.color,
            sortOrder: room.sortOrder,
          }),
        ),
      );
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
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

  private extractMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      return ((error as { error?: { message?: string } }).error?.message) ?? 'Request failed.';
    }
    return 'Request failed.';
  }
}


import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  EditableRoomInput,
  EditorRoomModel,
  GeoJsonPolygon,
  MapDto,
  MapSummaryDto,
  createPolygon,
  getBoundingBox,
  polygonContainsPolygon,
  polygonToRoomModel,
  roomModelToPolygon,
} from '@campus/contracts';

import {
  type BackgroundImageEditDraft,
  type CanvasMode,
  createDefaultCropRect,
  toBackgroundProcessRequest,
} from '../core/background-image-editor';
import { assetUrl } from '../core/api';
import { downloadMapSvg, readBlobAsDataUrl, type ExportableMap } from '../core/map-svg-export';
import { MapsService } from '../core/maps.service';
import { ImageManipulationToolsComponent } from './image-manipulation-tools.component';
import { MapEditorCanvasComponent } from './map-editor-canvas.component';

@Component({
  selector: 'app-map-editor-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ImageManipulationToolsComponent,
    MapEditorCanvasComponent,
  ],
  template: `
    <div class="editor-form" [class.page]="!embedded" [class.embedded-form]="embedded">
      <section class="section-header">
        <div>
          <h1>{{ headerTitle() }}</h1>
          <p class="muted">{{ headerSubtitle() }}</p>
        </div>
        <div class="chips">
          <span class="chip">SVG editor</span>
          <span class="chip">GeoJSON native</span>
          <span class="chip">Image tools</span>
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
            Parent map
            <select
              [ngModel]="parentMapId() ?? ''"
              (ngModelChange)="parentMapId.set($event || null)"
            >
              <option value="">No parent</option>
              @for (map of availableParentMaps(); track map.id) {
                <option [value]="map.id">{{ map.name }} · {{ map.floorLabel }}</option>
              }
            </select>
          </label>
          <label>
            Footprint GeoJSON
            <textarea [(ngModel)]="footprintText"></textarea>
          </label>
          <label>
            Background image
            <input type="file" accept="image/*" (change)="onBackgroundSelected($event)" />
          </label>

          <app-image-manipulation-tools
            [mode]="canvasMode()"
            [draft]="backgroundDraft()"
            [canUseImageTools]="canUseImageTools()"
            [canApplyBackgroundEdits]="canApplyBackgroundEdits()"
            [processingBackground]="processingBackground()"
            [hint]="backgroundToolHint()"
            (modeChange)="canvasMode.set($event)"
            (draftChange)="backgroundDraft.set($event)"
            (rotate)="rotateBackground($event)"
            (reset)="resetBackgroundEdits()"
            (apply)="applyBackgroundEdits()"
          />

          <div class="actions">
            <button type="button" class="ghost" (click)="loadSampleFootprint()">
              Use sample footprint
            </button>
            <button type="button" (click)="saveMap()">Save map</button>
          </div>
        </article>

        <article class="card panel canvas-panel">
          <div class="canvas-header">
            <h2>Editor canvas</h2>
            <div class="actions">
              <button type="button" class="ghost" (click)="exportSvg()">Export SVG</button>
              <button type="button" class="ghost" (click)="addRoom()">Add room</button>
              @if (selectedRoom()) {
                <button type="button" class="danger" (click)="removeSelectedRoom()">
                  Delete room
                </button>
              }
            </div>
          </div>

          <p class="muted canvas-mode-hint">{{ canvasModeHint() }}</p>

          <app-map-editor-canvas
            [footprint]="parsedFootprint()"
            [rooms]="rooms()"
            [selectedRoomId]="selectedRoomId()"
            [canvasMode]="canvasMode()"
            [backgroundUrl]="backgroundUrl()"
            [backgroundDraft]="backgroundDraft()"
            (roomsChange)="rooms.set($event)"
            (selectedRoomIdChange)="selectedRoomId.set($event)"
            (backgroundDraftChange)="backgroundDraft.set($event)"
          />
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
              <div
                class="room-item"
                [class.selected]="selectedRoomId() === room.id"
                (click)="selectedRoomId.set(room.id)"
              >
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
          <div class="section-header">
            <div>
              <h2>Rooms GeoJSON preview</h2>
              <p class="muted">This matches the rooms array sent to the API when you save.</p>
            </div>
            <span class="chip">{{ rooms().length }} room payloads</span>
          </div>
          @if (rooms().length > 0) {
            <pre class="json-preview">{{ roomsPayloadPreview() }}</pre>
          } @else {
            <p class="muted">Add at least one room to build the room payload.</p>
          }
          @if (invalidRoomNames().length > 0) {
            <p class="message error">
              These rooms are outside the footprint polygon: {{ invalidRoomNames().join(', ') }}
            </p>
          }
          <div class="actions top-gap">
            <button type="button" (click)="saveRooms()" [disabled]="!mapId()">Save rooms</button>
            @if (mapId()) {
              <a class="button ghost" [routerLink]="['/maps', mapId(), 'book']"
                >Open booking view</a
              >
            }
          </div>
        </article>
      </section>
    </div>
  `,
  styles: `
    .editor-form {
      display: grid;
      gap: 1.5rem;
    }

    .embedded-form {
      padding: 1.5rem;
      border: 1px solid var(--line);
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.45);
    }

    .panel {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }

    .canvas-mode-hint {
      margin: 0;
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
export class MapEditorFormComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly mapsService = inject(MapsService);

  protected readonly mapId = signal<string | null>(null);
  protected readonly rooms = signal<EditorRoomModel[]>([]);
  protected readonly selectedRoomId = signal<string | null>(null);
  protected readonly parentMapId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly canvasMode = signal<CanvasMode>('rooms');
  protected readonly processingBackground = signal(false);

  @Input({ alias: 'mapId' })
  set editorMapId(value: string | null | undefined) {
    this.mapId.set(value ?? null);
  }

  @Input() embedded = false;

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
  protected readonly backgroundDraft = signal<BackgroundImageEditDraft>({
    scale: 1,
    rotationQuarterTurns: 0,
    offsetX: 0,
    offsetY: 0,
    cropRect: createDefaultCropRect(this.bounds()),
  });

  private currentMap: MapDto | null = null;
  private backgroundFile: File | null = null;
  private pendingBackgroundUrl: string | null = null;
  private readonly parentMapOptions = signal<MapSummaryDto[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadParentMapOptions();
    this.resetBackgroundEdits();

    if (this.mapId()) {
      await this.loadMap(this.mapId()!);
    }
  }

  protected headerTitle(): string {
    if (!this.mapId()) {
      return 'Create Map';
    }

    if (this.embedded) {
      return this.name;
    }

    return 'Edit Map';
  }

  protected headerSubtitle(): string {
    if (!this.mapId()) {
      return 'Trace the footprint as GeoJSON, align a background image, then place rooms inside it.';
    }

    if (this.embedded) {
      return 'Editing form for a child map of the currently opened map.';
    }

    return 'Trace the footprint as GeoJSON, align a background image, then place rooms inside it.';
  }

  protected availableParentMaps(): MapSummaryDto[] {
    const currentMapId = this.mapId();
    return this.parentMapOptions().filter((map) => map.id !== currentMapId);
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
    this.resetBackgroundEdits();
  }

  protected onBackgroundSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0] ?? null;
    this.backgroundFile = selectedFile;
    this.pendingBackgroundUrl = null;
    this.resetBackgroundEdits();

    if (!selectedFile) {
      return;
    }

    void readBlobAsDataUrl(selectedFile)
      .then((dataUrl) => {
        if (this.backgroundFile === selectedFile) {
          this.pendingBackgroundUrl = dataUrl;
        }
      })
      .catch(() => {
        this.error.set('The selected background image could not be loaded.');
      });
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
    return polygon
      ? getBoundingBox(polygon)
      : { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  protected backgroundUrl(): string | null {
    return this.pendingBackgroundUrl ?? assetUrl(this.currentMap?.backgroundImageUrl ?? null);
  }

  protected canUseImageTools(): boolean {
    return !!this.backgroundUrl();
  }

  protected canApplyBackgroundEdits(): boolean {
    return (
      !!this.mapId() &&
      !!this.currentMap?.backgroundImageUrl &&
      !this.backgroundFile &&
      !this.processingBackground()
    );
  }

  protected backgroundToolHint(): string {
    if (!this.backgroundUrl()) {
      return 'Upload a floor-plan image to enable the image tools.';
    }

    if (!this.mapId()) {
      return 'Save the map first, then upload the image and apply destructive edits.';
    }

    if (this.backgroundFile) {
      return 'Save the map to upload the newly selected image before applying rotate, scale, or crop changes.';
    }

    return 'Preview changes locally, then apply them to generate a new saved background image.';
  }

  protected canvasModeHint(): string {
    if (!this.canUseImageTools()) {
      return 'Upload a background image to unlock image alignment tools.';
    }

    switch (this.canvasMode()) {
      case 'image':
        return 'Drag anywhere on the canvas to move the background image under the footprint.';
      case 'crop':
        return 'Move the crop frame or drag its handles. Leaving crop mode shows the final cropped preview.';
      default:
        return 'Room editing mode is active. Switch to image mode to move the background or to crop mode to trim it.';
    }
  }

  protected rotateBackground(direction: number): void {
    this.backgroundDraft.update((draft) => ({
      ...draft,
      rotationQuarterTurns: (((draft.rotationQuarterTurns + direction) % 4) + 4) % 4,
    }));
  }

  protected resetBackgroundEdits(): void {
    this.backgroundDraft.set({
      scale: 1,
      rotationQuarterTurns: 0,
      offsetX: 0,
      offsetY: 0,
      cropRect: createDefaultCropRect(this.bounds()),
    });
  }

  protected selectedRoom(): EditorRoomModel | null {
    return this.rooms().find((room) => room.id === this.selectedRoomId()) ?? null;
  }

  protected roomsPayloadPreview(): string {
    return JSON.stringify(
      this.rooms().map((room, index) => ({
        id: room.id,
        name: room.name,
        color: room.color,
        sortOrder: index,
        geometryGeoJson: roomModelToPolygon(room),
      })),
      null,
      2,
    );
  }

  protected addRoom(): void {
    const box = this.bounds();
    const index = this.rooms().length;
    const stepX = Math.max(box.width * 0.06, 28);
    const stepY = Math.max(box.height * 0.05, 24);
    const width = Math.max(box.width * 0.18, 48);
    const height = Math.max(box.height * 0.14, 48);
    const maxX = Math.max(box.minX + 12, box.maxX - width - 12);
    const maxY = Math.max(box.minY + 12, box.maxY - height - 12);
    const room: EditorRoomModel = {
      id: crypto.randomUUID(),
      name: `Room ${this.rooms().length + 1}`,
      color: '#38bdf8',
      x: Math.min(box.minX + box.width * 0.1 + stepX * index, maxX),
      y: Math.min(box.minY + box.height * 0.1 + stepY * index, maxY),
      width,
      height,
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

  protected invalidRoomNames(): string[] {
    return this.rooms()
      .filter((room) => !this.isRoomValid(room))
      .map((room) => room.name);
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
        parentMapId: this.parentMapId(),
        footprintGeoJson: footprint,
      };

      this.currentMap = this.mapId()
        ? await this.mapsService.update(this.mapId()!, payload)
        : await this.mapsService.create(payload);

      if (!this.mapId()) {
        this.mapId.set(this.currentMap.id);
        await this.router.navigate(['/maps', this.currentMap.id, 'edit']);
      }

      await this.loadParentMapOptions();

      if (this.backgroundFile) {
        this.currentMap = await this.mapsService.uploadBackground(
          this.currentMap.id,
          this.backgroundFile,
        );
        this.backgroundFile = null;
        this.pendingBackgroundUrl = null;
      }

      this.resetBackgroundEdits();
      this.message.set('Map saved.');
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  protected async applyBackgroundEdits(): Promise<void> {
    if (!this.canApplyBackgroundEdits()) {
      this.error.set(this.backgroundToolHint());
      return;
    }

    const mapId = this.mapId();
    if (!mapId) {
      this.error.set('Save the map before applying image edits.');
      return;
    }

    this.error.set('');
    this.message.set('');
    this.processingBackground.set(true);

    try {
      const draft = this.backgroundDraft();
      this.currentMap = await this.mapsService.processBackground(
        mapId,
        toBackgroundProcessRequest(this.bounds(), {
          rotationQuarterTurns: draft.rotationQuarterTurns,
          scale: draft.scale,
          offsetX: draft.offsetX,
          offsetY: draft.offsetY,
          cropRect: draft.cropRect,
        }),
      );
      this.pendingBackgroundUrl = null;
      this.backgroundFile = null;
      this.resetBackgroundEdits();
      this.canvasMode.set('rooms');
      this.message.set('Background image updated.');
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.processingBackground.set(false);
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

  protected async exportSvg(): Promise<void> {
    const footprint = this.parsedFootprint();
    if (!footprint) {
      this.error.set('The footprint GeoJSON is invalid.');
      return;
    }

    this.error.set('');
    this.message.set('');

    try {
      await downloadMapSvg(this.buildDraftExportMap(footprint), {
        backgroundHref: this.pendingBackgroundUrl ?? this.currentMap?.backgroundImageUrl ?? null,
      });
      this.message.set('Downloaded current draft as SVG.');
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  private async loadMap(mapId: string): Promise<void> {
    try {
      this.currentMap = await this.mapsService.get(mapId);
      this.pendingBackgroundUrl = null;
      this.backgroundFile = null;
      this.name = this.currentMap.name;
      this.floorLabel = this.currentMap.floorLabel;
      this.timezone = this.currentMap.timezone;
      this.parentMapId.set(this.currentMap.parentMapId);
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
      this.resetBackgroundEdits();
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  private async loadParentMapOptions(): Promise<void> {
    try {
      this.parentMapOptions.set(await this.mapsService.list());
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  private buildDraftExportMap(footprint: GeoJsonPolygon): ExportableMap {
    return {
      name: this.name,
      floorLabel: this.floorLabel,
      timezone: this.timezone,
      backgroundImageUrl: this.currentMap?.backgroundImageUrl ?? null,
      footprintGeoJson: footprint,
      rooms: this.rooms().map((room, index) => ({
        name: room.name,
        color: room.color,
        sortOrder: index,
        geometryGeoJson: roomModelToPolygon(room),
      })),
    };
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error && 'error' in error) {
      return (error as { error?: { message?: string } }).error?.message ?? 'Request failed.';
    }
    return 'Request failed.';
  }
}

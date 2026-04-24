import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DateTime } from 'luxon';
import { GeoJsonPolygon, MapDto, MeetingDto, UserSummaryDto, getBoundingBox, polygonToPointsAttribute } from '@campus/contracts';

import { assetUrl } from '../core/api';
import { AuthService } from '../core/auth.service';
import { downloadMapSvg } from '../core/map-svg-export';
import { MapsService } from '../core/maps.service';
import { MeetingsService } from '../core/meetings.service';
import { UsersService } from '../core/users.service';

@Component({
  selector: 'app-map-booking-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <section class="section-header">
        <div>
          <h1>{{ map()?.name ?? 'Room booking' }}</h1>
          <p class="muted">Choose a room, day, and hour. Each booking is exactly one hour.</p>
        </div>
        @if (map()) {
          <div class="chips">
            <span class="chip">{{ map()!.floorLabel }}</span>
            <span class="chip">{{ map()!.timezone }}</span>
          </div>
        }
      </section>

      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (message()) {
        <p class="message success">{{ message() }}</p>
      }

      <section class="grid-2">
        <article class="card panel">
          <div class="section-header">
            <div>
              <h2>Map view</h2>
              <p class="muted">Rooms remain tied to the saved GeoJSON geometry.</p>
            </div>
            <div class="actions">
              <span class="chip">{{ meetings().length }} meetings on {{ selectedDate }}</span>
              <button type="button" class="ghost" (click)="exportSvg()" [disabled]="!map()">Export SVG</button>
            </div>
          </div>

          @if (map()) {
            <svg class="viewer-svg" [attr.viewBox]="viewBox()">
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
              @for (room of map()!.rooms; track room.id) {
                <polygon
                  [attr.points]="pointsForRoom(room.geometryGeoJson)"
                  [attr.fill]="room.color"
                  fill-opacity="0.35"
                  stroke="rgba(31,42,51,0.65)"
                  stroke-width="2"
                  [class.selected-room]="selectedRoomId === room.id"
                  (click)="selectedRoomId = room.id"
                />
              }
            </svg>
          }
        </article>

        <article class="card panel">
          <h2>Schedule meeting</h2>
          <div class="grid-2 compact">
            <label>
              Room
              <select [(ngModel)]="selectedRoomId">
                @for (room of map()?.rooms ?? []; track room.id) {
                  <option [value]="room.id">{{ room.name }}</option>
                }
              </select>
            </label>
            <label>
              Date
              <input type="date" [(ngModel)]="selectedDate" (change)="loadMeetings()" />
            </label>
            <label>
              Hour
              <select [(ngModel)]="selectedHour">
                @for (hour of hours; track hour) {
                  <option [value]="hour">{{ hourLabel(hour) }}</option>
                }
              </select>
            </label>
            <label>
              Title
              <input [(ngModel)]="title" />
            </label>
          </div>
          <label>
            Description
            <textarea [(ngModel)]="description"></textarea>
          </label>

          <div class="participant-list">
            @for (user of users(); track user.id) {
              <label class="participant">
                <input
                  type="checkbox"
                  [checked]="participantIds.has(user.id)"
                  (change)="toggleParticipant(user.id)"
                />
                <span>{{ user.displayName }}</span>
                <span class="muted">{{ user.email }}</span>
              </label>
            }
          </div>

          <div class="actions">
            <button type="button" (click)="createMeeting()" [disabled]="!map()">Book hour slot</button>
            <span class="muted">Booked hours for this room: {{ bookedHoursLabel() }}</span>
          </div>
        </article>
      </section>

      <section class="card panel">
        <div class="section-header">
          <div>
            <h2>Meetings</h2>
            <p class="muted">The selected date is rendered in the map timezone.</p>
          </div>
        </div>
        <div class="meeting-list">
          @for (meeting of meetings(); track meeting.id) {
            <article class="meeting-item">
              <div class="section-header">
                <div>
                  <strong>{{ meeting.title }}</strong>
                  <p class="muted">{{ roomName(meeting.roomId) }} · {{ hourLabel(meeting.hour) }}</p>
                </div>
                <div class="actions">
                  @if (canDelete(meeting)) {
                    <button type="button" class="danger" (click)="deleteMeeting(meeting.id)">Cancel</button>
                  }
                </div>
              </div>
              <p>{{ meeting.description || 'No description.' }}</p>
              <div class="chips">
                @for (participant of meeting.participants; track participant.id) {
                  <span class="chip">{{ participant.displayName }}</span>
                }
              </div>
            </article>
          } @empty {
            <p class="muted">No meetings for this date.</p>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .panel {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }

    .viewer-svg {
      width: 100%;
      min-height: 420px;
      border-radius: 22px;
      background: white;
      box-shadow: inset 0 0 0 1px rgba(31, 42, 51, 0.08);
    }

    .footprint {
      fill: rgba(17, 94, 89, 0.06);
      stroke: var(--brand-strong);
      stroke-width: 2.5;
    }

    .selected-room {
      stroke: #111827;
      stroke-width: 3;
    }

    .participant-list,
    .meeting-list {
      display: grid;
      gap: 0.8rem;
    }

    .participant {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 0.8rem 1rem;
    }

    .meeting-item {
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 1rem;
      display: grid;
      gap: 0.8rem;
    }

    .compact {
      gap: 0.75rem;
    }
  `,
})
export class MapBookingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly mapsService = inject(MapsService);
  private readonly meetingsService = inject(MeetingsService);
  private readonly usersService = inject(UsersService);
  protected readonly auth = inject(AuthService);

  protected readonly map = signal<MapDto | null>(null);
  protected readonly users = signal<UserSummaryDto[]>([]);
  protected readonly meetings = signal<MeetingDto[]>([]);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly hours = Array.from({ length: 24 }, (_, index) => index);

  protected selectedRoomId = '';
  protected selectedDate = DateTime.now().toISODate() ?? '2026-01-01';
  protected selectedHour = 9;
  protected title = 'Team sync';
  protected description = '';
  protected participantIds = new Set<string>();

  constructor() {
    void this.load();
  }

  protected bounds() {
    const map = this.map();
    return map
      ? {
          ...this.boundingBox(map.footprintGeoJson),
        }
      : { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  protected viewBox(): string {
    const box = this.bounds();
    const padX = Math.max(box.width * 0.08, 24);
    const padY = Math.max(box.height * 0.08, 24);
    return `${box.minX - padX} ${box.minY - padY} ${box.width + padX * 2} ${box.height + padY * 2}`;
  }

  protected footprintPoints(): string {
    return this.map() ? polygonToPointsAttribute(this.map()!.footprintGeoJson) : '';
  }

  protected pointsForRoom(polygon: GeoJsonPolygon): string {
    return polygonToPointsAttribute(polygon);
  }

  protected backgroundUrl(): string | null {
    return assetUrl(this.map()?.backgroundImageUrl ?? null);
  }

  protected hourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  protected roomName(roomId: string): string {
    return this.map()?.rooms.find((room) => room.id === roomId)?.name ?? 'Unknown room';
  }

  protected bookedHoursLabel(): string {
    const hours = this.meetings()
      .filter((meeting) => meeting.roomId === this.selectedRoomId)
      .map((meeting) => this.hourLabel(meeting.hour));

    return hours.length > 0 ? hours.join(', ') : 'none';
  }

  protected toggleParticipant(userId: string): void {
    if (this.participantIds.has(userId)) {
      this.participantIds.delete(userId);
    } else {
      this.participantIds.add(userId);
    }
    this.participantIds = new Set(this.participantIds);
  }

  protected canDelete(meeting: MeetingDto): boolean {
    const user = this.auth.user();
    return !!user && (user.role === 'admin' || user.id === meeting.createdBy.id);
  }

  protected async loadMeetings(): Promise<void> {
    const map = this.map();
    if (!map) {
      return;
    }

    try {
      this.meetings.set(await this.meetingsService.list(map.id, this.selectedDate));
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  protected async createMeeting(): Promise<void> {
    const map = this.map();
    if (!map || !this.selectedRoomId) {
      return;
    }

    this.error.set('');
    this.message.set('');

    try {
      await this.meetingsService.create({
        roomId: this.selectedRoomId,
        title: this.title,
        description: this.description,
        localDate: this.selectedDate,
        hour: Number(this.selectedHour),
        participantUserIds: Array.from(this.participantIds),
      });
      this.message.set('Meeting booked.');
      await this.loadMeetings();
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  protected async exportSvg(): Promise<void> {
    const map = this.map();
    if (!map) {
      return;
    }

    this.error.set('');
    this.message.set('');

    try {
      await downloadMapSvg(map);
      this.message.set(`Downloaded ${map.name} as SVG.`);
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  protected async deleteMeeting(meetingId: string): Promise<void> {
    try {
      await this.meetingsService.delete(meetingId);
      this.message.set('Meeting cancelled.');
      await this.loadMeetings();
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  private async load(): Promise<void> {
    const mapId = this.route.snapshot.paramMap.get('mapId');
    if (!mapId) {
      return;
    }

    try {
      const [map, users] = await Promise.all([this.mapsService.get(mapId), this.usersService.list()]);
      this.map.set(map);
      this.users.set(users);
      this.selectedRoomId = map.rooms[0]?.id ?? '';
      const currentUserId = this.auth.user()?.id;
      if (currentUserId) {
        this.participantIds.add(currentUserId);
      }
      await this.loadMeetings();
    } catch (error) {
      this.error.set(this.extractMessage(error));
    }
  }

  private boundingBox(polygon: GeoJsonPolygon) {
    return getBoundingBox(polygon);
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error && 'error' in error) {
      return ((error as { error?: { message?: string } }).error?.message) ?? 'Request failed.';
    }
    return 'Request failed.';
  }
}

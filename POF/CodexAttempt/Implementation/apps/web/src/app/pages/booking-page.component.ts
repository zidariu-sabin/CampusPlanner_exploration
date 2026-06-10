import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookableResourceDto, FloorMapDto, MeetingDto, UserSummaryDto } from '@campus/contracts';
import { DateTime } from 'luxon';

import { MapPreviewComponent } from '../components/map-preview.component';
import { AuthService } from '../core/auth.service';
import { MapsService } from '../core/maps.service';
import { MeetingsService } from '../core/meetings.service';
import { ResourcesService } from '../core/resources.service';
import { UsersService } from '../core/users.service';

const SLOT_HOURS = Array.from({ length: 12 }, (_, index) => index + 8); // 08:00 .. 19:00 starts

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MapPreviewComponent],
  template: `
    <div class="page">
      <section class="section-header">
        <div>
          <h1>Book a room</h1>
          <p class="muted">Pick a space, choose a free one-hour slot, and invite participants.</p>
        </div>
      </section>

      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading available spaces...</p>
      } @else {
        <section class="booking-layout">
          <aside class="card panel">
            <div>
              <h2>Available spaces</h2>
              <p class="muted">{{ resources().length }} bookable resources in your organization.</p>
            </div>

            <div class="resource-list">
              @for (resource of resources(); track resource.id) {
                <button
                  type="button"
                  class="resource-card"
                  [class.selected]="resource.id === selectedResource()?.id"
                  (click)="pickResource(resource)"
                >
                  <span class="resource-head">
                    <strong>{{ resource.name }}</strong>
                    <span class="chip" [class.outdoor]="resource.kind === 'campus_place'">
                      {{ resource.kind === 'room' ? 'room' : 'outdoor space' }}
                    </span>
                  </span>
                  <span class="muted">{{ resourceLocation(resource) }}</span>
                </button>
              } @empty {
                <p class="muted">No bookable spaces configured yet.</p>
              }
            </div>
          </aside>

          <section class="card panel">
            @if (selectedResource(); as resource) {
              <div class="section-header">
                <div>
                  <h2>{{ resource.name }}</h2>
                  <p class="muted">{{ resourceLocation(resource) }}</p>
                </div>
                <span class="chip">{{ resource.timezone }}</span>
              </div>

              <label>
                Date
                <input type="date" [(ngModel)]="selectedDate" (change)="onDateChange()" />
              </label>

              <div>
                <h3>Time slots</h3>
                @if (loadingSlots()) {
                  <p class="muted">Checking availability...</p>
                } @else {
                  <div class="slot-grid">
                    @for (hour of slotHours; track hour) {
                      <button
                        type="button"
                        class="slot"
                        [class.busy]="isBusy(hour)"
                        [class.selected]="selectedHour() === hour"
                        [disabled]="isBusy(hour)"
                        (click)="selectedHour.set(hour)"
                      >
                        {{ hourLabel(hour) }}
                        <span class="slot-state">{{ isBusy(hour) ? 'busy' : 'free' }}</span>
                      </button>
                    }
                  </div>
                }
              </div>

              <div class="form-grid">
                <label>
                  Title
                  <input [(ngModel)]="title" placeholder="Team sync" />
                </label>
                <label>
                  Description
                  <textarea [(ngModel)]="description" placeholder="Optional agenda"></textarea>
                </label>
              </div>

              <div>
                <h3>Participants</h3>
                <div class="participant-list">
                  @for (user of invitableUsers(); track user.id) {
                    <label class="participant">
                      <input
                        type="checkbox"
                        [checked]="participantIds().has(user.id)"
                        (change)="toggleParticipant(user.id)"
                      />
                      <span>{{ user.displayName }}</span>
                      <span class="muted">{{ user.email }}</span>
                    </label>
                  } @empty {
                    <p class="muted">No other members to invite.</p>
                  }
                </div>
              </div>

              @if (conflictError()) {
                <p class="message error">{{ conflictError() }}</p>
              }

              <div class="actions">
                <button type="button" [disabled]="!canConfirm() || saving()" (click)="confirm()">
                  {{ saving() ? 'Booking...' : 'Confirm booking' }}
                </button>
                @if (selectedHour() !== null) {
                  <span class="muted">
                    {{ selectedDate }} · {{ hourLabel(selectedHour()!) }}
                  </span>
                }
              </div>
            } @else {
              <div class="empty-panel">
                <h2>Select a space</h2>
                <p class="muted">Choose a room or outdoor space from the list to see availability.</p>
              </div>
            }
          </section>
        </section>

        @if (selectedResource()?.floorMapId) {
          <section class="card panel">
            <div class="section-header">
              <div>
                <h2>Floor context</h2>
                <p class="muted">
                  {{ selectedResource()!.campusPlaceName }} ·
                  {{ selectedResource()!.floorLabel }} — the selected room is highlighted.
                </p>
              </div>
            </div>
            @if (floorMap(); as map) {
              <app-map-preview
                [map]="map"
                [compact]="true"
                [selectedRoomId]="selectedResource()!.roomId"
              />
            } @else {
              <p class="muted">Loading floor preview...</p>
            }
          </section>
        }
      }
    </div>
  `,
  styles: `
    .booking-layout {
      display: grid;
      grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .panel {
      padding: 1.25rem;
      display: grid;
      gap: 1.1rem;
    }

    .resource-list {
      display: grid;
      gap: 0.6rem;
      max-height: 560px;
      overflow: auto;
    }

    .resource-card {
      display: grid;
      gap: 0.3rem;
      justify-items: start;
      text-align: left;
      padding: 0.85rem 1rem;
      border-radius: 18px;
      background: white;
      color: var(--ink);
      box-shadow: inset 0 0 0 1px var(--line);
    }

    .resource-card.selected {
      box-shadow: inset 0 0 0 2px var(--brand);
      background: rgba(14, 116, 144, 0.06);
    }

    .resource-head {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .chip.outdoor {
      background: rgba(194, 65, 12, 0.1);
      color: var(--accent);
    }

    .slot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 0.5rem;
      margin-top: 0.6rem;
    }

    .slot {
      display: grid;
      gap: 0.1rem;
      padding: 0.6rem 0.5rem;
      border-radius: 14px;
      background: white;
      color: var(--ink);
      box-shadow: inset 0 0 0 1px var(--line);
      font-size: 0.92rem;
    }

    .slot-state {
      font-size: 0.75rem;
      color: var(--ink-soft);
    }

    .slot.busy {
      opacity: 0.45;
      text-decoration: line-through;
    }

    .slot.selected {
      box-shadow: inset 0 0 0 2px var(--brand);
      background: rgba(14, 116, 144, 0.1);
    }

    .form-grid {
      display: grid;
      gap: 0.8rem;
    }

    .participant-list {
      display: grid;
      gap: 0.55rem;
      margin-top: 0.6rem;
      max-height: 260px;
      overflow: auto;
    }

    .participant {
      display: flex;
      gap: 0.7rem;
      align-items: center;
      flex-wrap: wrap;
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 0.65rem 0.9rem;
    }

    .participant input {
      width: auto;
    }

    .actions {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .empty-panel {
      display: grid;
      gap: 0.5rem;
      padding: 3rem 1rem;
      justify-items: center;
      text-align: center;
    }

    @media (max-width: 980px) {
      .booking-layout {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class BookingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resourcesService = inject(ResourcesService);
  private readonly meetingsService = inject(MeetingsService);
  private readonly usersService = inject(UsersService);
  private readonly mapsService = inject(MapsService);
  private readonly auth = inject(AuthService);

  protected readonly slotHours = SLOT_HOURS;

  protected readonly resources = signal<BookableResourceDto[]>([]);
  protected readonly users = signal<UserSummaryDto[]>([]);
  protected readonly meetings = signal<MeetingDto[]>([]);
  protected readonly floorMap = signal<FloorMapDto | null>(null);
  protected readonly participantIds = signal<Set<string>>(new Set());
  protected readonly selectedHour = signal<number | null>(null);

  protected readonly loading = signal(true);
  protected readonly loadingSlots = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly conflictError = signal('');

  private readonly resourceId = signal<string | null>(null);

  protected selectedDate = DateTime.now().toISODate() ?? '2026-01-01';
  protected title = '';
  protected description = '';

  protected readonly selectedResource = computed(() => {
    const id = this.resourceId();
    return id ? (this.resources().find((resource) => resource.id === id) ?? null) : null;
  });

  protected readonly invitableUsers = computed(() => {
    const me = this.auth.user();
    return this.users().filter((user) => user.id !== me?.id);
  });

  private readonly busyHours = computed(() => new Set(this.meetings().map((meeting) => meeting.hour)));

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.resourceId.set(params.get('resourceId'));
        this.selectedHour.set(null);
        this.conflictError.set('');
        void this.syncSelection();
      });

    void this.loadInitial();
  }

  protected pickResource(resource: BookableResourceDto): void {
    void this.router.navigate(['/book', resource.id]);
  }

  protected onDateChange(): void {
    this.selectedHour.set(null);
    this.conflictError.set('');
    void this.syncSelection();
  }

  protected resourceLocation(resource: BookableResourceDto): string {
    const parts = [resource.campusName];
    if (resource.campusPlaceName && resource.campusPlaceName !== resource.name) {
      parts.push(resource.campusPlaceName);
    }
    if (resource.floorLabel) {
      parts.push(resource.floorLabel);
    }
    return parts.join(' · ');
  }

  protected hourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`;
  }

  protected isBusy(hour: number): boolean {
    return this.busyHours().has(hour);
  }

  protected toggleParticipant(userId: string): void {
    const next = new Set(this.participantIds());
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    this.participantIds.set(next);
  }

  protected canConfirm(): boolean {
    return !!this.selectedResource() && this.selectedHour() !== null && this.title.trim().length > 0;
  }

  protected async confirm(): Promise<void> {
    const resource = this.selectedResource();
    const hour = this.selectedHour();
    if (!resource || hour === null) {
      return;
    }

    this.saving.set(true);
    this.conflictError.set('');
    this.error.set('');

    try {
      const meeting = await this.meetingsService.create({
        bookableResourceId: resource.id,
        title: this.title.trim(),
        description: this.description.trim(),
        localDate: this.selectedDate,
        hour,
        participantUserIds: Array.from(this.participantIds()),
      });
      await this.router.navigate(['/bookings', meeting.id]);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.conflictError.set(
          extractMessage(error) || 'This slot was just booked by someone else. Pick another one.',
        );
        this.selectedHour.set(null);
        await this.loadSlots();
      } else {
        this.conflictError.set(extractMessage(error));
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async loadInitial(): Promise<void> {
    try {
      const [resources, users] = await Promise.all([
        this.resourcesService.list(),
        this.usersService.list(),
      ]);
      this.resources.set(resources);
      this.users.set(users);
    } catch (error) {
      this.error.set(extractMessage(error));
    } finally {
      this.loading.set(false);
    }

    await this.syncSelection();
  }

  private async syncSelection(): Promise<void> {
    const resource = this.selectedResource();
    if (!resource) {
      this.meetings.set([]);
      this.floorMap.set(null);
      return;
    }

    await Promise.all([this.loadSlots(), this.loadFloorMap(resource)]);
  }

  private async loadSlots(): Promise<void> {
    const resource = this.selectedResource();
    if (!resource) {
      return;
    }

    this.loadingSlots.set(true);
    try {
      this.meetings.set(await this.meetingsService.list(resource.id, this.selectedDate));
    } catch (error) {
      this.error.set(extractMessage(error));
    } finally {
      this.loadingSlots.set(false);
    }
  }

  private async loadFloorMap(resource: BookableResourceDto): Promise<void> {
    if (!resource.floorMapId) {
      this.floorMap.set(null);
      return;
    }

    if (this.floorMap()?.id === resource.floorMapId) {
      return;
    }

    this.floorMap.set(null);
    try {
      this.floorMap.set(await this.mapsService.get(resource.floorMapId));
    } catch {
      // The floor preview is optional context; booking still works without it.
      this.floorMap.set(null);
    }
  }
}

function extractMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'error' in error) {
    const message = (error as { error?: { message?: string } }).error?.message;
    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Request failed.';
}

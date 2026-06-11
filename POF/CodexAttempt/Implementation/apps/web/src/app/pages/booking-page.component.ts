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
    <div class="screen-shell">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading available spaces...</p>
      } @else {
        <section class="map-layout">
          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>Available rooms</h3>
                <p>{{ resources().length }} bookable resources in your organization</p>
              </div>
            </header>
            <div class="panel-body">
              <div class="card-list">
                @for (resource of resources(); track resource.id) {
                  <article
                    class="member-room-card"
                    [class.is-selected]="resource.id === selectedResource()?.id"
                  >
                    <div>
                      <h3>{{ resource.name }}</h3>
                      <p>{{ resourceLocation(resource) }}</p>
                      <div class="status-row">
                        <span class="badge badge-good">
                          {{ resource.kind === 'room' ? 'Room' : 'Outdoor space' }}
                        </span>
                        @if (resource.floorLabel) {
                          <span class="badge">{{ resource.floorLabel }}</span>
                        }
                      </div>
                    </div>
                    <button
                      type="button"
                      [class]="resource.id === selectedResource()?.id ? 'primary-action' : 'secondary-action'"
                      (click)="pickResource(resource)"
                    >
                      {{ resource.id === selectedResource()?.id ? 'Selected' : 'Select' }}
                    </button>
                  </article>
                } @empty {
                  <p class="muted">No bookable spaces configured yet.</p>
                }
              </div>
            </div>
          </section>

          <section class="panel">
            @if (selectedResource(); as resource) {
              <header class="panel-header">
                <div>
                  <h3>Book {{ resource.name }}</h3>
                  <p>{{ resourceLocation(resource) }}</p>
                </div>
              </header>
              <div class="panel-body">
                <div class="booking-summary">
                  <span class="badge badge-good">{{ resource.timezone }}</span>
                  @if (resource.floorLabel) {
                    <span class="badge">{{ resource.floorLabel }}</span>
                  }
                  <span class="badge">{{ resource.kind === 'room' ? 'Room' : 'Outdoor space' }}</span>
                </div>

                <label>
                  Date
                  <input type="date" [(ngModel)]="selectedDate" (change)="onDateChange()" />
                </label>

                <strong class="selector-label">Time slots</strong>
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
                        {{ slotLabel(hour) }}
                      </button>
                    }
                  </div>
                }

                <label>
                  Meeting title
                  <input [(ngModel)]="title" placeholder="Team sync" />
                </label>
                <label>
                  Description
                  <textarea [(ngModel)]="description" placeholder="Optional agenda"></textarea>
                </label>

                <strong class="selector-label">Participants</strong>
                <div class="card-list">
                  @for (user of invitableUsers(); track user.id) {
                    <label class="compact-card participant">
                      <span>{{ user.displayName }} · {{ user.email }}</span>
                      <input
                        type="checkbox"
                        [checked]="participantIds().has(user.id)"
                        (change)="toggleParticipant(user.id)"
                      />
                    </label>
                  } @empty {
                    <p class="muted">No other members to invite.</p>
                  }
                </div>

                @if (conflictError()) {
                  <p class="message error">{{ conflictError() }}</p>
                }

                <div class="booking-detail-card">
                  <div><span>Room</span><strong>{{ resource.name }}</strong></div>
                  <div>
                    <span>Floor</span>
                    <strong>{{ resource.floorLabel || resource.campusPlaceName || '—' }}</strong>
                  </div>
                  <div><span>Organizer</span><strong>{{ organizerName() }}</strong></div>
                  @if (selectedHour() !== null) {
                    <div><span>Slot</span><strong>{{ selectedDate }} · {{ hourLabel(selectedHour()!) }}</strong></div>
                  }
                </div>

                <button
                  class="primary-action"
                  type="button"
                  [disabled]="!canConfirm() || saving()"
                  (click)="confirm()"
                >
                  {{ saving() ? 'Booking...' : 'Confirm booking' }}
                </button>
              </div>
            } @else {
              <header class="panel-header">
                <div>
                  <h3>Select a space</h3>
                  <p>Choose a room or outdoor space to see availability</p>
                </div>
              </header>
              <div class="panel-body">
                <div class="inline-form-title">
                  <strong>No space selected</strong>
                  <span>Pick a room or outdoor space from the list to review its open slots.</span>
                </div>
              </div>
            }
          </section>
        </section>

        @if (selectedResource()?.floorMapId) {
          <section class="panel">
            <header class="panel-header">
              <div>
                <h3>Floor context</h3>
                <p>
                  {{ selectedResource()!.campusPlaceName }} ·
                  {{ selectedResource()!.floorLabel }} — the selected room is highlighted.
                </p>
              </div>
            </header>
            <div class="panel-body">
              @if (floorMap(); as map) {
                <app-map-preview
                  [map]="map"
                  [compact]="true"
                  [selectedRoomId]="selectedResource()!.roomId"
                />
              } @else {
                <p class="muted">Loading floor preview...</p>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .participant {
      cursor: pointer;
    }

    .participant span {
      font-size: 13px;
      color: var(--ink);
      font-weight: 700;
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

  protected slotLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  protected organizerName(): string {
    return this.auth.user()?.displayName ?? 'You';
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

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
import { BadgeComponent, ButtonDirective, EmptyStateComponent, PanelComponent } from '../ui';

const SLOT_HOURS = Array.from({ length: 12 }, (_, index) => index + 8); // 08:00 .. 19:00 starts

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [
    FormsModule,
    MapPreviewComponent,
    PanelComponent,
    BadgeComponent,
    EmptyStateComponent,
    ButtonDirective,
  ],
  template: `
    <div class="grid content-start gap-4">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="text-sm text-muted">Loading available spaces…</p>
      } @else {
        <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(320px,32%,380px)] lg:items-start">
          <app-panel
            heading="Available rooms"
            [sub]="resources().length + ' bookable resources in your organization'"
          >
            <div class="grid gap-2.5">
              @for (resource of resources(); track resource.id) {
                <article
                  class="grid gap-3 rounded-lg border bg-panel p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  [class]="resource.id === selectedResource()?.id ? 'border-green bg-green-soft/30' : 'border-line'"
                >
                  <div class="min-w-0">
                    <h3 class="text-base font-bold">{{ resource.name }}</h3>
                    <p class="my-1 text-sm text-muted">{{ resourceLocation(resource) }}</p>
                    <div class="flex flex-wrap gap-2">
                      <app-badge tone="good">{{ resource.kind === 'room' ? 'Room' : 'Outdoor space' }}</app-badge>
                      @if (resource.floorLabel) {
                        <app-badge>{{ resource.floorLabel }}</app-badge>
                      }
                    </div>
                  </div>
                  <button
                    type="button"
                    [uiBtn]="resource.id === selectedResource()?.id ? '' : 'secondary'"
                    (click)="pickResource(resource)"
                  >
                    {{ resource.id === selectedResource()?.id ? 'Selected' : 'Select' }}
                  </button>
                </article>
              } @empty {
                <p class="text-sm text-muted">No bookable spaces configured yet.</p>
              }
            </div>
          </app-panel>

          @if (selectedResource(); as resource) {
            <app-panel [heading]="'Book ' + resource.name" [sub]="resourceLocation(resource)">
              <div class="grid gap-3">
                <div class="flex flex-wrap gap-2">
                  <app-badge tone="good">{{ resource.timezone }}</app-badge>
                  @if (resource.floorLabel) {
                    <app-badge>{{ resource.floorLabel }}</app-badge>
                  }
                  <app-badge>{{ resource.kind === 'room' ? 'Room' : 'Outdoor space' }}</app-badge>
                </div>

                <label>
                  Date
                  <input type="date" [(ngModel)]="selectedDate" (change)="onDateChange()" />
                </label>

                <strong class="text-xs font-black uppercase tracking-wider text-strong-2">Time slots</strong>
                @if (loadingSlots()) {
                  <p class="text-sm text-muted">Checking availability…</p>
                } @else {
                  <div class="grid grid-cols-4 gap-2">
                    @for (hour of slotHours; track hour) {
                      <button
                        type="button"
                        class="rounded-lg border py-2.5 text-sm font-bold transition-colors"
                        [class]="slotClass(hour)"
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

                <strong class="text-xs font-black uppercase tracking-wider text-strong-2">Participants</strong>
                <div class="grid gap-2">
                  @for (user of invitableUsers(); track user.id) {
                    <label
                      class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3"
                    >
                      <span class="text-sm font-bold text-ink">{{ user.displayName }} · {{ user.email }}</span>
                      <input
                        type="checkbox"
                        class="h-4 w-4 accent-strong"
                        [checked]="participantIds().has(user.id)"
                        (change)="toggleParticipant(user.id)"
                      />
                    </label>
                  } @empty {
                    <p class="text-sm text-muted">No other members to invite.</p>
                  }
                </div>

                @if (conflictError()) {
                  <p class="message error">{{ conflictError() }}</p>
                }

                <div class="grid gap-2.5 rounded-lg border border-line bg-panel p-3 text-sm">
                  <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                    <span class="font-semibold text-muted">Room</span><strong>{{ resource.name }}</strong>
                  </div>
                  <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                    <span class="font-semibold text-muted">Floor</span>
                    <strong>{{ resource.floorLabel || resource.campusPlaceName || '—' }}</strong>
                  </div>
                  <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                    <span class="font-semibold text-muted">Organizer</span><strong>{{ organizerName() }}</strong>
                  </div>
                  @if (selectedHour() !== null) {
                    <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                      <span class="font-semibold text-muted">Slot</span>
                      <strong>{{ selectedDate }} · {{ hourLabel(selectedHour()!) }}</strong>
                    </div>
                  }
                </div>

                <button
                  uiBtn
                  class="w-full"
                  type="button"
                  [disabled]="!canConfirm() || saving()"
                  (click)="confirm()"
                >
                  {{ saving() ? 'Booking…' : 'Confirm booking' }}
                </button>
              </div>
            </app-panel>
          } @else {
            <app-panel heading="Select a space" sub="Choose a room or outdoor space to see availability">
              <app-empty-state
                title="No space selected"
                message="Pick a room or outdoor space from the list to review its open slots."
              />
            </app-panel>
          }
        </section>

        @if (selectedResource()?.floorMapId) {
          <app-panel
            heading="Floor context"
            [sub]="
              selectedResource()!.campusPlaceName +
              ' · ' +
              selectedResource()!.floorLabel +
              ' — the selected room is highlighted.'
            "
          >
            @if (floorMap(); as map) {
              <app-map-preview [map]="map" [compact]="true" [selectedRoomId]="selectedResource()!.roomId" />
            } @else {
              <p class="text-sm text-muted">Loading floor preview…</p>
            }
          </app-panel>
        }
      }
    </div>
  `,
  styles: ``,
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

  protected slotClass(hour: number): string {
    if (this.isBusy(hour)) {
      return 'border-line bg-panel-soft text-muted line-through';
    }
    if (this.selectedHour() === hour) {
      return 'border-strong bg-strong text-white';
    }
    return 'border-line bg-panel text-ink hover:border-strong';
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

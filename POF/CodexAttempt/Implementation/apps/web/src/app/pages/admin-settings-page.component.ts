import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrganizationInviteDto, OrganizationRole, UserSummaryDto } from '@campus/contracts';

import { AuthService } from '../core/auth.service';
import { OrganizationsService } from '../core/organizations.service';
import { UsersService } from '../core/users.service';
import { BadgeComponent, ButtonDirective, PanelComponent } from '../ui';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ButtonDirective, PanelComponent, BadgeComponent],
  template: `
    <div class="grid content-start gap-4">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="text-sm text-muted">Loading settings…</p>
      } @else {
        <section class="grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <aside class="h-fit rounded-lg border border-line bg-panel p-2 shadow-panel">
            <nav class="grid gap-1">
              <button
                type="button"
                class="w-full rounded-lg bg-green-soft px-3 py-2.5 text-left text-sm font-bold text-green"
              >
                Users and roles
              </button>
              @for (item of ['Publishing', 'Domains', 'Branding', 'Audit log']; track item) {
                <button
                  type="button"
                  class="w-full rounded-lg bg-transparent px-3 py-2.5 text-left text-sm font-bold text-muted transition-colors hover:bg-panel-soft hover:text-ink"
                >
                  {{ item }}
                </button>
              }
            </nav>
          </aside>

          <div class="grid gap-4">
            <app-panel heading="Users and access" [sub]="'Role-based access for ' + organizationName()">
              <app-badge panelAction>{{ users().length }} users</app-badge>

              <div class="overflow-hidden rounded-lg border border-line">
                <div
                  class="grid grid-cols-[1fr_auto_auto] items-center gap-3 bg-panel-inset px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-muted"
                >
                  <span>User</span><span>Role</span><span>Status</span>
                </div>
                @for (user of users(); track user.id) {
                  <div
                    class="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-line px-3 py-2.5 text-sm"
                  >
                    <div class="min-w-0">
                      <strong>{{ user.displayName }}</strong>
                      <div class="truncate text-[11px] text-muted">{{ user.email }}</div>
                    </div>
                    <span class="capitalize text-muted">{{ user.role }}</span>
                    <app-badge tone="good">Active</app-badge>
                  </div>
                }
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <article class="grid content-start gap-2 rounded-lg border border-line bg-panel p-3.5">
                  <strong>Private URL</strong>
                  <p class="break-all text-sm text-muted">{{ privateUrl() }}</p>
                  <app-badge tone="good">Published</app-badge>
                </article>
                <article class="grid content-start gap-2 rounded-lg border border-line bg-panel p-3.5">
                  <strong>Custom domain</strong>
                  <p class="text-sm leading-relaxed text-muted">
                    Map your own domain (e.g. maps.your-university.edu) to this workspace.
                  </p>
                  <app-badge tone="warn">Not configured</app-badge>
                </article>
              </div>
            </app-panel>

            <app-panel heading="Invitations" sub="Onboard teammates with a shareable invite link">
              <app-badge panelAction>{{ pendingInviteCount() }} pending</app-badge>

              <form
                class="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end"
                [formGroup]="inviteForm"
                (ngSubmit)="createInvite()"
              >
                <label>
                  Role
                  <select
                    class="w-full rounded-lg border border-line bg-panel px-3 py-2.5 font-medium text-ink"
                    formControlName="role"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label>
                  Email (optional)
                  <input type="email" formControlName="email" placeholder="person@example.com" />
                </label>
                <button uiBtn type="submit" [disabled]="creatingInvite()">
                  {{ creatingInvite() ? 'Creating…' : 'Create invite' }}
                </button>
              </form>

              @if (lastCreatedInvite(); as invite) {
                <div class="message success mt-3 flex flex-wrap items-center gap-2">
                  <span>Invite created. Share this link:</span>
                  <code class="break-all font-mono text-xs">{{ inviteLink(invite) }}</code>
                  <button uiBtn="secondary" type="button" (click)="copyLink(invite)">
                    {{ copiedInviteId() === invite.id ? 'Copied' : 'Copy link' }}
                  </button>
                </div>
              }

              @if (invites().length === 0) {
                <p class="mt-3 text-sm text-muted">No invitations yet. Create one to onboard teammates.</p>
              }

              <div class="mt-3 grid gap-2.5">
                @for (invite of invites(); track invite.id) {
                  <article
                    class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3"
                  >
                    <div class="grid gap-1.5">
                      <div class="flex flex-wrap gap-2">
                        <app-badge class="capitalize">{{ invite.role }}</app-badge>
                        <app-badge [tone]="invite.usedAt ? 'warn' : 'good'">
                          {{ invite.usedAt ? 'used' : 'pending' }}
                        </app-badge>
                      </div>
                      <p class="break-all text-xs text-muted">
                        {{ invite.email || 'Anyone with the link' }} · expires
                        {{ invite.expiresAt | date: 'mediumDate' }}
                      </p>
                    </div>
                    @if (!invite.usedAt) {
                      <button uiBtn="secondary" type="button" (click)="copyLink(invite)">
                        {{ copiedInviteId() === invite.id ? 'Copied' : 'Copy' }}
                      </button>
                    }
                  </article>
                }
              </div>
            </app-panel>
          </div>
        </section>
      }
    </div>
  `,
  styles: ``,
})
export class AdminSettingsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly organizationsService = inject(OrganizationsService);

  protected readonly users = signal<UserSummaryDto[]>([]);
  protected readonly invites = signal<OrganizationInviteDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly creatingInvite = signal(false);
  protected readonly error = signal('');
  protected readonly lastCreatedInvite = signal<OrganizationInviteDto | null>(null);
  protected readonly copiedInviteId = signal<string | null>(null);

  protected readonly inviteForm = this.fb.nonNullable.group({
    role: ['member' as Exclude<OrganizationRole, 'owner'>, [Validators.required]],
    email: [''],
  });

  protected readonly pendingInviteCount = computed(
    () => this.invites().filter((invite) => !invite.usedAt).length,
  );

  protected readonly organizationName = computed(
    () => this.auth.organization()?.name ?? 'your organization',
  );

  protected readonly privateUrl = computed(() => {
    const slug = this.auth.organization()?.slug ?? 'your-organization';
    return `${location.origin}/o/${slug}`;
  });

  constructor() {
    void this.load();
  }

  protected inviteLink(invite: OrganizationInviteDto): string {
    return `${location.origin}/login?invite=${invite.token}`;
  }

  protected async copyLink(invite: OrganizationInviteDto): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.inviteLink(invite));
      this.copiedInviteId.set(invite.id);
      setTimeout(() => this.copiedInviteId.set(null), 2000);
    } catch {
      this.error.set('Could not copy to clipboard. Copy the link manually.');
    }
  }

  protected async createInvite(): Promise<void> {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    this.creatingInvite.set(true);
    this.error.set('');
    try {
      const { role, email } = this.inviteForm.getRawValue();
      const invite = await this.organizationsService.createInvite({
        role,
        email: email.trim() || null,
      });
      this.lastCreatedInvite.set(invite);
      this.invites.update((current) => [invite, ...current]);
      this.inviteForm.reset({ role: 'member', email: '' });
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.creatingInvite.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [users, invites] = await Promise.all([
        this.usersService.list(),
        this.organizationsService.listInvites(),
      ]);
      this.users.set(users);
      this.invites.set(invites);
    } catch (error) {
      this.error.set(this.extractMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private extractMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const payload = (error as { error?: { message?: string } }).error;
      if (payload?.message) {
        return payload.message;
      }
    }

    return 'Request failed.';
  }
}

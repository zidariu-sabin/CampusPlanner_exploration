import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrganizationInviteDto, OrganizationRole, UserSummaryDto } from '@campus/contracts';

import { AuthService } from '../core/auth.service';
import { OrganizationsService } from '../core/organizations.service';
import { UsersService } from '../core/users.service';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="screen-shell">
      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading settings…</p>
      } @else {
        <section class="settings-layout">
          <aside class="settings-nav">
            <button class="active" type="button">Users and roles</button>
            <button type="button">Publishing</button>
            <button type="button">Domains</button>
            <button type="button">Branding</button>
            <button type="button">Audit log</button>
          </aside>

          <div class="side-stack">
            <section class="panel">
              <header class="panel-header">
                <div>
                  <h3>Users and access</h3>
                  <p>Role-based access for {{ organizationName() }}</p>
                </div>
                <span class="badge">{{ users().length }} users</span>
              </header>
              <div class="panel-body">
                <div class="table">
                  <div class="table-row table-head">
                    <span>User</span>
                    <span>Role</span>
                    <span>Status</span>
                  </div>
                  @for (user of users(); track user.id) {
                    <div class="table-row">
                      <div>
                        <strong>{{ user.displayName }}</strong>
                        <div class="muted user-email">{{ user.email }}</div>
                      </div>
                      <span>{{ user.role }}</span>
                      <span class="badge badge-good">Active</span>
                    </div>
                  }
                </div>

                <div class="domain-cards">
                  <article>
                    <strong>Private URL</strong>
                    <p>{{ privateUrl() }}</p>
                    <span class="badge badge-good">Published</span>
                  </article>
                  <article>
                    <strong>Custom domain</strong>
                    <p>Map your own domain (e.g. maps.your-university.edu) to this workspace.</p>
                    <span class="badge badge-warn">Not configured</span>
                  </article>
                </div>
              </div>
            </section>

            <section class="panel">
              <header class="panel-header">
                <div>
                  <h3>Invitations</h3>
                  <p>Onboard teammates with a shareable invite link</p>
                </div>
                <span class="badge">{{ pendingInviteCount() }} pending</span>
              </header>
              <div class="panel-body">
                <form class="invite-form" [formGroup]="inviteForm" (ngSubmit)="createInvite()">
                  <label>
                    Role
                    <select formControlName="role">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label>
                    Email (optional)
                    <input type="email" formControlName="email" placeholder="person@example.com" />
                  </label>
                  <button class="primary-action" type="submit" [disabled]="creatingInvite()">
                    {{ creatingInvite() ? 'Creating…' : 'Create invite' }}
                  </button>
                </form>

                @if (lastCreatedInvite(); as invite) {
                  <div class="message success invite-created">
                    <span>Invite created. Share this link:</span>
                    <code class="mono">{{ inviteLink(invite) }}</code>
                    <button type="button" class="secondary-action" (click)="copyLink(invite)">
                      {{ copiedInviteId() === invite.id ? 'Copied' : 'Copy link' }}
                    </button>
                  </div>
                }

                @if (invites().length === 0) {
                  <p class="muted">No invitations yet. Create one to onboard teammates.</p>
                }

                <div class="card-list">
                  @for (invite of invites(); track invite.id) {
                    <article class="compact-card invite-row">
                      <div>
                        <div class="status-row">
                          <span class="badge">{{ invite.role }}</span>
                          <span class="badge" [class.badge-good]="!invite.usedAt" [class.badge-warn]="!!invite.usedAt">
                            {{ invite.usedAt ? 'used' : 'pending' }}
                          </span>
                        </div>
                        <p class="muted invite-meta">
                          {{ invite.email || 'Anyone with the link' }} · expires
                          {{ invite.expiresAt | date: 'mediumDate' }}
                        </p>
                      </div>
                      @if (!invite.usedAt) {
                        <button type="button" class="secondary-action" (click)="copyLink(invite)">
                          {{ copiedInviteId() === invite.id ? 'Copied' : 'Copy' }}
                        </button>
                      }
                    </article>
                  }
                </div>
              </div>
            </section>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .user-email {
      font-size: 11px;
      margin-top: 2px;
    }

    .invite-form {
      display: grid;
      grid-template-columns: 120px 1fr auto;
      gap: 10px;
      align-items: end;
    }

    .invite-created {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .invite-created code,
    .invite-meta {
      font-size: 12px;
      word-break: break-all;
    }

    .invite-row {
      align-items: center;
    }

    @media (max-width: 900px) {
      .invite-form {
        grid-template-columns: 1fr;
      }
    }
  `,
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

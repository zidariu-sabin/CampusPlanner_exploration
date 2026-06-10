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
    <div class="page admin-settings">
      <section class="section-header">
        <div>
          <h1>Organization settings</h1>
          <p class="muted">Users, access, invitations and tenant publishing for {{ organizationName() }}.</p>
        </div>
      </section>

      @if (error()) {
        <p class="message error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading settings…</p>
      } @else {
        <section class="grid-2 settings-grid">
          <article class="card panel">
            <div class="section-header">
              <h2>Users &amp; access</h2>
              <span class="chip">{{ users().length }} users</span>
            </div>

            <table class="settings-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr>
                    <td>{{ user.displayName }}</td>
                    <td class="muted">{{ user.email }}</td>
                    <td>
                      <span class="badge" [class.owner]="user.role === 'owner'" [class.admin]="user.role === 'admin'">
                        {{ user.role }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </article>

          <article class="card panel">
            <div class="section-header">
              <h2>Invitations</h2>
              <span class="chip">{{ pendingInviteCount() }} pending</span>
            </div>

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
              <button type="submit" [disabled]="creatingInvite()">
                {{ creatingInvite() ? 'Creating…' : 'Create invite' }}
              </button>
            </form>

            @if (lastCreatedInvite(); as invite) {
              <div class="message success invite-created">
                <span>Invite created. Share this link:</span>
                <code class="mono">{{ inviteLink(invite) }}</code>
                <button type="button" class="ghost" (click)="copyLink(invite)">
                  {{ copiedInviteId() === invite.id ? 'Copied' : 'Copy link' }}
                </button>
              </div>
            }

            @if (invites().length === 0) {
              <p class="muted">No invitations yet. Create one to onboard teammates.</p>
            }

            <div class="invite-list">
              @for (invite of invites(); track invite.id) {
                <div class="invite-row">
                  <div class="invite-row-head">
                    <span class="badge" [class.admin]="invite.role === 'admin'">{{ invite.role }}</span>
                    <span class="badge" [class.success]="!invite.usedAt" [class.used]="!!invite.usedAt">
                      {{ invite.usedAt ? 'used' : 'pending' }}
                    </span>
                  </div>
                  <div class="muted">
                    {{ invite.email || 'Anyone with the link' }} · expires {{ invite.expiresAt | date: 'mediumDate' }}
                  </div>
                  @if (!invite.usedAt) {
                    <div class="invite-link">
                      <code class="mono">{{ inviteLink(invite) }}</code>
                      <button type="button" class="ghost" (click)="copyLink(invite)">
                        {{ copiedInviteId() === invite.id ? 'Copied' : 'Copy' }}
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </article>
        </section>

        <section class="grid-2 settings-grid">
          <article class="card panel">
            <div class="section-header">
              <h2>Private URL</h2>
              <span class="badge success">Published</span>
            </div>
            <p class="muted">Your team reaches the workspace through the private tenant URL.</p>
            <code class="mono url-box">{{ privateUrl() }}</code>
          </article>

          <article class="card panel">
            <div class="section-header">
              <h2>Custom domain</h2>
              <span class="badge used">Not configured</span>
            </div>
            <p class="muted">
              Map your own domain (for example maps.your-university.edu) to this workspace. Domain
              verification and DNS setup are not yet available — this feature is planned.
            </p>
          </article>
        </section>
      }
    </div>
  `,
  styles: `
    .admin-settings {
      display: grid;
      gap: 1.5rem;
    }

    .settings-grid {
      align-items: start;
    }

    .panel {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
      align-content: start;
    }

    .settings-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }

    .settings-table th {
      text-align: left;
      font-weight: 500;
      color: var(--ink-soft);
      padding: 0.4rem 0.6rem;
      border-bottom: 1px solid var(--line);
    }

    .settings-table td {
      padding: 0.6rem;
      border-bottom: 1px solid var(--line);
    }

    .invite-form {
      display: grid;
      grid-template-columns: 1fr 1.4fr auto;
      gap: 0.75rem;
      align-items: end;
    }

    .invite-list {
      display: grid;
      gap: 0.75rem;
    }

    .invite-row {
      display: grid;
      gap: 0.45rem;
      padding: 0.85rem 1rem;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.6);
    }

    .invite-row-head {
      display: flex;
      gap: 0.5rem;
    }

    .invite-link,
    .invite-created {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .invite-link code,
    .invite-created code,
    .url-box {
      font-size: 0.82rem;
      padding: 0.45rem 0.7rem;
      border-radius: 12px;
      background: rgba(31, 42, 51, 0.06);
      word-break: break-all;
    }

    .invite-link button,
    .invite-created button {
      padding: 0.45rem 0.9rem;
      font-size: 0.85rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: rgba(14, 116, 144, 0.1);
      color: var(--brand-strong);
    }

    .badge.owner {
      background: rgba(194, 65, 12, 0.12);
      color: var(--accent);
    }

    .badge.admin {
      background: rgba(37, 99, 235, 0.12);
      color: #1d4ed8;
    }

    .badge.success {
      background: rgba(21, 128, 61, 0.12);
      color: #166534;
    }

    .badge.used {
      background: rgba(31, 42, 51, 0.08);
      color: var(--ink-soft);
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

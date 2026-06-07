import React from 'react';
import { Badge, Panel, ScreenShell } from '../common/ui';
import { users } from '../data';

/*
## Admin Organization Settings
Tenant-level administration page.

Shows users, roles, access status, private URL, and custom domain state. The
mockup keeps settings navigation static, but the page establishes where access,
publishing, domain, branding, and audit controls should live.
*/
export function SettingsScreen() {
  return (
    <ScreenShell>
      <section className="settings-layout">
        <aside className="settings-nav">
          <button className="active" type="button">Users and roles</button>
          <button type="button">Publishing</button>
          <button type="button">Domains</button>
          <button type="button">Branding</button>
          <button type="button">Audit log</button>
        </aside>
        <Panel title="Users and Access" subtitle="Role-based access for private maps" action="Invite user">
          <div className="table">
            <div className="table-row table-head">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
            </div>
            {users.map((user) => (
              <div className="table-row" key={user.name}>
                <strong>{user.name}</strong>
                <span>{user.role}</span>
                <Badge tone={user.status === 'Active' ? 'good' : 'warn'}>{user.status}</Badge>
              </div>
            ))}
          </div>
          <div className="domain-cards">
            <article>
              <strong>Private URL</strong>
              <p>north-campus.campusplanner.local</p>
              <Badge tone="good">Published</Badge>
            </article>
            <article>
              <strong>Custom domain</strong>
              <p>maps.university.test</p>
              <Badge tone="warn">DNS verification needed</Badge>
            </article>
          </div>
        </Panel>
      </section>
    </ScreenShell>
  );
}

import React from 'react';
import { Badge, Metric, Panel, ScreenShell, Task } from '../common/ui';
import { campuses } from '../data';

/*
## Admin Dashboard
Operational landing page for tenant administrators.

Shows portfolio metrics, campus publication health, and attention tasks that
block publishing or tenant readiness. The primary user action in this mockup is
opening campus configuration through `onAddCampus`.
*/
export function AdminDashboardScreen({ onAddCampus }) {
  return (
    <ScreenShell>
      <section className="metrics-grid">
        <Metric label="Campuses" value="4" />
        <Metric label="Floor maps" value="28" />
        <Metric label="Bookings today" value="73" />
        <Metric label="Open issues" value="6" tone="warn" />
      </section>

      <section className="two-column">
        <Panel
          title="Campus Portfolio"
          subtitle="Operational status by site"
          action="Add campus"
          onAction={onAddCampus}
        >
          <div className="card-list">
            {campuses.map((campus) => (
              <article className="campus-card" key={campus.id}>
                <div>
                  <h3>{campus.name}</h3>
                  <p>{campus.buildings} buildings · {campus.floors} floors · {campus.rooms} rooms</p>
                </div>
                <div className="status-row">
                  <Badge tone={campus.status === 'Published' ? 'good' : 'warn'}>{campus.status}</Badge>
                  <Badge tone={campus.issues ? 'warn' : 'neutral'}>{campus.issues} issues</Badge>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Attention Queue" subtitle="Work that blocks publishing">
          <div className="task-list">
            <Task title="Review detected rooms in Science Hall" label="Import" />
            <Task title="Invite facilities editor" label="Users" />
            <Task title="Publish maps.university.test" label="Domain" />
            <Task title="Fix room outside footprint on Level 2" label="Geometry" urgent />
          </div>
        </Panel>
      </section>
    </ScreenShell>
  );
}

import React from 'react';
import { Badge, Metric, Panel, RouteStep, ScreenShell } from '../common/ui';
import { memberMeetings } from '../data';

export function MemberDashboardScreen({ onOpenBookingDetail, onOpenMap }) {
  return (
    <ScreenShell>
      <section className="metrics-grid">
        <Metric label="Today" value="3" />
        <Metric label="This week" value="9" />
        <Metric label="My bookings" value="4" />
        <Metric label="Next starts in" value="25m" tone="warn" />
      </section>

      <section className="two-column">
        <Panel title="My planned meetings" subtitle="What is planned and where to find it" action="Book a room">
          <div className="card-list">
            {memberMeetings.map((meeting) => (
              <button
                className="member-meeting-card"
                key={`${meeting.time}-${meeting.title}`}
                type="button"
                onClick={onOpenBookingDetail}
              >
                <div className={`meeting-time meeting-time-${meeting.tone}`}>{meeting.time}</div>
                <div>
                  <h3>{meeting.title}</h3>
                  <p>{meeting.location}</p>
                  <div className="status-row">
                    {meeting.details.split(' · ').map((detail) => (
                      <Badge key={detail}>{detail}</Badge>
                    ))}
                  </div>
                </div>
                <span className="secondary-action as-static-action">Details</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Next meeting route" subtitle="Engineering Building C203">
          <div className="route-steps">
            <RouteStep number="1">Enter Main Campus through North Gate.</RouteStep>
            <RouteStep number="2">Walk to Engineering Building, east entrance.</RouteStep>
            <RouteStep number="3">Take stairs or elevator to Level 2.</RouteStep>
            <RouteStep number="4">Room C203 is on the right side of Corridor C.</RouteStep>
          </div>
          <button className="primary-action" type="button" onClick={onOpenMap}>Open map view</button>
        </Panel>
      </section>
    </ScreenShell>
  );
}

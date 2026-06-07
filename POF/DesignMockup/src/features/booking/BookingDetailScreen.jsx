import React from 'react';
import { Badge, Panel, RouteStep, ScreenShell } from '../common/ui';
import { BookingMap } from './BookingMap';

export function BookingDetailScreen() {
  return (
    <ScreenShell>
      <section className="map-layout">
        <BookingMap />
        <Panel title="Licenta planning review" subtitle="Tuesday, June 9 · 11:00 - 12:00">
          <div className="booking-summary">
            <Badge tone="good">Confirmed</Badge>
            <Badge>Engineering C203</Badge>
            <Badge>Level 2</Badge>
          </div>
          <div className="booking-detail-card">
            <div><span>Room</span><strong>C203 Seminar</strong></div>
            <div><span>Floor</span><strong>Level 2, Corridor C</strong></div>
            <div><span>Organizer</span><strong>Ioana Marinescu</strong></div>
            <div><span>Guests</span><strong>Alice, Bob, Charlie</strong></div>
          </div>
          <div className="route-steps">
            <RouteStep number="1">Start from Engineering east entrance.</RouteStep>
            <RouteStep number="2">Go straight to Corridor C.</RouteStep>
            <RouteStep number="3">Turn right after the elevator lobby.</RouteStep>
            <RouteStep number="4">C203 is reserved until 12:00.</RouteStep>
          </div>
          <button className="primary-action" type="button">Start navigation</button>
        </Panel>
      </section>
    </ScreenShell>
  );
}

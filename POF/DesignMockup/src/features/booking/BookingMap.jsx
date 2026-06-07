import React from 'react';
import { Badge } from '../common/ui';

/*
## Booking Map
Small indoor route visualization used by Booking Detail.

Highlights the selected room and a mocked indoor route from an entry/current
position to the destination room. In the real implementation this should render
the same room/floor geometry used by the member map view.
*/
export function BookingMap() {
  return (
    <section className="map-panel">
      <svg viewBox="0 0 700 500" role="img" aria-label="Booking map">
        <path d="M90 100 H610 V395 H455 V445 H90 Z" className="floor-footprint" />
        <path d="M90 190 H610 M90 295 H610 M230 100 V445 M380 100 V395 M515 100 V395" className="floor-lines" />
        <rect x="392" y="112" width="110" height="66" className="room selected" />
        <path d="M145 345 H296 V320 H448 V178" className="route" />
        <circle cx="145" cy="345" r="10" className="location-dot" />
        <text x="447" y="151">C203</text>
      </svg>
      <div className="floating-toolbar">
        <Badge tone="good">4 min walk</Badge>
        <Badge>Level 2</Badge>
      </div>
    </section>
  );
}

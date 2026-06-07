import React from 'react';
import { Badge, Panel, ScreenShell } from '../common/ui';
import { bookingSlots, memberRooms } from '../data';

/*
## Room Booking
Shared admin/member page for organizing a meeting in an available room.

Users compare candidate rooms, review capacity/equipment/proximity, choose a
time slot, and confirm the booking. The mockup focuses on selection states and
booking context rather than persistence.
*/
export function RoomBookingScreen() {
  return (
    <ScreenShell>
      <section className="map-layout">
        <Panel title="Available rooms" subtitle="Tuesday, June 9 · 11:00 - 12:00">
          <div className="form-stack">
            <label>
              Meeting title
              <input defaultValue="Licenta planning review" />
            </label>
            <label>
              Participants
              <input defaultValue="Alice, Bob, Charlie" />
            </label>
            <div className="card-list">
              {memberRooms.map((room) => (
                <article className="member-room-card" key={room.name}>
                  <div>
                    <h3>{room.name}</h3>
                    <p>{room.location}</p>
                    <div className="status-row">
                      {room.details.map((detail, detailIndex) => (
                        <Badge key={detail} tone={detailIndex === 0 ? 'good' : 'neutral'}>{detail}</Badge>
                      ))}
                    </div>
                  </div>
                  <button className={room.selected ? 'primary-action' : 'secondary-action'} type="button">
                    {room.selected ? 'Selected' : 'Select'}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Book C203 Seminar Room" subtitle="Engineering Building · Level 2">
          <div className="booking-summary">
            <Badge tone="good">Available at 11:00</Badge>
            <Badge>8 seats</Badge>
            <Badge>Projector</Badge>
          </div>
          <div className="slot-grid">
            {bookingSlots.map((slot) => (
              <button key={slot.time} className={`slot ${slot.state}`} type="button">
                {slot.time}
              </button>
            ))}
          </div>
          <div className="booking-detail-card">
            <div><span>Room</span><strong>C203 Seminar</strong></div>
            <div><span>Floor</span><strong>Level 2, Corridor C</strong></div>
            <div><span>Organizer</span><strong>Ioana Marinescu</strong></div>
          </div>
          <button className="primary-action" type="button">Confirm booking</button>
        </Panel>
      </section>
    </ScreenShell>
  );
}

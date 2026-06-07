# Room Booking

## Component
- File: `src/features/booking/RoomBookingScreen.jsx`
- Export: `RoomBookingScreen`
- Shared by admin and member booking routes.
- Rendered from:
  - Admin: `activeScreen === "booking"`
  - Member: `activeScreen === "member-booking"`

## Purpose
The room booking page lets users organize a meeting in an available campus space. It focuses on room comparison, time slot selection, and booking confirmation.

## Primary Users
- Normal member creating a meeting
- Admin testing or managing booking behavior

## User Flow
1. User enters or reviews meeting title and participants.
2. User reviews recommended available rooms.
3. User selects a room.
4. User reviews available and busy time slots.
5. User confirms the booking.

## Visible Sections
- Available rooms panel.
- Room cards with location, availability, capacity, equipment, and walk distance.
- Booking panel for the selected room.
- Slot grid with free, busy, and selected states.
- Selected room summary.

## Interaction Contract
- Room cards are currently static in the mockup; selected state is represented visually.
- Time slots are static buttons in the mockup; busy and selected states are visual.
- Confirm booking is visible after selected room context is shown.

## Data Requirements
- Meeting title.
- Participants.
- Candidate rooms.
- Availability slots.
- Room capacity and equipment.
- Walking distance or route summary.

## Implementation Notes
- Real implementation should validate booking conflicts server-side.
- Slot availability must be fetched for selected room/date.
- Room recommendation should consider capacity, equipment, proximity, and permissions.
- Confirm booking should create both a booking record and participant invitations.

## Acceptance Criteria
- User can compare rooms.
- User can identify selected room.
- User can identify selected slot.
- Busy slots are visually unavailable.
- Confirm booking action is clear.

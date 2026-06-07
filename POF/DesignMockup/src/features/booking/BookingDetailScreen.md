# Booking Detail

## Component
- File: `src/features/booking/BookingDetailScreen.jsx`
- Export: `BookingDetailScreen`
- Map helper: `src/features/booking/BookingMap.jsx`
- Shared by admin and member booking detail routes.

## Purpose
Booking detail shows the confirmed meeting, its room location, participants, and route guidance. It is the destination after selecting a planned meeting from the member dashboard.

## Primary Users
- Normal member attending or organizing a meeting
- Admin reviewing a booking

## User Flow
1. User opens booking detail from dashboard, sidebar, or future booking confirmation.
2. User sees meeting title and scheduled time.
3. User reviews confirmed status and room metadata.
4. User reviews route instructions.
5. User starts navigation.

## Visible Sections
- Indoor route map.
- Booking summary panel.
- Confirmation badges.
- Room, floor, organizer, and guest rows.
- Step-by-step route instructions.
- Start navigation action.

## Interaction Contract
- Dashboard meeting rows navigate here.
- `Start navigation` is static in the mockup and should start live navigation in a full implementation.
- Booking map highlights the selected room and route.

## Data Requirements
- Booking ID.
- Meeting title and scheduled time.
- Confirmation status.
- Room ID, building, floor, and route geometry.
- Organizer and participants.

## Implementation Notes
- Real implementation should load booking by ID.
- Route should be generated from current or chosen start point to the room.
- If current location is unavailable, offer a start location selector.
- Booking detail should handle cancelled, changed, and expired states.

## Acceptance Criteria
- Confirmed status is visible.
- Location includes building, room, and floor.
- Route map and text directions agree.
- Start navigation action is prominent.

# Member Dashboard

## Component
- File: `src/features/member/DashboardScreen.jsx`
- Export: `MemberDashboardScreen`
- Rendered from: `FeatureRenderer` when `activeRole === "member"` and `activeScreen === "member-dashboard"`.

## Purpose
The member dashboard is the normal user's landing page. It answers the user's most immediate questions: what meetings are planned, where they happen, and how to get to the next one.

## Primary Users
- Normal member
- Student, teacher, staff, or guest with booking/map access only

## User Flow
1. User opens the member view.
2. User sees meeting metrics and next meeting countdown.
3. User reviews planned meetings with time, title, and location.
4. User clicks a meeting row to open booking detail.
5. User clicks `Open map view` to inspect the campus map and route context.

## Visible Sections
- Metrics grid: today, this week, my bookings, next starts in.
- My planned meetings list.
- Next meeting route card.

## Interaction Contract
- `onOpenBookingDetail` opens the booking detail page.
- `onOpenMap` opens the member map view.
- Meeting cards must behave like buttons, not static cards.

## Data Requirements
- Meeting time.
- Meeting title.
- Building/room location.
- Floor and room capacity details.
- Booking ownership or invite status.

## Implementation Notes
- In a real implementation, meeting rows should link to unique booking IDs.
- Route preview should use current user location only when permission is granted.
- Meeting list should support empty state and conflict state.

## Acceptance Criteria
- User can identify next meeting location without searching.
- Meeting click opens booking detail.
- Open map view opens the map page.
- Booking ownership/invitation state is visible.

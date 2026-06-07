# Admin Dashboard

## Component
- File: `src/features/admin/DashboardScreen.jsx`
- Export: `AdminDashboardScreen`
- Rendered from: `FeatureRenderer` when `activeRole === "admin"` and `activeScreen === "dashboard"`.

## Purpose
The admin dashboard is the operational landing page for tenant administrators. It summarizes campus portfolio health, floor map coverage, booking activity, and administrative work that blocks publishing or tenant readiness.

## Primary Users
- Tenant admin
- Facilities manager
- Campus map editor with operational responsibilities

## User Flow
1. Admin opens the dashboard after entering the admin view.
2. Admin scans top-level metrics: campuses, floor maps, bookings today, open issues.
3. Admin reviews campus portfolio cards to understand which campuses are published or in draft.
4. Admin reviews attention queue tasks.
5. Admin can click `Add campus` to continue into campus configuration.

## Visible Sections
- Metrics grid: portfolio totals and issue count.
- Campus Portfolio panel: campus cards with buildings, floors, rooms, publication state, and issue count.
- Attention Queue panel: prioritized admin tasks.

## Interaction Contract
- `onAddCampus` callback moves the mockup to the `Campus Configuration` feature.
- Campus cards are currently static but should become selectable in a full implementation.
- Attention queue rows are static in the mockup but should eventually link to issue-specific workflows.

## Data Requirements
- Campus count, building count, floor count, room count.
- Campus publication status.
- Campus issue count.
- Attention queue task list.

## Implementation Notes
- Real data should be tenant-scoped.
- Metrics should be loaded from aggregate endpoints, not computed client-side from paginated campus lists.
- Issue severity should drive ordering in the attention queue.

## Acceptance Criteria
- Admin can identify portfolio state without opening another page.
- Published and draft states are visually distinct.
- Open issues are visible in both summary and campus-level context.
- `Add campus` routes to the campus configuration page.

# Campus Planner Redesign Mockup Series

This mockup series is meant to guide redesign iterations before changing the Angular app. It uses the business target from `Implementation/docs/business-project-description.md`: a private, multi-tenant indoor maps platform with campus context, floor-plan import, indoor search, booking, administration, and private publishing.

## Product Frame

Campus Planner should feel like an operational mapping tool, not a marketing site. The main experience is a map-first workspace where users can find places, book rooms, and where administrators can maintain campus, building, floor, room, and tenant configuration.

## Design Principles

- Map first: every workflow should keep spatial context visible when possible.
- Clear mode separation: viewer, booking, editor, and admin settings should have distinct visual states.
- Tenant aware: organization identity, publishing state, and access level should be visible without crowding the map.
- Fast operational UI: dense controls, strong hierarchy, low decoration, readable tables and panels.
- Progressive editor complexity: start from import/trace/review, then expose polygon editing and validation only when needed.

## Mockup Screens

### 01 Organization Dashboard

Purpose: validate the home surface for a tenant administrator.

Key elements:
- Tenant switcher or tenant identity.
- Campus cards with health/status indicators.
- Quick actions for adding campus, importing a floor plan, inviting users, and publishing maps.
- Recent changes and pending validation issues.

Questions to answer:
- Can an admin understand what needs attention in under 10 seconds?
- Is the dashboard useful once there are many campuses/buildings?
- Which metrics matter: published maps, unresolved import issues, room count, bookings today, or active users?

### 02 Campus And Building Configuration

Purpose: validate outdoor campus context and building hierarchy.

Key elements:
- Outdoor campus map.
- Building/configurable-space list.
- Boundary drawing/editing controls.
- Building details panel with floors and bookable outdoor spaces.

Questions to answer:
- Should campus boundary editing be a primary mode or a settings detail?
- How much Mapbox/Google context should remain visible while editing places?
- Are outdoor bookable spaces first-class enough, or should they stay secondary?

### 03 Floor Import Pipeline

Purpose: validate the workflow for turning customer assets into an editable floor map.

Key elements:
- Step view for the import workflow.
- Upload/drop zone for image-based floor plans.
- Image controls for scale, rotation, and placement on top of the building footprint.
- Configure step for defining rooms on top of the aligned floor plan.
- Review/publish status for validation issues before the map becomes usable.

Questions to answer:
- Is upload and image alignment clear enough as one step?
- What controls are required for image placement: scale, rotate, opacity, crop, or reset?
- Should room configuration happen in the same import flow or open a dedicated editor later?

### 04 Room Booking

Purpose: validate the room scheduling flow connected to maps.

Key elements:
- Selected room details and map context.
- Date/time availability grid.
- Capacity, equipment, access rules, and conflicts.
- Participant search.
- Confirmation summary.

Questions to answer:
- Is the time-slot-first flow faster than a form-first flow?
- What meeting metadata is required at booking time?
- How much conflict detail should users see?

### 05 Admin Settings

Purpose: validate tenant administration beyond map editing.

Key elements:
- Role-based access control.
- Users and invitations.
- Domain/private URL publishing.
- Branding and visibility settings.
- Audit/change log.

Questions to answer:
- Which settings belong to tenant admins versus platform owners?
- Should domain publishing be a guided checklist?
- What audit events are important for map ownership and compliance?

## Iteration Method

1. Start with the static board in `Docs/RedesignMockupBoard.html`.
2. Review one workflow at a time, not the entire product at once.
3. For each screen, capture decisions as:
   - keep
   - change
   - unresolved
4. Convert stable screens into Angular components only after the workflow has survived at least one review pass.

## Recommended Implementation Slices

1. Replace visual shell and dashboard hierarchy.
2. Redesign campus/building configuration around a map-first layout.
3. Add the floor import step view with image upload, scale, rotate, and room definition.
4. Redesign booking as a room-context flow.
5. Add tenant settings and domain management.

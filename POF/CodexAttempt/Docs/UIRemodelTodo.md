# UI Remodel Todo

Based on:
- [MockupDesignSpec.md](./MockupDesignSpec.md)
- [MockupDesignSpec.html](./MockupDesignSpec.html)
- [MockupDesignSpecV2.html](./MockupDesignSpecV2.html)

Precedence:
- V2 mockup is latest target.
- If V1 spec and V2 mockup conflict, follow V2.

## Current State Analysis

## Big mismatch

Current Angular app still structured like separate desktop pages.

- V2 wants one handset-style shell with top header and role toggle.
- Current app uses routed pages with desktop header/nav.
- V2 wants same map viewport reused in `user` and `admin` modes.
- Current app splits booking and editing into different routes and layouts.
- V2 wants one shared bottom sheet with contextual content.
- Current app uses separate page-level forms, not contextual overlays.
- V2 wants canvas-like direct manipulation of rooms in admin mode.
- Current app admin editor exists, but feels like full CRUD page, not lightweight harness UI.
- V2 wants admin toolbar inside same shell with `Add Room` and `Save GeoJSON`.
- Current app admin actions live in dedicated editor page.
- V2 wants toast feedback, participant multiselect, time-slot-first booking flow.
- Current app uses larger forms and checklist-style participants list.
- V2 uses slate base UI with amber accents only for admin editing state.
- Current app uses warm gradients and generic card/page styling.

## File-level findings

- [app-shell.component.ts](../Implementation/apps/web/src/app/layout/app-shell.component.ts)
  Wrong shell model. Desktop header/nav instead of handset harness.
- [app.routes.ts](../Implementation/apps/web/src/app/app.routes.ts)
  Current routes split flows that V2 keeps inside one viewport.
- [dashboard-page.component.ts](../Implementation/apps/web/src/app/pages/dashboard-page.component.ts)
  Dashboard-first entry does not exist in V2 harness.
- [map-booking-page.component.ts](../Implementation/apps/web/src/app/pages/map-booking-page.component.ts)
  Useful SVG + meetings logic, but UX far from V2 sheet-based booking.
- [map-editor-page.component.ts](../Implementation/apps/web/src/app/pages/map-editor-page.component.ts)
  Useful geometry logic, but wrong presentation and interaction model for V2 harness.
- [styles.css](../Implementation/apps/web/src/styles.css)
  Global visual language conflicts with V2.
- [package.json](../Implementation/apps/web/package.json)
  No Tailwind or icon package yet.

## What already reusable

- [auth-page.component.ts](../Implementation/apps/web/src/app/pages/auth-page.component.ts), guards, auth service can stay with visual changes.
- `MapsService`, `MeetingsService`, `UsersService` can stay as data layer.
- SVG/geometry helpers from booking/editor pages can be reused in new viewport component.
- Current room editing constraints already point toward V2 admin behavior.
- Current booking API can support V2 booking flow after UI reshape.

## Target V2 Direction

## App model

Build one primary authenticated harness shell:

- handset-style viewport
- top header
- role toggle: `User | Admin`
- single map viewport
- admin toolbar shown only in admin mode
- one shared bottom sheet
- one toast layer

Keep login separate. Keep backend/API contracts if possible.

## Core V2 behaviors

- User mode:
  - tap room
  - open bottom sheet
  - pick 1-hour slot
  - reveal booking form
  - enter title, description, participants
  - confirm booking
- Admin mode:
  - toggle into admin
  - show admin toolbar
  - tap room to edit
  - drag room
  - resize via four corner handles
  - reject invalid geometry outside footprint
  - rename room
  - delete room
  - add room
  - save map as GeoJSON payload

## Recommended component tree

- `HarnessShellComponent`
- `HarnessHeaderComponent`
- `RoleToggleComponent`
- `AdminToolbarComponent`
- `MapViewportComponent`
- `RoomSheetComponent`
- `UserBookingFlowComponent`
- `AdminRoomEditFlowComponent`
- `ToastLayerComponent`
- `HarnessStateService`

## Recommended shared state

```ts
mode = signal<'user' | 'admin'>('user');
selectedRoomId = signal<string | null>(null);
selectedTimeSlot = signal<string | null>(null);
toastMessage = signal<string | null>(null);

interaction = signal<
  'dragging_room' |
  'resizing_tl' |
  'resizing_tr' |
  'resizing_bl' |
  'resizing_br' |
  null
>(null);

rooms = signal<RoomRectViewModel[]>([]);
meetings = signal<MeetingViewModel[]>([]);
footprint = signal<PointViewModel[]>([]);

selectedRoom = computed(() => rooms().find((room) => room.id === selectedRoomId()) ?? null);
isAdmin = computed(() => mode() === 'admin');
showAdminToolbar = computed(() => isAdmin());
showRoomSheet = computed(() => !!selectedRoom());
showUserBookingFlow = computed(() => !!selectedRoom() && mode() === 'user');
showAdminEditFlow = computed(() => !!selectedRoom() && mode() === 'admin');
```

## Todo

## Phase 1: Foundation

- [  ] Add Tailwind to Angular app.
- [  ] Add `lucide-angular` if icons needed during implementation.
- [x] Replace current warm global theme with V2 slate design tokens.
- [x] Add handset viewport rules.
- [x] Add `max-width` mobile shell on desktop.
- [x] Add full-width mobile behavior.
- [x] Add `overscroll-behavior-y: none`.
- [x] Add rounded device-shell chrome matching V2.
- [x] Keep typography close to V2 heavy bold hierarchy.

## Phase 2: Routing And Shell

- [x] Replace dashboard-first authenticated entry with V2 harness shell.
- [x] Keep `/login`.
- [x] Keep one main authenticated route for harness UI.
- [x] Decide if admin uses same route with mode toggle or guarded deep-link helper.
- [x] Build `HarnessShellComponent`.
- [x] Build top header with app title and small subtitle.
- [x] Build `User | Admin` segmented role toggle in header.
- [x] Remove old desktop nav from primary authenticated flow.

## Phase 3: Shared State And View Models

- [x] Create `HarnessStateService`.
- [x] Move selection state into shared signals.
- [x] Move booking sheet state into shared signals.
- [x] Move admin interaction state into shared signals.
- [x] Add room rectangle view model for harness rendering.
- [x] Add adapters between existing GeoJSON room data and V2 rect interaction model.
- [x] Add toast state handling.

## Phase 4: Map Viewport

- [x] Build `MapViewportComponent` as main surface.
- [x] Render footprint boundary.
- [x] Render room rectangles inside footprint.
- [x] Add patterned/background-image layer behind map.
- [x] Add room labels centered in shapes.
- [x] Highlight selected room.
- [x] Add canvas/SVG pointer interaction layer.
- [x] Support touch and mouse input.

## Phase 5: User Booking Flow

- [x] Build shared room sheet container.
- [x] Add user-mode room summary header.
- [x] Build 1-hour time slot grid.
- [x] Disable already booked slots.
- [x] Reveal booking details form only after slot selection.
- [x] Add meeting title field.
- [x] Add description field.
- [x] Add participants multi-select dropdown.
- [x] Add confirm booking action.
- [x] Reset booking form state after success.
- [x] Show success toast after booking.

## Phase 6: Admin Edit Flow

- [x] Build admin-mode room edit content inside same sheet.
- [x] Add editor warning/info banner.
- [x] Add room name edit field.
- [x] Add update attributes action.
- [x] Add delete room action.
- [x] Keep user flow hidden while admin edit flow active.
- [x] Keep admin edit flow hidden while user flow active.

## Phase 7: Admin Toolbar And Geometry Actions

- [x] Build admin toolbar visible only in admin mode.
- [x] Add `Add Room` action.
- [x] Add `Save GeoJSON` action.
- [x] Add new room with sensible default rect.
- [x] Auto-select new room after create.
- [x] Open sheet for new room after create.
- [x] Validate all rooms before save.
- [x] Convert edited rooms to GeoJSON payload.
- [x] Wire save action to backend or temporary console/export path.
- [x] Show error toast if invalid rooms exist.
- [x] Show success toast on save.

## Phase 8: Drag/Resize Interaction

- [x] Add room drag interaction in admin mode.
- [x] Add four corner resize handles for selected room.
- [x] Add top-left resize.
- [x] Add top-right resize.
- [x] Add bottom-left resize.
- [x] Add bottom-right resize.
- [x] Enforce minimum room size.
- [x] Revert room to original rect after invalid drop.
- [x] Show invalid styling for out-of-bounds room.
- [x] Show toast when room leaves footprint bounds.

## Phase 9: Geometry Validation

- [x] Implement point-in-polygon validation for room corners.
- [x] Validate all four rectangle corners against footprint.
- [x] Surface validity in admin sheet header or helper text.
- [x] Prevent save when any room invalid.
- [x] Keep selected invalid room visually obvious.

## Phase 10: UX Polish

- [x] Add bottom sheet slide-up / slide-down transitions.
- [x] Add toast fade in/out behavior.
- [x] Match V2 spacing, borders, and rounded corners.
- [x] Use slate for base states.
- [x] Use amber only for admin editing emphasis.
- [x] Keep text hierarchy close to V2.
- [x] Keep viewport clutter low.
- [x] Make sheet scrollable while header stays readable.

## Phase 11: Data Wiring

- [x] Wire existing map data into harness footprint + rooms.
- [x] Wire existing meetings data into booked-slot detection.
- [x] Map existing participant/user data into multi-select options.
- [x] Decide persistence strategy for rectangle edits vs existing polygon storage.
- [x] If needed, convert edited rects back into polygon GeoJSON for API compatibility.
- [x] Keep existing editor route temporarily only if needed during migration.

## Phase 12: Cleanup

- [x] Remove obsolete dashboard-first primary flow.
- [  ] Remove duplicated old page CSS after harness replacement.
- [  ] Remove dead UI parts that conflict with V2 shell.
- [x] Keep only migration-safe fallback routes.
- [x] Update todo checkboxes as implementation progresses.

## Acceptance Checklist

- [x] Authenticated user lands in handset-style V2 harness, not desktop dashboard.
- [x] Header shows title and `User | Admin` toggle.
- [x] Toggling mode changes visible controls without route jump.
- [x] Map viewport stays central in both modes.
- [x] Selecting room opens bottom sheet.
- [x] User mode shows booking flow.
- [x] Booking details form appears only after slot choice.
- [x] Booked slots are disabled.
- [x] Participants are selectable through dropdown-style control.
- [x] Booking confirmation creates meeting and resets form.
- [x] Admin mode shows toolbar.
- [x] Admin can add room.
- [x] Admin can drag room.
- [x] Admin can resize room from all four corners.
- [x] Invalid geometry is visually marked.
- [x] Invalid room drop reverts.
- [x] Admin can rename room.
- [x] Admin can delete room.
- [x] Admin can save valid GeoJSON payload.
- [x] Toast feedback appears for key actions.
- [x] Visual language matches V2 much more than current implementation.

## Suggested Build Order

- [  ] Tailwind + global slate reset.
- [x] New harness shell + header + role toggle.
- [x] Shared state service.
- [x] Map viewport rendering.
- [x] Shared room sheet.
- [x] User booking flow.
- [x] Admin toolbar + admin edit flow.
- [x] Drag/resize interactions.
- [x] GeoJSON save wiring.
- [  ] Cleanup old primary flow.

## Notes / Constraints

- V2 mockup is imperative HTML/JS. Angular port should copy behavior, not implementation style.
- V2 is not same product shape as original bottom-nav navigator concept. Todo now optimized for V2 parity first.
- Current backend stores polygons. V2 admin interaction uses axis-aligned rectangles. Adapter layer likely needed.
- If role-based security matters, UI role toggle must still respect actual auth permissions on real save/edit actions.

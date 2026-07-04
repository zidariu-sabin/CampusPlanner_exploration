# Organization-Scoped Architecture — Entity Changes

This document records the database-scope entity changes that move Campus Planner from the
standalone `maps -> rooms -> meetings` schema to the organization-scoped campus hierarchy
described in `Implementation/docs/project-description.md` and
`Implementation/docs/business-project-description.md`.

Status: implemented (fresh-start migration `1730000000000-organization-scoped-schema.ts`).

## Entity Model

```text
Organization
  Users (role: owner | admin | member)
  OrganizationInvites
  Campuses (timezone, optional boundary GeoJSON)
    CampusPlaces ("configurable spaces": building, sports_field, tennis_court, parking, outdoor_area, other)
      Building (1:1 extension of CampusPlace(type = 'building'))
        FloorMaps (floor label, footprint GeoJSON, background image)
          Rooms (polygon GeoJSON)
  BookableResources (kind: room | campus_place)
  Meetings (point to bookableResourceId, not roomId)
    MeetingParticipants
```

## Tables

| Table | Purpose | Key columns / constraints |
| --- | --- | --- |
| `organizations` | Tenant boundary | `slug` unique (private tenant URL) |
| `users` | Login + membership | `organization_id` FK, `role` (`owner`/`admin`/`member`), unique email |
| `organization_invites` | Invite-link onboarding | unique `token`, `role`, optional `email`, `expires_at`, `used_at` |
| `campuses` | Top-level spatial container | `organization_id` FK, `timezone`, nullable `boundary_geojson` JSONB |
| `campus_places` | Configurable spaces drawn on Mapbox | `campus_id` FK, `type`, `bookable`, `footprint_geojson` JSONB |
| `buildings` | Building extension of a place | `campus_place_id` unique FK |
| `floor_maps` | Indoor floor maps (was `maps`) | `building_id` FK; no own timezone (derived from campus); `parent_map_id` removed |
| `rooms` | Bookable indoor polygons | `floor_map_id` FK (was `map_id`) |
| `bookable_resources` | Generic booking target | `room_id` XOR `campus_place_id` (CHECK), `organization_id` FK |
| `meetings` | One-hour bookings | `bookable_resource_id` FK; `EXCLUDE USING gist` no-overlap on `(bookable_resource_id, tstzrange)` |
| `meeting_participants` | M:N meetings/users | composite PK |

## Rules Implemented

- Registration creates an organization and makes the registering user `owner`;
  joining happens only through invite tokens (`POST /auth/register/invite`).
- Every query is scoped by `request.user.organizationId`; client-provided organization
  ids are never trusted. Nested lookups verify ownership through the campus chain.
- Space footprints are validated against the campus boundary (when one is set).
- Room geometry is validated against the parent floor-map footprint.
- Rooms automatically receive a `bookable_resources` row (kind `room`); non-building
  places with `bookable = true` receive one with kind `campus_place`.
- Meeting times convert local date/hour using the owning campus timezone; the `[)`
  range exclusion constraint prevents double-booking per resource.
- Owners/admins manage campuses, spaces, floors, rooms, and invites; members view,
  book, and manage their own meetings.

## Migration Note (fresh start)

The migration is a fresh-start schema change: previous `maps/rooms/meetings` data is not
preserved. Reset local databases before running:

```bash
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d
npm run dev
```

## API Surface

`/auth` (register, register/invite, login, me), `/users`, `/organizations/me`,
`/organizations/invites`, `/campuses` (+ `/:campusId/places`), `/buildings/:buildingId/floors`,
`/floor-maps` (update, background image upload/process, room replacement),
`/bookable-resources`, `/meetings` (by resource+date, `/mine`, by id, CRUD).

## Frontend Product Areas (aligned to `POF/DesignMockup`)

- Admin: dashboard (metrics, campus portfolio, attention queue), campus configuration
  (bounds + configurable spaces), space configuration (floor import pipeline), settings
  (users, invites, private URL, domains).
- Member: dashboard (my meetings, next-meeting countdown), layered map view
  (campus → space → floor → rooms), room booking (resource cards + slot grid),
  booking detail (summary, map context, route placeholder).

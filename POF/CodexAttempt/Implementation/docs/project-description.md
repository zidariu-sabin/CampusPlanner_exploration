# Campus Planner Project Description

Campus Planner is a TypeScript monorepo for managing organization-owned campus spaces, drawing real-world map footprints, configuring indoor floor maps, defining bookable rooms, and scheduling meetings. The architecture is centered on a tenant-style organization scope, a campus hierarchy, and a shared GeoJSON coordinate model.

## Application Architecture

The repository is split into npm workspaces:

- `apps/web`: Angular frontend using standalone components, Angular Router, Angular forms, HttpClient services, Mapbox GL JS, Mapbox Draw, and shared contracts from `@campus/contracts`.
- `apps/api`: Express API written in TypeScript. It uses TypeORM for PostgreSQL persistence, Zod for request validation, JWT authentication, bcrypt password hashing, Multer for background image uploads, Sharp for image processing, and Luxon for timezone-aware meeting windows.
- `packages/contracts`: Shared TypeScript package used by web and API. It defines DTOs, GeoJSON polygon types, editor models, booking request types, and geometry/projection helpers.
- `infra`: Local infrastructure, currently a Docker Compose PostgreSQL service.
- `apps/storage/uploads`: Default runtime storage location for uploaded floor-plan/background images.

Root scripts:

- `npm run dev`: starts the API watcher and Angular development server.
- `npm run build`: builds contracts, API, and web.
- `npm run test`: runs contracts and API tests.

## Domain Architecture

The intended domain model is:

```text
Organization
  Users / Organization Roles
  Campuses
    Configurable Spaces
      Buildings
        FloorMaps
          Rooms
  BookableResources
  Meetings
```

The currently implemented campus hierarchy uses the backend term `CampusPlace`. In the frontend, this should be presented as `Configurable Space`, because it may represent a building, sports field, tennis court, parking area, outdoor area, or another mappable space.

### Organization Scope

Organization scope is the tenant boundary for the application.

Planned rules:

- Each user belongs to exactly one organization.
- Users can only see and manage data from their organization.
- There is no platform-level superadmin in the planned v1 organization model.
- Registration creates a new organization and makes the registering user the organization `owner`.
- Existing organizations add users through invite links.
- Meeting participants are limited to users in the same organization.

Organization roles:

- `owner`: full organization control, including invites and management actions.
- `admin`: manages campuses, configurable spaces, buildings, floor maps, rooms, resources, and bookings.
- `member`: views organization resources, creates bookings, and manages their own meetings.

All organization members can view and book all organization resources in v1. Fine-grained campus/resource assignment is intentionally deferred.

### Campus

`Campus` is the top-level spatial container inside an organization.

Responsibilities:

- Stores the campus name and timezone.
- Stores an optional campus boundary GeoJSON polygon.
- Owns all configurable spaces under that campus.
- Provides the timezone used by resources and meetings under the campus.

Frontend flow:

- The dashboard starts from campuses.
- Opening a campus shows an intermediate choice:
  - Configure campus bounds.
  - Create configurable space.
- Campus bounds are configured before drawing spaces.

### Configurable Space / CampusPlace

`CampusPlace` is the backend model for a frontend `Configurable Space`.

Responsibilities:

- Represents a real-world object drawn on Mapbox.
- Stores name, type, footprint GeoJSON, and bookable flag.
- Belongs to one campus.
- Can be directly bookable when it is not a building.

Supported types:

- `building`
- `sports_field`
- `tennis_court`
- `parking`
- `outdoor_area`
- `other`

Important decision:

- Outdoor spaces should not require fake buildings, floors, or rooms.
- A football field or tennis court can be a directly bookable configurable space.
- A building configurable space branches into building/floor/room configuration.

### Building

`Building` is a one-to-one extension of `CampusPlace(type = 'building')`.

Responsibilities:

- Exists only for configurable spaces of type `building`.
- Owns one or more floor maps.
- Reuses the building configurable space footprint as the real-world building placement.

### FloorMap

`FloorMap` represents an indoor floor-level map inside a building.

Responsibilities:

- Belongs to one building.
- Stores floor name, floor label, footprint GeoJSON, optional background image URL, and background fit mode.
- Owns room polygons.
- Reuses the existing SVG/canvas floor-plan editing workflow.

The old frontend aliases `MapDto` and `MapSummaryDto` may still exist as compatibility names, but conceptually these are floor maps.

### Room

`Room` is a bookable indoor polygon on a floor map.

Responsibilities:

- Belongs to one floor map.
- Stores name, color, sort order, and GeoJSON polygon geometry.
- Has a generated `BookableResource`.

Room geometry is validated against the parent floor map footprint before persistence.

### BookableResource

`BookableResource` is the generic booking target.

It can represent:

- A room.
- A directly bookable configurable space.

Meetings point to `bookableResourceId`, not directly to room ids. This keeps booking consistent across indoor rooms and outdoor spaces.

### Meeting

`Meeting` represents a one-hour booking.

Responsibilities:

- Points to a `BookableResource`.
- Stores creator, participants, title, description, and UTC start/end timestamps.
- Uses the owning campus timezone to convert local date/hour inputs to UTC.
- Prevents overlapping bookings for the same resource.

## Backend Architecture

The API exposes authenticated REST endpoints grouped by resource.

Current/planned endpoint groups:

- `/auth`: registration, login, and current user.
- `/users`: organization-scoped user list.
- `/organizations/me`: current organization summary.
- `/organizations/invites`: invite creation/listing for owner/admin users.
- `/campuses`: campus CRUD within the current organization.
- `/campuses/:campusId/places`: configurable space management.
- `/buildings/:buildingId/floors`: floor map creation for building spaces.
- `/floor-maps`: floor map loading, update, background image upload/processing, and room replacement.
- `/bookable-resources`: generic booking resource lookup.
- `/meetings`: meeting creation, update, deletion, and listing by bookable resource/date.

`server.ts` starts the Express application. `app.ts` wires middleware, routes, uploaded static files, and centralized error handling. TypeORM is configured in `apps/api/src/data-source.ts` with `synchronize: false`, so schema changes are controlled through migrations.

Request payloads are validated with Zod at the route boundary. Geometry-specific normalization is handled by `ensurePolygon` and shared helpers from `@campus/contracts`.

## Database Architecture

PostgreSQL stores application state. The schema uses JSONB for GeoJSON geometry and regular relational constraints for hierarchy and booking integrity.

Important tables:

- `organizations`: tenant/workspace container.
- `users`: login/profile data, organization membership, and organization role.
- `organization_invites`: invite tokens for joining an existing organization.
- `campuses`: organization-owned campus containers with optional boundary GeoJSON.
- `campus_places`: configurable spaces within a campus.
- `buildings`: one-to-one extension of building-type configurable spaces.
- `floor_maps`: indoor floor-level maps under buildings.
- `rooms`: indoor room polygons under floor maps.
- `bookable_resources`: generic booking targets for rooms and directly bookable spaces.
- `meetings`: bookings for bookable resources.
- `meeting_participants`: many-to-many join table between meetings and users.

Fresh-start migration note:

- The campus hierarchy migration was treated as a fresh-start schema change.
- Existing old `maps -> rooms -> meetings` data is not preserved by the migration plan.
- Local development databases that already recorded old migrations must be reset before the new schema can run.

Local reset command:

```bash
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d
npm run dev
```

`npm run build` only compiles code. It does not run migrations or update PostgreSQL.

## Coordinate System

The application stores map geometry as GeoJSON `Polygon` objects in EPSG:4326 longitude/latitude coordinates.

Canonical coordinate rule:

```text
[longitude, latitude]
```

This applies to:

- Campus boundary polygons.
- Configurable space footprints.
- Building/floor map footprints.
- Room polygons.

The app does not store local pixel coordinates as the source of truth. Local/pixel-like coordinates are only derived for SVG/canvas rendering.

### Mapbox Layer

Mapbox is the geographic/world-coordinate layer.

Responsibilities:

- Display real-world context with satellite or streets styles.
- Draw and edit campus boundaries.
- Draw and edit configurable space footprints.
- Preview floor map footprints in geographic context.
- Show optional floor-plan image overlays where useful.
- Show view-only room polygons in booking/map preview views.

Mapbox consumes saved GeoJSON directly, because Mapbox also uses longitude/latitude GeoJSON.

Supported frontend Mapbox controls:

- Style selector: satellite or streets.
- Floor-plan overlay toggle.
- Footprint draw/edit tools through Mapbox Draw.

Controls intentionally not included in the current pass:

- Extra terrain/building/outdoor style toggles with unclear value.
- Full floor-plan alignment tooling on Mapbox.
- Room drawing as the primary Mapbox interaction.

### SVG/Canvas Layer

The SVG/canvas editor is the precision indoor editor.

Responsibilities:

- Render floor map footprint.
- Render and align the uploaded floor-plan/background image.
- Draw, drag, resize, and edit rooms.
- Export SVG.

The SVG/canvas layer uses Web Mercator projection helpers:

```text
GeoJSON lon/lat -> projected canvas coordinates -> edit/render -> unproject -> GeoJSON lon/lat
```

This allows the editor to work with visually stable planar coordinates while preserving geographic GeoJSON as the persisted format.

### Background Images

Background images are visual references, not geometry sources of truth.

Current behavior:

- Images are associated with floor maps.
- The image is placed under the projected floor map footprint.
- Rotate, scale, offset, and crop edits are represented through background image edit drafts and processing requests.
- Saved geometry remains GeoJSON regardless of image manipulation.

### Geometry Helpers

Geometry logic lives in `@campus/contracts` so the web app and API share the same rules.

Important helpers:

- `closeRing`: ensures a polygon ring ends where it starts.
- `createPolygon`: creates a valid single-ring polygon.
- `createRectanglePolygon`: creates a polygon from rectangle bounds.
- `projectGeoJsonPosition`: projects lon/lat to Web Mercator canvas coordinates.
- `unprojectGeoJsonPosition`: converts projected coordinates back to lon/lat.
- `projectGeoJsonPolygon`: projects a polygon for rendering/editing.
- `unprojectGeoJsonPolygon`: converts projected polygon edits back to persisted GeoJSON.
- `getProjectedBoundingBox`: gets projected bounds for viewBox/image placement.
- `projectedPolygonToPointsAttribute`: creates SVG points from projected GeoJSON.
- `polygonContainsPolygon`: validates containment, such as rooms inside floor map footprints.
- `roomModelToPolygon` and `polygonToRoomModel`: bridge editor room models and persisted room geometry.

## Data Flows

### Organization Onboarding

New organization:

1. User registers with organization name.
2. API creates organization.
3. API creates user as organization `owner`.
4. JWT/session includes organization context.

Joining an organization:

1. Owner/admin creates invite link.
2. Invited user registers through invite token.
3. API creates user inside invite organization with assigned role.
4. Invite is marked used or expires.

### Campus And Configurable Space Setup

1. Owner/admin opens organization dashboard.
2. User creates or opens a campus.
3. User chooses between configuring campus bounds or creating a configurable space.
4. Campus bounds are drawn/edited on Mapbox and saved as GeoJSON.
5. Configurable space creation starts from the campus footprint and is adjusted on Mapbox.
6. If the configurable space is a building, the UI offers floor map creation.
7. If the configurable space is directly bookable, it receives a `BookableResource`.

### Floor Map And Room Setup

1. Owner/admin opens a building configurable space.
2. User creates a floor map with footprint GeoJSON.
3. User uploads/aligns the floor-plan image in the SVG/canvas editor.
4. User draws rooms on the projected floor map canvas.
5. Frontend converts room editor models to GeoJSON.
6. API validates that rooms remain inside the floor map footprint.
7. API replaces rooms and creates room bookable resources.

### Booking

1. User selects a bookable resource, either a room or directly bookable configurable space.
2. UI loads meetings for the resource and selected local date.
3. User creates a one-hour meeting with same-organization participants.
4. API converts the local date/hour using the resource campus timezone.
5. Database prevents overlapping meetings for the same bookable resource.

## Scheduling Model

Meetings are stored as UTC timestamps.

User-facing scheduling inputs:

- Local date.
- Hour.
- Bookable resource.
- Participants.

Timezone source:

- The owning campus timezone.

Overlap rule:

- No overlapping meetings are allowed for the same `bookableResourceId`.
- The `[)` time range convention means a meeting can start exactly when the previous one ends.

Database constraint shape:

```sql
EXCLUDE USING gist (
  bookable_resource_id WITH =,
  tstzrange(starts_at_utc, ends_at_utc, '[)') WITH &&
)
```

## Security And Access Control

Organization scope is the primary access-control boundary.

Rules:

- Every authenticated request has a user and organization context.
- Organization users can only access rows owned by their organization.
- Owner/admin users can configure campuses, spaces, buildings, floors, rooms, resources, and invites.
- Members can view/book organization resources and manage their own meetings.
- User listing and meeting participants are organization-scoped.

Implementation implication:

- API queries must not trust client-provided organization ids.
- Organization id should be derived from `request.user.organizationId`.
- Nested resource lookups must verify ownership through campus or bookable resource relations.

## Current Limitations

- Geometry is stored as JSONB GeoJSON, not PostGIS geometry. Spatial indexing and advanced geospatial queries would require PostGIS or derived spatial columns.
[- Only the outer polygon ring is used by the current rendering/validation helpers. Interior holes are not fully modeled in UI behavior.]: #
- Mapbox is not the primary room editor. Room editing remains in SVG/canvas.
- Fine-grained permissions by campus/resource are deferred.
- Multi-organization membership and organization switching are deferred.


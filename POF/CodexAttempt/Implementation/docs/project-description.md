# Campus Planner Project Description

Campus Planner is a TypeScript monorepo for creating campus floor maps, defining bookable rooms on those maps, and scheduling meetings in those rooms. The current implementation is organized as a web client, an HTTP API, shared DTO/geometry contracts, and a PostgreSQL database.

## Application Architecture

The repository is split into npm workspaces:

- `apps/web`: Angular 20 frontend. It uses standalone components, Angular Router, Angular forms, HttpClient services, and shared contracts from `@campus/contracts`.
- `apps/api`: Node.js API written in TypeScript. It uses Express 5 for routing, TypeORM 0.3 for database entities/migrations, PostgreSQL through `pg`, Zod for request validation, JWT authentication, bcrypt password hashing, Multer for background image uploads, and Luxon for timezone-aware meeting windows.
- `packages/contracts`: Shared TypeScript package used by both frontend and backend. It defines DTOs, GeoJSON polygon types, editor room models, and geometry helpers.
- `infra`: Local infrastructure, currently a Docker Compose PostgreSQL 16 service.
- `apps/storage/uploads`: Default runtime file storage location for uploaded map background images when the API runs with the current default `UPLOADS_DIR`.

The root scripts run the project as a monorepo:

- `npm run dev`: starts the API watcher and Angular development server together.
- `npm run build`: builds contracts, API, and web.
- `npm run test`: runs contracts and API tests.

## Backend Architecture

The API exposes authenticated REST endpoints grouped by resource:

- `auth.routes.ts`: login and authentication operations.
- `users.routes.ts`: user list/access operations.
- `maps.routes.ts`: map CRUD, background image upload, and room replacement.
- `meetings.routes.ts`: meeting creation, update, deletion, and listing.

`server.ts` starts the Express application. `app.ts` wires middleware, API routes, uploaded static files, and centralized error handling. The TypeORM data source is configured in `apps/api/src/data-source.ts` with:

- database type: PostgreSQL
- models: `UserEntity`, `FloorMapEntity`, `RoomEntity`, `MeetingEntity`
- migrations: `InitialSchema1720000000000`
- `synchronize: false`, so schema changes are controlled through migrations

The backend uses TypeORM decorators for database models. Request payloads are validated with Zod at the route boundary, then geometry-specific normalization is handled by `ensurePolygon` and shared contract helpers.

## Database Architecture

PostgreSQL stores the application state. The initial migration creates the `pgcrypto` extension for UUID generation and `btree_gist` for the meeting overlap exclusion constraint.

### Tables

`users`

- Stores login and profile data.
- Primary key: `id uuid`.
- Important columns: `email`, `password_hash`, `display_name`, `role`.
- `email` is unique.

`maps`

- Stores one floor-map definition.
- Primary key: `id uuid`.
- Important columns:
  - `name`: human-readable map name.
  - `floor_label`: floor identifier such as "Ground Floor".
  - `timezone`: timezone used when interpreting meeting dates/hours for rooms on this map. Default is `Europe/Bucharest`.
  - `footprint_geojson jsonb`: the map boundary polygon.
  - `background_image_url`: optional uploaded image URL.
  - `background_fit_mode`: currently `contain`.
- Relationship: one map has many rooms.

`rooms`

- Stores rooms belonging to a map.
- Primary key: `id uuid`.
- Foreign key: `map_id` references `maps(id)` with `ON DELETE CASCADE`.
- Important columns:
  - `name`: room label displayed in the UI.
  - `color`: fill color used when rendering the room polygon.
  - `sort_order`: display/export order.
  - `geometry_geojson jsonb`: the room polygon.
- Relationship: one room belongs to one map and can have many meetings.

`meetings`

- Stores room bookings.
- Primary key: `id uuid`.
- Foreign keys:
  - `room_id` references `rooms(id)` with `ON DELETE RESTRICT`.
  - `created_by_user_id` references `users(id)` with `ON DELETE RESTRICT`.
- Important columns:
  - `title`, `description`
  - `starts_at_utc`, `ends_at_utc`
- Constraints:
  - `meetings_positive_window`: ensures `ends_at_utc > starts_at_utc`.
  - `meetings_no_room_overlap`: PostgreSQL GiST exclusion constraint preventing overlapping time ranges for the same room.

`meeting_participants`

- Join table for the many-to-many relation between meetings and users.
- Composite primary key: `meeting_id`, `user_id`.
- Both foreign keys cascade on delete.

## Map And Room Polygon Model

Map and room geometry is stored as GeoJSON-compatible `Polygon` objects in JSONB columns:

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [0, 0],
      [560, 0],
      [560, 360],
      [0, 360],
      [0, 0]
    ]
  ]
}
```

The shared `GeoJsonPolygon` type is defined in `packages/contracts/src/index.ts`:

- `GeoJsonPosition`: `[number, number]`
- `GeoJsonPolygon.type`: always `"Polygon"`
- `GeoJsonPolygon.coordinates`: an array of rings, with the first ring used as the outer boundary

The helper `createPolygon` closes a ring automatically by repeating the first point at the end when needed. `polygonToPointsAttribute` converts the polygon's outer ring into the SVG `points` format used by the frontend.

### Map Footprint

The map footprint is stored in `maps.footprint_geojson`. It represents the outer boundary of the floor plan. The Angular map editor lets an administrator paste or edit this GeoJSON directly. The frontend parses the text as a `Polygon`, renders it as an SVG `<polygon>`, and sends it to the API when the map is saved.

### Room Geometry

Room geometry is stored in `rooms.geometry_geojson`. The current editor creates and edits rooms as axis-aligned rectangles, then converts each rectangle into a GeoJSON polygon with `roomModelToPolygon`.

Even though the current editor UI is rectangle-based, the persisted room field is a generic GeoJSON polygon. The preview and SVG export paths render the saved polygon directly, so the storage model can support non-rectangular rooms later if the editor is expanded.

Before rooms are saved, both the frontend and backend check that every room polygon stays inside the map footprint. The backend enforces this in `replaceRooms` using `polygonContainsPolygon`, so invalid room geometry cannot be persisted by bypassing the UI.

Room replacement is transactional:

1. Load the map and existing rooms.
2. Reject replacement if meetings already exist for that map.
3. Validate and normalize every room polygon.
4. Delete all previous rooms for the map.
5. Insert the replacement room set.

This keeps room geometry consistent with meeting history. Once meetings exist, room geometry is locked from bulk replacement to avoid orphaning or changing the meaning of existing bookings.

## Coordinate System

The project uses a local planar coordinate system for floor-map geometry, not geographic latitude/longitude coordinates.

Coordinates are interpreted as SVG/user-space units:

- X grows from left to right.
- Y grows from top to bottom.
- The origin `(0, 0)` is wherever the map author chooses in the footprint GeoJSON, commonly the upper-left corner of the drawing.
- Units are arbitrary but must be consistent across the map footprint, room polygons, and background image. In practice they behave like pixels or design units.

The frontend derives the SVG `viewBox` from the bounding box of `footprintGeoJson`. It adds padding around that bounding box for display. Because the `viewBox` is based on geometry, the same coordinates are used consistently for:

- editor pointer interactions
- room drag and resize operations
- map preview rendering
- background image placement
- SVG export

When a background image is present, it is rendered at the footprint bounding box:

- `x = footprint.minX`
- `y = footprint.minY`
- `width = footprint.width`
- `height = footprint.height`
- `preserveAspectRatio = "none"`

This means background images are stretched to the footprint bounding rectangle. The polygon footprint and room polygons remain the source of truth; the image is only a visual reference/overlay.

The standalone `POF/scripts/ancpiCoordinatesTransformer.js` script demonstrates converting Romanian Stereo 70 coordinates (`EPSG:3844`) to WGS84 longitude/latitude GeoJSON. That script is outside the current Implementation runtime. The app does not currently store a CRS/SRID with a map, and it does not project geographic coordinates into the editor coordinate space. If ANCPI or WGS84 polygons are imported into this app, they should first be transformed into the same local SVG coordinate system used by the floor-plan image and rooms.

## Geometry Validation And Shared Helpers

Geometry logic lives in `@campus/contracts` so both the web app and API use the same rules. Important helpers include:

- `closeRing`: ensures a polygon ring ends where it starts.
- `createPolygon`: creates a valid single-ring polygon.
- `createRectanglePolygon`: creates a polygon from `x`, `y`, `width`, and `height`.
- `getOuterRing`: reads the first polygon ring.
- `getBoundingBox`: calculates min/max X/Y and width/height.
- `polygonToPointsAttribute`: converts GeoJSON positions to SVG points.
- `isPointInPolygon`: ray-casting point-in-polygon test, including boundary points.
- `polygonContainsPolygon`: checks whether all candidate polygon points and edges stay inside a container polygon.
- `roomModelToPolygon` and `polygonToRoomModel`: convert between editor rectangle models and persisted polygons.

## Data Flow For Maps And Rooms

Map creation/update:

1. Admin edits map metadata and footprint GeoJSON in Angular.
2. Angular sends `CreateMapRequest` or `UpdateMapRequest` to the API.
3. API validates basic fields with Zod.
4. API normalizes the footprint with `ensurePolygon`.
5. TypeORM saves the `FloorMapEntity` into `maps`.

Room editing:

1. Admin places rooms on the SVG editor canvas.
2. Angular stores in-progress rooms as `EditorRoomModel` rectangles.
3. Before saving, each editor rectangle is converted to a GeoJSON polygon.
4. Angular sends a `ReplaceRoomsRequest` to `PUT /maps/:mapId/rooms`.
5. API validates every polygon and confirms it is inside the map footprint.
6. TypeORM replaces the map's room rows inside a transaction.

Map rendering:

1. Angular fetches `MapDto` from the API.
2. The footprint and rooms are rendered as SVG polygons.
3. Optional background image is placed under the footprint and rooms.
4. Labels are positioned using each room polygon's bounding box.

## Scheduling Model

Meetings are stored in UTC timestamps, but users create them from a map-local date and hour. The API uses the map's `timezone` to convert local meeting windows to UTC before persistence.

The database enforces no overlapping meetings per room with the `meetings_no_room_overlap` exclusion constraint:

```sql
EXCLUDE USING gist (
  room_id WITH =,
  tstzrange(starts_at_utc, ends_at_utc, '[)') WITH &&
)
```

The `[)` time range convention means the start is inclusive and the end is exclusive, allowing a meeting to start exactly when the previous one ends.

## Current Limitations

- Geometry is stored as JSONB GeoJSON, not PostGIS geometry. This is sufficient for the current SVG/local-coordinate workflow, but spatial indexing and advanced spatial queries would require PostGIS or additional derived columns.
- Only the outer ring is used by the shared rendering helpers. Interior holes in polygons are not currently rendered or validated as separate holes.
- The editor creates axis-aligned rectangular rooms, although the database can store arbitrary polygon outlines.
- Background image fitting is currently fixed to `contain` in the model, while rendering stretches the image to the footprint bounding box.

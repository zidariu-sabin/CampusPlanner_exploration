# Mapbox Campus Architecture Conversation Spec

## Purpose

This document records the main decisions and implementation outcomes from the Mapbox/campus hierarchy conversation. It is intended as a reference for future work on the Campus Planner map editor, campus model, booking flow, and visual QA process.

## 1. Desired Mapbox API Integration

The desired Mapbox integration evolved from a simple footprint picker into a world-coordinate mapping layer for campus planning.

Primary goals:

- Use Mapbox GL JS for real-world footprint drawing and preview.
- Keep all persisted geometry as GeoJSON Polygon in EPSG:4326 `[longitude, latitude]`.
- Use Mapbox only where geographic context matters.
- Keep the SVG/canvas editor as the precision editor for floor-plan alignment and room drawing.
- Use Mapbox styles only where they add value:
  - Satellite.
  - Streets.
- Keep the floor-plan image overlay toggle.
- Avoid extra layer controls that add UI and code complexity without a clear current use case.

Implemented Mapbox-related behavior:

- Added Mapbox GL JS and Mapbox Draw integration.
- Added environment config fields for:
  - `mapboxAccessToken`.
  - `mapboxStyleUrl`.
- Added `MapboxFootprintPickerComponent` for drawing/editing a single footprint polygon.
- Added style selection between satellite and streets.
- Added floor-plan overlay toggle.
- Added a view-only Mapbox map in the booking flow for floor maps.
- Preserved the existing SVG/canvas editor for floor-plan and room editing.

Important Mapbox rules:

- Mapbox consumes saved GeoJSON directly.
- SVG/canvas projects GeoJSON through Web Mercator helpers for rendering/editing.
- Persisted coordinates must stay `[longitude, latitude]`.
- The public Mapbox token can live in the Angular environment, but it should be restricted in the Mapbox dashboard by allowed URLs/domains.
- Do not record the actual token in docs.

## 2. Bugs And Issues Encountered

### Missing Mapbox Token

Issue:

- Mapbox cannot render without a configured access token.

Decision:

- If `mapboxAccessToken` is empty, show an in-panel configuration error and keep the rest of the form usable.

### Port 4200 Already In Use

Issue:

- Angular dev server may already be running on port `4200`.

Useful command:

```bash
fuser -k 4200/tcp
```

Alternative:

```bash
lsof -ti:4200 | xargs -r kill
```

### Style Switch Broke Floor-Plan Overlay

Issue:

- Switching Mapbox styles reloaded the map style and removed custom image sources/layers.

Decision:

- Custom overlay sources/layers must be re-synced after Mapbox `style.load`.
- Keep only necessary controls: style selector and floor-plan toggle.

### Duplicated Overlay/Alignment Logic

Issue:

- An attempted alignment-tool expansion duplicated logic between Mapbox and SVG/canvas without actually affecting the Mapbox overlay.

Decision:

- Revert that direction.
- Keep Mapbox as the world-coordinate footprint/map viewer.
- Keep SVG/canvas as the detailed floor-plan alignment and room editor.

### No Floor-Plan Alignment Tools On Mapbox

Issue:

- The user expected tools to align the actual floor-plan image over the Mapbox view for room drawing.

Decision:

- Do not make Mapbox the primary room editor in this pass.
- Use Mapbox to preview/place geographic footprints.
- Use the existing SVG/canvas editor for floor-plan alignment and room drawing.

### Database Errors: `relation does not exist`

Issue:

- After the fresh-start schema migration, the running Postgres database still had the old schema/migration history.
- `npm run build` only compiles code. It does not update the database.
- Rebuilding/restarting the Docker container does not remove the named Postgres volume.

Fix for local fresh-start development:

```bash
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d
npm run dev
```
## 3. Architecture Model

The architecture moved from solitary maps to a campus hierarchy:

```text
Campus
  CampusPlace
    Building
      FloorMap
        Room
```

Frontend naming decision:

- Keep backend/domain name `CampusPlace` for now.
- In the frontend, show this concept as `Configurable Space`.

Reason:

- `CampusPlace` is useful as a technical domain term.
- `Configurable Space` is clearer for users because the item may be a building, sports field, tennis court, parking area, or outdoor area.

### Entity Responsibilities

`Campus`:

- Top-level container.
- Has name, timezone, and optional campus boundary GeoJSON.
- Its boundary is configured separately before creating spaces.

`CampusPlace` / frontend `Configurable Space`:

- Generic real-world Mapbox object.
- Has a type such as:
  - `building`
  - `sports_field`
  - `tennis_court`
  - `parking`
  - `outdoor_area`
  - `other`
- Stores footprint GeoJSON.
- Can be directly bookable if it is not a building.

`Building`:

- One-to-one extension of `CampusPlace(type = 'building')`.
- Exists only when the configurable space is a building.
- Owns floor maps.

`FloorMap`:

- Indoor/floor-level map.
- Belongs to a building.
- Stores floor footprint GeoJSON and optional background image.
- Reuses the existing floor-plan/SVG canvas editing workflow.

`Room`:

- Belongs to a floor map.
- Stores room geometry as GeoJSON Polygon.
- Has a generated `BookableResource`.

`BookableResource`:

- Generic booking target.
- Can represent:
  - A `Room`.
  - A directly bookable outdoor `CampusPlace`.
- Meetings point to `bookableResourceId`.

`Meeting`:

- No longer points directly to `roomId`.
- Points to a `BookableResource`.
- Uses the resource's campus timezone for local date/hour conversion.

### UI Flow Decisions

Dashboard:

- Main entry point is now campuses.
- Users create/open a campus from the dashboard.

### Coordinate System Decision

Single source of truth:

- Store all footprints and room geometries as GeoJSON Polygon `[longitude, latitude]`.

Mapbox:

- Uses persisted GeoJSON directly.
- Handles world-coordinate display and footprint drawing.

SVG/canvas:

- Uses Web Mercator projection helpers to render and edit saved world coordinates.
- Converts projected pointer/canvas edits back to GeoJSON before persistence.

### API Shape Decisions

Added API groups:

- `/campuses`
- `/campuses/:campusId/places`
- `/buildings/:buildingId/floors`
- `/floor-maps/:floorMapId/rooms`
- `/bookable-resources/:resourceId`
- `/meetings` with `bookableResourceId`

Compatibility note:

- Some frontend floor-map components still use local names such as `MapDto` as aliases for `FloorMapDto`.
- This was done to keep the migration focused and avoid rewriting stable SVG/canvas components in the same pass.

### Migration Decision

Fresh-start migration was selected.

Implications:

- Existing old `maps -> rooms -> meetings` data is not preserved.
- Local development databases must be reset if they already recorded the old migrations.
- No PostGIS was introduced; GeoJSON remains stored in JSONB.

## Validation And Current Status

Build/test checks run during the implementation:

```bash
npm run build
npm run test
```

Observed status:

- Contracts build passed.
- API build passed.
- Web build passed.
- Existing contract/API tests passed.

Remaining known warnings:

- Angular initial bundle exceeds the configured budget after Mapbox additions.
- Mapbox/Mapbox Draw dependencies produce CommonJS optimization warnings.
- Local Node version warning appears when using an odd-numbered Node release.


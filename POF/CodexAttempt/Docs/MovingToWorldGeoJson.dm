# Move Map Editor To World GeoJSON Coordinates

## Summary
Use the footprint GeoJSON as the source of truth for world coordinates. Store all map footprints and room geometries as standard GeoJSON `[longitude, latitude]` polygons, compatible with geojson.io and future Google Maps usage. Keep the current SVG editor, but render/edit through a Web Mercator projection layer so shapes are not collapsed or treated like local pixel rectangles.

## Key Changes
- Add a web geometry projection helper:
  - Convert GeoJSON lon/lat to projected canvas coordinates using Web Mercator.
  - Convert canvas pointer coordinates back to lon/lat before storing room points.
  - Project polygons only for rendering, labels, viewBox, background placement, crop handles, and drag/resize math.
- Update editor canvas behavior:
  - Polygon point clicks store world lon/lat coordinates, not SVG-local coordinates.
  - Dragging a room translates its GeoJSON by converting projected drag delta back into world coordinates.
  - Square rooms are created from projected footprint bounds, then converted back to world GeoJSON.
  - Existing `EditorRoomModel.geometryGeoJson` remains the room source of truth; `x/y/width/height` are only projected/world bounding metadata for list display and rectangle handles.
- Update all SVG-based map views:
  - `MapEditorCanvasComponent`, `MapPreviewComponent`, booking map SVG, and SVG export should render projected polygons instead of raw GeoJSON points.
  - Labels use projected bounding boxes.
  - Background images continue to fit the projected footprint bounds.
- Keep API/database shape unchanged:
  - `footprintGeoJson` and `rooms.geometryGeoJson` remain JSONB GeoJSON.
  - Treat new maps as EPSG:4326 lon/lat GeoJSON.
  - Do not auto-convert old local-coordinate maps.

## Public Interfaces / Types
- No endpoint or database migration is required.
- Clarify contract semantics:
  - `GeoJsonPosition` is `[longitude, latitude]` for world-coordinate maps.
  - `EditorRoomModel.geometryGeoJson` remains required for preserving non-rectangular room shapes.
- Add tests for projection round-trips:
  - lon/lat -> projected point -> lon/lat returns approximately the original coordinate.
  - projected polygon rendering does not mutate persisted GeoJSON.

## Test Plan
- Contracts:
  - Existing geometry tests still pass.
  - Add projection/round-trip tests if projection helpers live in shared code; otherwise add focused web helper tests if the app has a test setup.
- Web build:
  - Run `npm run build` in `apps/web`.
- API build:
  - Run `npm run build -w @campus/api`.
- Manual scenarios:
  - Paste a geojson.io footprint around `44.297575, 23.830052`.
  - Add a polygon room by clicking points; saved room payload uses lon/lat coordinates.
  - Add a square room; it renders as a proper rectangle on the projected world map, not a collapsed/square artifact.
  - Reload saved map; polygon and square rooms preserve their shapes.
  - Preview, booking view, and SVG export render the same projected geometry.

## Assumptions
- New maps should use real GeoJSON from geojson.io or another lon/lat source.
- Existing pixel/local-coordinate maps are left unchanged and may render incorrectly until manually replaced with world GeoJSON.
- Google Maps API integration is a later step; this plan prepares the coordinate model without adding Google Maps dependencies now.

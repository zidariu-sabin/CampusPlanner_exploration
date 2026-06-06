# OpenStreetMap Footprint Picker

## Summary
Add OpenStreetMap as a geospatial reference in the map configuration step. Use OpenLayers to render OSM tiles and overlay the current footprint GeoJSON using real `[longitude, latitude]` coordinates. Keep the existing SVG editor for image alignment and room editing; OSM is added as a footprint preview/drawing tool, not a replacement for the current canvas.

## Key Changes
- Add `ol` as a web dependency and import OpenLayers CSS globally.
- Create a standalone `OsmFootprintPickerComponent` for the map workflow:
  - Inputs: current `GeoJsonPolygon | null`.
  - Outputs: `footprintChange`.
  - Render OSM raster tiles plus a vector footprint layer.
  - Read/write GeoJSON with `dataProjection: 'EPSG:4326'` and `featureProjection: 'EPSG:3857'`.
  - Fit the map view to the footprint when valid; otherwise center near the sample campus coordinates.
- Add footprint editing controls:
  - `Draw footprint`: map clicks create a replacement polygon.
  - `Edit vertices`: modify the existing polygon vertices.
  - `Cancel`: clears active map interactions without changing saved form state.
  - On draw/modify completion, emit normalized Polygon GeoJSON and update `footprintText` in `MapEditorFormComponent`.
- Integrate only into the `workflow === 'map'` branch of `MapEditorFormComponent`, near the Footprint GeoJSON textarea.
- Keep all existing API/database contracts unchanged.

## OSM Usage Rules
- Use configurable tile URL defaulting to `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
- Display visible attribution: `© OpenStreetMap contributors`.
- Do not add tile prefetching, offline download, or tile scraping.
- Do not set a restrictive referrer policy that strips browser referer headers.
- For production/heavier use, keep the tile URL configurable so the app can switch to a hosted OSM-derived provider or self-hosted tiles.

## Test Plan
- Run `npm run build` from `POF/CodexAttempt/Implementation`.
- Manual checks:
  - Open `/maps/new`; OSM map renders with the sample footprint overlay.
  - Paste geojson.io footprint coordinates; OSM overlay moves to the correct real-world location.
  - Draw a new footprint on OSM; textarea updates to `[longitude, latitude]` GeoJSON.
  - Edit footprint vertices; textarea and existing SVG preview update.
  - Save map; reload configure page; OSM overlay still renders from saved coordinates.
  - Define rooms page still uses the saved footprint and keeps existing room editing behavior.

## Assumptions
- OpenLayers is preferred over Leaflet because it has first-class GeoJSON/vector-layer support and aligns well with the current Web Mercator projection model.
- OSM integration is for footprint preview/picking in the map configuration step only.
- Existing SVG canvas remains responsible for background image manipulation and room-boundary editing.
- References: OpenLayers supports OSM tiles and GeoJSON vector layers, and its examples use `OSM`, `GeoJSON`, `VectorSource`, and `VectorLayer`: https://openlayers.org/ and https://openlayers.org/en/latest/examples/geojson.html. OSM tile usage requirements come from the official policy: https://operations.osmfoundation.org/policies/tiles/.

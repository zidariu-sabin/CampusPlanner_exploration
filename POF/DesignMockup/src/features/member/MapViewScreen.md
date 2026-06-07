# Member Map View

## Component
- File: `src/features/member/MapViewScreen.jsx`
- Export: `MemberMapViewScreen`
- Main canvas helper: `MemberCampusMap`
- Rendered from: `FeatureRenderer` when `activeRole === "member"` and `activeScreen === "member-map"`.

## Purpose
The map view explains the hierarchical map concept: city campuses, campus spaces, space floors, and floor rooms. It should make it clear that selecting an entity loads additional map layers on top of the existing context.

## Primary Users
- Normal member looking for a room
- User navigating from dashboard route preview
- User exploring campuses before booking

## User Flow
1. User sees a city map with three campus options.
2. User selects one campus from the left selector or the city map marker.
3. The selected campus layer appears on top of the city base layer.
4. User selects a space/building.
5. The room/floor canvas appears on top of the campus context.
6. User selects a floor.
7. The room layer changes to represent the selected floor.

## Visible Sections
- Left selector panel.
- Selection summary:
  - City
  - Campus
  - Space
  - Floor
- Campus options.
- Space options after campus selection.
- Floor selector after space selection.
- Layered canvas map.
- Zoom/layer overlay.

## Interaction Contract
- Selecting a campus sets `selectedCampus`, clears `selectedSpace`, and resets floor to default.
- Selecting a space sets `selectedSpace`, keeps the matching campus selected, and resets floor to default.
- Selecting a floor sets `selectedFloor`.
- The canvas always keeps parent context visible underneath child layers.

## Data Layers
- City layer: roads, city blocks, campus markers.
- Campus layer: campus footprint, paths, outdoor resources.
- Space layer: building footprints and availability markers.
- Room layer: selected floor footprint and room polygons.

## Data Requirements
- Campuses with IDs, names, availability summaries, and city positions.
- Spaces with campus ID, type, name, availability summary, and footprint.
- Floors with ID, label, room count, and availability count.
- Rooms with polygon geometry, label, availability, capacity, and equipment.

## Implementation Notes
- Real implementation should use Mapbox sources/layers instead of SVG.
- Suggested source separation:
  - `city-base`
  - `campus-footprints`
  - `campus-spaces`
  - `floor-footprints`
  - `room-polygons`
- Parent layers should remain visible but muted when child layers load.
- The selected entity should be reflected in URL params for shareability and browser navigation.
- Floor changes should swap only the floor/room source data, not reload the whole map.

## Acceptance Criteria
- Initial state shows the three campuses.
- Campus selection reveals only spaces for that campus.
- Space selection reveals floor controls and room layer.
- Floor selection updates room summary and room layer.
- User can understand current selection from the left summary without reading the canvas.

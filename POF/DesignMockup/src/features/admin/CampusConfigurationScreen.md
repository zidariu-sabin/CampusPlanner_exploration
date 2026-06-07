# Admin Campus Configuration

## Component
- File: `src/features/admin/CampusConfigurationScreen.jsx`
- Export: `CampusConfigurationScreen`
- Rendered from: `FeatureRenderer` when `activeRole === "admin"` and `activeScreen === "campus"`.

## Purpose
Campus configuration lets administrators define the outdoor structure of a campus before floors and rooms can be configured. It covers campus footprint, cadastral alignment, and campus spaces such as buildings, outdoor resources, and points of interest.

## Primary Users
- Tenant admin
- Facilities map editor
- GIS or building data operator

## User Flow
1. Admin opens `Campus Configuration`.
2. Admin starts in `Campus setup`.
3. Admin defines the campus origin and footprint GeoJSON.
4. Admin uploads and aligns a cadastral image to the footprint.
5. Admin proceeds to define spaces inside the campus boundary.
6. Admin opens `Spaces setup` for a selected building or outdoor resource.

## Visible Sections
- Campus setup step strip.
- Definition panel with campus name, timezone, origin, and footprint GeoJSON.
- Upload/alignment panel with move, scale, rotation, and opacity controls.
- Define spaces panel with selectable campus spaces.
- Spaces setup page with space details, footprint GeoJSON, existing spaces, and canvas.

## Interaction Contract
- `activeStep` controls whether the page shows campus setup or spaces setup.
- `setupStep` controls the sub-step inside campus setup.
- `onOpenSpacesSetup` moves the user from campus setup into spaces setup.
- `onSetupStepChange` changes the campus setup sub-step.

## Data Requirements
- Campus metadata: name, timezone, footprint GeoJSON.
- Cadastral image metadata: file, transform, opacity.
- Space list: name, type, status, footprint GeoJSON.
- Validation status for campus and space boundaries.

## Implementation Notes
- Real implementation should validate GeoJSON server-side and client-side.
- Map editing should use a drawing/editing layer rather than text-only GeoJSON input.
- Cadastral alignment transforms should be stored with the uploaded asset.
- Space footprints must be constrained to the campus boundary.

## Acceptance Criteria
- Admin can see the setup sequence clearly.
- Admin can move from campus setup to spaces setup.
- Footprint and selected space are represented on the map canvas.
- Validation status is visible before saving or publishing.

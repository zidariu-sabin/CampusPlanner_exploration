# Admin Space Configuration

## Component
- File: `src/features/admin/SpaceConfigurationScreen.jsx`
- Export: `SpaceConfigurationScreen`
- Rendered from: `FeatureRenderer` when `activeRole === "admin"` and `activeScreen === "import"`.

## Purpose
Space configuration turns a building or campus space into usable indoor data. It models the flow for selecting a space, uploading and aligning a floor plan, defining rooms, reviewing warnings, and publishing the configured space.

## Primary Users
- Facilities map editor
- Tenant admin
- Indoor mapping operator

## User Flow
1. Admin selects the campus space and floor.
2. Admin uploads a floor image.
3. Admin aligns the image to the space footprint.
4. Admin defines room polygons and room labels.
5. Admin reviews detected warnings.
6. Admin publishes the configured space so it becomes available to booking and map users.

## Visible Sections
- Import pipeline step strip.
- Floor import canvas.
- Upload dropzone and transform controls.
- Room definition list.
- Review warnings.
- Publish confirmation card.

## Interaction Contract
- `activeStep` controls the current import pipeline step.
- `onStepChange` changes the active import step.
- The canvas changes its visible layers based on `activeStep`.
- Room warnings appear before publish.

## Data Requirements
- Selected campus space and floor.
- Uploaded floor plan asset.
- Image transform metadata.
- Room polygons, labels, capacity, equipment, and booking metadata.
- Validation warnings.

## Implementation Notes
- Real implementation should store floor plans as assets tied to a floor entity.
- Room polygons should be edited on a real map/canvas layer.
- Warnings should be structured and actionable, not plain text.
- Publishing should require all blocking warnings to be resolved.

## Acceptance Criteria
- Admin can understand the import pipeline at a glance.
- Current step is visually distinct.
- Room configuration appears after upload/alignment.
- Review and publish states are separate.

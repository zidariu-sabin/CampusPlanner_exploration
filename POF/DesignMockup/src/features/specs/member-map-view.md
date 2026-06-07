# Member Map View

## Goal
Help a normal member find campuses, spaces, floors, and rooms through a progressive map interaction.

## User Flow
1. User opens the city map and sees available campuses.
2. User selects a campus and sees that campus footprint plus its spaces.
3. User selects a space and sees the selected space with a floor selector.
4. User selects a floor and sees room footprints for that floor.
5. User can use the visible room layer to understand where bookable rooms are located.

## Data Layers
- City base layer: roads, city blocks, campus markers.
- Campus layer: selected campus footprint and campus paths.
- Space layer: buildings and outdoor spaces for the selected campus.
- Floor layer: selected floor footprint and rooms.

## Implementation Notes
- Real implementation should use Mapbox sources/layers instead of static SVG.
- Keep city, campus, space, and room GeoJSON in separate sources.
- Preserve selected entity state in URL/search params when routing is added.
- Loading a child layer should not remove parent context; render parent context muted underneath.

## Acceptance Criteria
- The page initially shows all campuses.
- Selecting a campus reveals spaces for that campus only.
- Selecting a space reveals floor controls.
- Selecting a floor changes the visible room layer.
- The left selector summarizes current city, campus, space, and floor selection.

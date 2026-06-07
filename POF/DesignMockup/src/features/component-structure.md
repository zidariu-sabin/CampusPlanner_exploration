# Component Structure

## Purpose
This document explains how the mockup is split into feature components and how each page should be connected to a feature specification.

## App Shell
- File: `src/main.jsx`
- Responsibilities:
  - Role toggle between admin and member.
  - Sidebar navigation.
  - Current screen header.
  - Active feature spec path display.
  - `FeatureRenderer` switch that inserts the selected page component.

## Feature Registry
- File: `src/features/featureRegistry.js`
- Responsibilities:
  - Defines admin sidebar screens.
  - Defines member sidebar screens.
  - Defines child pages under grouped sidebar entries.
  - Maps each screen to a feature spec path.

## Shared Data
- File: `src/features/data.js`
- Responsibilities:
  - Mock campus data.
  - Mock space data.
  - Mock booking slots.
  - Mock member meetings.
  - Mock map hierarchy data.
  - Mock user settings data.

## Shared UI Components
- File: `src/features/common/ui.jsx`
- Components:
  - `ScreenShell`: page layout wrapper.
  - `Panel`: titled content panel with optional action button.
  - `Metric`: dashboard metric card.
  - `Badge`: compact status label.
  - `Task`: two-column status row.
  - `RouteStep`: numbered route instruction row.

## Admin Feature Components
- `src/features/admin/DashboardScreen.jsx`
- `src/features/admin/CampusConfigurationScreen.jsx`
- `src/features/admin/SpaceConfigurationScreen.jsx`
- `src/features/admin/SettingsScreen.jsx`

## Member Feature Components
- `src/features/member/DashboardScreen.jsx`
- `src/features/member/MapViewScreen.jsx`

## Booking Feature Components
- `src/features/booking/RoomBookingScreen.jsx`
- `src/features/booking/BookingDetailScreen.jsx`
- `src/features/booking/BookingMap.jsx`

## Adding A New Mockup Page
1. Create the component under the relevant feature folder.
2. Add a Markdown spec next to the component with the same basename.
3. Add a screen entry in `featureRegistry.js`.
4. Add a render case in `FeatureRenderer`.
5. Run `npm run build`.

## Acceptance Criteria For New Components
- Component has a matching Markdown spec.
- Sidebar entry points to a feature id.
- Header displays the matching spec path.
- Component imports data and shared UI from `src/features`, not from `main.jsx`.

export const adminScreens = [
  { id: 'dashboard', label: 'Dashboard', feature: 'admin-dashboard' },
  { id: 'campus', label: 'Campus Configuration', feature: 'admin-campus-configuration' },
  { id: 'import', label: 'Space configuration', feature: 'admin-space-configuration' },
  {
    id: 'booking',
    label: 'Room Booking',
    feature: 'room-booking',
    children: [
      { id: 'booking', label: 'Book room', feature: 'room-booking' },
      { id: 'booking-detail', label: 'Booking detail', feature: 'booking-detail' },
    ],
  },
  { id: 'settings', label: 'Organization settings', feature: 'admin-organization-settings' },
];

export const memberScreens = [
  { id: 'member-dashboard', label: 'Dashboard', feature: 'member-dashboard' },
  { id: 'member-map', label: 'Map View', feature: 'member-map-view' },
  {
    id: 'member-booking',
    label: 'Room Booking',
    feature: 'room-booking',
    children: [
      { id: 'member-booking', label: 'Book room', feature: 'room-booking' },
      { id: 'member-booking-detail', label: 'Booking detail', feature: 'booking-detail' },
    ],
  },
];

export const featureSpecs = {
  'admin-dashboard': {
    title: 'Admin Dashboard',
    specPath: 'src/features/admin/DashboardScreen.md',
  },
  'admin-campus-configuration': {
    title: 'Campus Configuration',
    specPath: 'src/features/admin/CampusConfigurationScreen.md',
  },
  'admin-space-configuration': {
    title: 'Space Configuration',
    specPath: 'src/features/admin/SpaceConfigurationScreen.md',
  },
  'admin-organization-settings': {
    title: 'Organization Settings',
    specPath: 'src/features/admin/SettingsScreen.md',
  },
  'member-dashboard': {
    title: 'Member Dashboard',
    specPath: 'src/features/member/DashboardScreen.md',
  },
  'member-map-view': {
    title: 'Member Map View',
    specPath: 'src/features/member/MapViewScreen.md',
  },
  'room-booking': {
    title: 'Room Booking',
    specPath: 'src/features/booking/RoomBookingScreen.md',
  },
  'booking-detail': {
    title: 'Booking Detail',
    specPath: 'src/features/booking/BookingDetailScreen.md',
  },
};

export function findScreenById(screens, activeScreen) {
  return (
    screens.find((screen) => screen.id === activeScreen)
    ?? screens.flatMap((screen) => screen.children ?? []).find((screen) => screen.id === activeScreen)
    ?? screens[0]
  );
}

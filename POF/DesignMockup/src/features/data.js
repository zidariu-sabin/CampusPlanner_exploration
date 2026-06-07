export const campuses = [
  {
    id: 'main',
    name: 'Main Academic Campus',
    status: 'Published',
    buildings: 12,
    floors: 28,
    rooms: 246,
    issues: 3,
  },
  {
    id: 'medical',
    name: 'Medical Training Center',
    status: 'Published',
    buildings: 5,
    floors: 11,
    rooms: 88,
    issues: 0,
  },
  {
    id: 'sports',
    name: 'Sports Complex',
    status: 'Draft',
    buildings: 2,
    floors: 3,
    rooms: 18,
    issues: 5,
  },
];

export const spaces = [
  { name: 'Engineering Building', type: 'Building', details: '8 floors', state: 'Ready' },
  { name: 'Library', type: 'Building', details: '4 floors', state: 'Ready' },
  { name: 'Tennis Court A', type: 'Outdoor resource', details: 'Bookable', state: 'Draft' },
  { name: 'North Parking', type: 'Outdoor area', details: 'POI', state: 'Ready' },
];

export const campusSteps = [
  {
    title: 'Campus setup',
    summary: 'Import the cadastral map, set the origin, and define the campus footprint.',
  },
  {
    title: 'Spaces setup',
    summary: 'Define the buildings and outdoor spaces that belong to this campus.',
  },
];

export const campusSetupSteps = [
  {
    title: 'Definition',
    summary: 'Set the origin and define the campus footprint with direct GeoJSON input.',
  },
  {
    title: 'Upload',
    summary: 'Upload the cadastral image, then move, scale, and rotate it to match the footprint.',
  },
  {
    title: 'Define spaces',
    summary: 'Define buildings, outdoor resources, and POIs inside the campus boundary.',
  },
];

export const floorImportSteps = [
  {
    title: 'Select space',
    summary: 'Choose the campus space, level, and footprint that will receive the plan.',
  },
  {
    title: 'Upload',
    summary: 'Upload an image, then scale and rotate it over the footprint.',
  },
  {
    title: 'Configure',
    summary: 'Define rooms and labels on top of the aligned floor image.',
  },
  {
    title: 'Review',
    summary: 'Resolve geometry, labels, and booking metadata warnings.',
  },
  {
    title: 'Publish',
    summary: 'Make the configured space available to viewers and booking workflows.',
  },
];

export const bookingSlots = [
  { time: '09:00', state: 'free' },
  { time: '10:00', state: 'busy' },
  { time: '11:00', state: 'selected' },
  { time: '12:00', state: 'free' },
  { time: '13:00', state: 'busy' },
  { time: '14:00', state: 'free' },
  { time: '15:00', state: 'free' },
  { time: '16:00', state: 'free' },
];

export const memberMeetings = [
  {
    time: '10:00',
    title: 'Licenta planning review',
    location: 'Engineering C203',
    details: 'Level 2 · 8 seats · Booked by me',
    tone: 'good',
  },
  {
    time: '12:30',
    title: 'Project sync',
    location: 'Library L104',
    details: 'Main Campus · Invited',
    tone: 'warn',
  },
  {
    time: '15:00',
    title: 'Architecture workshop',
    location: 'Innovation Hub H210',
    details: 'Hybrid room · 14 seats',
    tone: 'good',
  },
];

export const memberRooms = [
  {
    name: 'C203 Seminar Room',
    location: 'Engineering · Level 2',
    details: ['Available 11:00', '8 seats', 'Projector', '3 min walk'],
    selected: true,
  },
  {
    name: 'L104 Collaboration Room',
    location: 'Library · Level 1',
    details: ['Available 11:00', '6 seats', 'Whiteboard', '7 min walk'],
  },
  {
    name: 'H210 Workshop Room',
    location: 'Innovation Hub · Level 2',
    details: ['Available 11:30', '14 seats', 'Hybrid setup', '5 min walk'],
  },
];

export const memberMapCampuses = [
  { id: 'main-campus', name: 'Main Academic Campus', details: '12 buildings · 31 rooms free' },
  { id: 'medical-campus', name: 'Medical Training Center', details: '5 buildings · 14 rooms free' },
  { id: 'sports-campus', name: 'Sports Complex', details: '2 buildings · 6 rooms free' },
];

export const memberMapSpaces = [
  { id: 'engineering', campusId: 'main-campus', name: 'Engineering Building', type: 'Building', details: '8 floors · 12 rooms free' },
  { id: 'library', campusId: 'main-campus', name: 'Library', type: 'Building', details: '4 floors · 7 rooms free' },
  { id: 'innovation', campusId: 'main-campus', name: 'Innovation Hub', type: 'Building', details: '2 floors · 3 rooms free' },
  { id: 'simulation', campusId: 'medical-campus', name: 'Simulation Center', type: 'Building', details: '3 floors · 6 rooms free' },
  { id: 'clinical', campusId: 'medical-campus', name: 'Clinical Skills Lab', type: 'Building', details: '2 floors · 4 rooms free' },
  { id: 'arena', campusId: 'sports-campus', name: 'Indoor Arena', type: 'Building', details: '2 floors · 3 rooms free' },
  { id: 'training', campusId: 'sports-campus', name: 'Training Pavilion', type: 'Building', details: '1 floor · 2 rooms free' },
];

export const memberMapFloors = [
  { id: 'level-1', label: 'Level 1', rooms: 6, free: 3 },
  { id: 'level-2', label: 'Level 2', rooms: 8, free: 5 },
  { id: 'level-3', label: 'Level 3', rooms: 5, free: 2 },
];

export const users = [
  { name: 'Ana Marinescu', role: 'Admin', status: 'Active' },
  { name: 'Mihai Pop', role: 'Editor', status: 'Active' },
  { name: 'Facilities Team', role: 'Viewer', status: 'Pending' },
  { name: 'External Partner', role: 'Viewer', status: 'Restricted' },
];

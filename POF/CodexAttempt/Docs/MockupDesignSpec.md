Frontend Design Specification: CampusNavigator
Target Framework: Angular (v17+ recommended, Standalone Components, Signals for state)
Styling: Tailwind CSS
Icons: lucide-angular
1. Global Design Tokens (Tailwind)
Primary Palette (Grayscale/Slate):
Backgrounds: bg-slate-50, bg-slate-100 (Main App), bg-white (Cards/Sheets)
Borders: border-slate-200, border-slate-300 (Dividers), border-slate-800 (Active/Selected)
Text: text-slate-800 (Headings), text-slate-500 (Body), text-slate-400 (Labels)
Primary Brand Action: bg-slate-800 text-white (Using dark slate as the primary contrast color based on wireframes).
Typography: Sans-serif (Default Tailwind). Use font-black or font-bold for titles, and text-[10px] tracking-widest uppercase for sub-labels and small UI hints.
Border Radius: Heavy use of rounded corners. rounded-xl for inner cards/buttons, rounded-3xl or rounded-t-[2.5rem] for bottom sheets.
2. Angular Architecture & Component Tree
Use Standalone components. The app relies on a single immersive view rather than traditional page routing, swapping overlays based on state.
AppComponent (Main Shell)
Role: Manages the main viewport (max-w-[350px] or w-full on mobile), safe-area padding, and the Bottom Navigation Bar.
State Signals: * viewState: 'map' | 'navigation' | 'booking'
activeTab: 'map' | 'schedule' | 'profile'
MapComponent
Role: Renders the indoor grid/cadastral SVG.
Features: Handles pan/zoom gestures. Displays the user's current location pip and destination markers.
Child: FloorSwitcherComponent (Floating right side, toggles levels 1-4).
SearchOverlayComponent
Role: Floating header search bar.
Behavior: When focused, expands to show "Recent Searches" and "Suggested Rooms" list.
RoomDetailSheetComponent
Role: A "Bottom Sheet" overlay triggered when a map zone is clicked.
UI: * Header: Room Name, Level.
Grid: 3 quick stats (Capacity, Walk Time, Type).
Actions: Primary "Navigate" button, Secondary "Book" button.
ActiveRoutingPanelComponent
Role: Replaces the Search Bar and Bottom Nav during active navigation.
UI: Large dark header (bg-slate-800) with turn-by-turn text. Bottom bar with an "END" route button.
SchedulingComponent
Role: Full-screen or large bottom sheet for the booking flow.
UI: * Horizontal scrollable date picker (Cards).
Grid of time slots (e.g., 9:00, 10:00). Disabled states for booked slots (opacity-50).
Fixed bottom confirmation bar.
3. Recommended State Management (Signals)
To orchestrate the complex overlay logic, implement a shared NavigationService using Angular Signals:
// Shared State Service Concept
@Injectable({ providedIn: 'root' })
export class CampusStateService {
  currentFloor = signal<number>(1);
  selectedRoom = signal<Room | null>(null);
  searchQuery = signal<string>('');
  isNavigating = signal<boolean>(false);
  
  // Computed states
  showBottomSheet = computed(() => this.selectedRoom() !== null && !this.isNavigating());
}


4. Key UX/Interaction Behaviors to Implement
Z-Index Hierarchy: * Map Canvas (z-0)
Floor Switcher / Search Bar (z-10)
Bottom Sheet Overlays (z-30)
Navigation Modals/Headers (z-40)
Transitions: * Bottom sheets must slide up smoothly (transform translateY).
The active navigation path on the map should use SVG stroke-dasharray with a CSS animation to simulate movement.
Responsiveness: Lock the application to prevent pull-to-refresh on mobile (overscroll-behavior-y: none). The layout is primarily mobile-first.
    
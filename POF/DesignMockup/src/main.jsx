import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const campuses = [
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

const spaces = [
  { name: 'Engineering Building', type: 'Building', details: '8 floors', state: 'Ready' },
  { name: 'Library', type: 'Building', details: '4 floors', state: 'Ready' },
  { name: 'Tennis Court A', type: 'Outdoor resource', details: 'Bookable', state: 'Draft' },
  { name: 'North Parking', type: 'Outdoor area', details: 'POI', state: 'Ready' },
];

const campusSteps = [
  {
    title: 'Campus setup',
    summary: 'Import the cadastral map, set the origin, and define the campus footprint.',
  },
  {
    title: 'Spaces setup',
    summary: 'Define the buildings and outdoor spaces that belong to this campus.',
  },
];

const floorImportSteps = [
  {
    title: 'Select floor',
    summary: 'Choose the building, level, and footprint that will receive the plan.',
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
    summary: 'Make the floor available to viewers and booking workflows.',
  },
];

const bookingSlots = [
  { time: '09:00', state: 'free' },
  { time: '10:00', state: 'busy' },
  { time: '11:00', state: 'selected' },
  { time: '12:00', state: 'free' },
  { time: '13:00', state: 'busy' },
  { time: '14:00', state: 'free' },
  { time: '15:00', state: 'free' },
  { time: '16:00', state: 'free' },
];

const users = [
  { name: 'Ana Marinescu', role: 'Admin', status: 'Active' },
  { name: 'Mihai Pop', role: 'Editor', status: 'Active' },
  { name: 'Facilities Team', role: 'Viewer', status: 'Pending' },
  { name: 'External Partner', role: 'Viewer', status: 'Restricted' },
];

const screens = [
  { id: 'dashboard', label: 'Organization Dashboard' },
  { id: 'campus', label: 'Campus Configuration' },
  { id: 'import', label: 'Floor Import Pipeline' },
  { id: 'booking', label: 'Room Booking' },
  { id: 'settings', label: 'Admin Settings' },
];

function App() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [activeCampusStep, setActiveCampusStep] = useState(0);
  const [activeImportStep, setActiveImportStep] = useState(1);

  const selectedScreen = useMemo(
    () => screens.find((screen) => screen.id === activeScreen),
    [activeScreen],
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">CP</div>
          <div>
            <p className="eyebrow">Design mockup</p>
            <h1>Campus Planner</h1>
          </div>
        </div>

        <nav className="screen-nav" aria-label="Mockup screens">
          {screens.map((screen, index) => (
            <React.Fragment key={screen.id}>
              <button
                className={screen.id === activeScreen ? 'active' : ''}
                type="button"
                onClick={() => setActiveScreen(screen.id)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {screen.label}
              </button>
              {screen.id === 'campus' && (
                <div className="child-nav" aria-label="Campus configuration sections">
                  {campusSteps.map((step, stepIndex) => (
                    <button
                      key={step.title}
                      className={
                        activeScreen === 'campus' && activeCampusStep === stepIndex ? 'active' : ''
                      }
                      type="button"
                      onClick={() => {
                        setActiveScreen('campus');
                        setActiveCampusStep(stepIndex);
                      }}
                    >
                      <span>2.{stepIndex + 1}</span>
                      {step.title}
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-note">
          <strong>Mocked only</strong>
          <p>No API, auth, or persistence. This project is only for visual design iteration.</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Current screen</p>
            <h2>{selectedScreen.label}</h2>
          </div>
          <div className="tenant-chip">
            <span className="avatar">AM</span>
            North Campus Group
          </div>
        </header>

        {activeScreen === 'dashboard' && <DashboardScreen onAddCampus={() => setActiveScreen('campus')} />}
        {activeScreen === 'campus' && (
          <CampusScreen activeStep={activeCampusStep} onStepChange={setActiveCampusStep} />
        )}
        {activeScreen === 'import' && (
          <ImportScreen activeStep={activeImportStep} onStepChange={setActiveImportStep} />
        )}
        {activeScreen === 'booking' && <BookingScreen />}
        {activeScreen === 'settings' && <SettingsScreen />}
      </main>
    </div>
  );
}

function DashboardScreen({ onAddCampus }) {
  return (
    <ScreenShell>
      <section className="metrics-grid">
        <Metric label="Campuses" value="4" />
        <Metric label="Floor maps" value="28" />
        <Metric label="Bookings today" value="73" />
        <Metric label="Open issues" value="6" tone="warn" />
      </section>

      <section className="two-column">
        <Panel
          title="Campus Portfolio"
          subtitle="Operational status by site"
          action="Add campus"
          onAction={onAddCampus}
        >
          <div className="card-list">
            {campuses.map((campus) => (
              <article className="campus-card" key={campus.id}>
                <div>
                  <h3>{campus.name}</h3>
                  <p>{campus.buildings} buildings · {campus.floors} floors · {campus.rooms} rooms</p>
                </div>
                <div className="status-row">
                  <Badge tone={campus.status === 'Published' ? 'good' : 'warn'}>{campus.status}</Badge>
                  <Badge tone={campus.issues ? 'warn' : 'neutral'}>{campus.issues} issues</Badge>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Attention Queue" subtitle="Work that blocks publishing">
          <div className="task-list">
            <Task title="Review detected rooms in Science Hall" label="Import" />
            <Task title="Invite facilities editor" label="Users" />
            <Task title="Publish maps.university.test" label="Domain" />
            <Task title="Fix room outside footprint on Level 2" label="Geometry" urgent />
          </div>
        </Panel>
      </section>
    </ScreenShell>
  );
}

function CampusScreen({ activeStep, onStepChange }) {
  return (
    <ScreenShell>
      {activeStep === 0 && (
        <section className="map-layout">
          <CampusSetupCanvas activeStep={activeStep} />
          <Panel title={campusSteps[activeStep].title} subtitle={campusSteps[activeStep].summary}>
            <CampusSetupPanel />
          </Panel>
        </section>
      )}

      {activeStep === 1 && <CampusSpacesSetupPage />}
    </ScreenShell>
  );
}

function ImportScreen({ activeStep, onStepChange }) {
  return (
    <ScreenShell>
      <section className="step-strip">
        {floorImportSteps.map((step, index) => (
          <button
            type="button"
            key={step.title}
            className={index === activeStep ? 'active' : ''}
            onClick={() => onStepChange(index)}
          >
            <span>{index + 1}</span>
            <strong>{step.title}</strong>
            <small>{step.summary}</small>
          </button>
        ))}
      </section>

      <section className="map-layout">
        <FloorImportCanvas activeStep={activeStep} />
        <Panel title={floorImportSteps[activeStep].title} subtitle={floorImportSteps[activeStep].summary}>
          {activeStep === 0 && <SelectFloorPanel />}
          {activeStep === 1 && <UploadPanel />}
          {activeStep === 2 && <ConfigurePanel />}
          {activeStep === 3 && <ReviewPanel />}
          {activeStep === 4 && <PublishPanel />}
        </Panel>
      </section>
    </ScreenShell>
  );
}

function BookingScreen() {
  return (
    <ScreenShell>
      <section className="map-layout">
        <BookingMap />
        <Panel title="Book C203 Seminar Room" subtitle="Engineering Building · Level 2">
          <div className="booking-summary">
            <Badge tone="good">Available at 11:00</Badge>
            <Badge>24 seats</Badge>
            <Badge>Projector</Badge>
          </div>
          <div className="slot-grid">
            {bookingSlots.map((slot) => (
              <button key={slot.time} className={`slot ${slot.state}`} type="button">
                {slot.time}
              </button>
            ))}
          </div>
          <div className="form-stack">
            <label>
              Meeting title
              <input defaultValue="Licenta planning review" />
            </label>
            <label>
              Participants
              <input defaultValue="Ana, Mihai, Facilities Team" />
            </label>
            <label>
              Notes
              <textarea defaultValue="Bring latest floor import samples." />
            </label>
          </div>
          <button className="primary-action" type="button">Confirm booking</button>
        </Panel>
      </section>
    </ScreenShell>
  );
}

function SettingsScreen() {
  return (
    <ScreenShell>
      <section className="settings-layout">
        <aside className="settings-nav">
          <button className="active" type="button">Users and roles</button>
          <button type="button">Publishing</button>
          <button type="button">Domains</button>
          <button type="button">Branding</button>
          <button type="button">Audit log</button>
        </aside>
        <Panel title="Users and Access" subtitle="Role-based access for private maps" action="Invite user">
          <div className="table">
            <div className="table-row table-head">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
            </div>
            {users.map((user) => (
              <div className="table-row" key={user.name}>
                <strong>{user.name}</strong>
                <span>{user.role}</span>
                <Badge tone={user.status === 'Active' ? 'good' : 'warn'}>{user.status}</Badge>
              </div>
            ))}
          </div>
          <div className="domain-cards">
            <article>
              <strong>Private URL</strong>
              <p>north-campus.campusplanner.local</p>
              <Badge tone="good">Published</Badge>
            </article>
            <article>
              <strong>Custom domain</strong>
              <p>maps.university.test</p>
              <Badge tone="warn">DNS verification needed</Badge>
            </article>
          </div>
        </Panel>
      </section>
    </ScreenShell>
  );
}

function ScreenShell({ children }) {
  return <div className="screen-shell">{children}</div>;
}

function Panel({ title, subtitle, action, onAction, children }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {action && (
          <button className="secondary-action" type="button" onClick={onAction}>
            {action}
          </button>
        )}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function Metric({ label, value, tone = 'neutral' }) {
  return (
    <article className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Task({ title, label, urgent }) {
  return (
    <article className="task">
      <span>{title}</span>
      <Badge tone={urgent ? 'warn' : 'neutral'}>{label}</Badge>
    </article>
  );
}

function CampusSetupCanvas({ activeStep }) {
  const showSpaces = activeStep >= 1;
  return (
    <section className="map-panel">
      <svg viewBox="0 0 700 520" role="img" aria-label="Campus cadastral map configuration">
        <path d="M82 380 C180 310 224 320 300 250 C386 170 482 138 618 92" className="road" />
        <path d="M64 425 L118 112 L620 72 L660 405 L410 474 Z" className="campus-boundary" />
        {activeStep === 0 && (
          <g className="definition-layer">
            <circle cx="64" cy="425" r="9" />
            <text x="105" y="444" className="origin-label">Origin 0,0</text>
            <path d="M64 425 L118 112 L620 72 L660 405 L410 474 Z" />
          </g>
        )}
        <g className={activeStep === 0 ? 'uploaded-image active cadastral-image' : 'uploaded-image cadastral-image'}>
          <path d="M110 392 C194 326 236 318 300 250 C384 164 470 126 610 90" />
          <path d="M95 290 H632 M126 204 H602 M238 122 V448 M382 96 V470 M525 84 V428" />
        </g>
        {showSpaces && (
          <g>
            <rect x="175" y="155" width="130" height="84" rx="8" className="building" />
            <rect x="365" y="118" width="142" height="94" rx="8" className="building" />
            <rect x="230" y="305" width="155" height="74" rx="8" className="building" />
            <rect x="470" y="310" width="95" height="58" rx="28" className="outdoor" />
            <text x="240" y="201">Engineering</text>
            <text x="436" y="168">Library</text>
            <text x="308" y="350">Lab Annex</text>
            <text x="518" y="346" className="outdoor-label">Court A</text>
          </g>
        )}
      </svg>
      <div className="floating-toolbar">
        {activeStep === 0 && <button className="active" type="button">Import cadastral</button>}
        {activeStep === 0 && <button type="button">Set origin</button>}
        {activeStep === 0 && <button type="button">Footprint</button>}
        {activeStep === 1 && <button className="active" type="button">Add building</button>}
        {activeStep === 1 && <button type="button">Outdoor space</button>}
        {activeStep === 1 && <button type="button">POI</button>}
      </div>
    </section>
  );
}

function FloorImportCanvas({ activeStep }) {
  const showRooms = activeStep >= 2;
  return (
    <section className="map-panel">
      <svg viewBox="0 0 700 500" role="img" aria-label="Floor import canvas">
        <path d="M92 74 H612 V410 H465 V456 H92 Z" className="floor-footprint" />
        <g className={activeStep === 1 ? 'uploaded-image active' : 'uploaded-image'}>
          <rect x="118" y="102" width="462" height="286" rx="4" />
          <path d="M118 184 H580 M118 276 H580 M254 102 V388 M416 102 V388" />
        </g>
        {showRooms && (
          <g>
            <rect x="124" y="110" width="120" height="66" className="room ready" />
            <rect x="263" y="110" width="140" height="66" className="room ready" />
            <rect x="424" y="110" width="134" height="66" className="room selected" />
            <rect x="424" y="292" width="132" height="76" className="room warning" />
            <text x="184" y="149">C201</text>
            <text x="333" y="149">C202</text>
            <text x="491" y="149">C203</text>
            <text x="490" y="336">Missing capacity</text>
          </g>
        )}
        {activeStep === 1 && (
          <g className="transform-handles">
            <circle cx="118" cy="102" r="8" />
            <circle cx="580" cy="102" r="8" />
            <circle cx="580" cy="388" r="8" />
            <circle cx="118" cy="388" r="8" />
            <path d="M590 92 C618 94 628 113 620 138" />
          </g>
        )}
      </svg>
      <div className="floating-toolbar">
        {activeStep === 1 && <button className="active" type="button">Scale</button>}
        {activeStep === 1 && <button className="active" type="button">Rotate</button>}
        {activeStep === 2 && <button className="active" type="button">Add room</button>}
        {activeStep === 2 && <button type="button">Room form</button>}
        {activeStep === 3 && <Badge tone="warn">4 warnings</Badge>}
        {activeStep === 4 && <Badge tone="good">Ready</Badge>}
      </div>
    </section>
  );
}

function BookingMap() {
  return (
    <section className="map-panel">
      <svg viewBox="0 0 700 500" role="img" aria-label="Booking map">
        <path d="M90 100 H610 V395 H455 V445 H90 Z" className="floor-footprint" />
        <path d="M90 190 H610 M90 295 H610 M230 100 V445 M380 100 V395 M515 100 V395" className="floor-lines" />
        <rect x="392" y="112" width="110" height="66" className="room selected" />
        <path d="M145 345 H296 V320 H448 V178" className="route" />
        <circle cx="145" cy="345" r="10" className="location-dot" />
        <text x="447" y="151">C203</text>
      </svg>
      <div className="floating-toolbar">
        <Badge tone="good">4 min walk</Badge>
        <Badge>Level 2</Badge>
      </div>
    </section>
  );
}

function CampusSetupPanel() {
  return (
    <div className="form-stack">
      <label>
        Campus name
        <input defaultValue="Main Academic Campus" />
      </label>
      <label>
        Timezone
        <input defaultValue="Europe/Bucharest" />
      </label>
      <div className="dropzone">
        <strong>main-campus-cadastral.png</strong>
        <span>Mock cadastral map imported. Align it, then use the footprint GeoJSON as the campus boundary.</span>
      </div>
      <label>
        Origin
        <input defaultValue="0, 0 at south-west campus boundary point" />
      </label>
      <label>
        Campus footprint GeoJSON
        <textarea
          className="geojson-input"
          defaultValue={`{
  "type": "Polygon",
  "coordinates": [
    [
      [0, 0],
      [54, -313],
      [556, -353],
      [596, -20],
      [346, 49],
      [0, 0]
    ]
  ]
}`}
        />
      </label>
      <label>Move X <input type="range" min="-100" max="100" defaultValue="8" /></label>
      <label>Move Y <input type="range" min="-100" max="100" defaultValue="-12" /></label>
      <label>Scale <input type="range" min="50" max="140" defaultValue="96" /></label>
      <label>Rotation <input type="range" min="-10" max="10" defaultValue="1" /></label>
      <div className="task-list">
        <Task title="Cadastral map aligned to campus footprint" label="Draft" />
        <Task title="Campus boundary GeoJSON closes correctly" label="Valid" />
      </div>
    </div>
  );
}

function CampusSpacesSetupPage() {
  return (
    <section className="map-layout side-first">
      <div className="side-stack">
        <Panel title="Campus setup" subtitle="Create or edit the campus-level configuration" action="Save campus">
          <div className="form-stack">
            <label>
              Campus name
              <input defaultValue="Main Academic Campus" />
            </label>
            <label>
              Timezone
              <input defaultValue="Europe/Bucharest" />
            </label>
            <label>
              Boundary source
              <input defaultValue="Draw on map or paste GeoJSON later" />
            </label>
          </div>
        </Panel>
        <Panel title="Spaces" subtitle="Buildings and outdoor resources" action="Draw space">
          <div className="card-list">
            {spaces.map((space) => (
              <article className="compact-card" key={space.name}>
                <div>
                  <h3>{space.name}</h3>
                  <p>{space.type} · {space.details}</p>
                </div>
                <Badge tone={space.state === 'Ready' ? 'good' : 'warn'}>{space.state}</Badge>
              </article>
            ))}
          </div>
        </Panel>
      </div>
      <CampusSpacesMap />
    </section>
  );
}

function CampusSpacesMap() {
  return (
    <section className="map-panel">
      <svg viewBox="0 0 700 520" role="img" aria-label="Campus spaces configuration map">
        <path d="M82 380 C180 310 224 320 300 250 C386 170 482 138 618 92" className="road" />
        <path d="M64 425 L118 112 L620 72 L660 405 L410 474 Z" className="campus-boundary" />
        <rect x="175" y="155" width="130" height="84" rx="8" className="building" />
        <rect x="365" y="118" width="142" height="94" rx="8" className="building" />
        <rect x="230" y="305" width="155" height="74" rx="8" className="building" />
        <rect x="470" y="310" width="95" height="58" rx="28" className="outdoor" />
        <text x="240" y="201">Engineering</text>
        <text x="436" y="168">Library</text>
        <text x="308" y="350">Lab Annex</text>
        <text x="518" y="346" className="outdoor-label">Court A</text>
      </svg>
      <div className="floating-toolbar">
        <button className="active" type="button">Buildings</button>
        <button type="button">Spaces</button>
        <button type="button">POIs</button>
      </div>
    </section>
  );
}

function SelectFloorPanel() {
  return (
    <div className="form-stack">
      <label>Building <input defaultValue="Engineering Building" /></label>
      <label>Floor label <input defaultValue="Level 2" /></label>
      <label>Footprint source <input defaultValue="Existing building footprint" /></label>
    </div>
  );
}

function UploadPanel() {
  return (
    <div className="form-stack">
      <div className="dropzone">
        <strong>engineering-level-2.png</strong>
        <span>Image uploaded. Adjust it over the footprint before configuring rooms.</span>
      </div>
      <label>Scale <input type="range" min="50" max="140" defaultValue="92" /></label>
      <label>Rotation <input type="range" min="-10" max="10" defaultValue="-2" /></label>
      <label>Opacity <input type="range" min="20" max="100" defaultValue="72" /></label>
    </div>
  );
}

function ConfigurePanel() {
  return (
    <div className="card-list">
      <div className="inline-form-title">
        <strong>Room definition form</strong>
        <span>Define rooms and labels on top of the aligned floor image.</span>
      </div>
      <div className="card-list">
        <article className="compact-card"><span>C201 Seminar</span><Badge tone="good">Ready</Badge></article>
        <article className="compact-card"><span>C202 Lab</span><Badge tone="good">Ready</Badge></article>
        <article className="compact-card"><span>C203 Seminar</span><Badge>Selected</Badge></article>
        <article className="compact-card"><span>Unnamed room</span><Badge tone="warn">Missing capacity</Badge></article>
      </div>
      <button className="primary-action" type="button">Add room</button>
    </div>
  );
}

function ReviewPanel() {
  return (
    <div className="task-list">
      <Task title="One room is missing capacity" label="Warning" urgent />
      <Task title="All rooms are inside the footprint" label="Valid" />
      <Task title="Floor image is aligned" label="Ready" />
    </div>
  );
}

function PublishPanel() {
  return (
    <div className="publish-card">
      <strong>Ready to publish</strong>
      <p>This floor will become available for room booking after publication.</p>
      <button className="primary-action" type="button">Publish floor</button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

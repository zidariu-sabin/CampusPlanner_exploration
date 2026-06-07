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

const campusSetupSteps = [
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

const floorImportSteps = [
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

const memberMeetings = [
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

const memberRooms = [
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

const users = [
  { name: 'Ana Marinescu', role: 'Admin', status: 'Active' },
  { name: 'Mihai Pop', role: 'Editor', status: 'Active' },
  { name: 'Facilities Team', role: 'Viewer', status: 'Pending' },
  { name: 'External Partner', role: 'Viewer', status: 'Restricted' },
];

const screens = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'campus', label: 'Campus Configuration' },
  { id: 'import', label: 'Space configuration' },
  {
    id: 'booking',
    label: 'Room Booking',
    children: [
      { id: 'booking', label: 'Book room' },
      { id: 'booking-detail', label: 'Booking detail' },
    ],
  },
  { id: 'settings', label: 'Organization settings' },
];

const memberScreens = [
  { id: 'member-dashboard', label: 'Dashboard' },
  { id: 'member-map', label: 'Map View' },
  {
    id: 'member-booking',
    label: 'Room Booking',
    children: [
      { id: 'member-booking', label: 'Book room' },
      { id: 'member-booking-detail', label: 'Booking detail' },
    ],
  },
];

function App() {
  const [activeRole, setActiveRole] = useState('admin');
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [activeCampusStep, setActiveCampusStep] = useState(0);
  const [activeCampusSetupStep, setActiveCampusSetupStep] = useState(0);
  const [activeImportStep, setActiveImportStep] = useState(1);
  const visibleScreens = activeRole === 'admin' ? screens : memberScreens;

  const selectedScreen = useMemo(
    () => (
      visibleScreens.find((screen) => screen.id === activeScreen)
      ?? visibleScreens.flatMap((screen) => screen.children ?? []).find((screen) => screen.id === activeScreen)
      ?? visibleScreens[0]
    ),
    [activeScreen, visibleScreens],
  );

  function handleRoleChange(role) {
    setActiveRole(role);
    if (role === 'member') {
      setActiveScreen('member-dashboard');
    } else {
      setActiveScreen('dashboard');
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">CP</div>
          <div className="brand-copy">
            <div className="brand-meta-row">
              <p className="eyebrow">Design mockup</p>
              <div className="role-toggle compact" aria-label="View as">
                <button
                  className={activeRole === 'admin' ? 'active' : ''}
                  type="button"
                  onClick={() => handleRoleChange('admin')}
                >
                  Admin
                </button>
                <button
                  className={activeRole === 'member' ? 'active' : ''}
                  type="button"
                  onClick={() => handleRoleChange('member')}
                >
                  Member
                </button>
              </div>
            </div>
            <h1>Campus Planner</h1>
          </div>
        </div>

        <nav className="screen-nav" aria-label="Mockup screens">
          {visibleScreens.map((screen, index) => (
            <React.Fragment key={screen.id}>
              <button
                className={
                  screen.id === activeScreen || screen.children?.some((child) => child.id === activeScreen)
                    ? 'active'
                    : ''
                }
                type="button"
                onClick={() => setActiveScreen(screen.id)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {screen.label}
              </button>
              {activeRole === 'admin' && screen.id === 'campus' && (
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
                        if (stepIndex === 0) {
                          setActiveCampusSetupStep(0);
                        }
                      }}
                    >
                      <span>2.{stepIndex + 1}</span>
                      {step.title}
                    </button>
                  ))}
                </div>
              )}
              {screen.children && screen.id !== 'campus' && (
                <div className="child-nav" aria-label={`${screen.label} sections`}>
                  {screen.children.map((child, childIndex) => (
                    <button
                      key={child.id}
                      className={activeScreen === child.id ? 'active' : ''}
                      type="button"
                      onClick={() => setActiveScreen(child.id)}
                    >
                      <span>{index + 1}.{childIndex + 1}</span>
                      {child.label}
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
            <p className="eyebrow">Current screen · {activeRole} view</p>
            <h2>{selectedScreen.label}</h2>
          </div>
          <div className="tenant-chip">
            <span className="avatar">{activeRole === 'admin' ? 'AM' : 'IM'}</span>
            {activeRole === 'admin' ? 'North Campus Group' : 'Ioana · Member'}
          </div>
        </header>

        {activeRole === 'admin' && activeScreen === 'dashboard' && <DashboardScreen onAddCampus={() => setActiveScreen('campus')} />}
        {activeRole === 'admin' && activeScreen === 'campus' && (
          <CampusScreen
            activeStep={activeCampusStep}
            setupStep={activeCampusSetupStep}
            onOpenSpacesSetup={() => setActiveCampusStep(1)}
            onSetupStepChange={setActiveCampusSetupStep}
          />
        )}
        {activeRole === 'admin' && activeScreen === 'import' && (
          <ImportScreen activeStep={activeImportStep} onStepChange={setActiveImportStep} />
        )}
        {activeRole === 'admin' && activeScreen === 'booking' && <MemberRoomBookingScreen />}
        {activeRole === 'admin' && activeScreen === 'booking-detail' && <MemberBookingDetailScreen />}
        {activeRole === 'member' && activeScreen === 'member-dashboard' && (
          <MemberDashboardScreen
            onOpenBookingDetail={() => setActiveScreen('member-booking-detail')}
            onOpenMap={() => setActiveScreen('member-map')}
          />
        )}
        {activeRole === 'member' && activeScreen === 'member-map' && <MemberMapScreen />}
        {activeRole === 'member' && activeScreen === 'member-booking' && <MemberRoomBookingScreen />}
        {activeRole === 'member' && activeScreen === 'member-booking-detail' && <MemberBookingDetailScreen />}
        {activeRole === 'admin' && activeScreen === 'settings' && <SettingsScreen />}
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

function CampusScreen({ activeStep, setupStep, onOpenSpacesSetup, onSetupStepChange }) {
  return (
    <ScreenShell>
      {activeStep === 0 && (
        <CampusSetupWorkflow
          activeStep={setupStep}
          onOpenSpacesSetup={onOpenSpacesSetup}
          onStepChange={onSetupStepChange}
        />
      )}

      {activeStep === 1 && <CampusSpacesSetupPage />}
    </ScreenShell>
  );
}

function CampusSetupWorkflow({ activeStep, onOpenSpacesSetup, onStepChange }) {
  if (activeStep === 2) {
    return (
      <>
        <CampusSetupStepStrip activeStep={activeStep} onStepChange={onStepChange} />
        <CampusDefineSpacesStep onOpenSpacesSetup={onOpenSpacesSetup} />
      </>
    );
  }

  return (
    <>
      <CampusSetupStepStrip activeStep={activeStep} onStepChange={onStepChange} />
      <section className="map-layout">
        <CampusSetupCanvas activeStep={activeStep} />
        <Panel title={campusSetupSteps[activeStep].title} subtitle={campusSetupSteps[activeStep].summary}>
          {activeStep === 0 && <CampusDefinitionPanel />}
          {activeStep === 1 && <CampusUploadPanel />}
        </Panel>
      </section>
    </>
  );
}

function CampusSetupStepStrip({ activeStep, onStepChange }) {
  return (
    <section className="step-strip compact-step-strip">
      {campusSetupSteps.map((step, index) => (
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

function MemberDashboardScreen({ onOpenBookingDetail, onOpenMap }) {
  return (
    <ScreenShell>
      <section className="metrics-grid">
        <Metric label="Today" value="3" />
        <Metric label="This week" value="9" />
        <Metric label="My bookings" value="4" />
        <Metric label="Next starts in" value="25m" tone="warn" />
      </section>

      <section className="two-column">
        <Panel title="My planned meetings" subtitle="What is planned and where to find it" action="Book a room">
          <div className="card-list">
            {memberMeetings.map((meeting) => (
              <button
                className="member-meeting-card"
                key={`${meeting.time}-${meeting.title}`}
                type="button"
                onClick={onOpenBookingDetail}
              >
                <div className={`meeting-time meeting-time-${meeting.tone}`}>{meeting.time}</div>
                <div>
                  <h3>{meeting.title}</h3>
                  <p>{meeting.location}</p>
                  <div className="status-row">
                    {meeting.details.split(' · ').map((detail) => (
                      <Badge key={detail}>{detail}</Badge>
                    ))}
                  </div>
                </div>
                <span className="secondary-action as-static-action">Details</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Next meeting route" subtitle="Engineering Building C203">
          <div className="route-steps">
            <RouteStep number="1">Enter Main Campus through North Gate.</RouteStep>
            <RouteStep number="2">Walk to Engineering Building, east entrance.</RouteStep>
            <RouteStep number="3">Take stairs or elevator to Level 2.</RouteStep>
            <RouteStep number="4">Room C203 is on the right side of Corridor C.</RouteStep>
          </div>
          <button className="primary-action" type="button" onClick={onOpenMap}>Open map view</button>
        </Panel>
      </section>
    </ScreenShell>
  );
}

function MemberMapScreen() {
  return (
    <ScreenShell>
      <section className="map-layout side-first">
        <Panel title="Find a campus space" subtitle="Search only member-visible bookable rooms">
          <div className="form-stack">
            <label>
              Campus
              <input defaultValue="Main Academic Campus" />
            </label>
            <label>
              Need
              <input defaultValue="Meeting room" />
            </label>
            <label>
              Capacity
              <input defaultValue="6 or more people" />
            </label>
            <div className="task-list">
              <Task title="Available now" label="12 rooms" />
              <Task title="Projector" label="7 rooms" />
              <Task title="Whiteboard" label="10 rooms" />
            </div>
          </div>
        </Panel>
        <MemberCampusMap />
      </section>
    </ScreenShell>
  );
}

function MemberRoomBookingScreen() {
  return (
    <ScreenShell>
      <section className="map-layout">
        <Panel title="Available rooms" subtitle="Tuesday, June 9 · 11:00 - 12:00">
          <div className="form-stack">
            <label>
              Meeting title
              <input defaultValue="Licenta planning review" />
            </label>
            <label>
              Participants
              <input defaultValue="Alice, Bob, Charlie" />
            </label>
            <div className="card-list">
              {memberRooms.map((room) => (
                <article className="member-room-card" key={room.name}>
                  <div>
                    <h3>{room.name}</h3>
                    <p>{room.location}</p>
                    <div className="status-row">
                      {room.details.map((detail, detailIndex) => (
                        <Badge key={detail} tone={detailIndex === 0 ? 'good' : 'neutral'}>{detail}</Badge>
                      ))}
                    </div>
                  </div>
                  <button className={room.selected ? 'primary-action' : 'secondary-action'} type="button">
                    {room.selected ? 'Selected' : 'Select'}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Book C203 Seminar Room" subtitle="Engineering Building · Level 2">
          <div className="booking-summary">
            <Badge tone="good">Available at 11:00</Badge>
            <Badge>8 seats</Badge>
            <Badge>Projector</Badge>
          </div>
          <div className="slot-grid">
            {bookingSlots.map((slot) => (
              <button key={slot.time} className={`slot ${slot.state}`} type="button">
                {slot.time}
              </button>
            ))}
          </div>
          <div className="booking-detail-card">
            <div><span>Room</span><strong>C203 Seminar</strong></div>
            <div><span>Floor</span><strong>Level 2, Corridor C</strong></div>
            <div><span>Organizer</span><strong>Ioana Marinescu</strong></div>
          </div>
          <button className="primary-action" type="button">Confirm booking</button>
        </Panel>
      </section>
    </ScreenShell>
  );
}

function MemberBookingDetailScreen() {
  return (
    <ScreenShell>
      <section className="map-layout">
        <BookingMap />
        <Panel title="Licenta planning review" subtitle="Tuesday, June 9 · 11:00 - 12:00">
          <div className="booking-summary">
            <Badge tone="good">Confirmed</Badge>
            <Badge>Engineering C203</Badge>
            <Badge>Level 2</Badge>
          </div>
          <div className="booking-detail-card">
            <div><span>Room</span><strong>C203 Seminar</strong></div>
            <div><span>Floor</span><strong>Level 2, Corridor C</strong></div>
            <div><span>Organizer</span><strong>Ioana Marinescu</strong></div>
            <div><span>Guests</span><strong>Alice, Bob, Charlie</strong></div>
          </div>
          <div className="route-steps">
            <RouteStep number="1">Start from Engineering east entrance.</RouteStep>
            <RouteStep number="2">Go straight to Corridor C.</RouteStep>
            <RouteStep number="3">Turn right after the elevator lobby.</RouteStep>
            <RouteStep number="4">C203 is reserved until 12:00.</RouteStep>
          </div>
          <button className="primary-action" type="button">Start navigation</button>
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

function RouteStep({ number, children }) {
  return (
    <div className="route-step">
      <span>{number}</span>
      <p>{children}</p>
    </div>
  );
}

function MemberCampusMap() {
  return (
    <section className="map-panel">
      <svg viewBox="0 0 700 520" role="img" aria-label="Member campus map">
        <path d="M74 418 L116 112 L615 76 L660 405 L414 476 Z" className="campus-boundary" />
        <path d="M95 395 C190 320 236 324 309 250 C394 166 482 140 620 95" className="road" />
        <rect x="165" y="150" width="140" height="88" rx="8" className="building" />
        <rect x="366" y="116" width="144" height="94" rx="8" className="building" />
        <rect x="228" y="306" width="158" height="76" rx="8" className="building" />
        <rect x="472" y="310" width="96" height="60" rx="28" className="outdoor" />
        <circle cx="236" cy="150" r="12" className="availability-dot" />
        <circle cx="436" cy="116" r="12" className="availability-dot" />
        <circle cx="308" cy="306" r="12" className="availability-dot warn" />
        <text x="235" y="200">Engineering</text>
        <text x="438" y="168">Library</text>
        <text x="307" y="352">Innovation</text>
        <text x="520" y="346" className="outdoor-label">Court A</text>
      </svg>
      <div className="floating-toolbar">
        <button className="active" type="button">All spaces</button>
        <button type="button">Available now</button>
        <Badge tone="good">12 available</Badge>
      </div>
    </section>
  );
}

function CampusSetupCanvas({ activeStep }) {
  const showSpaces = activeStep >= 2;
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
        <g className={activeStep === 1 ? 'uploaded-image active cadastral-image' : 'uploaded-image cadastral-image'}>
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
        {activeStep === 0 && <button type="button">Set origin</button>}
        {activeStep === 0 && <button className="active" type="button">Footprint</button>}
        {activeStep === 1 && <button className="active" type="button">Move</button>}
        {activeStep === 1 && <button className="active" type="button">Scale</button>}
        {activeStep === 1 && <button className="active" type="button">Rotate</button>}
      </div>
    </section>
  );
}

function FloorImportCanvas({ activeStep }) {
  const showRooms = activeStep >= 2;
  return (
    <section className="map-panel">
      <svg viewBox="0 0 700 500" role="img" aria-label="Space configuration canvas">
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

function CampusDefinitionPanel() {
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
      <div className="task-list">
        <Task title="Campus boundary GeoJSON closes correctly" label="Valid" />
        <Task title="Coordinate origin is visible on canvas" label="Ready" />
      </div>
    </div>
  );
}

function CampusUploadPanel() {
  return (
    <div className="form-stack">
      <div className="dropzone">
        <strong>main-campus-cadastral.png</strong>
        <span>Mock cadastral image uploaded. Move, scale, and rotate it until it matches the footprint.</span>
      </div>
      <label>Move X <input type="range" min="-100" max="100" defaultValue="8" /></label>
      <label>Move Y <input type="range" min="-100" max="100" defaultValue="-12" /></label>
      <label>Scale <input type="range" min="50" max="140" defaultValue="96" /></label>
      <label>Rotation <input type="range" min="-10" max="10" defaultValue="1" /></label>
      <label>Opacity <input type="range" min="20" max="100" defaultValue="78" /></label>
      <div className="task-list">
        <Task title="Cadastral map aligned to campus footprint" label="Draft" />
        <Task title="Image remains inside visible campus bounds" label="Ready" />
      </div>
    </div>
  );
}

function CampusDefineSpacesStep({ onOpenSpacesSetup }) {
  return (
    <section className="map-layout">
      <CampusSetupCanvas activeStep={2} />
      <Panel
        title="Define spaces"
        subtitle="Choose an existing space to configure, or add a new building/outdoor resource."
        action="Add space"
        onAction={onOpenSpacesSetup}
      >
        <div className="form-stack">
          <div className="inline-form-title">
            <strong>Space selection</strong>
            <span>
              This is the intermediary step. Opening a space takes you to the detailed Spaces setup page.
            </span>
          </div>
          <div className="card-list">
            {spaces.map((space) => (
              <button
                className="space-select-card"
                key={space.name}
                type="button"
                onClick={onOpenSpacesSetup}
              >
                <div>
                  <strong>{space.name}</strong>
                  <p>{space.type} · {space.details}</p>
                </div>
                <Badge tone={space.state === 'Ready' ? 'good' : 'warn'}>{space.state}</Badge>
              </button>
            ))}
          </div>
        </div>
      </Panel>
    </section>
  );
}

function CampusSpacesSetupPage() {
  return (
    <section className="map-layout side-first">
      <div className="side-stack">
        <Panel title="Space details" subtitle="Information about the selected campus space" action="Save space">
          <div className="form-stack">
            <label>
              Space name
              <input defaultValue="Engineering Building" />
            </label>
            <label>
              Space type
              <input defaultValue="Building" />
            </label>
            <label>
              Internal reference
              <input defaultValue="ENG-BLDG" />
            </label>
            <label>
              Bookable mode
              <input defaultValue="Not directly bookable - floors and rooms are bookable" />
            </label>
          </div>
        </Panel>

        <Panel title="Space localization" subtitle="Coordinates saved for future search, routing, and floor assignment">
          <div className="form-stack">
            <label>
              Space footprint GeoJSON
              <textarea
                className="geojson-input space-geojson-input"
                defaultValue={`{
  "type": "Polygon",
  "coordinates": [
    [
      [175, 155],
      [305, 155],
      [305, 239],
      [175, 239],
      [175, 155]
    ]
  ]
}`}
              />
            </label>
            <div className="task-list">
              <Task title="Space footprint is inside campus boundary" label="Valid" />
              <Task title="Drag polygon on canvas to reposition" label="Mocked" />
            </div>
          </div>
        </Panel>

        <Panel title="Existing spaces" subtitle="Other spaces in this campus">
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
      <CampusSpaceDefinitionCanvas />
    </section>
  );
}

function CampusSpaceDefinitionCanvas() {
  return (
    <section className="map-panel">
      <svg viewBox="0 0 700 520" role="img" aria-label="Campus space definition canvas">
        <path d="M82 380 C180 310 224 320 300 250 C386 170 482 138 618 92" className="road" />
        <path d="M64 425 L118 112 L620 72 L660 405 L410 474 Z" className="campus-boundary" />
        <rect x="365" y="118" width="142" height="94" rx="8" className="building muted-space" />
        <rect x="230" y="305" width="155" height="74" rx="8" className="building muted-space" />
        <rect x="470" y="310" width="95" height="58" rx="28" className="outdoor muted-space" />
        <g className="selected-space-shape">
          <rect x="175" y="155" width="130" height="84" rx="8" />
          <rect x="168" y="148" width="14" height="14" />
          <rect x="298" y="148" width="14" height="14" />
          <rect x="298" y="232" width="14" height="14" />
          <rect x="168" y="232" width="14" height="14" />
        </g>
        <path d="M175 255 H305" className="move-guide" />
        <text x="240" y="201">Engineering</text>
        <text x="436" y="168">Library</text>
        <text x="308" y="350">Lab Annex</text>
        <text x="518" y="346" className="outdoor-label">Court A</text>
      </svg>
      <div className="floating-toolbar">
        <button className="active" type="button">Draw footprint</button>
        <button className="active" type="button">Move</button>
        <button type="button">Resize</button>
        <button type="button">Validate</button>
      </div>
    </section>
  );
}

function SelectFloorPanel() {
  return (
    <div className="form-stack">
      <label>Campus space <input defaultValue="Engineering Building" /></label>
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
        <span>Define rooms and labels on top of the aligned space plan image.</span>
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
      <Task title="Space plan image is aligned" label="Ready" />
    </div>
  );
}

function PublishPanel() {
  return (
    <div className="publish-card">
      <strong>Ready to publish</strong>
      <p>This configured space will become available for room booking after publication.</p>
      <button className="primary-action" type="button">Publish space</button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

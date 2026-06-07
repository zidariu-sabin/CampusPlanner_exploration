import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminDashboardScreen } from './features/admin/DashboardScreen';
import { CampusConfigurationScreen } from './features/admin/CampusConfigurationScreen';
import { SettingsScreen } from './features/admin/SettingsScreen';
import { SpaceConfigurationScreen } from './features/admin/SpaceConfigurationScreen';
import { BookingDetailScreen } from './features/booking/BookingDetailScreen';
import { RoomBookingScreen } from './features/booking/RoomBookingScreen';
import { campusSteps } from './features/data';
import { adminScreens, featureSpecs, findScreenById, memberScreens } from './features/featureRegistry';
import { MemberDashboardScreen } from './features/member/DashboardScreen';
import { MemberMapViewScreen } from './features/member/MapViewScreen';
import './styles.css';

function App() {
  const [activeRole, setActiveRole] = useState('admin');
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [activeCampusStep, setActiveCampusStep] = useState(0);
  const [activeCampusSetupStep, setActiveCampusSetupStep] = useState(0);
  const [activeImportStep, setActiveImportStep] = useState(1);
  const visibleScreens = activeRole === 'admin' ? adminScreens : memberScreens;

  const selectedScreen = useMemo(
    () => findScreenById(visibleScreens, activeScreen),
    [activeScreen, visibleScreens],
  );
  const selectedFeatureSpec = featureSpecs[selectedScreen.feature];

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
            {selectedFeatureSpec && (
              <p className="feature-spec-reference">
                Feature spec: <span>{selectedFeatureSpec.specPath}</span>
              </p>
            )}
          </div>
          <div className="tenant-chip">
            <span className="avatar">{activeRole === 'admin' ? 'AM' : 'IM'}</span>
            {activeRole === 'admin' ? 'North Campus Group' : 'Ioana · Member'}
          </div>
        </header>

        <FeatureRenderer
          activeCampusSetupStep={activeCampusSetupStep}
          activeCampusStep={activeCampusStep}
          activeImportStep={activeImportStep}
          activeRole={activeRole}
          activeScreen={activeScreen}
          onActiveCampusSetupStepChange={setActiveCampusSetupStep}
          onActiveCampusStepChange={setActiveCampusStep}
          onActiveImportStepChange={setActiveImportStep}
          onActiveScreenChange={setActiveScreen}
        />
      </main>
    </div>
  );
}


function FeatureRenderer({
  activeCampusSetupStep,
  activeCampusStep,
  activeImportStep,
  activeRole,
  activeScreen,
  onActiveCampusSetupStepChange,
  onActiveCampusStepChange,
  onActiveImportStepChange,
  onActiveScreenChange,
}) {
  if (activeRole === 'admin' && activeScreen === 'dashboard') {
    return <AdminDashboardScreen onAddCampus={() => onActiveScreenChange('campus')} />;
  }

  if (activeRole === 'admin' && activeScreen === 'campus') {
    return (
      <CampusConfigurationScreen
        activeStep={activeCampusStep}
        setupStep={activeCampusSetupStep}
        onOpenSpacesSetup={() => onActiveCampusStepChange(1)}
        onSetupStepChange={onActiveCampusSetupStepChange}
      />
    );
  }

  if (activeRole === 'admin' && activeScreen === 'import') {
    return <SpaceConfigurationScreen activeStep={activeImportStep} onStepChange={onActiveImportStepChange} />;
  }

  if (activeRole === 'admin' && activeScreen === 'settings') {
    return <SettingsScreen />;
  }

  if (activeRole === 'member' && activeScreen === 'member-dashboard') {
    return (
      <MemberDashboardScreen
        onOpenBookingDetail={() => onActiveScreenChange('member-booking-detail')}
        onOpenMap={() => onActiveScreenChange('member-map')}
      />
    );
  }

  if (activeRole === 'member' && activeScreen === 'member-map') {
    return <MemberMapViewScreen />;
  }

  if (
    (activeRole === 'admin' && activeScreen === 'booking')
    || (activeRole === 'member' && activeScreen === 'member-booking')
  ) {
    return <RoomBookingScreen />;
  }

  if (
    (activeRole === 'admin' && activeScreen === 'booking-detail')
    || (activeRole === 'member' && activeScreen === 'member-booking-detail')
  ) {
    return <BookingDetailScreen />;
  }

  return <AdminDashboardScreen onAddCampus={() => onActiveScreenChange('campus')} />;
}

createRoot(document.getElementById('root')).render(<App />);

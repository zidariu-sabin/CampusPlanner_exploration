import React from 'react';
import { Badge, Panel, ScreenShell, Task } from '../common/ui';
import { campusSetupSteps, spaces } from '../data';

export function CampusConfigurationScreen({ activeStep, setupStep, onOpenSpacesSetup, onSetupStepChange }) {
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

import React from 'react';
import { Badge, Panel, ScreenShell, Task } from '../common/ui';
import { floorImportSteps } from '../data';

export function SpaceConfigurationScreen({ activeStep, onStepChange }) {
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

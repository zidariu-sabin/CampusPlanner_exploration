import React, { useState } from 'react';
import { spaces } from '../data';

/*
Define-spaces redesign lab.

Compares three list treatments for the "Campus spaces" list against the current
plain card list, plus a reworked space form (segmented type selector, bookable
switch, footprint status, clear actions). Visual-only — for picking a direction
before porting to the Angular app.
*/

function kindOf(space) {
  const t = `${space.type} ${space.name}`.toLowerCase();
  if (t.includes('building')) return 'building';
  if (t.includes('court') || t.includes('tennis') || t.includes('field')) return 'court';
  if (t.includes('parking')) return 'parking';
  return 'outdoor';
}

const KIND_LABEL = {
  building: 'Building',
  court: 'Court / field',
  parking: 'Parking',
  outdoor: 'Outdoor area',
};

function SpaceIcon({ kind }) {
  const p = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (kind === 'building') {
    return (
      <svg {...p}><rect x="3.5" y="2.5" width="11" height="13" rx="1" /><path d="M6.5 6h1M10.5 6h1M6.5 9h1M10.5 9h1M7 15.5v-3h4v3" /></svg>
    );
  }
  if (kind === 'court') {
    return (
      <svg {...p}><rect x="2.5" y="4.5" width="13" height="9" rx="1" /><path d="M9 4.5v9M2.5 9h13" /><circle cx="9" cy="9" r="1.6" /></svg>
    );
  }
  if (kind === 'parking') {
    return (
      <svg {...p}><rect x="3" y="3" width="12" height="12" rx="2.5" /><path d="M7 13V5h2.6a2.2 2.2 0 010 4.4H7" /></svg>
    );
  }
  return (
    <svg {...p}><path d="M9 15.5v-5" /><path d="M5.5 10.5a3.5 3.5 0 017 0z" /><path d="M9 7.5a2.2 2.2 0 010-4.4 2.2 2.2 0 010 4.4z" /></svg>
  );
}

const decorated = spaces.map((s) => ({ ...s, kind: kindOf(s) }));

function Status({ state }) {
  const good = state === 'Ready';
  return <span className={`ds-status ${good ? 'is-good' : 'is-warn'}`}>{state}</span>;
}

/* ---- Option A — compact rows with icon, meta, status, selected accent ---- */
function ListCompact() {
  const [selected, setSelected] = useState('Engineering Building');
  return (
    <div className="ds-rows">
      {decorated.map((s) => (
        <button
          key={s.name}
          type="button"
          className={`ds-row ${selected === s.name ? 'is-selected' : ''}`}
          onClick={() => setSelected(s.name)}
        >
          <span className={`ds-ico ds-ico-${s.kind}`}><SpaceIcon kind={s.kind} /></span>
          <span className="ds-row-main">
            <strong>{s.name}</strong>
            <small>{KIND_LABEL[s.kind]} · {s.details}</small>
          </span>
          <Status state={s.state} />
        </button>
      ))}
    </div>
  );
}

/* ---- Option B — grouped by category with counts ---- */
function ListGrouped() {
  const [selected, setSelected] = useState('Engineering Building');
  const groups = [
    { key: 'building', label: 'Buildings' },
    { key: 'court', label: 'Courts & fields' },
    { key: 'parking', label: 'Parking' },
    { key: 'outdoor', label: 'Outdoor areas' },
  ];
  return (
    <div className="ds-grouped">
      {groups.map((g) => {
        const items = decorated.filter((s) => s.kind === g.key);
        if (items.length === 0) return null;
        return (
          <div className="ds-group" key={g.key}>
            <div className="ds-group-head">
              <span>{g.label}</span>
              <span className="ds-count">{items.length}</span>
            </div>
            {items.map((s) => (
              <button
                key={s.name}
                type="button"
                className={`ds-row ds-row-sm ${selected === s.name ? 'is-selected' : ''}`}
                onClick={() => setSelected(s.name)}
              >
                <span className={`ds-ico ds-ico-${s.kind}`}><SpaceIcon kind={s.kind} /></span>
                <span className="ds-row-main">
                  <strong>{s.name}</strong>
                  <small>{s.details}</small>
                </span>
                <Status state={s.state} />
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Option C — search + filter chips + list (scales to many) ---- */
function ListFiltered() {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState('Engineering Building');
  const chips = [
    { key: 'all', label: 'All' },
    { key: 'building', label: 'Buildings' },
    { key: 'court', label: 'Courts' },
    { key: 'parking', label: 'Parking' },
  ];
  const counts = decorated.reduce((acc, s) => ({ ...acc, [s.kind]: (acc[s.kind] || 0) + 1 }), { all: decorated.length });
  const list = filter === 'all' ? decorated : decorated.filter((s) => s.kind === filter);
  return (
    <div className="ds-filtered">
      <div className="ds-search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4.5" /><path d="M11 11l3 3" strokeLinecap="round" /></svg>
        <input placeholder="Search spaces" />
      </div>
      <div className="ds-chips">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`ds-chip ${filter === c.key ? 'is-active' : ''}`}
            onClick={() => setFilter(c.key)}
          >
            {c.label}<span className="ds-chip-count">{counts[c.key] || 0}</span>
          </button>
        ))}
      </div>
      <div className="ds-rows">
        {list.map((s) => (
          <button
            key={s.name}
            type="button"
            className={`ds-row ds-row-sm ${selected === s.name ? 'is-selected' : ''}`}
            onClick={() => setSelected(s.name)}
          >
            <span className={`ds-ico ds-ico-${s.kind}`}><SpaceIcon kind={s.kind} /></span>
            <span className="ds-row-main">
              <strong>{s.name}</strong>
              <small>{KIND_LABEL[s.kind]} · {s.details}</small>
            </span>
            <Status state={s.state} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---- Reworked space form ---- */
function SpaceForm() {
  const [type, setType] = useState('building');
  const [bookable, setBookable] = useState(false);
  const types = [
    { key: 'building', label: 'Building' },
    { key: 'court', label: 'Court' },
    { key: 'parking', label: 'Parking' },
    { key: 'outdoor', label: 'Outdoor' },
  ];
  const isBuilding = type === 'building';
  return (
    <div className="ds-form">
      <label className="ds-label">
        Space name
        <input defaultValue="Engineering Building" />
      </label>

      <div className="ds-label">
        Space type
        <div className="ds-typegrid">
          {types.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`ds-type ${type === t.key ? 'is-active' : ''}`}
              onClick={() => setType(t.key)}
            >
              <span className="ds-type-ico"><SpaceIcon kind={t.key} /></span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ds-label">
        Bookable
        <button
          type="button"
          className={`ds-switch ${bookable && !isBuilding ? 'is-on' : ''} ${isBuilding ? 'is-disabled' : ''}`}
          onClick={() => !isBuilding && setBookable((v) => !v)}
          disabled={isBuilding}
        >
          <span className="ds-switch-track"><span className="ds-switch-knob" /></span>
          <span>{isBuilding ? 'Floors & rooms are bookable' : 'Directly bookable'}</span>
        </button>
        {isBuilding && (
          <p className="ds-hint">A building isn't booked directly — its floors and rooms are.</p>
        )}
      </div>

      <label className="ds-label">
        Internal reference <span className="ds-optional">optional</span>
        <input placeholder="ENG-BLDG" defaultValue="ENG-BLDG" />
      </label>

      <div className="ds-footprint">
        <span className="ds-footprint-ico"><SpaceIcon kind="building" /></span>
        <div className="ds-footprint-main">
          <strong>Footprint</strong>
          <small>Drawn on map · inside campus boundary</small>
        </div>
        <span className="ds-status is-good">Valid</span>
      </div>

      <div className="ds-actions">
        <button type="button" className="primary-action">Save space</button>
        <button type="button" className="secondary-action">Cancel</button>
      </div>
    </div>
  );
}

function OptionCard({ tag, title, note, children }) {
  return (
    <section className="ds-option">
      <header className="ds-option-head">
        <span className="ds-option-tag">{tag}</span>
        <div>
          <strong>{title}</strong>
          <p>{note}</p>
        </div>
      </header>
      <div className="ds-option-body">{children}</div>
    </section>
  );
}

export function DefineSpacesLab() {
  return (
    <div className="ds-lab">
      <section className="ds-block">
        <div className="ds-block-head">
          <h3>Reworked space form</h3>
          <p>Segmented type picker with icons, a bookable switch that adapts to the type, a footprint status row, and explicit actions — instead of four free-text inputs.</p>
        </div>
        <div className="ds-form-shell">
          <SpaceForm />
        </div>
      </section>

      <section className="ds-block">
        <div className="ds-block-head">
          <h3>Campus spaces — three list directions</h3>
          <p>Each replaces the plain full-width card list. Pick one (or mix); selection highlights the space and its footprint on the map.</p>
        </div>
        <div className="ds-options">
          <OptionCard tag="A" title="Compact rows" note="Type icon + meta + status, teal accent on the selected space. Dense and scannable.">
            <ListCompact />
          </OptionCard>
          <OptionCard tag="B" title="Grouped by type" note="Section headers with counts. Reads well once a campus has many mixed spaces.">
            <ListGrouped />
          </OptionCard>
          <OptionCard tag="C" title="Search + filters" note="Search box and type chips above the list. Scales to large campuses.">
            <ListFiltered />
          </OptionCard>
        </div>
      </section>
    </div>
  );
}

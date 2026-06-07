import React, { useState } from 'react';
import { Badge, Panel, ScreenShell, Task } from '../common/ui';
import { memberMapCampuses, memberMapFloors, memberMapSpaces } from '../data';

export function MemberMapViewScreen() {
  const [selectedCampus, setSelectedCampus] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(memberMapFloors[1].id);
  const activeFloor = memberMapFloors.find((floor) => floor.id === selectedFloor) ?? memberMapFloors[1];
  const activeCampus = memberMapCampuses.find((campus) => campus.id === selectedCampus);
  const activeSpace = memberMapSpaces.find((space) => space.id === selectedSpace);
  const visibleSpaces = selectedCampus
    ? memberMapSpaces.filter((space) => space.campusId === selectedCampus)
    : [];

  function handleCityClick() {
    setSelectedCampus(null);
    setSelectedSpace(null);
    setSelectedFloor(memberMapFloors[1].id);
  }

  function handleCampusClick(campusId) {
    setSelectedCampus(campusId);
    setSelectedSpace(null);
    setSelectedFloor(memberMapFloors[1].id);
  }

  function handleSpaceClick(spaceId) {
    const space = memberMapSpaces.find((item) => item.id === spaceId);
    if (space) {
      setSelectedCampus(space.campusId);
    }
    setSelectedSpace(spaceId);
    setSelectedFloor(memberMapFloors[1].id);
  }

  return (
    <ScreenShell>
      <section className="map-layout side-first">
        <Panel
          title="Map selector"
          subtitle={
            selectedSpace
              ? `${activeSpace?.name} · ${activeFloor.label}`
              : selectedCampus
                ? activeCampus?.name
                : 'Choose a campus to inspect'
          }
        >
          <div className="form-stack">
            <div className="selection-summary">
              <div><span>City</span><strong>Bucharest campus network</strong></div>
              <div><span>Campus</span><strong>{activeCampus?.name ?? 'None selected'}</strong></div>
              <div><span>Space</span><strong>{activeSpace?.name ?? 'None selected'}</strong></div>
              <div><span>Floor</span><strong>{selectedSpace ? activeFloor.label : 'None selected'}</strong></div>
            </div>
            <div className="map-stage-list">
              <strong className="selector-label">Campuses</strong>
              {memberMapCampuses.map((campus) => (
                <button
                  className={selectedCampus === campus.id && !selectedSpace ? 'active' : ''}
                  key={campus.id}
                  type="button"
                  onClick={() => handleCampusClick(campus.id)}
                >
                  <strong>{campus.name}</strong>
                  <span>{campus.details}</span>
                </button>
              ))}
            </div>
            {selectedCampus && (
              <div className="map-stage-list">
                <strong className="selector-label">Spaces</strong>
                {visibleSpaces.map((space) => (
                  <button
                    className={selectedSpace === space.id ? 'active' : ''}
                    key={space.id}
                    type="button"
                    onClick={() => handleSpaceClick(space.id)}
                  >
                    <strong>{space.name}</strong>
                    <span>{space.type} · {space.details}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedSpace && (
              <div className="floor-selector">
                <strong>Floors</strong>
                <div>
                  {memberMapFloors.map((floor) => (
                    <button
                      className={floor.id === selectedFloor ? 'active' : ''}
                      key={floor.id}
                      type="button"
                      onClick={() => setSelectedFloor(floor.id)}
                    >
                      {floor.label}
                    </button>
                  ))}
                </div>
                <p>{activeFloor.rooms} rooms on this floor · {activeFloor.free} currently available</p>
              </div>
            )}
            {selectedSpace && (
              <div className="task-list">
                <Task title="Available meeting rooms" label={`${activeFloor.free} rooms`} />
                <Task title="Selected layer" label={`${activeFloor.label} rooms`} />
              </div>
            )}
          </div>
        </Panel>
        <MemberCampusMap
          selectedCampus={selectedCampus}
          selectedSpace={selectedSpace}
          selectedFloor={selectedFloor}
          onCityClick={handleCityClick}
          onCampusClick={handleCampusClick}
          onSpaceClick={handleSpaceClick}
          onFloorChange={setSelectedFloor}
        />
      </section>
    </ScreenShell>
  );
}

function MemberCampusMap({
  selectedCampus,
  selectedSpace,
  selectedFloor,
  onCityClick,
  onCampusClick,
  onSpaceClick,
  onFloorChange,
}) {
  const activeFloor = memberMapFloors.find((floor) => floor.id === selectedFloor) ?? memberMapFloors[1];
  const activeSpace = memberMapSpaces.find((space) => space.id === selectedSpace);
  const activeCampus = memberMapCampuses.find((campus) => campus.id === selectedCampus);
  const isCampusStage = selectedCampus && !selectedSpace;
  const zoomLabel = selectedSpace
    ? `Zoom 3 · ${activeSpace?.name}`
    : selectedCampus
      ? `Zoom 2 · ${activeCampus?.name}`
      : 'Zoom 1 · City';

  return (
    <section className={`map-panel staged-map ${selectedCampus ? 'is-zoomed' : ''}`}>
      <svg viewBox="0 0 700 520" role="img" aria-label="Layered city campus map">
        <g className="map-layer city-layer">
          <path d="M70 92 C184 142 275 106 394 154 C504 198 565 171 642 222" className="city-road major" />
          <path d="M92 424 C164 328 251 330 340 260 C439 181 515 102 628 82" className="city-road" />
          <path d="M100 120 V458 M214 82 V438 M334 92 V452 M462 70 V430 M590 102 V450" className="city-grid-line" />
          <path d="M58 180 H640 M74 292 H620 M102 402 H660" className="city-grid-line" />
          <rect x="88" y="118" width="168" height="108" rx="10" className="city-block" />
          <rect x="395" y="98" width="170" height="112" rx="10" className="city-block" />
          <rect x="250" y="322" width="176" height="104" rx="10" className="city-block" />
          <g className="clickable-map-feature campus-marker" onClick={() => onCampusClick('main-campus')} role="button" tabIndex="0">
            <circle cx="182" cy="172" r="26" />
            <text x="182" y="172">Main</text>
          </g>
          <g className="clickable-map-feature campus-marker" onClick={() => onCampusClick('medical-campus')} role="button" tabIndex="0">
            <circle cx="480" cy="154" r="26" />
            <text x="480" y="154">Med</text>
          </g>
          <g className="clickable-map-feature campus-marker" onClick={() => onCampusClick('sports-campus')} role="button" tabIndex="0">
            <circle cx="338" cy="374" r="26" />
            <text x="338" y="374">Sport</text>
          </g>
        </g>

        {selectedCampus && (
          <g className="map-layer campus-detail-layer">
            <rect x="44" y="48" width="612" height="420" rx="14" className="map-focus-surface" />
            <g className="clickable-map-feature" onClick={() => onCampusClick(selectedCampus)} role="button" tabIndex="0" aria-label="Selected campus footprint">
              <path d="M74 418 L116 112 L615 76 L660 405 L414 476 Z" className="campus-boundary" />
            </g>
            <path d="M95 395 C190 320 236 324 309 250 C394 166 482 140 620 95" className="road" />
            {selectedCampus === 'main-campus' && (
              <>
                <g className="clickable-map-feature" onClick={() => onSpaceClick('engineering')} role="button" tabIndex="0">
                  <rect x="165" y="150" width="140" height="88" rx="8" className="building" />
                  <circle cx="236" cy="150" r="12" className="availability-dot" />
                  <text x="235" y="200">Engineering</text>
                </g>
                <g className="clickable-map-feature" onClick={() => onSpaceClick('library')} role="button" tabIndex="0">
                  <rect x="366" y="116" width="144" height="94" rx="8" className="building" />
                  <circle cx="436" cy="116" r="12" className="availability-dot" />
                  <text x="438" y="168">Library</text>
                </g>
                <g className="clickable-map-feature" onClick={() => onSpaceClick('innovation')} role="button" tabIndex="0">
                  <rect x="228" y="306" width="158" height="76" rx="8" className="building" />
                  <circle cx="308" cy="306" r="12" className="availability-dot warn" />
                  <text x="307" y="352">Innovation</text>
                </g>
              </>
            )}
            {selectedCampus === 'medical-campus' && (
              <>
                <g className="clickable-map-feature" onClick={() => onSpaceClick('simulation')} role="button" tabIndex="0">
                  <rect x="185" y="150" width="170" height="96" rx="8" className="building" />
                  <circle cx="270" cy="150" r="12" className="availability-dot" />
                  <text x="270" y="202">Simulation</text>
                </g>
                <g className="clickable-map-feature" onClick={() => onSpaceClick('clinical')} role="button" tabIndex="0">
                  <rect x="405" y="264" width="145" height="86" rx="8" className="building" />
                  <circle cx="478" cy="264" r="12" className="availability-dot" />
                  <text x="478" y="310">Clinical Lab</text>
                </g>
              </>
            )}
            {selectedCampus === 'sports-campus' && (
              <>
                <g className="clickable-map-feature" onClick={() => onSpaceClick('arena')} role="button" tabIndex="0">
                  <rect x="182" y="178" width="190" height="116" rx="46" className="building" />
                  <circle cx="278" cy="178" r="12" className="availability-dot" />
                  <text x="278" y="238">Arena</text>
                </g>
                <g className="clickable-map-feature" onClick={() => onSpaceClick('training')} role="button" tabIndex="0">
                  <rect x="435" y="302" width="126" height="70" rx="8" className="building" />
                  <circle cx="498" cy="302" r="12" className="availability-dot warn" />
                  <text x="498" y="338">Training</text>
                </g>
              </>
            )}
            <rect x="472" y="310" width="96" height="60" rx="28" className="outdoor" />
            <text x="520" y="346" className="outdoor-label">Court A</text>
            <text x="350" y="38" className="map-title-label">{activeCampus?.name}</text>
          </g>
        )}

        {selectedSpace && (
          <g className="map-layer room-detail-layer">
            <rect x="64" y="66" width="572" height="408" rx="14" className="floor-focus-surface" />
            <path d="M86 88 H614 V405 H462 V454 H86 Z" className="floor-footprint selected-floor-footprint" />
            <path d="M86 188 H614 M86 292 H614 M225 88 V454 M374 88 V405 M514 88 V405" className="floor-lines" />
            <rect x="104" y="108" width="104" height="62" rx="5" className="room ready" />
            <rect x="240" y="108" width="112" height="62" rx="5" className={selectedFloor === 'level-1' ? 'room warning' : 'room ready'} />
            <rect x="395" y="108" width="96" height="62" rx="5" className="room selected" />
            <rect x="104" y="212" width="104" height="62" rx="5" className="room ready" />
            <rect x="240" y="212" width="112" height="62" rx="5" className={selectedFloor === 'level-3' ? 'room warning' : 'room ready'} />
            <rect x="395" y="212" width="96" height="62" rx="5" className="room ready" />
            <rect x="104" y="318" width="248" height="66" rx="5" className="room ready" />
            <rect x="395" y="318" width="96" height="66" rx="5" className={selectedFloor === 'level-2' ? 'room selected' : 'room ready'} />
            <text x="156" y="140">C201</text>
            <text x="296" y="140">{selectedFloor === 'level-1' ? 'Busy' : 'C202'}</text>
            <text x="443" y="140">C203</text>
            <text x="156" y="244">C204</text>
            <text x="296" y="244">{selectedFloor === 'level-3' ? 'Busy' : 'C205'}</text>
            <text x="443" y="244">C206</text>
            <text x="228" y="351">Collaboration</text>
            <text x="443" y="351">{selectedFloor === 'level-2' ? 'C214' : 'C207'}</text>
          </g>
        )}
      </svg>
      <div className="floating-toolbar">
        <button className={!selectedCampus ? 'active' : ''} type="button" onClick={onCityClick}>
          City
        </button>
        <button className={isCampusStage ? 'active' : ''} type="button" onClick={() => selectedCampus && onCampusClick(selectedCampus)}>
          Campus
        </button>
        <button className={selectedSpace ? 'active' : ''} type="button" onClick={() => onSpaceClick('engineering')}>
          Space
        </button>
        <Badge tone={selectedCampus ? 'good' : 'neutral'}>
          {selectedSpace ? `${activeFloor.label} rooms` : selectedCampus ? 'Spaces loaded' : '3 campuses'}
        </Badge>
      </div>
      {selectedSpace && (
        <div className="floor-overlay">
          <strong>{activeSpace?.name}</strong>
          <div>
            {memberMapFloors.map((floor) => (
              <button
                className={floor.id === selectedFloor ? 'active' : ''}
                key={floor.id}
                type="button"
                onClick={() => onFloorChange(floor.id)}
              >
                {floor.label.replace('Level ', 'L')}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="zoom-overlay" aria-label="Map zoom state">
        <button type="button" onClick={onCityClick}>-</button>
        <div>
          <strong>{zoomLabel}</strong>
          <span>
            {selectedSpace
              ? `${activeFloor.label} room layer rendered`
              : selectedCampus
                ? 'Campus spaces rendered'
                : 'Campus markers rendered'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!selectedCampus) {
              onCampusClick('main-campus');
            } else if (!selectedSpace) {
              onSpaceClick(memberMapSpaces.find((space) => space.campusId === selectedCampus)?.id ?? 'engineering');
            }
          }}
        >
          +
        </button>
      </div>
    </section>
  );
}

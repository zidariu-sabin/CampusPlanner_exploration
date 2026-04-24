import { getBoundingBox, polygonToPointsAttribute, type MapDto, type RoomDto } from '@campus/contracts';

import { assetUrl } from './api';

export interface ExportableRoom {
  name: string;
  color: string;
  sortOrder: number;
  geometryGeoJson: RoomDto['geometryGeoJson'];
}

export interface ExportableMap {
  id?: string;
  name: string;
  floorLabel: string;
  timezone: string;
  backgroundImageUrl: string | null;
  footprintGeoJson: MapDto['footprintGeoJson'];
  rooms: ExportableRoom[];
}

export interface MapSvgExportOptions {
  backgroundHref?: string | null;
  includeLabels?: boolean;
}

export interface ExportableMapCollection {
  name: string;
  maps: ExportableMap[];
}

export interface MapCollectionSvgExportOptions {
  activeMapId?: string | null;
  includeLabels?: boolean;
}

export async function downloadMapSvg(map: ExportableMap, options: MapSvgExportOptions = {}): Promise<void> {
  const svgMarkup = await buildMapSvg(map, options);
  const downloadUrl = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = buildMapSvgFileName(map);
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}

export async function buildMapSvg(map: ExportableMap, options: MapSvgExportOptions = {}): Promise<string> {
  const viewport = getMapViewport(map);
  const rooms = [...map.rooms].sort((left, right) => left.sortOrder - right.sortOrder);
  const backgroundHref = await resolveBackgroundHref(options.backgroundHref ?? map.backgroundImageUrl);
  const includeLabels = options.includeLabels ?? true;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewport.minX} ${viewport.minY} ${viewport.width} ${viewport.height}" width="${viewport.width}" height="${viewport.height}" role="img" aria-labelledby="map-title map-desc">
  <title id="map-title">${escapeText(map.name)} - ${escapeText(map.floorLabel)}</title>
  <desc id="map-desc">${escapeText(`Static campus map export for ${map.name} (${map.floorLabel}, ${map.timezone}).`)}</desc>
  <defs>
    <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#ffffff" />
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dde3e8" stroke-width="1" />
    </pattern>
  </defs>
  ${buildMapScene(map, {
    backgroundHref,
    clipPathId: 'map-background-clip',
    includeLabels,
    gridPatternId: 'grid-pattern',
    rooms,
    viewport,
  })}
</svg>`;
}

export async function downloadMapCollectionSvg(
  collection: ExportableMapCollection,
  options: MapCollectionSvgExportOptions = {},
): Promise<void> {
  const svgMarkup = await buildMapCollectionSvg(collection, options);
  const downloadUrl = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = buildMapCollectionSvgFileName(collection);
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}

export async function buildMapCollectionSvg(
  collection: ExportableMapCollection,
  options: MapCollectionSvgExportOptions = {},
): Promise<string> {
  const maps = collection.maps.map((map, index) => ({
    ...map,
    exportId: map.id?.trim() || `map-${index + 1}`,
  }));
  const includeLabels = options.includeLabels ?? true;
  const activeMapId = maps.find((map) => map.exportId === options.activeMapId)?.exportId ?? maps[0]?.exportId ?? '';
  const resolvedMaps = await Promise.all(
    maps.map(async (map) => ({
      ...map,
      viewport: getMapViewport(map),
      rooms: [...map.rooms].sort((left, right) => left.sortOrder - right.sortOrder),
      backgroundHref: await resolveBackgroundHref(map.backgroundImageUrl),
    })),
  );

  const stageX = 32;
  const stageY = 32;
  const stageWidth = 840;
  const stageHeight = 656;
  const sidebarX = stageX + stageWidth + 24;
  const sidebarY = stageY;
  const sidebarWidth = 272;
  const sidebarHeight = stageHeight;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" width="1200" height="720" role="img" aria-labelledby="map-collection-title map-collection-desc">
  <title id="map-collection-title">${escapeText(collection.name)}</title>
  <desc id="map-collection-desc">${escapeText(`Interactive campus map export with ${resolvedMaps.length} selectable map views.`)}</desc>
  <defs>
    <pattern id="collection-grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#ffffff" />
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dde3e8" stroke-width="1" />
    </pattern>
    <clipPath id="map-stage-clip">
      <rect x="${stageX}" y="${stageY}" width="${stageWidth}" height="${stageHeight}" rx="26" ry="26" />
    </clipPath>
  </defs>
  <style>
    .stage-frame { fill: #f8fafc; stroke: #cbd5e1; stroke-width: 1.5; }
    .sidebar-frame { fill: #0f172a; }
    .map-panel { display: none; }
    .map-panel.active { display: inline; }
    .map-button { cursor: pointer; }
    .map-button rect { fill: rgba(148, 163, 184, 0.18); stroke: rgba(148, 163, 184, 0.28); stroke-width: 1; }
    .map-button text { fill: #e2e8f0; font-family: 'Space Grotesk', Arial, sans-serif; }
    .map-button .button-floor { fill: #94a3b8; font-size: 13px; }
    .map-button.active rect { fill: #0f766e; stroke: #5eead4; }
    .map-button.active .button-floor { fill: #ccfbf1; }
    .sidebar-title { fill: #f8fafc; font-family: 'Space Grotesk', Arial, sans-serif; font-size: 24px; font-weight: 700; }
    .sidebar-copy { fill: #94a3b8; font-family: 'Space Grotesk', Arial, sans-serif; font-size: 13px; }
    .panel-title { fill: #0f172a; font-family: 'Space Grotesk', Arial, sans-serif; font-size: 24px; font-weight: 700; }
    .panel-copy { fill: #475569; font-family: 'Space Grotesk', Arial, sans-serif; font-size: 13px; }
  </style>
  <rect x="0" y="0" width="1200" height="720" fill="#e2e8f0" />
  <rect class="stage-frame" x="${stageX}" y="${stageY}" width="${stageWidth}" height="${stageHeight}" rx="26" ry="26" />
  <rect class="sidebar-frame" x="${sidebarX}" y="${sidebarY}" width="${sidebarWidth}" height="${sidebarHeight}" rx="26" ry="26" />
  <text class="panel-title" x="${stageX + 28}" y="${stageY + 42}">${escapeText(collection.name)}</text>
  <text class="panel-copy" x="${stageX + 28}" y="${stageY + 64}">Select a map from the right menu.</text>
  <g clip-path="url(#map-stage-clip)">
    ${resolvedMaps
      .map(
        (map) => `<svg
      class="map-panel${map.exportId === activeMapId ? ' active' : ''}"
      data-map-id="${escapeAttribute(map.exportId)}"
      x="${stageX}"
      y="${stageY}"
      width="${stageWidth}"
      height="${stageHeight}"
      viewBox="${map.viewport.minX} ${map.viewport.minY} ${map.viewport.width} ${map.viewport.height}"
      preserveAspectRatio="xMidYMid meet"
    >
      ${buildMapScene(map, {
        backgroundHref: map.backgroundHref,
        clipPathId: `map-background-clip-${map.exportId}`,
        includeLabels,
        gridPatternId: 'collection-grid-pattern',
        rooms: map.rooms,
        viewport: map.viewport,
      })}
    </svg>`,
      )
      .join('\n    ')}
  </g>
  <g transform="translate(${sidebarX + 24} ${sidebarY + 42})">
    <text class="sidebar-title" x="0" y="0">Maps</text>
    <text class="sidebar-copy" x="0" y="24">Standalone SVG with built-in map switching.</text>
    ${resolvedMaps
      .map(
        (map, index) => `<g class="map-button${map.exportId === activeMapId ? ' active' : ''}" data-map-id="${escapeAttribute(map.exportId)}" transform="translate(0 ${56 + index * 76})">
      <rect x="0" y="0" width="${sidebarWidth - 48}" height="60" rx="16" ry="16" />
      <text x="18" y="26" font-size="16" font-weight="700">${escapeText(map.name)}</text>
      <text class="button-floor" x="18" y="44">${escapeText(map.floorLabel)}</text>
    </g>`,
      )
      .join('\n    ')}
  </g>
  <script><![CDATA[
    (function () {
      var root = document.documentElement;
      var panels = Array.prototype.slice.call(root.querySelectorAll('.map-panel'));
      var buttons = Array.prototype.slice.call(root.querySelectorAll('.map-button'));
      function setActive(mapId) {
        panels.forEach(function (panel) {
          panel.classList.toggle('active', panel.getAttribute('data-map-id') === mapId);
        });
        buttons.forEach(function (button) {
          button.classList.toggle('active', button.getAttribute('data-map-id') === mapId);
        });
      }
      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          setActive(button.getAttribute('data-map-id') || '');
        });
      });
      setActive(${JSON.stringify(activeMapId)});
    })();
  ]]></script>
</svg>`;
}

export function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read blob.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(blob);
  });
}

function buildMapSvgFileName(map: ExportableMap): string {
  const base = [map.name, map.floorLabel].map(slugify).filter(Boolean).join('-');
  return `${base || 'campus-map'}.svg`;
}

function buildMapCollectionSvgFileName(collection: ExportableMapCollection): string {
  const base = slugify(collection.name);
  return `${base || 'campus-map-collection'}.svg`;
}

function getMapViewport(map: ExportableMap) {
  const bounds = getBoundingBox(map.footprintGeoJson);
  const padX = Math.max(bounds.width * 0.08, 24);
  const padY = Math.max(bounds.height * 0.08, 24);

  return {
    bounds,
    minX: bounds.minX - padX,
    minY: bounds.minY - padY,
    width: Math.max(bounds.width + padX * 2, 1),
    height: Math.max(bounds.height + padY * 2, 1),
  };
}

function buildMapScene(
  map: ExportableMap,
  options: {
    backgroundHref: string | null;
    clipPathId: string;
    gridPatternId: string;
    includeLabels: boolean;
    rooms: ExportableRoom[];
    viewport: ReturnType<typeof getMapViewport>;
  },
): string {
  return `<defs>
    <clipPath id="${escapeAttribute(options.clipPathId)}">
      <polygon points="${escapeAttribute(polygonToPointsAttribute(map.footprintGeoJson))}" />
    </clipPath>
  </defs>
  <rect x="${options.viewport.minX}" y="${options.viewport.minY}" width="${options.viewport.width}" height="${options.viewport.height}" fill="url(#${escapeAttribute(options.gridPatternId)})" />
  ${
    options.backgroundHref
      ? `<g clip-path="url(#${escapeAttribute(options.clipPathId)})">
      <image href="${escapeAttribute(options.backgroundHref)}" x="${options.viewport.bounds.minX}" y="${options.viewport.bounds.minY}" width="${options.viewport.bounds.width}" height="${options.viewport.bounds.height}" preserveAspectRatio="none" />
    </g>`
      : ''
  }
  <polygon points="${escapeAttribute(polygonToPointsAttribute(map.footprintGeoJson))}" fill="#115e59" fill-opacity="0.08" stroke="#115e59" stroke-width="2.5" />
  ${options.rooms
    .map((room) => {
      const roomBounds = getBoundingBox(room.geometryGeoJson);
      const label = options.includeLabels
        ? `<text x="${roomBounds.minX + 6}" y="${roomBounds.minY + Math.min(Math.max(roomBounds.height * 0.3, 14), 22)}" fill="#0f172a" font-family="'Space Grotesk', sans-serif" font-size="12">${escapeText(room.name)}</text>`
        : '';

      return `<g>
    <polygon points="${escapeAttribute(polygonToPointsAttribute(room.geometryGeoJson))}" fill="${escapeAttribute(room.color)}" fill-opacity="0.35" stroke="#1f2a33" stroke-opacity="0.65" stroke-width="2" />
    ${label}
  </g>`;
    })
    .join('\n  ')}`;
}

async function resolveBackgroundHref(backgroundSource: string | null): Promise<string | null> {
  const url = normalizeBackgroundUrl(backgroundSource);
  if (!url) {
    return null;
  }

  if (url.startsWith('data:')) {
    return url;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return url;
    }

    return await readBlobAsDataUrl(await response.blob());
  } catch {
    return url;
  }
}

function normalizeBackgroundUrl(backgroundSource: string | null): string | null {
  if (!backgroundSource) {
    return null;
  }

  if (
    backgroundSource.startsWith('data:') ||
    backgroundSource.startsWith('http://') ||
    backgroundSource.startsWith('https://')
  ) {
    return backgroundSource;
  }

  return assetUrl(backgroundSource);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;');
}

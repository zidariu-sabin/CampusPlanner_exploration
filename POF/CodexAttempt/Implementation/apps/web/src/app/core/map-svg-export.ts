import { getBoundingBox, polygonToPointsAttribute, type MapDto, type RoomDto } from '@campus/contracts';

import { assetUrl } from './api';

export interface ExportableRoom {
  name: string;
  color: string;
  sortOrder: number;
  geometryGeoJson: RoomDto['geometryGeoJson'];
}

export interface ExportableMap {
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
  const bounds = getBoundingBox(map.footprintGeoJson);
  const padX = Math.max(bounds.width * 0.08, 24);
  const padY = Math.max(bounds.height * 0.08, 24);
  const minX = bounds.minX - padX;
  const minY = bounds.minY - padY;
  const width = Math.max(bounds.width + padX * 2, 1);
  const height = Math.max(bounds.height + padY * 2, 1);
  const rooms = [...map.rooms].sort((left, right) => left.sortOrder - right.sortOrder);
  const backgroundHref = await resolveBackgroundHref(options.backgroundHref ?? map.backgroundImageUrl);
  const includeLabels = options.includeLabels ?? true;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="map-title map-desc">
  <title id="map-title">${escapeText(map.name)} - ${escapeText(map.floorLabel)}</title>
  <desc id="map-desc">${escapeText(`Static campus map export for ${map.name} (${map.floorLabel}, ${map.timezone}).`)}</desc>
  <defs>
    <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#ffffff" />
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dde3e8" stroke-width="1" />
    </pattern>
  </defs>
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#grid-pattern)" />
  ${
    backgroundHref
      ? `<image href="${escapeAttribute(backgroundHref)}" x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" preserveAspectRatio="none" />`
      : ''
  }
  <polygon points="${escapeAttribute(polygonToPointsAttribute(map.footprintGeoJson))}" fill="#115e59" fill-opacity="0.08" stroke="#115e59" stroke-width="2.5" />
  ${rooms
    .map((room) => {
      const roomBounds = getBoundingBox(room.geometryGeoJson);
      const label = includeLabels
        ? `<text x="${roomBounds.minX + 6}" y="${roomBounds.minY + Math.min(Math.max(roomBounds.height * 0.3, 14), 22)}" fill="#0f172a" font-family="'Space Grotesk', sans-serif" font-size="12">${escapeText(room.name)}</text>`
        : '';

      return `<g>
    <polygon points="${escapeAttribute(polygonToPointsAttribute(room.geometryGeoJson))}" fill="${escapeAttribute(room.color)}" fill-opacity="0.35" stroke="#1f2a33" stroke-opacity="0.65" stroke-width="2" />
    ${label}
  </g>`;
    })
    .join('\n  ')}
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

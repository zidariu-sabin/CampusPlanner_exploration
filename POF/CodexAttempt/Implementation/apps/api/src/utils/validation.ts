import { GeoJsonPolygon, closeRing } from '@campus/contracts';

import { HttpError } from './http-error.js';

export function ensurePolygon(polygon: GeoJsonPolygon): GeoJsonPolygon {
  if (polygon.type !== 'Polygon') {
    throw new HttpError(400, 'Only GeoJSON Polygon geometry is supported.');
  }

  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 4) {
    throw new HttpError(400, 'Polygon must have at least four points.');
  }

  return {
    type: 'Polygon',
    coordinates: [closeRing(ring)],
  };
}


import { describe, expect, it } from 'vitest';

import {
  createPolygon,
  createRectanglePolygon,
  projectGeoJsonPolygon,
  projectGeoJsonPosition,
  projectedPolygonToPointsAttribute,
  polygonContainsPolygon,
  polygonToRoomModel,
  roomModelToPolygon,
  unprojectGeoJsonPosition,
} from './index';

describe('geometry helpers', () => {
  it('creates a closed rectangle polygon', () => {
    const rectangle = createRectanglePolygon(10, 20, 30, 40);

    expect(rectangle.coordinates[0]).toEqual([
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
      [10, 20],
    ]);
  });

  it('detects a rectangle inside a footprint polygon', () => {
    const footprint = createPolygon([
      [0, 0],
      [200, 0],
      [200, 200],
      [0, 200],
    ]);
    const room = createRectanglePolygon(40, 60, 50, 40);

    expect(polygonContainsPolygon(footprint, room)).toBe(true);
  });

  it('rejects a rectangle that crosses outside the footprint polygon', () => {
    const footprint = createPolygon([
      [0, 0],
      [200, 0],
      [150, 80],
      [200, 200],
      [0, 200],
    ]);
    const room = createRectanglePolygon(120, 40, 70, 70);

    expect(polygonContainsPolygon(footprint, room)).toBe(false);
  });

  it('preserves freeform polygon geometry in editor room models', () => {
    const polygon = createPolygon([
      [10, 10],
      [80, 20],
      [40, 70],
    ]);

    const room = polygonToRoomModel(polygon, {
      id: 'room-1',
      name: 'Polygon room',
      color: '#38bdf8',
      sortOrder: 0,
    });

    expect(room.shape).toBe('polygon');
    expect(roomModelToPolygon(room)).toEqual(polygon);
  });

  it('keeps axis-aligned rectangles editable as rectangle rooms', () => {
    const polygon = createRectanglePolygon(10, 20, 30, 40);

    const room = polygonToRoomModel(polygon, {
      id: 'room-1',
      name: 'Rectangle room',
      color: '#38bdf8',
      sortOrder: 0,
    });

    expect(room.shape).toBe('rectangle');
    expect(roomModelToPolygon({ ...room, width: 60 })).toEqual(createRectanglePolygon(10, 20, 60, 40));
  });

  it('round-trips world coordinates through Web Mercator projection', () => {
    const worldPosition = [23.830052, 44.297575] as const;
    const projected = projectGeoJsonPosition([...worldPosition]);
    const unprojected = unprojectGeoJsonPosition(projected);

    expect(unprojected[0]).toBeCloseTo(worldPosition[0], 8);
    expect(unprojected[1]).toBeCloseTo(worldPosition[1], 8);
  });

  it('projects polygons for rendering without mutating persisted GeoJSON', () => {
    const polygon = createPolygon([
      [23.8295, 44.298],
      [23.8306, 44.298],
      [23.8306, 44.2972],
      [23.8295, 44.2972],
    ]);
    const original = JSON.stringify(polygon);
    const projected = projectGeoJsonPolygon(polygon);

    expect(JSON.stringify(polygon)).toBe(original);
    expect(projected).not.toEqual(polygon);
    expect(projectedPolygonToPointsAttribute(polygon)).toContain(',');
  });
});

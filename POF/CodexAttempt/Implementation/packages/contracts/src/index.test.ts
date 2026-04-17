import { describe, expect, it } from 'vitest';

import { createPolygon, createRectanglePolygon, polygonContainsPolygon } from './index';

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
});

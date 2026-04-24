import { describe, expect, it } from 'vitest';

import { FloorMapEntity } from '../entities/floor-map.entity.js';
import { toMapDto, toMapSummaryDto } from './serializers.js';

describe('map serializers', () => {
  it('includes hierarchy metadata in the summary dto', () => {
    const campus = new FloorMapEntity();
    campus.id = 'campus';
    campus.name = 'Campus';

    const building = new FloorMapEntity();
    building.id = 'building';
    building.name = 'HQ Building';
    building.floorLabel = 'Ground Floor';
    building.timezone = 'Europe/Bucharest';
    building.parentMapId = campus.id;
    building.parentMap = campus;
    building.childMaps = [createMap('floor-1', 'Floor 1')];
    building.rooms = [];

    expect(toMapSummaryDto(building)).toMatchObject({
      id: 'building',
      parentMapId: 'campus',
      parentMapName: 'Campus',
      childMapCount: 1,
      roomCount: 0,
    });
  });

  it('preserves hierarchy metadata in the full dto', () => {
    const campus = createMap('campus', 'Campus');
    const building = createMap('building', 'HQ Building');
    building.parentMapId = campus.id;
    building.parentMap = campus;
    building.childMaps = [];
    building.rooms = [];

    expect(toMapDto(building)).toMatchObject({
      id: 'building',
      parentMapId: 'campus',
      parentMapName: 'Campus',
      childMapCount: 0,
      rooms: [],
    });
  });
});

function createMap(id: string, name: string): FloorMapEntity {
  const map = new FloorMapEntity();
  map.id = id;
  map.name = name;
  map.floorLabel = 'Ground Floor';
  map.timezone = 'Europe/Bucharest';
  map.parentMapId = null;
  map.parentMap = null;
  map.childMaps = [];
  map.rooms = [];
  map.backgroundImageUrl = null;
  map.backgroundFitMode = 'contain';
  map.footprintGeoJson = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ],
  };
  return map;
}

import { GeoJsonPolygon, polygonContainsPolygon } from '@campus/contracts';

import { AppDataSource } from '../data-source.js';
import { BookableResourceEntity } from '../entities/bookable-resource.entity.js';
import { FloorMapEntity } from '../entities/floor-map.entity.js';
import { MeetingEntity } from '../entities/meeting.entity.js';
import { RoomEntity } from '../entities/room.entity.js';
import { HttpError } from '../utils/http-error.js';
import { ensurePolygon } from '../utils/validation.js';
import { getBuildingOrFail } from './campus.service.js';

const floorMapRepository = () => AppDataSource.getRepository(FloorMapEntity);
const meetingRepository = () => AppDataSource.getRepository(MeetingEntity);

const floorMapRelations = {
  building: {
    campusPlace: {
      campus: true,
    },
  },
  rooms: {
    bookableResource: true,
  },
} as const;

export async function listFloorMaps(organizationId: string): Promise<FloorMapEntity[]> {
  return floorMapRepository().find({
    where: {
      building: {
        campusPlace: {
          campus: { organizationId },
        },
      },
    },
    relations: floorMapRelations,
    order: { name: 'ASC' },
  });
}

export async function getFloorMapOrFail(organizationId: string, floorMapId: string): Promise<FloorMapEntity> {
  const floorMap = await floorMapRepository().findOne({
    where: { id: floorMapId },
    relations: floorMapRelations,
  });

  if (!floorMap || floorMap.building.campusPlace.campus.organizationId !== organizationId) {
    throw new HttpError(404, 'Floor map not found.');
  }

  return floorMap;
}

export async function createFloorMap(
  organizationId: string,
  buildingId: string,
  input: { name: string; floorLabel: string; footprintGeoJson: GeoJsonPolygon },
): Promise<FloorMapEntity> {
  const building = await getBuildingOrFail(organizationId, buildingId);

  const floorMap = floorMapRepository().create({
    buildingId: building.id,
    name: input.name.trim(),
    floorLabel: input.floorLabel.trim(),
    footprintGeoJson: ensurePolygon(input.footprintGeoJson),
    backgroundFitMode: 'contain',
  });

  await floorMapRepository().save(floorMap);
  return getFloorMapOrFail(organizationId, floorMap.id);
}

export async function updateFloorMap(
  organizationId: string,
  floorMapId: string,
  input: { name: string; floorLabel: string; footprintGeoJson: GeoJsonPolygon },
): Promise<FloorMapEntity> {
  const floorMap = await getFloorMapOrFail(organizationId, floorMapId);
  floorMap.name = input.name.trim();
  floorMap.floorLabel = input.floorLabel.trim();
  floorMap.footprintGeoJson = ensurePolygon(input.footprintGeoJson);

  await floorMapRepository().save(floorMap);
  return getFloorMapOrFail(organizationId, floorMapId);
}

export async function replaceRooms(
  organizationId: string,
  floorMapId: string,
  rooms: Array<{
    id?: string;
    name: string;
    color: string;
    sortOrder: number;
    geometryGeoJson: GeoJsonPolygon;
  }>,
): Promise<FloorMapEntity> {
  const floorMap = await getFloorMapOrFail(organizationId, floorMapId);

  const existingMeetings = await meetingRepository()
    .createQueryBuilder('meeting')
    .innerJoin('meeting.bookableResource', 'resource')
    .innerJoin('resource.room', 'room')
    .where('room.floor_map_id = :floorMapId', { floorMapId })
    .getCount();

  if (existingMeetings > 0) {
    throw new HttpError(409, 'Rooms cannot be replaced after meetings have been scheduled on this floor map.');
  }

  const normalizedRooms = rooms.map((room, index) => {
    const geometryGeoJson = ensurePolygon(room.geometryGeoJson);
    if (!polygonContainsPolygon(floorMap.footprintGeoJson, geometryGeoJson)) {
      throw new HttpError(400, `Room "${room.name}" is outside the floor map footprint.`);
    }

    return {
      id: room.id,
      floorMapId,
      name: room.name.trim(),
      color: room.color,
      sortOrder: Number.isFinite(room.sortOrder) ? room.sortOrder : index,
      geometryGeoJson,
    };
  });

  await AppDataSource.transaction(async (manager) => {
    await manager.delete(RoomEntity, { floorMapId });

    if (normalizedRooms.length > 0) {
      const saved = await manager.save(
        RoomEntity,
        normalizedRooms.map((room) => manager.create(RoomEntity, room)),
      );

      await manager.save(
        BookableResourceEntity,
        saved.map((room) =>
          manager.create(BookableResourceEntity, {
            organizationId,
            kind: 'room',
            roomId: room.id,
          }),
        ),
      );
    }
  });

  return getFloorMapOrFail(organizationId, floorMapId);
}

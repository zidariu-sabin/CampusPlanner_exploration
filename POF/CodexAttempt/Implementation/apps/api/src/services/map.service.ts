import { polygonContainsPolygon } from '@campus/contracts';

import { AppDataSource } from '../data-source.js';
import { FloorMapEntity } from '../entities/floor-map.entity.js';
import { MeetingEntity } from '../entities/meeting.entity.js';
import { RoomEntity } from '../entities/room.entity.js';
import { HttpError } from '../utils/http-error.js';
import { ensurePolygon } from '../utils/validation.js';

const mapRepository = () => AppDataSource.getRepository(FloorMapEntity);
const roomRepository = () => AppDataSource.getRepository(RoomEntity);
const meetingRepository = () => AppDataSource.getRepository(MeetingEntity);

export async function getMapOrFail(mapId: string): Promise<FloorMapEntity> {
  const map = await mapRepository().findOne({
    where: { id: mapId },
    relations: {
      rooms: true,
    },
  });

  if (!map) {
    throw new HttpError(404, 'Map not found.');
  }

  return map;
}

export async function replaceRooms(
  mapId: string,
  rooms: Array<{
    id?: string;
    name: string;
    color: string;
    sortOrder: number;
    geometryGeoJson: RoomEntity['geometryGeoJson'];
  }>,
): Promise<FloorMapEntity> {
  const map = await getMapOrFail(mapId);

  const existingMeetings = await meetingRepository()
    .createQueryBuilder('meeting')
    .innerJoin('meeting.room', 'room')
    .where('room.map_id = :mapId', { mapId })
    .getCount();

  if (existingMeetings > 0) {
    throw new HttpError(409, 'Rooms cannot be replaced after meetings have been scheduled on this map.');
  }

  const normalizedRooms = rooms.map((room, index) => {
    const geometryGeoJson = ensurePolygon(room.geometryGeoJson);
    if (!polygonContainsPolygon(map.footprintGeoJson, geometryGeoJson)) {
      throw new HttpError(400, `Room "${room.name}" is outside the map footprint.`);
    }

    return roomRepository().create({
      id: room.id,
      mapId,
      name: room.name.trim(),
      color: room.color,
      sortOrder: Number.isFinite(room.sortOrder) ? room.sortOrder : index,
      geometryGeoJson,
    });
  });

  await AppDataSource.transaction(async (manager) => {
    await manager.delete(RoomEntity, { mapId });
    if (normalizedRooms.length > 0) {
      await manager.save(RoomEntity, normalizedRooms);
    }
  });

  return getMapOrFail(mapId);
}


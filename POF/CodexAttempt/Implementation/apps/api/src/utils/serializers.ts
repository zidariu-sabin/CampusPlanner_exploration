import { MapDto, MapSummaryDto, MeetingDto, UserSummaryDto } from '@campus/contracts';

import { FloorMapEntity } from '../entities/floor-map.entity.js';
import { MeetingEntity } from '../entities/meeting.entity.js';
import { RoomEntity } from '../entities/room.entity.js';
import { UserEntity } from '../entities/user.entity.js';
import { toMeetingLocalFields } from './time.js';

export function toUserSummary(user: UserEntity): UserSummaryDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export function toRoomDto(room: RoomEntity) {
  return {
    id: room.id,
    mapId: room.mapId,
    name: room.name,
    color: room.color,
    sortOrder: room.sortOrder,
    geometryGeoJson: room.geometryGeoJson,
  };
}

export function toMapSummaryDto(map: FloorMapEntity): MapSummaryDto {
  return {
    id: map.id,
    name: map.name,
    floorLabel: map.floorLabel,
    timezone: map.timezone,
    backgroundImageUrl: map.backgroundImageUrl,
    backgroundFitMode: map.backgroundFitMode,
    roomCount: map.rooms?.length ?? 0,
  };
}

export function toMapDto(map: FloorMapEntity): MapDto {
  return {
    ...toMapSummaryDto(map),
    footprintGeoJson: map.footprintGeoJson,
    rooms: (map.rooms ?? []).sort((left, right) => left.sortOrder - right.sortOrder).map(toRoomDto),
  };
}

export function toMeetingDto(meeting: MeetingEntity): MeetingDto {
  const timezone = meeting.room.map.timezone;
  const local = toMeetingLocalFields(meeting.startsAtUtc, timezone);

  return {
    id: meeting.id,
    roomId: meeting.roomId,
    mapId: meeting.room.mapId,
    title: meeting.title,
    description: meeting.description,
    startsAtUtc: meeting.startsAtUtc.toISOString(),
    endsAtUtc: meeting.endsAtUtc.toISOString(),
    localDate: local.localDate,
    hour: local.hour,
    createdBy: toUserSummary(meeting.createdBy),
    participants: (meeting.participants ?? []).map(toUserSummary),
  };
}


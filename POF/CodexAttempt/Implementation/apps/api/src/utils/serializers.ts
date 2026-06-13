import {
  BookableResourceDto,
  CampusDto,
  CampusPlaceDto,
  CampusSummaryDto,
  FloorMapDto,
  FloorMapSummaryDto,
  GeoJsonPolygon,
  MeetingDto,
  OrganizationDto,
  OrganizationInviteDto,
  RoomDto,
  RoomSearchResultDto,
  UserSummaryDto,
} from '@campus/contracts';

import type { RoomSearchMatch } from '../services/campus.service.js';

import { BookableResourceEntity } from '../entities/bookable-resource.entity.js';
import { CampusEntity } from '../entities/campus.entity.js';
import { CampusPlaceEntity } from '../entities/campus-place.entity.js';
import { FloorMapEntity } from '../entities/floor-map.entity.js';
import { MeetingEntity } from '../entities/meeting.entity.js';
import { OrganizationEntity } from '../entities/organization.entity.js';
import { OrganizationInviteEntity } from '../entities/organization-invite.entity.js';
import { RoomEntity } from '../entities/room.entity.js';
import { UserEntity } from '../entities/user.entity.js';
import { toMeetingLocalFields } from './time.js';

export function toUserSummary(user: UserEntity): UserSummaryDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    organizationId: user.organizationId,
  };
}

export function toOrganizationDto(organization: OrganizationEntity): OrganizationDto {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
  };
}

export function toInviteDto(invite: OrganizationInviteEntity): OrganizationInviteDto {
  return {
    id: invite.id,
    token: invite.token,
    role: invite.role,
    email: invite.email,
    expiresAt: invite.expiresAt.toISOString(),
    usedAt: invite.usedAt ? invite.usedAt.toISOString() : null,
    createdAt: invite.createdAt.toISOString(),
  };
}

export function toCampusPlaceDto(place: CampusPlaceEntity): CampusPlaceDto {
  return {
    id: place.id,
    campusId: place.campusId,
    name: place.name,
    type: place.type,
    bookable: place.bookable,
    footprintGeoJson: place.footprintGeoJson,
    buildingId: place.building?.id ?? null,
    bookableResourceId: place.bookableResource?.id ?? null,
    floorCount: place.building?.floorMaps?.length ?? 0,
  };
}

/**
 * Camera-fit extent for overviews: the campus boundary if set, otherwise the
 * bounding rectangle of the campus's place footprints, or null if empty. Lets
 * the map fit to a campus that has buildings drawn but no boundary polygon.
 */
function campusExtent(campus: CampusEntity): GeoJsonPolygon | null {
  if (campus.boundaryGeoJson) {
    return campus.boundaryGeoJson;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const place of campus.places ?? []) {
    const ring = place.footprintGeoJson?.coordinates?.[0] ?? [];
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return null;
  }

  return {
    type: 'Polygon',
    coordinates: [
      [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
      ],
    ],
  };
}

export function toCampusSummaryDto(campus: CampusEntity): CampusSummaryDto {
  const places = campus.places ?? [];
  const buildings = places.filter((place) => place.building);
  const floorMaps = buildings.flatMap((place) => place.building?.floorMaps ?? []);

  return {
    id: campus.id,
    name: campus.name,
    timezone: campus.timezone,
    boundaryGeoJson: campus.boundaryGeoJson,
    extentGeoJson: campusExtent(campus),
    placeCount: places.length,
    buildingCount: buildings.length,
    floorCount: floorMaps.length,
    roomCount: floorMaps.reduce((count, floorMap) => count + (floorMap.rooms?.length ?? 0), 0),
  };
}

export function toCampusDto(campus: CampusEntity): CampusDto {
  return {
    ...toCampusSummaryDto(campus),
    places: (campus.places ?? [])
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(toCampusPlaceDto),
  };
}

export function toRoomSearchResultDto(match: RoomSearchMatch): RoomSearchResultDto {
  return {
    roomId: match.room.id,
    roomName: match.room.name,
    floorMapId: match.floorMap.id,
    floorLabel: match.floorMap.floorLabel,
    buildingId: match.building.id,
    campusPlaceId: match.place.id,
    campusPlaceName: match.place.name,
    campusId: match.campus.id,
    campusName: match.campus.name,
    bookableResourceId: match.room.bookableResource?.id ?? null,
  };
}

export function toRoomDto(room: RoomEntity): RoomDto {
  return {
    id: room.id,
    floorMapId: room.floorMapId,
    name: room.name,
    color: room.color,
    sortOrder: room.sortOrder,
    geometryGeoJson: room.geometryGeoJson,
    bookableResourceId: room.bookableResource?.id ?? null,
  };
}

/** Requires floorMap.building.campusPlace.campus to be loaded. */
export function toFloorMapSummaryDto(floorMap: FloorMapEntity): FloorMapSummaryDto {
  const place = floorMap.building.campusPlace;

  return {
    id: floorMap.id,
    buildingId: floorMap.buildingId,
    campusPlaceId: place.id,
    campusPlaceName: place.name,
    campusId: place.campusId,
    name: floorMap.name,
    floorLabel: floorMap.floorLabel,
    timezone: place.campus.timezone,
    backgroundImageUrl: floorMap.backgroundImageUrl,
    backgroundFitMode: floorMap.backgroundFitMode,
    roomCount: floorMap.rooms?.length ?? 0,
  };
}

export function toFloorMapDto(floorMap: FloorMapEntity): FloorMapDto {
  return {
    ...toFloorMapSummaryDto(floorMap),
    footprintGeoJson: floorMap.footprintGeoJson,
    rooms: (floorMap.rooms ?? [])
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(toRoomDto),
  };
}

/** Returns the campus that owns a bookable resource. Requires deep relations to be loaded. */
export function resourceCampus(resource: BookableResourceEntity): CampusEntity {
  if (resource.room) {
    return resource.room.floorMap.building.campusPlace.campus;
  }

  if (resource.campusPlace) {
    return resource.campusPlace.campus;
  }

  throw new Error(`Bookable resource ${resource.id} has no room or campus place.`);
}

export function toBookableResourceDto(resource: BookableResourceEntity): BookableResourceDto {
  const campus = resourceCampus(resource);
  const room = resource.room;
  const place = room ? room.floorMap.building.campusPlace : resource.campusPlace!;

  return {
    id: resource.id,
    kind: resource.kind,
    name: room ? room.name : place.name,
    campusId: campus.id,
    campusName: campus.name,
    timezone: campus.timezone,
    campusPlaceId: place.id,
    campusPlaceName: place.name,
    roomId: room?.id ?? null,
    floorMapId: room?.floorMapId ?? null,
    floorLabel: room ? room.floorMap.floorLabel : null,
  };
}

export function toMeetingDto(meeting: MeetingEntity): MeetingDto {
  const campus = resourceCampus(meeting.bookableResource);
  const local = toMeetingLocalFields(meeting.startsAtUtc, campus.timezone);

  return {
    id: meeting.id,
    bookableResourceId: meeting.bookableResourceId,
    roomId: meeting.bookableResource.room?.id ?? null,
    floorMapId: meeting.bookableResource.room?.floorMapId ?? null,
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

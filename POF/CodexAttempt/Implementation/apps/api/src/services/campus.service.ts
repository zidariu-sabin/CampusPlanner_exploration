import { CampusPlaceType, GeoJsonPolygon, polygonContainsPolygon } from '@campus/contracts';

import { AppDataSource } from '../data-source.js';
import { BookableResourceEntity } from '../entities/bookable-resource.entity.js';
import { BuildingEntity } from '../entities/building.entity.js';
import { CampusEntity } from '../entities/campus.entity.js';
import { CampusPlaceEntity } from '../entities/campus-place.entity.js';
import { HttpError } from '../utils/http-error.js';
import { ensurePolygon } from '../utils/validation.js';

const campusRepository = () => AppDataSource.getRepository(CampusEntity);
const placeRepository = () => AppDataSource.getRepository(CampusPlaceEntity);
const buildingRepository = () => AppDataSource.getRepository(BuildingEntity);

const campusRelations = {
  places: {
    building: {
      floorMaps: {
        rooms: true,
      },
    },
    bookableResource: true,
  },
} as const;

export async function listCampuses(organizationId: string): Promise<CampusEntity[]> {
  return campusRepository().find({
    where: { organizationId },
    relations: campusRelations,
    order: { name: 'ASC' },
  });
}

export async function getCampusOrFail(organizationId: string, campusId: string): Promise<CampusEntity> {
  const campus = await campusRepository().findOne({
    where: { id: campusId, organizationId },
    relations: campusRelations,
  });

  if (!campus) {
    throw new HttpError(404, 'Campus not found.');
  }

  return campus;
}

export async function createCampus(
  organizationId: string,
  input: { name: string; timezone?: string; boundaryGeoJson?: GeoJsonPolygon | null },
): Promise<CampusEntity> {
  const campus = campusRepository().create({
    organizationId,
    name: input.name.trim(),
    timezone: input.timezone ?? 'Europe/Bucharest',
    boundaryGeoJson: input.boundaryGeoJson ? ensurePolygon(input.boundaryGeoJson) : null,
  });

  await campusRepository().save(campus);
  return getCampusOrFail(organizationId, campus.id);
}

export async function updateCampus(
  organizationId: string,
  campusId: string,
  input: { name: string; timezone?: string; boundaryGeoJson?: GeoJsonPolygon | null },
): Promise<CampusEntity> {
  const campus = await getCampusOrFail(organizationId, campusId);
  campus.name = input.name.trim();
  if (input.timezone) {
    campus.timezone = input.timezone;
  }
  campus.boundaryGeoJson = input.boundaryGeoJson ? ensurePolygon(input.boundaryGeoJson) : null;

  await campusRepository().save(campus);
  return getCampusOrFail(organizationId, campusId);
}

export async function deleteCampus(organizationId: string, campusId: string): Promise<void> {
  await getCampusOrFail(organizationId, campusId);
  await campusRepository().delete({ id: campusId, organizationId });
}

export async function getPlaceOrFail(organizationId: string, placeId: string): Promise<CampusPlaceEntity> {
  const place = await placeRepository().findOne({
    where: { id: placeId },
    relations: {
      campus: true,
      building: { floorMaps: true },
      bookableResource: true,
    },
  });

  if (!place || place.campus.organizationId !== organizationId) {
    throw new HttpError(404, 'Configurable space not found.');
  }

  return place;
}

function assertWithinCampusBoundary(campus: CampusEntity, footprint: GeoJsonPolygon, placeName: string): void {
  if (campus.boundaryGeoJson && !polygonContainsPolygon(campus.boundaryGeoJson, footprint)) {
    throw new HttpError(400, `Space "${placeName}" is outside the campus boundary.`);
  }
}

export async function createPlace(
  organizationId: string,
  campusId: string,
  input: { name: string; type: CampusPlaceType; bookable?: boolean; footprintGeoJson: GeoJsonPolygon },
): Promise<CampusPlaceEntity> {
  const campus = await getCampusOrFail(organizationId, campusId);
  const footprint = ensurePolygon(input.footprintGeoJson);
  assertWithinCampusBoundary(campus, footprint, input.name);

  const bookable = input.type !== 'building' && (input.bookable ?? false);

  const place = await AppDataSource.transaction(async (manager) => {
    const created = manager.create(CampusPlaceEntity, {
      campusId,
      name: input.name.trim(),
      type: input.type,
      bookable,
      footprintGeoJson: footprint,
    });
    await manager.save(created);

    if (input.type === 'building') {
      await manager.save(manager.create(BuildingEntity, { campusPlaceId: created.id }));
    }

    if (bookable) {
      await manager.save(
        manager.create(BookableResourceEntity, {
          organizationId,
          kind: 'campus_place',
          campusPlaceId: created.id,
        }),
      );
    }

    return created;
  });

  return getPlaceOrFail(organizationId, place.id);
}

export async function updatePlace(
  organizationId: string,
  campusId: string,
  placeId: string,
  input: { name: string; type: CampusPlaceType; bookable?: boolean; footprintGeoJson: GeoJsonPolygon },
): Promise<CampusPlaceEntity> {
  const place = await getPlaceOrFail(organizationId, placeId);
  if (place.campusId !== campusId) {
    throw new HttpError(404, 'Configurable space not found.');
  }

  if (place.type === 'building' && input.type !== 'building' && (place.building?.floorMaps?.length ?? 0) > 0) {
    throw new HttpError(409, 'Remove the building floors before changing this space to a non-building type.');
  }

  const footprint = ensurePolygon(input.footprintGeoJson);
  assertWithinCampusBoundary(place.campus, footprint, input.name);

  const bookable = input.type !== 'building' && (input.bookable ?? false);

  await AppDataSource.transaction(async (manager) => {
    place.name = input.name.trim();
    place.type = input.type;
    place.bookable = bookable;
    place.footprintGeoJson = footprint;
    await manager.save(CampusPlaceEntity, place);

    if (input.type === 'building' && !place.building) {
      await manager.save(manager.create(BuildingEntity, { campusPlaceId: place.id }));
    }

    if (input.type !== 'building' && place.building && (place.building.floorMaps?.length ?? 0) === 0) {
      await manager.delete(BuildingEntity, { id: place.building.id });
    }

    if (bookable && !place.bookableResource) {
      await manager.save(
        manager.create(BookableResourceEntity, {
          organizationId,
          kind: 'campus_place',
          campusPlaceId: place.id,
        }),
      );
    }

    if (!bookable && place.bookableResource) {
      await manager.delete(BookableResourceEntity, { id: place.bookableResource.id });
    }
  });

  return getPlaceOrFail(organizationId, placeId);
}

export async function deletePlace(organizationId: string, campusId: string, placeId: string): Promise<void> {
  const place = await getPlaceOrFail(organizationId, placeId);
  if (place.campusId !== campusId) {
    throw new HttpError(404, 'Configurable space not found.');
  }

  await placeRepository().delete({ id: placeId });
}

export async function getBuildingOrFail(organizationId: string, buildingId: string): Promise<BuildingEntity> {
  const building = await buildingRepository().findOne({
    where: { id: buildingId },
    relations: {
      campusPlace: { campus: true },
      floorMaps: { rooms: true },
    },
  });

  if (!building || building.campusPlace.campus.organizationId !== organizationId) {
    throw new HttpError(404, 'Building not found.');
  }

  return building;
}

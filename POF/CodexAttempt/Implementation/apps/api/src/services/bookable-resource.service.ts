import { AppDataSource } from '../data-source.js';
import { BookableResourceEntity } from '../entities/bookable-resource.entity.js';
import { HttpError } from '../utils/http-error.js';

const resourceRepository = () => AppDataSource.getRepository(BookableResourceEntity);

const resourceRelations = {
  room: {
    floorMap: {
      building: {
        campusPlace: {
          campus: true,
        },
      },
    },
  },
  campusPlace: {
    campus: true,
  },
} as const;

export async function listBookableResources(organizationId: string): Promise<BookableResourceEntity[]> {
  return resourceRepository().find({
    where: { organizationId },
    relations: resourceRelations,
    order: { createdAt: 'ASC' },
  });
}

export async function getBookableResourceOrFail(
  organizationId: string,
  resourceId: string,
): Promise<BookableResourceEntity> {
  const resource = await resourceRepository().findOne({
    where: { id: resourceId, organizationId },
    relations: resourceRelations,
  });

  if (!resource) {
    throw new HttpError(404, 'Bookable resource not found.');
  }

  return resource;
}

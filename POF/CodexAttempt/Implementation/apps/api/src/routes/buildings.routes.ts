import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import { getBuildingOrFail } from '../services/campus.service.js';
import { createFloorMap, getFloorMapOrFail } from '../services/floor-map.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { toFloorMapDto, toFloorMapSummaryDto } from '../utils/serializers.js';

function routeParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  throw new HttpError(400, `Missing route parameter: ${name}.`);
}

const floorMapSchema = z.object({
  name: z.string().trim().min(2).max(120),
  floorLabel: z.string().trim().min(1).max(50),
  footprintGeoJson: z.any(),
});

export const buildingsRouter = Router();

buildingsRouter.use(authenticate);

buildingsRouter.get(
  '/:buildingId/floors',
  asyncHandler(async (request, response) => {
    const building = await getBuildingOrFail(
      request.user!.organizationId,
      routeParam(request.params.buildingId, 'buildingId'),
    );

    const floors = await Promise.all(
      (building.floorMaps ?? []).map((floorMap) => getFloorMapOrFail(request.user!.organizationId, floorMap.id)),
    );

    response.json(
      floors
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(toFloorMapSummaryDto),
    );
  }),
);

buildingsRouter.post(
  '/:buildingId/floors',
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    const body = floorMapSchema.parse(request.body);
    const floorMap = await createFloorMap(
      request.user!.organizationId,
      routeParam(request.params.buildingId, 'buildingId'),
      body,
    );

    response.status(201).json(toFloorMapDto(floorMap));
  }),
);

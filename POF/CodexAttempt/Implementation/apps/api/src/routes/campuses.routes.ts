import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createCampus,
  createPlace,
  deleteCampus,
  deletePlace,
  getCampusOrFail,
  listCampuses,
  updateCampus,
  updatePlace,
} from '../services/campus.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { toCampusDto, toCampusPlaceDto, toCampusSummaryDto } from '../utils/serializers.js';

function routeParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  throw new HttpError(400, `Missing route parameter: ${name}.`);
}

const campusSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(1).optional(),
  boundaryGeoJson: z.any().nullable().optional(),
});

const placeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['building', 'sports_field', 'tennis_court', 'parking', 'outdoor_area', 'other']),
  bookable: z.boolean().optional(),
  footprintGeoJson: z.any(),
});

export const campusesRouter = Router();

campusesRouter.use(authenticate);

campusesRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const campuses = await listCampuses(request.user!.organizationId);
    response.json(campuses.map(toCampusSummaryDto));
  }),
);

campusesRouter.get(
  '/:campusId',
  asyncHandler(async (request, response) => {
    const campus = await getCampusOrFail(request.user!.organizationId, routeParam(request.params.campusId, 'campusId'));
    response.json(toCampusDto(campus));
  }),
);

campusesRouter.post(
  '/',
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    const body = campusSchema.parse(request.body);
    const campus = await createCampus(request.user!.organizationId, body);
    response.status(201).json(toCampusDto(campus));
  }),
);

campusesRouter.patch(
  '/:campusId',
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    const body = campusSchema.parse(request.body);
    const campus = await updateCampus(
      request.user!.organizationId,
      routeParam(request.params.campusId, 'campusId'),
      body,
    );
    response.json(toCampusDto(campus));
  }),
);

campusesRouter.delete(
  '/:campusId',
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    await deleteCampus(request.user!.organizationId, routeParam(request.params.campusId, 'campusId'));
    response.status(204).send();
  }),
);

campusesRouter.post(
  '/:campusId/places',
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    const body = placeSchema.parse(request.body);
    const place = await createPlace(
      request.user!.organizationId,
      routeParam(request.params.campusId, 'campusId'),
      body,
    );
    response.status(201).json(toCampusPlaceDto(place));
  }),
);

campusesRouter.patch(
  '/:campusId/places/:placeId',
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    const body = placeSchema.parse(request.body);
    const place = await updatePlace(
      request.user!.organizationId,
      routeParam(request.params.campusId, 'campusId'),
      routeParam(request.params.placeId, 'placeId'),
      body,
    );
    response.json(toCampusPlaceDto(place));
  }),
);

campusesRouter.delete(
  '/:campusId/places/:placeId',
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    await deletePlace(
      request.user!.organizationId,
      routeParam(request.params.campusId, 'campusId'),
      routeParam(request.params.placeId, 'placeId'),
    );
    response.status(204).send();
  }),
);

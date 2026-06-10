import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import { listBookableResources } from '../services/bookable-resource.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { toBookableResourceDto } from '../utils/serializers.js';

export const bookableResourcesRouter = Router();

bookableResourcesRouter.get(
  '/',
  authenticate,
  asyncHandler(async (request, response) => {
    const resources = await listBookableResources(request.user!.organizationId);
    response.json(resources.map(toBookableResourceDto));
  }),
);

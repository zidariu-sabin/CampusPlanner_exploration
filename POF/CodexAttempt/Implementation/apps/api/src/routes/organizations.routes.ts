import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import { createInvite, getOrganizationOrFail, listInvites } from '../services/organization.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { toInviteDto, toOrganizationDto } from '../utils/serializers.js';

const createInviteSchema = z.object({
  role: z.enum(['admin', 'member']),
  email: z.email().nullable().optional(),
  expiresInDays: z.number().int().min(1).max(60).optional(),
});

export const organizationsRouter = Router();

organizationsRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (request, response) => {
    const organization = await getOrganizationOrFail(request.user!.organizationId);
    response.json(toOrganizationDto(organization));
  }),
);

organizationsRouter.get(
  '/invites',
  authenticate,
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    const invites = await listInvites(request.user!.organizationId);
    response.json(invites.map(toInviteDto));
  }),
);

organizationsRouter.post(
  '/invites',
  authenticate,
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    const body = createInviteSchema.parse(request.body);
    const invite = await createInvite({
      organizationId: request.user!.organizationId,
      role: body.role,
      email: body.email ?? null,
      expiresInDays: body.expiresInDays,
      createdBy: request.user!,
    });

    response.status(201).json(toInviteDto(invite));
  }),
);

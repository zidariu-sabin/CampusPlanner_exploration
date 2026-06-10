import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/auth.js';
import { loginUser, registerOrganizationOwner, registerWithInvite } from '../services/auth.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { toUserSummary } from '../utils/serializers.js';

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  displayName: z.string().trim().min(2).max(120),
  organizationName: z.string().trim().min(2).max(120),
});

const registerWithInviteSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  displayName: z.string().trim().min(2).max(120),
  inviteToken: z.string().trim().min(16).max(128),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (request, response) => {
    const body = registerSchema.parse(request.body);
    response.status(201).json(await registerOrganizationOwner(body));
  }),
);

authRouter.post(
  '/register/invite',
  asyncHandler(async (request, response) => {
    const body = registerWithInviteSchema.parse(request.body);
    response.status(201).json(await registerWithInvite(body));
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (request, response) => {
    const body = loginSchema.parse(request.body);
    response.json(await loginUser(body.email, body.password));
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (request, response) => {
    response.json(toUserSummary(request.user!));
  }),
);

import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/auth.js';
import { loginUser, registerUser } from '../services/auth.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { toUserSummary } from '../utils/serializers.js';

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  displayName: z.string().trim().min(2).max(120),
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
    response.status(201).json(await registerUser(body));
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


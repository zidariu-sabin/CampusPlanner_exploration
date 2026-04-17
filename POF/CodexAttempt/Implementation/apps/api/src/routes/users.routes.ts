import { Router } from 'express';

import { AppDataSource } from '../data-source.js';
import { UserEntity } from '../entities/user.entity.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { toUserSummary } from '../utils/serializers.js';

export const usersRouter = Router();

usersRouter.get(
  '/',
  authenticate,
  asyncHandler(async (_request, response) => {
    const users = await AppDataSource.getRepository(UserEntity).find({
      order: {
        displayName: 'ASC',
      },
    });

    response.json(users.map(toUserSummary));
  }),
);


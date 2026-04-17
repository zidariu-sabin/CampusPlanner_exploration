import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { AppDataSource } from '../data-source.js';
import { UserEntity } from '../entities/user.entity.js';
import { HttpError } from '../utils/http-error.js';
import { config } from '../config.js';

interface TokenPayload {
  sub: string;
  role: string;
  email: string;
}

export async function authenticate(request: Request, _response: Response, next: NextFunction): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Authentication required.'));
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    const user = await AppDataSource.getRepository(UserEntity).findOneBy({ id: payload.sub });

    if (!user) {
      return next(new HttpError(401, 'Authentication required.'));
    }

    request.user = user;
    return next();
  } catch {
    return next(new HttpError(401, 'Authentication required.'));
  }
}

export function requireRole(role: UserEntity['role']) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      return next(new HttpError(401, 'Authentication required.'));
    }

    if (request.user.role !== role) {
      return next(new HttpError(403, 'You do not have permission for this action.'));
    }

    return next();
  };
}


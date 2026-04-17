import { UserEntity } from './entities/user.entity.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserEntity;
    }
  }
}

export {};


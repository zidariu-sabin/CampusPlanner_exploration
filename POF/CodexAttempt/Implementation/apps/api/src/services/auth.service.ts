import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { AuthResponseDto, Role } from '@campus/contracts';

import { config } from '../config.js';
import { AppDataSource } from '../data-source.js';
import { UserEntity } from '../entities/user.entity.js';
import { HttpError } from '../utils/http-error.js';
import { toUserSummary } from '../utils/serializers.js';

const userRepository = () => AppDataSource.getRepository(UserEntity);

function signToken(user: UserEntity): AuthResponseDto {
  const expiresInSeconds = config.jwtExpiresInHours * 60 * 60;
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    config.jwtSecret,
    { expiresIn: expiresInSeconds },
  );

  return {
    token,
    expiresInSeconds,
    user: toUserSummary(user),
  };
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
  role?: Role;
}): Promise<AuthResponseDto> {
  const existing = await userRepository().findOneBy({ email: input.email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, 'A user with that email already exists.');
  }

  const user = userRepository().create({
    email: input.email.toLowerCase(),
    displayName: input.displayName.trim(),
    role: input.role ?? 'user',
    passwordHash: await bcrypt.hash(input.password, 10),
  });

  await userRepository().save(user);
  return signToken(user);
}

export async function loginUser(email: string, password: string): Promise<AuthResponseDto> {
  const user = await userRepository().findOneBy({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  return signToken(user);
}

export async function seedAdminUser(): Promise<void> {
  const existing = await userRepository().findOneBy({ email: config.adminEmail.toLowerCase() });
  if (existing) {
    return;
  }

  await registerUser({
    email: config.adminEmail,
    password: config.adminPassword,
    displayName: config.adminDisplayName,
    role: 'admin',
  });
}


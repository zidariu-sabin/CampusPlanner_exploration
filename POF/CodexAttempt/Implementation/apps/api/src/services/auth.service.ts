import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { AuthResponseDto } from '@campus/contracts';

import { config } from '../config.js';
import { AppDataSource } from '../data-source.js';
import { OrganizationEntity } from '../entities/organization.entity.js';
import { OrganizationInviteEntity } from '../entities/organization-invite.entity.js';
import { UserEntity } from '../entities/user.entity.js';
import { HttpError } from '../utils/http-error.js';
import { toOrganizationDto, toUserSummary } from '../utils/serializers.js';

const userRepository = () => AppDataSource.getRepository(UserEntity);
const organizationRepository = () => AppDataSource.getRepository(OrganizationEntity);
const inviteRepository = () => AppDataSource.getRepository(OrganizationInviteEntity);

function signToken(user: UserEntity, organization: OrganizationEntity): AuthResponseDto {
  const expiresInSeconds = config.jwtExpiresInHours * 60 * 60;
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      organizationId: user.organizationId,
    },
    config.jwtSecret,
    { expiresIn: expiresInSeconds },
  );

  return {
    token,
    expiresInSeconds,
    user: toUserSummary(user),
    organization: toOrganizationDto(organization),
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'organization';
  let candidate = base;

  while (await organizationRepository().findOneBy({ slug: candidate })) {
    candidate = `${base}-${crypto.randomBytes(2).toString('hex')}`;
  }

  return candidate;
}

async function assertEmailAvailable(email: string): Promise<void> {
  const existing = await userRepository().findOneBy({ email });
  if (existing) {
    throw new HttpError(409, 'A user with that email already exists.');
  }
}

/** Registration creates a new organization with the registering user as owner. */
export async function registerOrganizationOwner(input: {
  email: string;
  password: string;
  displayName: string;
  organizationName: string;
}): Promise<AuthResponseDto> {
  const email = input.email.toLowerCase();
  await assertEmailAvailable(email);

  const result = await AppDataSource.transaction(async (manager) => {
    const organization = manager.create(OrganizationEntity, {
      name: input.organizationName.trim(),
      slug: await uniqueSlug(input.organizationName),
    });
    await manager.save(organization);

    const user = manager.create(UserEntity, {
      organizationId: organization.id,
      email,
      displayName: input.displayName.trim(),
      role: 'owner',
      passwordHash: await bcrypt.hash(input.password, 10),
    });
    await manager.save(user);

    return { user, organization };
  });

  return signToken(result.user, result.organization);
}

/** Invited users join the invite's organization with the invite's role. */
export async function registerWithInvite(input: {
  email: string;
  password: string;
  displayName: string;
  inviteToken: string;
}): Promise<AuthResponseDto> {
  const email = input.email.toLowerCase();
  await assertEmailAvailable(email);

  const invite = await inviteRepository().findOne({
    where: { token: input.inviteToken },
    relations: { organization: true },
  });

  if (!invite || invite.usedAt || invite.expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, 'This invite link is invalid or has expired.');
  }

  if (invite.email && invite.email.toLowerCase() !== email) {
    throw new HttpError(400, 'This invite was issued for a different email address.');
  }

  const user = await AppDataSource.transaction(async (manager) => {
    const created = manager.create(UserEntity, {
      organizationId: invite.organizationId,
      email,
      displayName: input.displayName.trim(),
      role: invite.role,
      passwordHash: await bcrypt.hash(input.password, 10),
    });
    await manager.save(created);

    invite.usedAt = new Date();
    await manager.save(invite);

    return created;
  });

  return signToken(user, invite.organization);
}

export async function loginUser(email: string, password: string): Promise<AuthResponseDto> {
  const user = await userRepository().findOne({
    where: { email: email.toLowerCase() },
    relations: { organization: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  return signToken(user, user.organization);
}

export async function seedAdminUser(): Promise<void> {
  const existing = await userRepository().findOneBy({ email: config.adminEmail.toLowerCase() });
  if (existing) {
    return;
  }

  await registerOrganizationOwner({
    email: config.adminEmail,
    password: config.adminPassword,
    displayName: config.adminDisplayName,
    organizationName: 'Campus Demo Organization',
  });
}

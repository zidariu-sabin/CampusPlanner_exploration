import crypto from 'node:crypto';

import { OrganizationRole } from '@campus/contracts';

import { AppDataSource } from '../data-source.js';
import { OrganizationEntity } from '../entities/organization.entity.js';
import { OrganizationInviteEntity } from '../entities/organization-invite.entity.js';
import { UserEntity } from '../entities/user.entity.js';
import { HttpError } from '../utils/http-error.js';

const inviteRepository = () => AppDataSource.getRepository(OrganizationInviteEntity);

export async function getOrganizationOrFail(organizationId: string): Promise<OrganizationEntity> {
  const organization = await AppDataSource.getRepository(OrganizationEntity).findOneBy({ id: organizationId });
  if (!organization) {
    throw new HttpError(404, 'Organization not found.');
  }

  return organization;
}

export async function listInvites(organizationId: string): Promise<OrganizationInviteEntity[]> {
  return inviteRepository().find({
    where: { organizationId },
    order: { createdAt: 'DESC' },
  });
}

export async function createInvite(input: {
  organizationId: string;
  role: Exclude<OrganizationRole, 'owner'>;
  email?: string | null;
  expiresInDays?: number;
  createdBy: UserEntity;
}): Promise<OrganizationInviteEntity> {
  const expiresInDays = input.expiresInDays ?? 7;
  const invite = inviteRepository().create({
    organizationId: input.organizationId,
    token: crypto.randomBytes(24).toString('hex'),
    role: input.role,
    email: input.email?.toLowerCase() ?? null,
    createdByUserId: input.createdBy.id,
    expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
  });

  await inviteRepository().save(invite);
  return invite;
}

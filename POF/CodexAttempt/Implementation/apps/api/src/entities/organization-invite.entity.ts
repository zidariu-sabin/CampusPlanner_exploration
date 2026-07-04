import { OrganizationRole } from '@campus/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';

import { OrganizationEntity } from './organization.entity.js';
import { UserEntity } from './user.entity.js';

@Entity({ name: 'organization_invites' })
export class OrganizationInviteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId = '';

  @Column({ type: 'varchar', unique: true })
  token = '';

  @Column({ type: 'varchar' })
  role: OrganizationRole = 'member';

  @Column({ type: 'varchar', nullable: true })
  email: string | null = null;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId = '';

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'used_at', nullable: true })
  usedAt: Date | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => OrganizationEntity, (organization) => organization.invites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Relation<OrganizationEntity>;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: Relation<UserEntity>;
}

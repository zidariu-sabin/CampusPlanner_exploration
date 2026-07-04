import { OrganizationRole } from '@campus/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';

import { MeetingEntity } from './meeting.entity.js';
import { OrganizationEntity } from './organization.entity.js';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId = '';

  @Column({ type: 'varchar', unique: true })
  email = '';

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash = '';

  @Column({ type: 'varchar', name: 'display_name' })
  displayName = '';

  @Column({ type: 'varchar' })
  role: OrganizationRole = 'member';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => OrganizationEntity, (organization) => organization.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Relation<OrganizationEntity>;

  @OneToMany(() => MeetingEntity, (meeting) => meeting.createdBy)
  meetingsCreated!: Relation<MeetingEntity>[];

  @ManyToMany(() => MeetingEntity, (meeting) => meeting.participants)
  meetings!: Relation<MeetingEntity>[];
}

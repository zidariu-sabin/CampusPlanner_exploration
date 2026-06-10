import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';

import { CampusEntity } from './campus.entity.js';
import { OrganizationInviteEntity } from './organization-invite.entity.js';
import { UserEntity } from './user.entity.js';

@Entity({ name: 'organizations' })
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name = '';

  @Column({ type: 'varchar', unique: true })
  slug = '';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UserEntity, (user) => user.organization)
  users!: Relation<UserEntity>[];

  @OneToMany(() => CampusEntity, (campus) => campus.organization)
  campuses!: Relation<CampusEntity>[];

  @OneToMany(() => OrganizationInviteEntity, (invite) => invite.organization)
  invites!: Relation<OrganizationInviteEntity>[];
}

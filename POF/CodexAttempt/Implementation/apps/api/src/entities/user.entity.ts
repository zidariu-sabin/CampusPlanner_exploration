import { Role } from '@campus/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { MeetingEntity } from './meeting.entity.js';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email = '';

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash = '';

  @Column({ type: 'varchar', name: 'display_name' })
  displayName = '';

  @Column({ type: 'varchar' })
  role: Role = 'user';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => MeetingEntity, (meeting) => meeting.createdBy)
  meetingsCreated!: MeetingEntity[];

  @ManyToMany(() => MeetingEntity, (meeting) => meeting.participants)
  meetings!: MeetingEntity[];
}

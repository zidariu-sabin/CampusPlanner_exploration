import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RoomEntity } from './room.entity.js';
import { UserEntity } from './user.entity.js';

@Entity({ name: 'meetings' })
export class MeetingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'room_id' })
  roomId = '';

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId = '';

  @Column({ type: 'varchar' })
  title = '';

  @Column({ type: 'text', default: '' })
  description = '';

  @Column({ type: 'timestamptz', name: 'starts_at_utc' })
  startsAtUtc!: Date;

  @Column({ type: 'timestamptz', name: 'ends_at_utc' })
  endsAtUtc!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => RoomEntity, (room) => room.meetings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id' })
  room!: RoomEntity;

  @ManyToOne(() => UserEntity, (user) => user.meetingsCreated, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: UserEntity;

  @ManyToMany(() => UserEntity, (user) => user.meetings)
  @JoinTable({
    name: 'meeting_participants',
    joinColumn: { name: 'meeting_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  participants!: UserEntity[];
}

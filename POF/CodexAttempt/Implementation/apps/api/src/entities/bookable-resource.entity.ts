import { BookableResourceKind } from '@campus/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';

import { CampusPlaceEntity } from './campus-place.entity.js';
import { MeetingEntity } from './meeting.entity.js';
import { OrganizationEntity } from './organization.entity.js';
import { RoomEntity } from './room.entity.js';

@Entity({ name: 'bookable_resources' })
export class BookableResourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId = '';

  @Column({ type: 'varchar' })
  kind: BookableResourceKind = 'room';

  @Column({ type: 'uuid', name: 'room_id', nullable: true, unique: true })
  roomId: string | null = null;

  @Column({ type: 'uuid', name: 'campus_place_id', nullable: true, unique: true })
  campusPlaceId: string | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Relation<OrganizationEntity>;

  @OneToOne(() => RoomEntity, (room) => room.bookableResource, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Relation<RoomEntity> | null;

  @OneToOne(() => CampusPlaceEntity, (place) => place.bookableResource, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campus_place_id' })
  campusPlace!: Relation<CampusPlaceEntity> | null;

  @OneToMany(() => MeetingEntity, (meeting) => meeting.bookableResource)
  meetings!: Relation<MeetingEntity>[];
}

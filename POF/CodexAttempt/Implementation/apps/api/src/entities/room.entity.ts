import { GeoJsonPolygon } from '@campus/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { FloorMapEntity } from './floor-map.entity.js';
import { MeetingEntity } from './meeting.entity.js';

@Entity({ name: 'rooms' })
export class RoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'map_id' })
  mapId = '';

  @Column({ type: 'varchar' })
  name = '';

  @Column({ type: 'varchar' })
  color = '#1a5f7a';

  @Column({ type: 'integer', name: 'sort_order', default: 0 })
  sortOrder = 0;

  @Column({ type: 'jsonb', name: 'geometry_geojson' })
  geometryGeoJson!: GeoJsonPolygon;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => FloorMapEntity, (map) => map.rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'map_id' })
  map!: FloorMapEntity;

  @OneToMany(() => MeetingEntity, (meeting) => meeting.room)
  meetings!: MeetingEntity[];
}

import { GeoJsonPolygon } from '@campus/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';

import { BookableResourceEntity } from './bookable-resource.entity.js';
import { FloorMapEntity } from './floor-map.entity.js';

@Entity({ name: 'rooms' })
export class RoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'floor_map_id' })
  floorMapId = '';

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

  @ManyToOne(() => FloorMapEntity, (floorMap) => floorMap.rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'floor_map_id' })
  floorMap!: Relation<FloorMapEntity>;

  @OneToOne(() => BookableResourceEntity, (resource) => resource.room)
  bookableResource!: Relation<BookableResourceEntity> | null;
}

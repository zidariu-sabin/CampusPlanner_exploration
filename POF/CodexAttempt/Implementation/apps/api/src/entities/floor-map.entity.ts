import { BackgroundFitMode, GeoJsonPolygon } from '@campus/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';

import { BuildingEntity } from './building.entity.js';
import { RoomEntity } from './room.entity.js';

@Entity({ name: 'floor_maps' })
export class FloorMapEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'building_id' })
  buildingId = '';

  @Column({ type: 'varchar' })
  name = '';

  @Column({ type: 'varchar', name: 'floor_label' })
  floorLabel = '';

  @Column({ type: 'jsonb', name: 'footprint_geojson' })
  footprintGeoJson!: GeoJsonPolygon;

  @Column({ type: 'varchar', name: 'background_image_url', nullable: true })
  backgroundImageUrl: string | null = null;

  @Column({ type: 'varchar', name: 'background_fit_mode', default: 'contain' })
  backgroundFitMode: BackgroundFitMode = 'contain';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => BuildingEntity, (building) => building.floorMaps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building!: Relation<BuildingEntity>;

  @OneToMany(() => RoomEntity, (room) => room.floorMap)
  rooms!: Relation<RoomEntity>[];
}

import { BackgroundFitMode, GeoJsonPolygon } from '@campus/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RoomEntity } from './room.entity.js';

@Entity({ name: 'maps' })
export class FloorMapEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name = '';

  @Column({ type: 'varchar', name: 'floor_label' })
  floorLabel = '';

  @Column({ type: 'varchar', default: 'Europe/Bucharest' })
  timezone = 'Europe/Bucharest';

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

  @OneToMany(() => RoomEntity, (room) => room.map)
  rooms!: RoomEntity[];
}

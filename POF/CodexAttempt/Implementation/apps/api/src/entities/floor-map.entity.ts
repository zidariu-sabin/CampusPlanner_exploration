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

  @Column({ type: 'uuid', name: 'parent_map_id', nullable: true })
  parentMapId: string | null = null;

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

  @ManyToOne(() => FloorMapEntity, (map) => map.childMaps, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_map_id' })
  parentMap: FloorMapEntity | null = null;

  @OneToMany(() => FloorMapEntity, (map) => map.parentMap)
  childMaps!: FloorMapEntity[];

  @OneToMany(() => RoomEntity, (room) => room.map)
  rooms!: RoomEntity[];
}

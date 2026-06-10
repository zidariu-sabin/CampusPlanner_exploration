import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';

import { CampusPlaceEntity } from './campus-place.entity.js';
import { FloorMapEntity } from './floor-map.entity.js';

@Entity({ name: 'buildings' })
export class BuildingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'campus_place_id', unique: true })
  campusPlaceId = '';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => CampusPlaceEntity, (place) => place.building, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campus_place_id' })
  campusPlace!: Relation<CampusPlaceEntity>;

  @OneToMany(() => FloorMapEntity, (floorMap) => floorMap.building)
  floorMaps!: Relation<FloorMapEntity>[];
}

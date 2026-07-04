import { CampusPlaceType, GeoJsonPolygon } from '@campus/contracts';
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
import { BuildingEntity } from './building.entity.js';
import { CampusEntity } from './campus.entity.js';

@Entity({ name: 'campus_places' })
export class CampusPlaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'campus_id' })
  campusId = '';

  @Column({ type: 'varchar' })
  name = '';

  @Column({ type: 'varchar' })
  type: CampusPlaceType = 'building';

  @Column({ type: 'boolean', default: false })
  bookable = false;

  @Column({ type: 'jsonb', name: 'footprint_geojson' })
  footprintGeoJson!: GeoJsonPolygon;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => CampusEntity, (campus) => campus.places, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campus_id' })
  campus!: Relation<CampusEntity>;

  @OneToOne(() => BuildingEntity, (building) => building.campusPlace)
  building!: Relation<BuildingEntity> | null;

  @OneToOne(() => BookableResourceEntity, (resource) => resource.campusPlace)
  bookableResource!: Relation<BookableResourceEntity> | null;
}

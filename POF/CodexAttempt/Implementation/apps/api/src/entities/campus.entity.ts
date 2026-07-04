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
  Relation,
} from 'typeorm';

import { CampusPlaceEntity } from './campus-place.entity.js';
import { OrganizationEntity } from './organization.entity.js';

@Entity({ name: 'campuses' })
export class CampusEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId = '';

  @Column({ type: 'varchar' })
  name = '';

  @Column({ type: 'varchar', default: 'Europe/Bucharest' })
  timezone = 'Europe/Bucharest';

  @Column({ type: 'jsonb', name: 'boundary_geojson', nullable: true })
  boundaryGeoJson: GeoJsonPolygon | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => OrganizationEntity, (organization) => organization.campuses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Relation<OrganizationEntity>;

  @OneToMany(() => CampusPlaceEntity, (place) => place.campus)
  places!: Relation<CampusPlaceEntity>[];
}

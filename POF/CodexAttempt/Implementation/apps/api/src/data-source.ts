import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { config } from './config.js';
import { BookableResourceEntity } from './entities/bookable-resource.entity.js';
import { BuildingEntity } from './entities/building.entity.js';
import { CampusEntity } from './entities/campus.entity.js';
import { CampusPlaceEntity } from './entities/campus-place.entity.js';
import { FloorMapEntity } from './entities/floor-map.entity.js';
import { MeetingEntity } from './entities/meeting.entity.js';
import { OrganizationEntity } from './entities/organization.entity.js';
import { OrganizationInviteEntity } from './entities/organization-invite.entity.js';
import { RoomEntity } from './entities/room.entity.js';
import { UserEntity } from './entities/user.entity.js';
import { OrganizationScopedSchema1730000000000 } from './migrations/1730000000000-organization-scoped-schema.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  entities: [
    OrganizationEntity,
    OrganizationInviteEntity,
    UserEntity,
    CampusEntity,
    CampusPlaceEntity,
    BuildingEntity,
    FloorMapEntity,
    RoomEntity,
    BookableResourceEntity,
    MeetingEntity,
  ],
  migrations: [OrganizationScopedSchema1730000000000],
  synchronize: false,
  logging: false,
});

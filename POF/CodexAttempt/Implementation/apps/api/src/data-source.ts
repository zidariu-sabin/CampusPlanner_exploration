import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { config } from './config.js';
import { FloorMapEntity } from './entities/floor-map.entity.js';
import { MeetingEntity } from './entities/meeting.entity.js';
import { RoomEntity } from './entities/room.entity.js';
import { UserEntity } from './entities/user.entity.js';
import { InitialSchema1720000000000 } from './migrations/1720000000000-initial-schema.js';
import { AddMapParent1720000000001 } from './migrations/1720000000001-add-map-parent.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  entities: [UserEntity, FloorMapEntity, RoomEntity, MeetingEntity],
  migrations: [InitialSchema1720000000000, AddMapParent1720000000001],
  synchronize: false,
  logging: false,
});

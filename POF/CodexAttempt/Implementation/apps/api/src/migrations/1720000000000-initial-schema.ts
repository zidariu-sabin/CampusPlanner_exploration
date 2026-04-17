import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1720000000000 implements MigrationInterface {
  name = 'InitialSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar NOT NULL UNIQUE,
        password_hash varchar NOT NULL,
        display_name varchar NOT NULL,
        role varchar NOT NULL DEFAULT 'user',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS maps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        floor_label varchar NOT NULL,
        timezone varchar NOT NULL DEFAULT 'Europe/Bucharest',
        footprint_geojson jsonb NOT NULL,
        background_image_url varchar NULL,
        background_fit_mode varchar NOT NULL DEFAULT 'contain',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        map_id uuid NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        color varchar NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        geometry_geojson jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
        created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        title varchar NOT NULL,
        description text NOT NULL DEFAULT '',
        starts_at_utc timestamptz NOT NULL,
        ends_at_utc timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT meetings_positive_window CHECK (ends_at_utc > starts_at_utc)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meeting_participants (
        meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (meeting_id, user_id)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE meetings
      ADD CONSTRAINT meetings_no_room_overlap
      EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(starts_at_utc, ends_at_utc, '[)') WITH &&
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_no_room_overlap`);
    await queryRunner.query(`DROP TABLE IF EXISTS meeting_participants`);
    await queryRunner.query(`DROP TABLE IF EXISTS meetings`);
    await queryRunner.query(`DROP TABLE IF EXISTS rooms`);
    await queryRunner.query(`DROP TABLE IF EXISTS maps`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}


import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fresh-start schema for the organization-scoped campus hierarchy.
 * Existing maps/rooms/meetings data from the pre-organization schema is not
 * preserved; local databases must be reset (see Implementation/docs/project-description.md).
 */
export class OrganizationScopedSchema1730000000000 implements MigrationInterface {
  name = 'OrganizationScopedSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        slug varchar NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email varchar NOT NULL UNIQUE,
        password_hash varchar NOT NULL,
        display_name varchar NOT NULL,
        role varchar NOT NULL DEFAULT 'member',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_invites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        token varchar NOT NULL UNIQUE,
        role varchar NOT NULL DEFAULT 'member',
        email varchar NULL,
        created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        expires_at timestamptz NOT NULL,
        used_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_organization_invites_organization_id ON organization_invites(organization_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS campuses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        timezone varchar NOT NULL DEFAULT 'Europe/Bucharest',
        boundary_geojson jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_campuses_organization_id ON campuses(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS campus_places (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        campus_id uuid NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        type varchar NOT NULL DEFAULT 'building',
        bookable boolean NOT NULL DEFAULT false,
        footprint_geojson jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_campus_places_campus_id ON campus_places(campus_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        campus_place_id uuid NOT NULL UNIQUE REFERENCES campus_places(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS floor_maps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        floor_label varchar NOT NULL,
        footprint_geojson jsonb NOT NULL,
        background_image_url varchar NULL,
        background_fit_mode varchar NOT NULL DEFAULT 'contain',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_floor_maps_building_id ON floor_maps(building_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        floor_map_id uuid NOT NULL REFERENCES floor_maps(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        color varchar NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        geometry_geojson jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rooms_floor_map_id ON rooms(floor_map_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bookable_resources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        kind varchar NOT NULL,
        room_id uuid NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
        campus_place_id uuid NULL UNIQUE REFERENCES campus_places(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT bookable_resources_single_target CHECK (
          (room_id IS NULL) <> (campus_place_id IS NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_bookable_resources_organization_id ON bookable_resources(organization_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        bookable_resource_id uuid NOT NULL REFERENCES bookable_resources(id) ON DELETE RESTRICT,
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
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_meetings_bookable_resource_id ON meetings(bookable_resource_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meeting_participants (
        meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (meeting_id, user_id)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE meetings
      ADD CONSTRAINT meetings_no_resource_overlap
      EXCLUDE USING gist (
        bookable_resource_id WITH =,
        tstzrange(starts_at_utc, ends_at_utc, '[)') WITH &&
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_no_resource_overlap`);
    await queryRunner.query(`DROP TABLE IF EXISTS meeting_participants`);
    await queryRunner.query(`DROP TABLE IF EXISTS meetings`);
    await queryRunner.query(`DROP TABLE IF EXISTS bookable_resources`);
    await queryRunner.query(`DROP TABLE IF EXISTS rooms`);
    await queryRunner.query(`DROP TABLE IF EXISTS floor_maps`);
    await queryRunner.query(`DROP TABLE IF EXISTS buildings`);
    await queryRunner.query(`DROP TABLE IF EXISTS campus_places`);
    await queryRunner.query(`DROP TABLE IF EXISTS campuses`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_invites`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations`);
  }
}

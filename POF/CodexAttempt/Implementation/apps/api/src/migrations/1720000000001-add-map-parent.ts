import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMapParent1720000000001 implements MigrationInterface {
  name = 'AddMapParent1720000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE maps
      ADD COLUMN IF NOT EXISTS parent_map_id uuid NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'maps_parent_map_fk'
        ) THEN
          ALTER TABLE maps
          ADD CONSTRAINT maps_parent_map_fk
          FOREIGN KEY (parent_map_id)
          REFERENCES maps(id)
          ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_maps_parent_map_id
      ON maps(parent_map_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_maps_parent_map_id`);
    await queryRunner.query(`ALTER TABLE maps DROP CONSTRAINT IF EXISTS maps_parent_map_fk`);
    await queryRunner.query(`ALTER TABLE maps DROP COLUMN IF EXISTS parent_map_id`);
  }
}

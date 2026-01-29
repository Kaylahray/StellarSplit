import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add search indexes for full-text search and fuzzy matching
 * 
 * I'm using PostgreSQL's pg_trgm extension for fuzzy matching and
 * GIN indexes for efficient full-text search. These indexes are
 * essential for good search performance at scale.
 */
export class AddSearchIndexes1738127000000 implements MigrationInterface {
  name = 'AddSearchIndexes1738127000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable the pg_trgm extension for fuzzy matching
    // This is safe to run even if already enabled
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `);

    // GIN index for full-text search on splits.description
    // Using 'english' configuration for stemming and stop words
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_splits_description_fts 
      ON splits USING GIN (to_tsvector('english', COALESCE(description, '')));
    `);

    // Trigram index for fuzzy matching on splits.description
    // This enables similarity() queries with good performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_splits_description_trgm 
      ON splits USING GIN (COALESCE(description, '') gin_trgm_ops);
    `);

    // GIN index for full-text search on items.name
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_items_name_fts 
      ON items USING GIN (to_tsvector('english', name));
    `);

    // Trigram index for fuzzy matching on items.name
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_items_name_trgm 
      ON items USING GIN (name gin_trgm_ops);
    `);

    // Composite index for common filter + sort patterns
    // This speeds up queries filtered by status and sorted by date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_splits_status_created 
      ON splits (status, "createdAt" DESC);
    `);

    // B-tree index for amount range queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_splits_amount_range 
      ON splits ("totalAmount");
    `);

    // Index for participant-based filtering
    // Speeds up EXISTS subqueries when filtering by participants
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_participants_split_user 
      ON participants ("splitId", "userId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove all the indexes we created
    await queryRunner.query(`DROP INDEX IF EXISTS idx_participants_split_user;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_splits_amount_range;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_splits_status_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_items_name_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_items_name_fts;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_splits_description_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_splits_description_fts;`);
    
    // Note: We don't drop pg_trgm extension as other features might use it
  }
}

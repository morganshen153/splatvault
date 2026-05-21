import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Default to project-root/data/splatvault.db when running from dist or src
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', '..', '..', '..', '..', '..', '..', 'data', 'splatvault.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  initSchema()
  migrateV1()

  return db
}

function initSchema() {
  if (!db) return

  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      modified_at INTEGER NOT NULL,
      thumbnail_path TEXT,
      duration INTEGER,
      frame_count INTEGER,
      indexed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
    CREATE INDEX IF NOT EXISTS idx_assets_path ON assets(path);

    CREATE TABLE IF NOT EXISTS asset_embeddings (
      asset_id TEXT NOT NULL,
      model TEXT NOT NULL,
      vector BLOB NOT NULL,
      source TEXT NOT NULL,
      frame_time REAL,
      PRIMARY KEY (asset_id, model, source),
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      root_path TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS collection_assets (
      collection_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      note TEXT,
      PRIMARY KEY (collection_id, asset_id),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS asset_tags (
      asset_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (asset_id, tag_id),
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_frames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id TEXT NOT NULL,
      frame_index INTEGER NOT NULL,
      time_seconds REAL NOT NULL,
      thumbnail_path TEXT,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_video_frames_asset ON video_frames(asset_id);
  `)
}

/** Migration v1: add frame_time to asset_embeddings PK to support multi-frame video */
function migrateV1() {
  if (!db) return
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='asset_embeddings'").get() as { sql: string } | undefined
  if (!row) return
  // Already migrated if PK mentions frame_time
  if (row.sql.includes('frame_time,')) return

  db.exec(`
    CREATE TABLE asset_embeddings_new (
      asset_id TEXT NOT NULL,
      model TEXT NOT NULL,
      vector BLOB NOT NULL,
      source TEXT NOT NULL,
      frame_time REAL,
      PRIMARY KEY (asset_id, model, source, frame_time),
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    );
    INSERT INTO asset_embeddings_new SELECT * FROM asset_embeddings;
    DROP TABLE asset_embeddings;
    ALTER TABLE asset_embeddings_new RENAME TO asset_embeddings;
  `)
  // Clean up any rows with wrong model label (e.g. local-fallback stored as clip)
  db.exec("DELETE FROM asset_embeddings WHERE model = 'clip-vit-base-patch32' AND length(vector) != 2048")
}

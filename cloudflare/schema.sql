-- D1 Database Schema for Monsters
-- This schema stores monster data from Open5e API

CREATE TABLE IF NOT EXISTS monsters (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  size TEXT,
  type TEXT,
  subtype TEXT,
  alignment TEXT,
  armor_class INTEGER,
  armor_desc TEXT,
  hit_points INTEGER,
  hit_dice TEXT,
  speed_walk INTEGER,
  speed_fly INTEGER,
  speed_swim INTEGER,
  speed_burrow INTEGER,
  speed_climb INTEGER,
  strength INTEGER,
  dexterity INTEGER,
  constitution INTEGER,
  intelligence INTEGER,
  wisdom INTEGER,
  charisma INTEGER,
  strength_save INTEGER,
  dexterity_save INTEGER,
  constitution_save INTEGER,
  intelligence_save INTEGER,
  wisdom_save INTEGER,
  charisma_save INTEGER,
  perception INTEGER,
  skills TEXT, -- JSON string
  damage_vulnerabilities TEXT,
  damage_resistances TEXT,
  damage_immunities TEXT,
  condition_immunities TEXT,
  senses TEXT,
  languages TEXT,
  challenge_rating TEXT,
  cr REAL,
  actions TEXT, -- JSON string
  bonus_actions TEXT, -- JSON string
  reactions TEXT, -- JSON string
  legendary_desc TEXT,
  legendary_actions TEXT, -- JSON string
  special_abilities TEXT, -- JSON string
  spell_list TEXT, -- JSON string
  img_main TEXT,
  document_slug TEXT,
  document_title TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_monsters_name ON monsters(name);
CREATE INDEX IF NOT EXISTS idx_monsters_type ON monsters(type);
CREATE INDEX IF NOT EXISTS idx_monsters_cr ON monsters(cr);
CREATE INDEX IF NOT EXISTS idx_monsters_size ON monsters(size);

-- Full-text search index (SQLite FTS5)
-- Using a separate FTS table that we'll manually sync with the monsters table
-- This is because FTS5 content_rowid requires an INTEGER PRIMARY KEY, but we use TEXT (slug)
CREATE VIRTUAL TABLE IF NOT EXISTS monsters_fts USING fts5(
  slug UNINDEXED,  -- Store slug for joining, but don't index it
  name,
  type,
  subtype,
  alignment
);


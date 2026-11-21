CREATE TABLE IF NOT EXISTS jarvis_sync (
  sync_code TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

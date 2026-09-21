-- Umami history has no raw IP and must not be subject to live-IP retention.
CREATE TABLE IF NOT EXISTS umami_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  website_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  session_id TEXT NOT NULL DEFAULT '',
  visited_at INTEGER NOT NULL,
  origin TEXT NOT NULL,
  path TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  imported_at INTEGER NOT NULL,
  UNIQUE(website_id, event_id)
);
CREATE INDEX IF NOT EXISTS umami_visits_timeline ON umami_visits(visited_at DESC, id DESC);

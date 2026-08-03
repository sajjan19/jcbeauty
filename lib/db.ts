import "server-only";

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * A single SQLite file holds every booking. For a one-artist studio this is
 * plenty — it's fast, needs no separate service, and the whole database is one
 * file you can copy as a backup.
 *
 * Set DATABASE_PATH in the environment to move it (useful on hosts with a
 * mounted disk). Defaults to ./data/jcbeauty.db.
 */

const dbPath =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "jcbeauty.db");

declare global {
  // Reused across hot reloads in development so we don't open a new handle
  // on every file change.
  var __jcBeautyDb: Database.Database | undefined;
}

function connect(): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      reference        TEXT    NOT NULL UNIQUE,
      service_slug     TEXT    NOT NULL,
      service_name     TEXT    NOT NULL,
      price            INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      date             TEXT    NOT NULL,
      start_minutes    INTEGER NOT NULL,
      end_minutes      INTEGER NOT NULL,
      client_name      TEXT    NOT NULL,
      email            TEXT    NOT NULL,
      phone            TEXT    NOT NULL,
      notes            TEXT,
      first_time       INTEGER NOT NULL DEFAULT 0,
      status           TEXT    NOT NULL DEFAULT 'pending',
      created_at       TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_date
      ON bookings (date, status);

    CREATE TABLE IF NOT EXISTS blocked_dates (
      date       TEXT PRIMARY KEY,
      reason     TEXT,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

export const db = globalThis.__jcBeautyDb ?? connect();

if (process.env.NODE_ENV !== "production") {
  globalThis.__jcBeautyDb = db;
}

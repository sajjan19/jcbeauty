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

    -- A row with NULL start/end blocks the whole day. Otherwise it blocks
    -- just that window, so she can work part of a day.
    CREATE TABLE IF NOT EXISTS blocked_periods (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT NOT NULL,
      start_minutes INTEGER,
      end_minutes   INTEGER,
      reason        TEXT,
      created_at    TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_blocked_periods_date
      ON blocked_periods (date);

    -- Her address book. Kept separate from bookings so a client can be added
    -- before they've booked, and removed without erasing their history.
    CREATE TABLE IF NOT EXISTS clients (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL DEFAULT '',
      phone      TEXT NOT NULL DEFAULT '',
      notes      TEXT,
      created_at TEXT NOT NULL
    );

    -- Partial, so several contacts without an email don't collide.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email
      ON clients (LOWER(email)) WHERE email <> '';
  `);

  // First run after this table appeared: seed it from whoever has booked.
  const clientCount = db
    .prepare(`SELECT COUNT(*) AS n FROM clients`)
    .get() as { n: number };

  if (clientCount.n === 0) {
    db.exec(`
      INSERT INTO clients (name, email, phone, created_at)
        SELECT MAX(client_name), MAX(email), MAX(phone), MIN(created_at)
        FROM bookings
        WHERE email <> ''
        GROUP BY LOWER(email);
    `);
  }

  // Carry over any whole-day blocks from the original table, then retire it.
  const legacy = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'blocked_dates'`,
    )
    .get();

  if (legacy) {
    db.exec(`
      INSERT INTO blocked_periods (date, start_minutes, end_minutes, reason, created_at)
        SELECT date, NULL, NULL, reason, created_at FROM blocked_dates;
      DROP TABLE blocked_dates;
    `);
  }

  return db;
}

export const db = globalThis.__jcBeautyDb ?? connect();

if (process.env.NODE_ENV !== "production") {
  globalThis.__jcBeautyDb = db;
}

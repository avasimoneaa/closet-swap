// SQLite storage using Node's built-in driver (Node 22.5+), so there is nothing to install.
// Every record is a JSON document filed under a collection, which mirrors how the frontend
// keeps its state: items you add, borrow requests, swap status changes, item edits,
// your profile, and your wishlist.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const COLLECTIONS = ["items", "requests", "exState", "prefs", "profile", "wishlist"];

export function openDb(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS docs (
      collection TEXT NOT NULL,
      id         TEXT NOT NULL,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (collection, id)
    );
  `);

  const upsert = db.prepare(`
    INSERT INTO docs (collection, id, data, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `);
  const remove = db.prepare(`DELETE FROM docs WHERE collection = ? AND id = ?`);
  const all = db.prepare(`SELECT collection, id, data FROM docs ORDER BY updated_at`);

  return {
    put(collection, id, data) {
      upsert.run(collection, id, JSON.stringify(data), new Date().toISOString());
    },
    remove(collection, id) {
      remove.run(collection, id);
    },
    // Everything the frontend needs on load, grouped by collection.
    state() {
      const out = Object.fromEntries(COLLECTIONS.map(c => [c, []]));
      for (const row of all.all()) {
        if (!out[row.collection]) continue;
        out[row.collection].push({ ...JSON.parse(row.data), id: row.id });
      }
      return out;
    },
  };
}

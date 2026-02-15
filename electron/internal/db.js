// internal/db.js
const fs = require("fs");
const path = require("path");
const os = require("os");
const sqlite3 = require("sqlite3").verbose();

// Database directory & file (per-user)
const DB_DIR = path.join(os.homedir(), ".local", "share");
const DB_FILE = "mocha.db";
const DB_PATH = path.join(DB_DIR, DB_FILE);

let dbPromise = null;

/**
 * Ensure DB directory exists (recursive).
 */
function ensureDbDir() {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
  } catch (err) {
    throw err;
  }
}

/**
 * Returns a Promise that resolves to an open sqlite3.Database
 * Ensures the favourites, collections, collection_items and downloads tables exist.
 */
function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      ensureDbDir();
    } catch (err) {
      return reject(err);
    }

    const db = new sqlite3.Database(
      DB_PATH,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if (err) return reject(err);

        // Enable foreign keys
        db.run("PRAGMA foreign_keys = ON;", (fkErr) => {
          if (fkErr) {
            console.warn("Could not enable foreign_keys:", fkErr);
            // continue anyway
          }

          // Create tables if not exists
          const createFavourites = `CREATE TABLE IF NOT EXISTS favourites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            animeId TEXT,
            title TEXT,
            cover TEXT
          );`;

          const createCollections = `CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT (datetime('now'))
          );`;

          const createCollectionItems = `CREATE TABLE IF NOT EXISTS collection_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id INTEGER NOT NULL,
            animeId TEXT,
            title TEXT,
            cover TEXT,
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
          );`;

          // Add index/unique constraint to avoid duplicate anime in same collection
          const createCollectionUnique = `CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_anime_unique
            ON collection_items (collection_id, animeId);`;

          // ---- New downloads table ----
          // Fields:
          // - id (PK)
          // - animeId (string) — matches other tables
          // - episodeNumber (integer)
          // - episodeTitle text
          // - magnetLink (text)
          // - torrentUrl (text)
          // - isDownloaded (0/1) — INTEGER used as boolean
          // - filePath (text) — location on disk if downloaded
          const createDownloads = `CREATE TABLE IF NOT EXISTS downloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            animeId TEXT NOT NULL,
            episodeNumber INTEGER NOT NULL,
            episodeTitle TEXT,
            magnetLink TEXT,
            torrentUrl TEXT,
            isDownloaded INTEGER DEFAULT 0,
            filePath TEXT,
            created_at TEXT DEFAULT (datetime('now'))
          );`;
          

          // Unique index to prevent duplicate records for same anime episode
          const createDownloadsUnique = `CREATE UNIQUE INDEX IF NOT EXISTS idx_downloads_unique
            ON downloads (animeId, episodeNumber);`;

          // Run sequentially
          db.serialize(() => {
            db.run(createFavourites);
            db.run(createCollections);
            db.run(createCollectionItems);
            db.run(createCollectionUnique);
            db.run(createDownloads);
            db.run(createDownloadsUnique, (idxErr) => {
              if (idxErr) console.warn("Could not create downloads index:", idxErr);
              resolve(db);
            });
          });
        });
      }
    );
  });

  return dbPromise;
}

/**
 * Close DB (optional helper)
 */
async function closeDB() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

module.exports = {
  DB_DIR,
  DB_PATH,
  getDB,
  closeDB,
};

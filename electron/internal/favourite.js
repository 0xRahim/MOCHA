// internal/favourite.js
const dbModule = require("./db");

/**
 * Promise-wrapped sqlite helpers (run/get/all)
 */
async function run(sql, params = []) {
  const db = await dbModule.getDB();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      // `this` is statement context: lastID/changes available
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function get(sql, params = []) {
  const db = await dbModule.getDB();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

async function all(sql, params = []) {
  const db = await dbModule.getDB();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

/* ---------------- CRUD operations for favourites ---------------- */

/**
 * Create a favourite entry.
 * @param {{ animeId: string, title?: string, cover?: string }} data
 * @returns {Promise<{ lastID: number, changes: number }>}
 */
async function createFavourite({ animeId, title = null, cover = null }) {
  const sql = `INSERT INTO favourites (animeId, title, cover) VALUES (?, ?, ?)`;
  return run(sql, [animeId, title, cover]);
}

/**
 * Get a favourite by numeric id (primary key).
 * @param {number} id
 * @returns {Promise<null|object>}
 */
async function getFavouriteById(id) {
  const sql = `SELECT * FROM favourites WHERE id = ? LIMIT 1`;
  return get(sql, [id]);
}

/**
 * Get a favourite by animeId (string).
 * @param {string} animeId
 * @returns {Promise<null|object>}
 */
async function getFavouriteByAnimeId(animeId) {
  const sql = `SELECT * FROM favourites WHERE animeId = ? LIMIT 1`;
  return get(sql, [animeId]);
}

/**
 * List all favourites. Ordered by id desc (most recent first).
 * @returns {Promise<Array>}
 */
async function getAllFavourites() {
  const sql = `SELECT * FROM favourites ORDER BY id DESC`;
  return all(sql);
}

/**
 * Update a favourite row.
 * Only updates columns provided (animeId, title, cover).
 * @param {number} id
 * @param {{ animeId?: string, title?: string, cover?: string }} data
 * @returns {Promise<{ changes: number }>}
 */
async function updateFavourite(id, data = {}) {
  const fields = [];
  const params = [];

  if (data.animeId !== undefined) {
    fields.push("animeId = ?");
    params.push(data.animeId);
  }
  if (data.title !== undefined) {
    fields.push("title = ?");
    params.push(data.title);
  }
  if (data.cover !== undefined) {
    fields.push("cover = ?");
    params.push(data.cover);
  }

  if (fields.length === 0) {
    // nothing to do
    return { changes: 0 };
  }

  params.push(id);
  const sql = `UPDATE favourites SET ${fields.join(", ")} WHERE id = ?`;
  const res = await run(sql, params);
  return { changes: res.changes };
}

/**
 * Delete a favourite by id.
 * @param {number} id
 * @returns {Promise<{ changes: number }>}
 */
async function deleteFavourite(id) {
  const sql = `DELETE FROM favourites WHERE id = ?`;
  const res = await run(sql, [id]);
  return { changes: res.changes };
}

module.exports = {
  createFavourite,
  getFavouriteById,
  getFavouriteByAnimeId,
  getAllFavourites,
  updateFavourite,
  deleteFavourite,
};

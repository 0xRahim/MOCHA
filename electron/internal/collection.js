// internal/collection.js
const dbModule = require("./db");

/* Promise-wrapped sqlite helpers (run/get/all) */
async function run(sql, params = []) {
  const db = await dbModule.getDB();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
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

/* ---------------- Collection CRUD ---------------- */

/**
 * Create a new collection.
 * @param {{ name: string, description?: string }} data
 * @returns {Promise<{ lastID: number, changes: number }>}
 */
async function createCollection( name ) {
    const description = ""
    console.log(name)
    console.log(description)
  const sql = `INSERT INTO collections (name, description) VALUES (?, ?)`;
  return run(sql, [name, description]);
}

/**
 * Get collection by id (without items)
 * @param {number} id
 * @returns {Promise<null|object>}
 */
async function getCollectionById(id) {
  const sql = `SELECT * FROM collections WHERE id = ? LIMIT 1`;
  return get(sql, [id]);
}

/**
 * Get collection by id and include items
 * @param {number} id
 * @returns {Promise<null|object>}
 */
async function getCollectionWithItems(id) {
  const coll = await getCollectionById(id);
  if (!coll) return null;
  const items = await getItemsByCollection(id);
  return { ...coll, items };
}

/**
 * List all collections (no items)
 * @returns {Promise<Array>}
 */
async function getAllCollections() {
    console.log("[collection] running SQL:");
  const sql = `SELECT * FROM collections ORDER BY id DESC`;
  console.log("[collection] getAllCollections ->");
  return all(sql);
}

/**
 * Update collection (name, description)
 * @param {number} id
 * @param {{ name?: string, description?: string }} data
 * @returns {Promise<{ changes: number }>}
 */
async function updateCollection(id, data = {}) {
  const fields = [];
  const params = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    params.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    params.push(data.description);
  }

  if (fields.length === 0) return { changes: 0 };

  params.push(id);
  const sql = `UPDATE collections SET ${fields.join(", ")} WHERE id = ?`;
  const res = await run(sql, params);
  return { changes: res.changes };
}

/**
 * Delete a collection (and cascade delete items via FK)
 * @param {number} id
 * @returns {Promise<{ changes: number }>}
 */
async function deleteCollection(id) {
  const sql = `DELETE FROM collections WHERE id = ?`;
  const res = await run(sql, [id]);
  return { changes: res.changes };
}

/* ---------------- Collection Items CRUD ---------------- */

/**
 * Add an anime to a collection.
 * Unique constraint on (collection_id, animeId) will prevent duplicates.
 * @param {number} collectionId
 * @param {{ animeId: string, title?: string, cover?: string }} data
 * @returns {Promise<{ lastID: number, changes: number }>}
 */
// electron/internal/collection.js

async function addItemToCollection({ collectionId, animeId, title = null, cover = null }) {
    const sql = `INSERT INTO collection_items (collection_id, animeId, title, cover) VALUES (?, ?, ?, ?)`;
    // Note: collectionId is now destructured from the first argument
    return run(sql, [collectionId, animeId, title, cover]);
  }
/**
 * Get item by its DB id
 * @param {number} id
 * @returns {Promise<null|object>}
 */
async function getItemById(id) {
  const sql = `SELECT * FROM collection_items WHERE id = ? LIMIT 1`;
  return get(sql, [id]);
}

/**
 * Get an item by collectionId + animeId (useful to check duplication)
 * @param {number} collectionId
 * @param {string} animeId
 * @returns {Promise<null|object>}
 */
async function getItemByAnimeId(collectionId, animeId) {
  const sql = `SELECT * FROM collection_items WHERE collection_id = ? AND animeId = ? LIMIT 1`;
  return get(sql, [collectionId, animeId]);
}

/**
 * List items in a collection
 * @param {number} collectionId
 * @returns {Promise<Array>}
 */
async function getItemsByCollection(collectionId) {
  const sql = `SELECT * FROM collection_items WHERE collection_id = ? ORDER BY id DESC`;
  return all(sql, [collectionId]);
}

/**
 * Update an item (anime entry) by id
 * @param {number} id
 * @param {{ animeId?: string, title?: string, cover?: string }} data
 * @returns {Promise<{ changes: number }>}
 */
async function updateItem(id, data = {}) {
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

  if (fields.length === 0) return { changes: 0 };

  params.push(id);
  const sql = `UPDATE collection_items SET ${fields.join(", ")} WHERE id = ?`;
  const res = await run(sql, params);
  return { changes: res.changes };
}

/**
 * Remove an item by id
 * @param {number} id
 * @returns {Promise<{ changes: number }>}
 */
async function deleteItem(id) {
  const sql = `DELETE FROM collection_items WHERE id = ?`;
  const res = await run(sql, [id]);
  return { changes: res.changes };
}

/* ---------------- Optional helpers ---------------- */

/**
 * Move an item to another collection
 * @param {number} itemId
 * @param {number} newCollectionId
 * @returns {Promise<{ changes: number }>}
 */
async function moveItemToCollection(itemId, newCollectionId) {
  const sql = `UPDATE collection_items SET collection_id = ? WHERE id = ?`;
  const res = await run(sql, [newCollectionId, itemId]);
  return { changes: res.changes };
}

module.exports = {
  // collections
  createCollection,
  getCollectionById,
  getCollectionWithItems,
  getAllCollections,
  updateCollection,
  deleteCollection,

  // items
  addItemToCollection,
  getItemById,
  getItemByAnimeId,
  getItemsByCollection,
  updateItem,
  deleteItem,
  moveItemToCollection,
};

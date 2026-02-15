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

/* ---------------- Downloads CRUD ---------------- */

/**
 * Add a download entry (episode)
 * Unique constraint: (animeId, episodeNumber)
 */
async function addDownload({
  animeId,
  episodeNumber,
  episodeTitle = null,
  magnetLink = null,
  torrentUrl = null,
  isDownloaded = false,
  filePath = null,
}) {
  const sql = `
    INSERT INTO downloads
    (animeId, episodeNumber, episodeTitle, magnetLink, torrentUrl, isDownloaded, filePath)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  return run(sql, [
    animeId,
    episodeNumber,
    episodeTitle,
    magnetLink,
    torrentUrl,
    isDownloaded ? 1 : 0,
    filePath,
  ]);
}

/**
 * Get download by DB id
 */
async function getDownloadById(id) {
  const sql = `SELECT * FROM downloads WHERE id = ? LIMIT 1`;
  return get(sql, [id]);
}

/**
 * Get a specific episode download
 */
async function getDownloadByEpisode(animeId, episodeNumber) {
  const sql = `
    SELECT * FROM downloads
    WHERE animeId = ? AND episodeNumber = ?
    LIMIT 1
  `;
  return get(sql, [animeId, episodeNumber]);
}

/**
 * List all downloads
 */
async function getAllDownloads() {
  const sql = `SELECT * FROM downloads ORDER BY created_at DESC`;
  return all(sql);
}

/**
 * List downloads for an anime
 */
async function getDownloadsByAnime(animeId) {
  const sql = `
    SELECT * FROM downloads
    WHERE animeId = ?
    ORDER BY episodeNumber ASC
  `;
  return all(sql, [animeId]);
}

/**
 * List only completed downloads
 */
async function getCompletedDownloads() {
  const sql = `SELECT * FROM downloads WHERE isDownloaded = 1 ORDER BY created_at DESC`;
  return all(sql);
}

/**
 * Update a download entry
 */
async function updateDownload(id, data = {}) {
  const fields = [];
  const params = [];

  if (data.animeId !== undefined) {
    fields.push("animeId = ?");
    params.push(data.animeId);
  }
  if (data.episodeNumber !== undefined) {
    fields.push("episodeNumber = ?");
    params.push(data.episodeNumber);
  }
  if (data.episodeTitle !== undefined) {
    fields.push("episodeTitle = ?");
    params.push(data.episodeTitle);
  }
  if (data.magnetLink !== undefined) {
    fields.push("magnetLink = ?");
    params.push(data.magnetLink);
  }
  if (data.torrentUrl !== undefined) {
    fields.push("torrentUrl = ?");
    params.push(data.torrentUrl);
  }
  if (data.isDownloaded !== undefined) {
    fields.push("isDownloaded = ?");
    params.push(data.isDownloaded ? 1 : 0);
  }
  if (data.filePath !== undefined) {
    fields.push("filePath = ?");
    params.push(data.filePath);
  }

  if (fields.length === 0) return { changes: 0 };

  params.push(id);
  const sql = `UPDATE downloads SET ${fields.join(", ")} WHERE id = ?`;
  const res = await run(sql, params);
  return { changes: res.changes };
}

/**
 * Mark episode as downloaded
 */
async function markDownloaded(id, filePath) {
  const sql = `
    UPDATE downloads
    SET isDownloaded = 1, filePath = ?
    WHERE id = ?
  `;
  const res = await run(sql, [filePath, id]);
  return { changes: res.changes };
}

/**
 * Delete a download entry
 */
async function deleteDownload(id) {
  const sql = `DELETE FROM downloads WHERE id = ?`;
  const res = await run(sql, [id]);
  return { changes: res.changes };
}

/**
 * Delete all downloads for an anime
 */
async function deleteDownloadsByAnime(animeId) {
  const sql = `DELETE FROM downloads WHERE animeId = ?`;
  const res = await run(sql, [animeId]);
  return { changes: res.changes };
}

module.exports = {
  addDownload,
  getDownloadById,
  getDownloadByEpisode,
  getAllDownloads,
  getDownloadsByAnime,
  getCompletedDownloads,
  updateDownload,
  markDownloaded,
  deleteDownload,
  deleteDownloadsByAnime,
};

// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  /* ---------------- existing ---------------- */
  loadHome: () => ipcRenderer.invoke('load-home'),
  loadImage: (url) => ipcRenderer.invoke('image-proxy', url),
  loadExplore: (page) => ipcRenderer.invoke('load-explore', page),
  loadSearch: (query) => ipcRenderer.invoke('load-search', query),

  /* ---------------- favourites ---------------- */
  favAdd: (data) => ipcRenderer.invoke("fav-add", data),
  favGetByAnime: (animeId) => ipcRenderer.invoke("fav-get-by-anime", animeId),
  favGetById: (id) => ipcRenderer.invoke("fav-get-by-id", id),
  favList: () => ipcRenderer.invoke("fav-list"),
  favUpdate: (id, data) => ipcRenderer.invoke("fav-update", id, data),
  favDelete: (id) => ipcRenderer.invoke("fav-delete", id),
  favToggle: (data) => ipcRenderer.invoke("fav-toggle", data),

  /* ---------------- collections ---------------- */
  collectionCreate: (name) =>
    ipcRenderer.invoke("collection:create", name),

  collectionList: () =>
    ipcRenderer.invoke("collection:getAll"),

  collectionUpdate: (data) =>
    ipcRenderer.invoke("collection:update", data),

  collectionDelete: (id) =>
    ipcRenderer.invoke("collection:delete", id),

  collectionItemAdd: (data) =>
    ipcRenderer.invoke("collection:item:add", data),

  collectionItemList: (collectionId) =>
    ipcRenderer.invoke("collection:item:getAll", collectionId),

  collectionItemUpdate: (data) =>
    ipcRenderer.invoke("collection:item:update", data),

  collectionItemDelete: (id) =>
    ipcRenderer.invoke("collection:item:delete", id),

  /* ---------------- show data ---------------- */
  loadShowData: (id) => ipcRenderer.invoke("load-show", id),

  /* ---------------- downloads (existing) ---------------- */
  loadDownloadSource: (animeId, page) =>
    ipcRenderer.invoke("load-download-source", animeId, page),
  addDownload: (data) => ipcRenderer.invoke('add-download', data),
  getDownloadsByAnime: (animeId) => ipcRenderer.invoke('get-downloads-by-anime', animeId),
  getAllDownloads: () => ipcRenderer.invoke('get-all-downloads'),
  markDownload: (id, filePath) => ipcRenderer.invoke('mark-download', id, filePath),


  /* ================= TORRENT HANDLER ================= */

  // actions
  torrentStart: (data) =>
    ipcRenderer.invoke('torrent-start', data),

  torrentStop: (id) =>
    ipcRenderer.invoke('torrent-stop', { id }),

  torrentList: () =>
    ipcRenderer.invoke('torrent-list'),

  // events
  onTorrentProgress: (callback) => {
    const listener = (_, payload) => callback(payload)
    ipcRenderer.on('torrent-progress', listener)
    return () => ipcRenderer.removeListener('torrent-progress', listener)
  },

  onTorrentDone: (callback) => {
    const listener = (_, payload) => callback(payload)
    ipcRenderer.on('torrent-done', listener)
    return () => ipcRenderer.removeListener('torrent-done', listener)
  },

  onTorrentError: (callback) => {
    const listener = (_, payload) => callback(payload)
    ipcRenderer.on('torrent-error', listener)
    return () => ipcRenderer.removeListener('torrent-error', listener)
  }
})

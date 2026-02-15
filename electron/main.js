const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// main.js

const {
  startTorrent,
  stopTorrent,
  on: onTorrentEvent,
} = require("./internal/torrentHandler"); // Ensure this path is correct

//const defaultPlugin = require(
  //path.join(__dirname, 'plugins', 'default', 'default.js')
//)
const defaultPlugin = require('./plugins/default/default')
const axios = require("axios");
const favourites = require("./internal/favourite");
const collectionDB = require("./internal/collection");
const downloads = require('./internal/downloads')
const isDev = !app.isPackaged

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

/* ---------------- IPC ---------------- */
ipcMain.handle("image-proxy", async (_, url) => {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://anidb.net/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      timeout: 15000,
    });

    return {
      buffer: Buffer.from(res.data),
      contentType: res.headers["content-type"] || "image/jpeg",
    };
  } catch (err) {
    console.error("Image proxy failed:", url, err.message);
    return null;
  }
});
// Request / Response (preferred)
ipcMain.handle('save-file', async (_event, data) => {
  console.log('Saving file:', data)

  // example async logic
  return {
    success: true,
    timestamp: Date.now(),
  }
})

// Fire-and-forget
ipcMain.on('some-message', (event, data) => {
  console.log('From UI:', data)

  event.reply('status', 'Hello from Electron')
})

// main.js

ipcMain.handle('load-home', async () => {
  data = {
    hero: [],
    continue:[],
    youMayLike: []
  }
  // You can fetch data, read files, call APIs, etc.
  const result = await defaultPlugin.loadHeroData()
  data.hero = result
  data.youMayLike = await defaultPlugin.loadYouMayLikeData()
  const loadYouMayLikeData = await defaultPlugin.loadYouMayLikeData()
  return data;
})

ipcMain.handle('load-explore', async (_,page) => {

  // You can fetch data, read files, call APIs, etc.
  const result = await defaultPlugin.loadExploreData(page)
  return result;;
})

ipcMain.handle('load-search', async (_,query) => {
  const result = await defaultPlugin.loadSearchData(query)
  console.log('Result Search:', result)
  return result
})


// FAVOURITES
ipcMain.handle("fav-list", async () => {
  const result = await favourites.getAllFavourites();
  console.log("All favourites:", result.length);
  return result;
});


ipcMain.handle("fav-add", async (_, data) => {
  // data: { animeId, title, cover }
  const result = await favourites.createFavourite(data);
  console.log("Favourite added:", result);
  return result;
});

ipcMain.handle("fav-get-by-anime", async (_, animeId) => {
  const result = await favourites.getFavouriteByAnimeId(animeId);
  console.log("Favourite fetched:", result);
  return result;
});

ipcMain.handle("fav-get-by-id", async (_, id) => {
  const result = await favourites.getFavouriteById(id);
  return result;
});

ipcMain.handle("fav-update", async (_, id, data) => {
  // data can include: animeId, title, cover
  const result = await favourites.updateFavourite(id, data);
  return result;
});

ipcMain.handle("fav-delete", async (_, id) => {
  const result = await favourites.deleteFavourite(id);
  return result;
});

ipcMain.handle("fav-toggle", async (_, data) => {
  // data: { animeId, title, cover }
  const existing = await favourites.getFavouriteByAnimeId(data.animeId);

  if (existing) {
    await favourites.deleteFavourite(existing.id);
    return { removed: true };
  } else {
    await favourites.createFavourite(data);
    return { added: true };
  }
});



/* ---------------- COLLECTIONS ---------------- */

// create collection
ipcMain.handle("collection:create", async (_, name) => {
  console.log('Creating collection:', name)
  if (!name || !name.trim()) {
    throw new Error('Collection name is required')
  }
  return await collectionDB.createCollection(name);
});

// get all collections
ipcMain.handle("collection:getAll", async () => {
  console.log("[main] collection:getAll called");
  const rows = await collectionDB.getAllCollections();
  console.log(`[main] collection:getAll -> rows=${Array.isArray(rows) ? rows.length : 'non-array'}`);
  // optional: print rows (careful if many)
  console.log(rows);
  return rows;
  
});

// update collection name
ipcMain.handle("collection:update", async (_, { id, name }) => {
  return await collectionDB.updateCollection(id, name);
});

// delete collection
ipcMain.handle("collection:delete", async (_, id) => {
  return await collectionDB.deleteCollection(id);
});

/* ---------------- COLLECTION ITEMS ---------------- */

// add anime to collection
ipcMain.handle("collection:item:add", async (_, data) => {
  /**
   * data = {
   *  collectionId,
   *  animeId,
   *  title,
   *  cover
   * }
   */
  console.log("[main] collection:item:add called")
  console.log(data)
  return await collectionDB.addItemToCollection(data);
});

// get items of a collection
ipcMain.handle("collection:item:getAll", async (_, collectionId) => {
  return await collectionDB.getCollectionWithItems(collectionId);
});

// update anime inside collection
ipcMain.handle("collection:item:update", async (_, data) => {
  /**
   * data = {
   *  id,
   *  title,
   *  cover
   * }
   */
  return await collectionDB.updateItem(data);
});

// remove anime from collection
ipcMain.handle("collection:item:delete", async (_, id) => {
  return await collectionDB.deleteItem(id);
});


//SHOW PAGE
ipcMain.handle("load-show", async (_,id) => {
  console.log(`ID IS ${id} `)
  const result = await defaultPlugin.loadShowData(id)
  return result
})

// LOAD DONWLOAD SOURCE
ipcMain.handle("load-download-source", async (_,animeId,page) => {
  console.log(`ID IS ${animeId} `)
  const result = await defaultPlugin.loadDownloadSource(animeId,page)
  return result;
})

ipcMain.handle('add-download',async(_,data)=>{
console.log(`[main] adding to downloads${data.animeId,data.episodeNumber,data.episodeTitle,data.magnetLink,data.torrentUrl,data.isDownloaded,data.filePath}`)
  return await downloads.addDownload(data)
}) // TODO WHILE AT THE SAME TIME ADD THE BANNER , ANIME ID , TITLE TO RECENTLY ADDED TABLE SO THAT WE CAN FETCH IT LATER

ipcMain.handle('get-downloads-by-anime',async(_,animeId)=>{
  console.log(`[main] getting downloads for anime ${animeId}`)
  return await downloads.getDownloadsByAnime(animeId)
})

ipcMain.handle('get-all-downloads',async()=>{
  console.log(`[main] getting all downloads`)
  return await downloads.getAllDownloads()
})
ipcMain.handle('mark-download',async(_,id,filePath)=>{
  console.log(`[main] marking download ${id} as downloaded`)
  return await downloads.markDownloaded(id,filePath)  
})


// RPC handlers for torrent 
ipcMain.handle("torrent-start", async (_, data) => {
  try {
    // Ensure we only pass the raw data fields
    const cleanData = {
      id: data.id,
      magnetURI: data.magnetURI,
      animeId: data.animeId,
      episodeId: data.episodeId
    };
    await startTorrent(cleanData);
    return { ok: true };
  } catch (err) {
    console.error("Torrent Start Error:", err);
    throw err; // Send error back to React
  }
});


ipcMain.handle("torrent-stop", async (event, { id }) => {
  const ok = stopTorrent(id);
  return { ok };
});

ipcMain.handle("torrent-list", async () => {
  return listTorrents();
});

// forward events from torrentHandler to renderer
const forward = (channel) => (payload) => {
  if (mainWindow && mainWindow.webContents) { // <--- Matches 'let mainWindow'
    mainWindow.webContents.send(channel, payload);
  }
};

// subscribe to events
onTorrentEvent("torrent-progress", forward("torrent-progress"));
onTorrentEvent("torrent-done", forward("torrent-done"));
onTorrentEvent("torrent-error", forward("torrent-error"));
onTorrentEvent("torrent-added", forward("torrent-added"));
onTorrentEvent("client-error", forward("client-error"));

// In main.js
app.on('will-quit', () => {
  // The process.on('exit') in torrentHandler handles this, 
  // but you can be explicit here if needed.
})
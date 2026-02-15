const path = require("path");
const os = require("os");
const fs = require("fs");
const { spawn } = require("child_process");
const { EventEmitter } = require("events");

// Aria2 Import Fix
let Aria2Module = require("aria2");
const Aria2 = Aria2Module.default || Aria2Module;

const ee = new EventEmitter();
const torrents = new Map(); 

let ariaProcess = null;
let aria2Client = null;
let isConnected = false;
let isConnecting = false; 

function getAriaBinaryPath() {
  if (process.platform === "win32") {
    const devPath = path.join(__dirname, "..", "resources", "aria2c.exe");
    const prodPath = path.join(process.resourcesPath, "resources", "aria2c.exe");
    return fs.existsSync(devPath) ? devPath : prodPath;
  }
  return "aria2c"; 
}

async function initAria() {
  if (isConnected && aria2Client) return aria2Client;
  
  if (isConnecting) {
    // Wait for the other process to finish connecting
    await new Promise(r => setTimeout(r, 1000));
    return initAria(); 
  }

  isConnecting = true;

  try {
    const binary = getAriaBinaryPath();
    const rpcPort = 6800;

    if (!ariaProcess) {
      console.log(`[Aria2] Spawning daemon: ${binary}`);
      ariaProcess = spawn(binary, [
        "--enable-rpc",
        `--rpc-listen-port=${rpcPort}`,
        "--rpc-listen-all=true",
        "--rpc-allow-origin-all=true",
        "--follow-torrent=mem",
        "--seed-time=0",
      ]);
      
      // Give the process a moment to bind to the port
      await new Promise(r => setTimeout(r, 500));
    }

    if (!aria2Client) {
      aria2Client = new Aria2({ host: "localhost", port: rpcPort, secure: false, path: "/jsonrpc" });
    }

    console.log("[Aria2] Attempting RPC connection...");
    await aria2Client.open();
    
    // Success logic
    isConnected = true;
    isConnecting = false;
    console.log("[Aria2] Connection Established Successfully");

    // FIX: aria2 library uses .on() but doesn't always support .removeAllListeners()
    // We only attach the listener once here
    aria2Client.on("onDownloadComplete", ([{ gid }]) => handleDownloadDone(gid));

    return aria2Client;

  } catch (e) {
    isConnecting = false; // Release lock on error
    
    if (e.message?.includes("already open") || e.message?.includes("READY")) {
      isConnected = true;
      return aria2Client;
    }

    console.error(`[Aria2] Connection failed: ${e.message}. Retrying...`);
    await new Promise(r => setTimeout(r, 2000));
    return initAria();
  }
}

async function handleDownloadDone(gid) {
  // Find which DB ID this GID belongs to
  let dbId = null;
  for (let [id, g] of torrents.entries()) {
    if (g === gid) { dbId = id; break; }
  }
  if (!dbId) return;

  try {
    const status = await aria2Client.call("tellStatus", gid);
    ee.emit("torrent-done", {
      id: dbId,
      name: status.bittorrent?.info?.name || "Download Complete",
      path: status.dir,
    });
    torrents.delete(dbId);
  } catch (err) {
    console.error("[Aria2] Done Error:", err);
  }
}

async function startTorrent(data) {
  const { id, magnetURI, animeId, episodeId } = data;
  
  // Wait for connection
  const client = await initAria();

  const downloadPath = path.join(
    os.homedir(),
    "Downloads",
    "mocha_downloads",
    `anime_${animeId}`,
    `ep_${episodeId}`
  );

  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  // Add the download
  const gid = await client.call("addUri", [magnetURI], { dir: downloadPath });
  torrents.set(id, gid);

  // Polling for progress
  const interval = setInterval(async () => {
    if (!torrents.has(id)) {
      clearInterval(interval);
      return;
    }

    try {
      const s = await client.call("tellStatus", gid, [
        "gid", "status", "completedLength", "totalLength", "downloadSpeed", "connections"
      ]);

      const total = parseInt(s.totalLength);
      const completed = parseInt(s.completedLength);
      const progress = total > 0 ? (completed / total) : 0;

      ee.emit("torrent-progress", {
        id,
        progress: +progress.toFixed(4),
        downloadSpeed: `${(parseInt(s.downloadSpeed) / 1024 / 1024).toFixed(2)} MB/s`,
        peers: parseInt(s.connections),
        status: s.status
      });

      if (s.status === "complete") {
        clearInterval(interval);
        torrents.delete(id);
      }
    } catch (e) {
      clearInterval(interval);
    }
  }, 1000);

  return { id, gid };
}

async function stopTorrent(id) {
  const gid = torrents.get(id);
  if (!gid) return false;
  try {
    await aria2Client.call("remove", gid);
    torrents.delete(id);
    return true;
  } catch (e) {
    return false;
  }
}

process.on("exit", () => {
  if (ariaProcess) ariaProcess.kill();
});

module.exports = {
  startTorrent,
  stopTorrent,
  on: (event, cb) => ee.on(event, cb),
};
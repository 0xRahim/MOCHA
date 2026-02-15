const { BrowserWindow, session } = require('electron');

let win;

async function getWindow() {
  if (win && !win.isDestroyed()) return win;

  win = new BrowserWindow({
    show: false,
    webPreferences: {
      session: session.fromPartition('scraper'),
      contextIsolation: true,
      sandbox: true
    }
  });

  return win;
}

async function getHtml(url) {
  const w = await getWindow();

  await w.loadURL(url);

  // wait for JS / Cloudflare
  await w.webContents.executeJavaScript(`
    new Promise(r => {
      if (document.readyState === 'complete') r();
      else window.addEventListener('load', r);
    })
  `);

  await new Promise(r => setTimeout(r, 3000));

  return w.webContents.executeJavaScript(
    'document.documentElement.outerHTML',
    true
  );
}

module.exports = {
  getHtml
};

'use strict';
// Editor C para escritorio: una ventana que abre el editor servido desde esta misma computadora (127.0.0.1).
// El editor corre dentro de la ventana, sin acceso a archivos ni al sistema (igual que en el navegador).
const { app, BrowserWindow, shell, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { crearServidor } = require('./servidor');
const { actualizar } = require('./actualizar');

const PUERTO = 8137;   // fijo a propósito: el almacenamiento (programas guardados) depende de la dirección, puerto incluido
let ventana = null, servidor = null;

if (!app.requestSingleInstanceLock()) { app.quit(); } else {
  app.on('second-instance', () => { if (ventana) { if (ventana.isMinimized()) ventana.restore(); ventana.focus(); } });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    const dirUsuario = path.join(app.getPath('userData'), 'editor');
    const dirEmbebida = path.join(__dirname, 'site');
    const dir = () => (fs.existsSync(path.join(dirUsuario, 'index.html')) ? dirUsuario : dirEmbebida);
    // gcc real (opcional): viene dentro de la app, en resources/gcc; sin esa carpeta el editor funciona igual
    const gcc = path.join(process.resourcesPath || '', 'gcc', 'bin', 'gcc.exe');
    servidor = await crearServidor(dir, PUERTO, { gcc: fs.existsSync(gcc) ? gcc : '', marcar: true });
    const origen = 'http://127.0.0.1:' + servidor.port + '/';
    ventana = new BrowserWindow({
      width: 1280, height: 800, minWidth: 700, minHeight: 500, autoHideMenuBar: true, title: 'Editor C',
      icon: path.join(dirEmbebida, 'assets', 'icon-512.png'),
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
    });
    // solo se navega dentro del editor; los enlaces de afuera (WhatsApp, la página) se abren en el navegador
    ventana.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origen)) e.preventDefault(); });
    ventana.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\/(wa\.me|api\.whatsapp\.com|diego-20000\.github\.io)\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    ventana.webContents.session.setPermissionRequestHandler((wc, permiso, cb) => cb(false));
    ventana.on('closed', () => { ventana = null; });
    await ventana.loadURL(origen);
    // al abrir: se busca la versión nueva; sin internet no pasa nada. La página (service worker) la aplica sola si todavía no se escribió nada.
    try {
      const r = await actualizar(dirUsuario, dirEmbebida);
      if (r.cambio && ventana) ventana.webContents.executeJavaScript('navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(function (g) { return g && g.update(); })').catch(() => {});
    } catch (e) { /* sin conexión: se sigue con lo que hay */ }
  });
  app.on('window-all-closed', () => { if (servidor) servidor.close(); app.quit(); });
}

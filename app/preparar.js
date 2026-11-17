'use strict';
// Copia el sitio ya armado (node build.js) a app/site, que es lo que viaja dentro de la app.
const fs = require('fs'); const path = require('path');
const raiz = path.join(__dirname, '..'), dst = path.join(__dirname, 'site');
fs.rmSync(dst, { recursive: true, force: true }); fs.mkdirSync(path.join(dst, 'assets'), { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js']) fs.copyFileSync(path.join(raiz, f), path.join(dst, f));
for (const f of fs.readdirSync(path.join(raiz, 'assets'))) fs.copyFileSync(path.join(raiz, 'assets', f), path.join(dst, 'assets', f));
const m = /const VERSION = '([0-9a-f]{12})'/.exec(fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8'));
fs.writeFileSync(path.join(dst, 'VERSION'), (m ? m[1] : '') + '\n');
// ícono de la app (electron-builder lo convierte a .ico)
const png = path.join(raiz, 'assets', 'icon-512.png');
if (fs.existsSync(png)) fs.copyFileSync(png, path.join(__dirname, 'icon.png'));
console.log('app/site listo, versión', m && m[1]);

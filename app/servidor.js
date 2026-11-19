'use strict';
// Servidor local del editor: sirve los archivos del editor desde 127.0.0.1 (solo esta computadora).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { compilarYEjecutar, versionGcc } = require('./gcc');

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8'
};

// getDir() devuelve la carpeta que se sirve en ese momento (la actualizada o la que viene con la app)
// opts.gcc: ruta del gcc (o '' si no hay). Con opts.marcar el index.html lleva una marca para que el editor sepa que lo sirve la app.
function crearServidor(getDir, puertoBase, opts) {
  opts = opts || {};
  const gccRuta = opts.gcc || '';
  const token = crypto.randomBytes(16).toString('hex');
  let versionG = null;
  let puerto = puertoBase;
  const json = (rs, code, v) => { rs.statusCode = code; rs.setHeader('Content-Type', 'application/json; charset=utf-8'); rs.setHeader('Cache-Control', 'no-store'); rs.end(JSON.stringify(v)); };
  const mismoOrigen = (rq) => {
    const sf = rq.headers['sec-fetch-site'];
    if (sf && sf !== 'same-origin') return false;
    const o = rq.headers.origin; if (o && o !== 'http://' + rq.headers.host) return false;
    return true;
  };
  const srv = http.createServer((rq, rs) => {
    const host = rq.headers.host || '';
    if (host !== '127.0.0.1:' + puerto && host !== 'localhost:' + puerto) { rs.statusCode = 403; rs.end('direccion no permitida'); return; }   // contra DNS rebinding
    let u;
    try { u = decodeURIComponent(rq.url.split('?')[0]); } catch (e) { rs.statusCode = 400; rs.end('mal pedido'); return; }
    if (u.indexOf('\0') >= 0) { rs.statusCode = 400; rs.end('mal pedido'); return; }   // un byte nulo hace fallar a fs (y cerraría el programa)
    if (u === '/api/info' && rq.method === 'GET') {
      if (!mismoOrigen(rq)) { rs.statusCode = 404; rs.end('no'); return; }
      if (gccRuta && versionG === null) versionG = versionGcc(gccRuta);
      json(rs, 200, { gcc: !!gccRuta, version: versionG, so: process.platform === 'win32' ? 'windows' : 'linux', token }); return;
    }
    if (u === '/api/actualizar') {   // «Buscar actualización» de Ajustes: la página no puede pedir la versión publicada (solo habla con 127.0.0.1), la pide el programa
      if (rq.method !== 'POST' || !mismoOrigen(rq) || !opts.actualizar || rq.headers['x-token'] !== token) { rs.statusCode = 404; rs.end('no'); return; }
      Promise.resolve().then(() => opts.actualizar()).then((r) => json(rs, 200, { version: r.version, changed: !!r.cambio }), (e) => json(rs, 200, { error: String(e && e.message || e) }));
      return;
    }
    if (u === '/api/gcc') {
      if (rq.method !== 'POST' || !mismoOrigen(rq) || !gccRuta || rq.headers['x-token'] !== token) { rs.statusCode = 404; rs.end('no'); return; }
      let cuerpo = '', grande = false;
      rq.on('data', (d) => { cuerpo += d; if (cuerpo.length > (1 << 20)) { grande = true; rq.destroy(); } });
      rq.on('end', async () => {
        if (grande) return;
        let p; try { p = JSON.parse(cuerpo); } catch (e) { json(rs, 400, { error: 'pedido invalido' }); return; }
        try { json(rs, 200, await compilarYEjecutar(gccRuta, { code: p.code, input: p.input })); } catch (e) { json(rs, 500, { error: 'no se pudo compilar' }); }
      });
      return;
    }
    if (u === '/' || u === '') u = '/index.html';
    const raiz = path.resolve(getDir());
    const f = path.resolve(raiz, '.' + u);
    if (f !== raiz && !f.startsWith(raiz + path.sep)) { rs.statusCode = 404; rs.end('no'); return; }
    fs.stat(f, (err, st) => {
      if (err || !st.isFile()) { rs.statusCode = 404; rs.end('no'); return; }
      rs.setHeader('Content-Type', TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream');
      rs.setHeader('Cache-Control', 'no-store');
      rs.setHeader('X-Content-Type-Options', 'nosniff');
      if (opts.marcar && path.basename(f) === 'index.html' && f === path.join(raiz, 'index.html')) {
        fs.readFile(f, 'utf8', (e2, t) => { if (e2) { rs.statusCode = 500; rs.end('no'); return; } rs.end(t.replace('<head>', '<head>\n<meta name="editorc-local" content="1">')); });
        return;
      }
      const flujo = fs.createReadStream(f);   // si el archivo desaparece justo ahora (una actualización lo está cambiando), se corta la respuesta y nada más
      flujo.on('error', () => { rs.destroy(); });
      flujo.pipe(rs);
    });
  });
  return new Promise((resolve, reject) => {
    let intentos = 0;
    const probar = () => {
      srv.once('error', (e) => { if (e.code === 'EADDRINUSE' && intentos++ < 10) { puerto++; probar(); } else reject(e); });
      srv.listen(puerto, '127.0.0.1', () => resolve({ server: srv, port: puerto, close: () => new Promise((r) => srv.close(r)) }));
    };
    probar();
  });
}

module.exports = { crearServidor };

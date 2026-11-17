'use strict';
// Servidor local del editor: sirve los archivos del editor desde 127.0.0.1 (solo esta computadora).
const http = require('http');
const fs = require('fs');
const path = require('path');

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8'
};

// getDir() devuelve la carpeta que se sirve en ese momento (la actualizada o la que viene con la app)
function crearServidor(getDir, puertoBase) {
  let puerto = puertoBase;
  const srv = http.createServer((rq, rs) => {
    const host = rq.headers.host || '';
    if (host !== '127.0.0.1:' + puerto && host !== 'localhost:' + puerto) { rs.statusCode = 403; rs.end('direccion no permitida'); return; }   // contra DNS rebinding
    let u;
    try { u = decodeURIComponent(rq.url.split('?')[0]); } catch (e) { rs.statusCode = 400; rs.end('mal pedido'); return; }
    if (u === '/' || u === '') u = '/index.html';
    const raiz = path.resolve(getDir());
    const f = path.resolve(raiz, '.' + u);
    if (f !== raiz && !f.startsWith(raiz + path.sep)) { rs.statusCode = 404; rs.end('no'); return; }
    fs.stat(f, (err, st) => {
      if (err || !st.isFile()) { rs.statusCode = 404; rs.end('no'); return; }
      rs.setHeader('Content-Type', TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream');
      rs.setHeader('Cache-Control', 'no-store');
      rs.setHeader('X-Content-Type-Options', 'nosniff');
      fs.createReadStream(f).pipe(rs);
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

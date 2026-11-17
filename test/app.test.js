// Servidor local y actualizador de la app de escritorio (sin Electron): se prueban con Node solo.
const http = require('http'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { crearServidor } = require('../app/servidor'); const { actualizar } = require('../app/actualizar');
const raiz = path.join(__dirname, '..');
let ok = 0, mal = 0; const check = (c, m) => { if (c) { ok++; } else { mal++; console.log('  MAL  ' + m); } };
const estado = (puerto, host, p) => new Promise((res) => { const rq = http.request({ host: '127.0.0.1', port: puerto, path: p || '/', headers: { Host: host }, agent: false }, (r) => { let b = ''; r.on('data', (d) => { b += d; }); r.on('end', () => res({ s: r.statusCode, b, h: r.headers })); }); rq.on('error', () => res({ s: 0 })); rq.end(); });
const publicada = (extra) => http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split('?')[0]); const f = u === '/' ? 'index.html' : u.slice(1); if (extra && extra[f]) { rs.end(extra[f]); return; } const p = path.join(raiz, f); if (!p.startsWith(raiz) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rs.statusCode = 404; rs.end('no'); return; } rs.end(fs.readFileSync(p)); });
const escuchar = (s) => new Promise((r) => s.listen(0, '127.0.0.1', r));
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'app-'));
  const sitio = path.join(tmp, 'site'); fs.mkdirSync(sitio, { recursive: true }); fs.writeFileSync(path.join(sitio, 'index.html'), '<head>hola</head>'); fs.writeFileSync(path.join(tmp, 'secreto.txt'), 'no');
  // servidor
  const S = await crearServidor(() => sitio, 18137);
  const h = '127.0.0.1:' + S.port;
  let r = await estado(S.port, h); check(r.s === 200 && /hola/.test(r.b) && r.h['cache-control'] === 'no-store', 'sirve el index con la dirección propia');
  r = await estado(S.port, 'ejemplo.com'); check(r.s === 403, 'rechaza otro nombre de host (DNS rebinding)');
  r = await estado(S.port, h, '/../secreto.txt'); check(r.s === 404, 'no sale de la carpeta del editor (..)');
  r = await estado(S.port, h, '/%2e%2e/secreto.txt'); check(r.s === 404, 'no sale de la carpeta (..codificado)');
  r = await estado(S.port, h, '/no-existe.js'); check(r.s === 404, 'archivo que no existe: 404');
  const S2 = await crearServidor(() => sitio, S.port); check(S2.port === S.port + 1, 'si el puerto está ocupado usa el siguiente'); await S2.close(); await S.close();
  // actualizador
  const ver = /const VERSION = '([0-9a-f]{12})'/.exec(fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8'))[1];
  let web = publicada(); await escuchar(web); const base = 'http://127.0.0.1:' + web.address().port + '/';
  const emb = path.join(tmp, 'emb'); fs.mkdirSync(emb); fs.writeFileSync(path.join(emb, 'sw.js'), "const VERSION = '000000000000'");
  const dir = path.join(tmp, 'editor');
  let u = await actualizar(dir, emb, { base }); check(u.cambio && u.version === ver && fs.existsSync(path.join(dir, 'assets', 'app.js')) && fs.readFileSync(path.join(dir, 'VERSION'), 'utf8').trim() === ver, 'baja el editor nuevo y deja su versión');
  check(fs.existsSync(path.join(dir, 'sw.js')) && fs.existsSync(path.join(dir, 'index.html')) && !fs.existsSync(dir + '.nuevo') && !fs.existsSync(dir + '.viejo'), 'deja sw.js e index.html y no deja carpetas temporales');
  u = await actualizar(dir, emb, { base }); check(!u.cambio && u.version === ver, 'con la misma versión no vuelve a bajar');
  fs.writeFileSync(path.join(dir, 'VERSION'), '111111111111\n');
  let fallo = ''; try { await actualizar(dir, emb, { base: 'http://127.0.0.1:1/' }); } catch (e) { fallo = e.message; }
  check(fallo && fs.readFileSync(path.join(dir, 'VERSION'), 'utf8').trim() === '111111111111', 'sin conexión falla sin tocar lo que había');
  web.close();
  const swMal = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8').replace(/const FILES = \[[^\]]*\]/, 'const FILES = ["index.html","../../etc/passwd"]');
  web = publicada({ 'sw.js': swMal }); await escuchar(web); fallo = '';
  try { await actualizar(dir, emb, { base: 'http://127.0.0.1:' + web.address().port + '/' }); } catch (e) { fallo = e.message; }
  check(/no permitido/.test(fallo) && fs.readFileSync(path.join(dir, 'VERSION'), 'utf8').trim() === '111111111111', 'rechaza nombres de archivo con ..');
  web.close();
  fallo = ''; try { await actualizar(dir, emb, { base: 'http://ejemplo.com/' }); } catch (e) { fallo = e.message; }
  check(/direccion no permitida/.test(fallo), 'solo acepta https (o 127.0.0.1 en pruebas)');
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(ok + ' ok, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR', e); process.exit(1); });

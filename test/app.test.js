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
  // gcc real (con el gcc de esta máquina)
  const gccSis = require('child_process').execFileSync('which', ['gcc']).toString().trim();
  const SG = await crearServidor(() => sitio, 18237, { gcc: gccSis, marcar: true });
  const hg = '127.0.0.1:' + SG.port;
  const pedir = (met, p, cuerpo, hdr) => new Promise((res) => { const rq = http.request({ host: '127.0.0.1', port: SG.port, path: p, method: met, headers: Object.assign({ Host: hg }, hdr || {}), agent: false }, (r) => { let b = ''; r.on('data', (d) => { b += d; }); r.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (e) { /* no era JSON */ } res({ s: r.statusCode, b, j }); }); }); rq.on('error', () => res({ s: 0 })); rq.end(cuerpo ? JSON.stringify(cuerpo) : undefined); });
  r = await estado(SG.port, hg); check(/editorc-local/.test(r.b), 'el index lleva la marca de la app');
  const info = await pedir('GET', '/api/info'); check(info.s === 200 && info.j.gcc === true && /^\d+\.\d+/.test(info.j.version) && info.j.token.length === 32, 'info: dice que hay gcc y da un token');
  const tk = info.j.token;
  let g = await pedir('POST', '/api/gcc', { code: '#include <stdio.h>\nint main() { int A; scanf("%d", &A); printf("doble %d\\n", A * 2); }\n', input: '21\n' }, { 'X-Token': tk });
  check(g.s === 200 && g.j.compiled && /doble 42/.test(g.j.output) && g.j.exit === 0, 'compila y ejecuta con la entrada');
  g = await pedir('POST', '/api/gcc', { code: 'int main() { int A\n }', input: '' }, { 'X-Token': tk });
  check(g.s === 200 && g.j.compiled === false && /error/.test(g.j.messages), 'un error de compilación vuelve con el mensaje de gcc');
  g = await pedir('POST', '/api/gcc', { code: '#include <stdio.h>\nint main() { for (;;) { } }\n', input: '' }, { 'X-Token': tk });
  check(g.j && g.j.compiled && g.j.timeout === true, 'un lazo infinito se corta a los 5 segundos');
  g = await pedir('POST', '/api/gcc', { code: '#include <stdio.h>\nint main() { for (;;) printf("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\\n"); }\n', input: '' }, { 'X-Token': tk });
  check(g.j && g.j.compiled && g.j.output.length <= (1 << 20) + 10 && (g.j.truncated || g.j.timeout), 'una salida enorme se corta');
  g = await pedir('POST', '/api/gcc', { code: 'int main(){}', input: '' }); check(g.s === 404, 'sin token no se puede usar gcc');
  g = await pedir('POST', '/api/gcc', { code: 'int main(){}', input: '' }, { 'X-Token': 'x' }); check(g.s === 404, 'token incorrecto: no');
  g = await pedir('POST', '/api/gcc', { code: 'int main(){}', input: '' }, { 'X-Token': tk, 'Sec-Fetch-Site': 'cross-site' }); check(g.s === 404, 'pedido desde otro sitio: no');
  g = await pedir('POST', '/api/gcc', { code: 'int main(){}', input: '' }, { 'X-Token': tk, Origin: 'http://ejemplo.com' }); check(g.s === 404, 'otro Origin: no');
  const sg2 = await crearServidor(() => sitio, 18337, { gcc: '', marcar: true });
  const i2 = await new Promise((res) => { http.get({ host: '127.0.0.1', port: sg2.port, path: '/api/info', headers: { Host: '127.0.0.1:' + sg2.port } }, (rr) => { rr.resume(); res(rr.statusCode); }); }); check(i2 === 200, 'sin gcc en la app: /api/info igual responde (gcc: false)');
  await sg2.close(); await SG.close();
  // «Buscar actualización» desde la página: pasa por /api/actualizar del programa
  let llamadas = 0;
  const SA = await crearServidor(() => sitio, 18537, { marcar: true, actualizar: async () => { llamadas++; return { version: 'abcdef012345', cambio: false }; } });
  const ha = '127.0.0.1:' + SA.port;
  const pedirA = (met, p, hdr) => new Promise((res) => { const rq = http.request({ host: '127.0.0.1', port: SA.port, path: p, method: met, headers: Object.assign({ Host: ha }, hdr || {}), agent: false }, (r) => { let b = ''; r.on('data', (d) => { b += d; }); r.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (e) { /* no era JSON */ } res({ s: r.statusCode, j }); }); }); rq.on('error', () => res({ s: 0 })); rq.end(); });
  const infoA = await pedirA('GET', '/api/info'); check(infoA.s === 200 && infoA.j.gcc === false && infoA.j.token.length === 32, 'sin gcc, /api/info igual da el token (la página lo necesita para actualizar)');
  let au = await pedirA('POST', '/api/actualizar', { 'X-Token': infoA.j.token }); check(au.s === 200 && au.j.version === 'abcdef012345' && au.j.changed === false && llamadas === 1, '/api/actualizar usa el actualizador del programa');
  au = await pedirA('POST', '/api/actualizar'); check(au.s === 404 && llamadas === 1, '/api/actualizar sin token: no');
  au = await pedirA('POST', '/api/actualizar', { 'X-Token': infoA.j.token, 'Sec-Fetch-Site': 'cross-site' }); check(au.s === 404 && llamadas === 1, '/api/actualizar desde otro sitio: no');
  await SA.close();
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

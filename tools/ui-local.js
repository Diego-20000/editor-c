// Versión local: lanzador en Go (local/) + gcc real. Se prueba con el gcc de esta máquina (EDITORC_GCC).
const { chromium } = require('playwright'); const { spawn, execFileSync } = require('child_process'); const path = require('path'); const fs = require('fs');
let ok = 0, bad = 0; const check = (c, m) => { if (c) { ok++; console.log('  ok   ' + m); } else { bad++; console.log('  FALLA ' + m); } };
const bin = path.join(__dirname, '..', 'local', 'editorc-local');
if (!fs.existsSync(bin)) { console.log('falta local/editorc-local (bash local/build.sh linux): se omite'); process.exit(0); }
(async () => {
  const gcc = execFileSync('which', ['gcc']).toString().trim();
  const srv = spawn(bin, [], { env: Object.assign({}, process.env, { EDITORC_GCC: gcc, EDITORC_NO_ABRIR: '1' }) });
  let log = ''; srv.stdout.on('data', (d) => { log += d; });
  await new Promise((r) => setTimeout(r, 800));
  const m = /127\.0\.0\.1:(\d+)/.exec(log); const base = 'http://127.0.0.1:' + (m ? m[1] : '8137');
  const br = await chromium.launch(); const cx = await br.newContext({ viewport: { width: 1280, height: 800 } }); const pg = await cx.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(base + '/?ayuda=2'); await pg.waitForSelector('#code');
  await pg.waitForSelector('#gccBtn:not([hidden])', { timeout: 5000 });
  check(true, 'local: el botón «gcc real» aparece');
  await pg.fill('#code', '#include <stdio.h>\nint main() {\n    int A;\n    scanf("%d", &A);\n    printf("doble: %d\\n", A * 2);\n}\n');
  await pg.click('#inBtn'); await pg.fill('#inTxt', '21'); await pg.click('#gccBtn');
  await pg.waitForFunction(() => /código de salida/.test(document.getElementById('out').textContent), null, { timeout: 15000 });
  let t = await pg.textContent('#out');
  check(/gcc real/.test(t) && /doble: 42/.test(t) && /código de salida 0/.test(t), 'local: compila, ejecuta con la entrada y muestra la salida');
  await pg.click('#clear');
  await pg.fill('#code', '#include <stdio.h>\nint main() {\n    int A\n    printf("hola");\n}\n'); await pg.click('#gccBtn');
  await pg.waitForFunction(() => /gcc/.test(document.getElementById('out').textContent), null, { timeout: 15000 });
  t = await pg.textContent('#out'); check(/error/i.test(t), 'local: con ayuda 2 muestra el error de gcc');
  await pg.click('#clear'); await pg.evaluate(() => window.__editorc.setNivel(1)); await pg.click('#gccBtn');
  await pg.waitForFunction(() => /gcc/.test(document.getElementById('out').textContent), null, { timeout: 15000 });
  t = await pg.textContent('#out'); check(/no pudo compilar/.test(t) && !/expected/.test(t), 'local: con ayuda 1 no revela dónde está el error');
  // seguridad: sin token, con otro Host o desde otro origen no se puede usar la API
  const f = async (opts, host) => (await fetch(base + '/api/gcc', Object.assign({ method: 'POST', body: '{"code":"int main(){}","input":""}' }, opts, host ? { headers: Object.assign({ Host: host }, opts.headers || {}) } : {}))).status;
  check(await f({}) === 404, 'local: la API rechaza pedidos sin token');
  check(await f({ headers: { 'X-Token': 'x' } }) === 404, 'local: la API rechaza un token incorrecto');
  const estado = (host) => new Promise((res) => { const rq = require('http').request({ host: '127.0.0.1', port: +base.split(':')[2].replace('/', ''), path: '/', headers: { Host: host } }, (r) => { r.resume(); res(r.statusCode); }); rq.on('error', () => res(0)); rq.end(); });
  check(await estado('ejemplo.com') === 403 && await estado('127.0.0.1:' + base.split(':')[2]) === 200, 'local: rechaza otro nombre de host (DNS rebinding) y acepta el propio');
  check(errs.length === 0, 'local: consola limpia' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await br.close(); srv.kill();
  // en el sitio normal (file://) no aparece el botón ni se hace ningún pedido
  const br2 = await chromium.launch(); const pg2 = await (await br2.newContext()).newPage();
  const pedidos = []; pg2.on('request', (rq) => { if (/^https?:/.test(rq.url())) pedidos.push(rq.url()); });
  await pg2.goto('file://' + path.join(__dirname, '..', 'index.html')); await pg2.waitForSelector('#code'); await pg2.waitForTimeout(500);
  check(await pg2.isHidden('#gccBtn') && pedidos.length === 0, 'sitio normal: sin botón «gcc real» y sin pedidos de red');
  await br2.close();
  console.log(ok + ' ok, ' + bad + ' fallas'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('ERROR', e.message); process.exit(1); });

// Prueba de la interfaz con Chromium headless (Playwright).
// Uso: node tools/ui-smoke.js [carpeta-de-capturas]      (sale con código distinto de cero si algo falla)
//   SHOTS_FINAL=1 node tools/ui-smoke.js docs/capturas    -> además arma las capturas finales (escritorio y celular)
// Recorre index.html (file://), index.html por http (con service worker) y dist/editor-c.html, en escritorio y celular.
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const SHOTS = path.resolve(process.argv[2] || path.join(ROOT, 'tools', 'capturas'));
const FINAL = !!process.env.SHOTS_FINAL;
fs.mkdirSync(SHOTS, { recursive: true });
// capturas y archivos de cada paso: con SHOTS_FINAL solo quedan en la carpeta indicada las capturas finales
const STEP = FINAL ? fs.mkdtempSync(path.join(os.tmpdir(), 'editorc-shots-')) : SHOTS;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const SCANF = '#include <stdio.h>\nint main() {\n    int A, B;\n    printf("A: ");\n    scanf("%d", &A);\n    printf("B: ");\n    scanf("%d", &B);\n    printf("Suma = %d\\n", A + B);\n    return 0;\n}\n';
const ERR = '#include <stdio.h>\nint main() {\n    int A\n    A = 5;\n    printf("%d\\n", A);\n    return 0;\n}\n';
const WARN = '#include <stdio.h>\nint main() {\n    int A;\n    float P;\n    scanf("%d", A);\n    P = 2.5;\n    printf("%d\\n", P);\n    return 0;\n}\n';
const LOOP = '#include <stdio.h>\nint main() {\n    int I;\n    I = 0;\n    while (1) { I++; }\n    return 0;\n}\n';
const LOOPOUT = '#include <stdio.h>\nint main() {\n    while (1) { printf("hola\\n"); }\n    return 0;\n}\n';
const BIGARR = '#include <stdio.h>\nint main() {\n    int A[2000000000];\n    A[5] = 1;\n    printf("%d\\n", A[5]);\n    return 0;\n}\n';
const BIGSRC = (() => { let s = '#include <stdio.h>\nint main() {\n    int A;\n    A = 0;\n'; for (let i = 0; i < 50000; i++) s += '    A = A + ' + (i % 7) + ';\n'; return s + '    printf("%d\\n", A);\n    return 0;\n}\n'; })();
const BIGSRC_SUM = (() => { let a = 0; for (let i = 0; i < 50000; i++) a += i % 7; return a; })();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
function serve(dir, port) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(dir, p);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(port || 0, '127.0.0.1', () => r({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/', close: () => { srv.closeAllConnections && srv.closeAllConnections(); return new Promise((x) => srv.close(x)); } })));
}
function copySite(dest) {
  fs.mkdirSync(path.join(dest, 'assets'), { recursive: true });
  ['index.html', 'sw.js', 'manifest.webmanifest'].forEach((f) => fs.copyFileSync(path.join(ROOT, f), path.join(dest, f)));
  fs.readdirSync(path.join(ROOT, 'assets')).forEach((f) => fs.copyFileSync(path.join(ROOT, 'assets', f), path.join(dest, 'assets', f)));
}

const newCtx = (browser, mobile) => browser.newContext(mobile
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, acceptDownloads: true }
  : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, acceptDownloads: true });

// espera a que una función asíncrona de la página devuelva algo verdadero (waitForFunction no espera promesas de forma confiable)
async function until(page, fn, ms) {
  const t0 = Date.now();
  for (;;) { if (await page.evaluate(fn)) return; if (Date.now() - t0 > ms) throw new Error('until: se agotó el tiempo'); await page.waitForTimeout(100); }
}

// ------------------------------------------------------------------ ayudantes de página
function helpers(page, mobile) {
  const h = {};
  h.setCode = (s) => page.evaluate((c) => window.__editorc.setCode(c), s);
  h.out = () => page.evaluate(() => document.getElementById('out').textContent);
  h.tap = (sel) => (mobile ? page.tap(sel) : page.click(sel));
  h.run = () => h.tap('#run');
  h.tab = async (t) => { if (mobile) await page.tap(t === 'ed' ? '#tabEd' : '#tabCo'); };
  h.menu = async () => { if (mobile && !(await page.evaluate(() => document.getElementById('more').open))) await page.tap('#more > summary'); };
  h.done = () => page.waitForFunction(() => /código de salida|Detenido|Salida cortada|Error|No se pudo ejecutar/.test(document.getElementById('out').textContent), null, { timeout: 30000 });
  h.typeLine = async (v) => { await page.waitForSelector('.stdin input'); await page.keyboard.type(v); await page.keyboard.press('Enter'); };
  h.runScanf = async (a, b) => { await h.setCode(SCANF); await h.run(); await h.typeLine(a); await h.typeLine(b); await page.waitForFunction(() => /código de salida/.test(document.getElementById('out').textContent)); };
  h.progCount = () => page.evaluate(() => JSON.parse(localStorage.getItem('editorc.progs') || '[]').length);
  h.alive = async () => { const t = Date.now(); await page.evaluate(() => 1); return Date.now() - t; };
  return h;
}

// ------------------------------------------------------------------ la suite principal
async function suite(browser, target, mobile) {
  const label = target.label;
  console.log('\n== ' + label + (mobile ? ' (celular)' : ' (escritorio)'));
  const ctx = await newCtx(browser, mobile);
  const page = await ctx.newPage();
  const errors = [], net = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const allowed = target.origin;
  ctx.on('request', (r) => { const u = r.url(); if (/^(file|data|blob|about):/.test(u)) return; if (allowed && u.startsWith(allowed)) return; net.push(u); });
  await page.goto(target.url);
  const H = helpers(page, mobile);
  const { setCode, out: outText, run: clickRun } = H;
  const tag = (mobile ? 'm' : 'd') + '-' + label.replace(/\W+/g, '');
  const shot = (n) => page.screenshot({ path: path.join(STEP, tag + '-' + n + '.png') });

  // ---- 1) scanf (se compila y se ejecuta dentro del Worker)
  await page.evaluate(() => { window.__cc = 0; window.__wk = 0; const c = CCompiler.compile; CCompiler.compile = function () { window.__cc++; return c.apply(this, arguments); }; const W = window.Worker; window.Worker = function () { window.__wk++; return new W(...arguments); }; });
  await H.runScanf('7', '5');
  let t = await outText();
  ok(/Suma = 12/.test(t), 'scanf/printf: Suma = 12');
  ok(/código de salida 0/.test(t), 'muestra código de salida');
  ok((await page.textContent('#status')).includes('Terminó'), 'estado Terminó');
  ok((await page.evaluate(() => window.__cc)) === 0 && (await page.evaluate(() => window.__wk)) >= 1, 'la compilación ocurre en el Worker, no en el hilo de la página');
  await shot('1-scanf');

  // ---- 2) error de compilación (diagnóstico que llega desde el Worker)
  await setCode(ERR); await clickRun();
  await page.waitForSelector('#diag:not([hidden])');
  ok(await page.isVisible('#diagList .it.e'), 'panel de problemas con error');
  ok((await page.locator('.gut .e').count()) >= 1, 'marca en el margen');
  ok((await page.locator('#ul .e').count()) >= 1, 'subrayado en la línea');
  ok(await page.isEnabled('#run') && !(await page.isEnabled('#stop')), 'tras un error de compilación se puede volver a ejecutar');
  await shot('2-error');
  await page.click('#diagList .it.e button');
  if (mobile) ok(await page.isVisible('#code'), 'clic en un problema pasa al editor (celular)');
  ok(true, 'clic en el problema (saltar a la línea) sin fallar');

  // ---- 3) aviso
  await setCode(WARN); await clickRun();
  await page.waitForSelector('#diag:not([hidden])');
  ok((await page.locator('#diagList .it.w').count()) >= 1, 'avisos listados');
  ok((await page.locator('.gut .w').count()) >= 1, 'marca de aviso en el margen');
  await shot('3-aviso');

  // ---- 4) bucle infinito sin salida: Detener durante la ejecución
  await setCode(LOOP); await clickRun();
  await page.waitForFunction(() => document.getElementById('status').textContent === 'Ejecutando…');
  await page.waitForTimeout(300);
  ok((await H.alive()) < 500, 'bucle infinito: la página sigue respondiendo');
  await H.tap('#stop');
  await page.waitForFunction(() => /Detenido/.test(document.getElementById('out').textContent), null, { timeout: 5000 });
  ok(await page.isEnabled('#run'), 'Detener corta el bucle infinito y se puede volver a ejecutar');

  // ---- 5) aviso de "sigue ejecutándose" (umbral reducido para no esperar 5 s en cada suite)
  await page.evaluate(() => { window.__editorc.cfg.slowMs = 1000; });
  await setCode(LOOP); await clickRun();
  await page.waitForTimeout(500);
  ok(!(await page.isVisible('#slow')), 'aviso de bucle: todavía no aparece antes del umbral');
  await page.waitForSelector('#slow:not([hidden])', { timeout: 6000 });
  ok(/sigue ejecutándose/.test(await page.textContent('#slowTxt')) && /bucle infinito/.test(await page.textContent('#slowTxt')) && /Detener/.test(await page.textContent('#slowTxt')), 'aviso de bucle: texto pedido');
  ok(await page.isEnabled('#stop') && /Ejecutando/.test(await page.textContent('#status')), 'aviso de bucle: no bloquea (sigue ejecutando y Detener habilitado)');
  await shot('5-aviso-bucle');
  await H.tap('#slowStop');
  await page.waitForFunction(() => /Detenido/.test(document.getElementById('out').textContent));
  ok(!(await page.isVisible('#slow')), 'el aviso se oculta al detener');
  // esperar datos del usuario no dispara el aviso
  await setCode(SCANF); await clickRun(); await page.waitForSelector('.stdin input');
  await page.waitForTimeout(1700);
  ok(!(await page.isVisible('#slow')), 'esperando entrada no dispara el aviso de bucle');
  await H.typeLine('1'); await H.typeLine('2'); await H.done();
  await page.evaluate(() => { window.__editorc.cfg.slowMs = 5000; });
  if (target.realSlow) {
    await setCode(LOOP); await clickRun();
    await page.waitForTimeout(3500);
    ok(!(await page.isVisible('#slow')), 'umbral real: a los 3,5 s todavía no hay aviso');
    await page.waitForSelector('#slow:not([hidden])', { timeout: 4500 });
    ok(true, 'umbral real: el aviso aparece pasados ~5 s');
    await H.tap('#stop'); await H.done();
  }

  // ---- 6) bucle infinito con salida: tope de salida
  await setCode(LOOPOUT); await clickRun();
  await page.waitForFunction(() => /Salida cortada/.test(document.getElementById('out').textContent), null, { timeout: 15000 });
  t = await outText();
  ok(t.length < 400200, 'tope de salida: ~400000 caracteres como máximo (' + t.length + ')');
  ok(await page.isEnabled('#run') && !(await page.isEnabled('#stop')) && (await H.alive()) < 500, 'tope de salida: ejecución cortada y página fluida');
  await setCode(LOOPOUT); await clickRun(); await page.waitForTimeout(60);
  ok((await H.alive()) < 800, 'bucle con salida: la página responde mientras escribe');
  await H.done(); await page.waitForFunction(() => document.getElementById('run') && !document.getElementById('run').disabled);

  // ---- 7) arreglo gigante
  await setCode(BIGARR); await clickRun(); await H.done();
  t = await outText();
  ok(/demasiado grande|memoria/.test(t) && (await H.alive()) < 500, 'arreglo gigante: mensaje claro y la página sigue viva');

  // ---- 8) fuente enorme (50 000 líneas): compila y ejecuta en el Worker; Detener durante la compilación
  await setCode(BIGSRC);
  let t0 = Date.now();
  await clickRun();
  let worst = 0, sawCompiling = false;
  for (let i = 0; i < 400; i++) {
    const a = Date.now(); const st = await page.textContent('#status'); worst = Math.max(worst, Date.now() - a);
    if (st === 'Compilando…') sawCompiling = true;
    if (/Terminó|error/i.test(st)) break;
    await page.waitForTimeout(50);
  }
  t = await outText();
  ok(new RegExp('^' + BIGSRC_SUM + '\\n').test(t), '50 000 líneas: compila y calcula ' + BIGSRC_SUM + ' (' + (Date.now() - t0) + ' ms)');
  ok(worst < 1000, '50 000 líneas: la página responde durante la compilación (peor respuesta ' + worst + ' ms)');
  await clickRun();
  await page.waitForFunction(() => document.getElementById('status').textContent === 'Compilando…' || /Terminó/.test(document.getElementById('status').textContent), null, { timeout: 5000 });
  const compiling = (await page.textContent('#status')) === 'Compilando…';
  if (compiling) {
    await H.tap('#stop');
    await page.waitForFunction(() => /Compilación detenida/.test(document.getElementById('out').textContent), null, { timeout: 3000 });
    ok(await page.isEnabled('#run') && !(await page.isEnabled('#stop')), 'Detener funciona durante la compilación');
  } else ok(false, 'Detener durante la compilación: no se llegó a ver el estado "Compilando…" (' + sawCompiling + ')');
  await clickRun(); await H.done(); await page.waitForTimeout(300);   // deja terminar y vuelve al programa chico
  await setCode(SCANF);

  // ---- 9) entrada precargada
  await H.tab('co'); await page.click('#inBtn'); await page.fill('#inTxt', '20\n22');
  await clickRun();
  await page.waitForFunction(() => /código de salida/.test(document.getElementById('out').textContent));
  t = await outText();
  ok(/A: 20\nB: 22\nSuma = 42/.test(t), 'entrada precargada se consume sola');
  await shot('4-entrada');
  await page.click('#copy');
  await page.click('#clear'); ok((await outText()) === '', 'Limpiar vacía la consola');

  // ---- 10) buscar y reemplazar
  await H.tab('ed');
  await setCode('int A;\nA = 1;\nA = A + 1;\n');
  await page.click('#findBtn'); await page.fill('#fq', 'A'); await page.fill('#fr', 'X');
  ok(/de \d+/.test(await page.textContent('#fcount')), 'cuenta coincidencias');
  await page.click('#frepall');
  ok((await page.inputValue('#code')) === 'int X;\nX = 1;\nX = X + 1;\n', 'reemplazar todos');
  await page.keyboard.press('Escape');

  // ---- 11) cierre automático, comentar, sangría (solo escritorio: teclado físico)
  if (!mobile) {
    await setCode(''); await page.click('#code');
    await page.keyboard.type('if (x');
    ok((await page.inputValue('#code')) === 'if (x)', 'autocierra paréntesis');
    await page.keyboard.type(')');
    ok((await page.inputValue('#code')) === 'if (x)', 'sobrescribe el cierre');
    await page.keyboard.press('End'); await page.keyboard.type(' {'); await page.keyboard.press('Enter');
    ok((await page.inputValue('#code')) === 'if (x) {\n    \n}', 'llave + Enter arma el bloque');
    await page.keyboard.type('puts("hola');
    ok((await page.inputValue('#code')).includes('puts("hola")'), 'autocierra comillas y paréntesis');
    await page.keyboard.press('Control+/');
    ok((await page.inputValue('#code')).includes('    // puts("hola")'), 'Ctrl+/ comenta');
    await page.keyboard.press('Control+/');
    ok(!(await page.inputValue('#code')).includes('//'), 'Ctrl+/ descomenta');
  }

  // ---- 12) varios programas y recuperación al recargar
  await setCode('// PROGRAMA UNO\nint main() { return 0; }\n');
  await page.waitForTimeout(500);
  await page.click('#pname'); await page.click('#pnew');
  await setCode('// PROGRAMA DOS\n');
  await page.waitForTimeout(500);
  await page.click('#pname');
  ok((await page.locator('#plist li').count()) >= 2, 'lista de programas');
  await shot('5-programas');
  await page.keyboard.press('Escape');
  await page.reload();
  ok((await page.inputValue('#code')).startsWith('// PROGRAMA DOS'), 'recupera el programa tras recargar');

  // ---- 13) vista previa de la captura PNG
  await setCode(SCANF);
  await page.evaluate(() => { const t = document.getElementById('inTxt'); t.value = '3\n4'; t.dispatchEvent(new Event('input')); });
  await clickRun();   // la entrada precargada se consume sola
  await page.waitForFunction(() => /código de salida/.test(document.getElementById('out').textContent));
  await H.menu();
  await H.tap('#shot');
  await page.waitForSelector('#dShot[open]');
  await page.waitForFunction(() => { const i = document.getElementById('shotImg'); return i.complete && i.naturalWidth > 0; });
  const hWith = +(await page.getAttribute('#shotImg', 'data-h'));
  ok(await page.isVisible('#shotInRow'), 'vista previa: opción de incluir la entrada');
  await shot('6-vista-previa');
  await page.uncheck('#shotIn');
  await page.waitForFunction((h) => +document.getElementById('shotImg').dataset.h !== h && document.getElementById('shotImg').complete, hWith);
  const hWithout = +(await page.getAttribute('#shotImg', 'data-h'));
  ok(hWithout < hWith, 'vista previa: sin la entrada la imagen es más baja (' + hWith + ' -> ' + hWithout + ')');
  await page.check('#shotIn');
  await page.waitForFunction((h) => +document.getElementById('shotImg').dataset.h === h, hWith);
  let downloads = 0; page.on('download', () => downloads++);
  await H.tap('#dShot [data-close]');
  await page.waitForTimeout(200);
  ok(downloads === 0 && !(await page.isVisible('#dShot')), 'vista previa: Cancelar no descarga nada');
  await H.menu(); await H.tap('#shot');
  await page.waitForFunction(() => { const i = document.getElementById('shotImg'); return i.complete && i.naturalWidth > 0; });
  const [dl] = await Promise.all([page.waitForEvent('download'), H.tap('#shotDl')]);
  const png = path.join(STEP, tag + '-captura.png'); await dl.saveAs(png);
  const sig = fs.readFileSync(png).subarray(0, 8).toString('hex');
  ok(fs.statSync(png).size > 3000 && sig === '89504e470d0a1a0a' && dl.suggestedFilename().endsWith('.png'), 'exporta PNG desde la vista previa (' + dl.suggestedFilename() + ')');

  // ---- 14) exportar e importar todos los programas
  await H.menu(); await H.tap('#progs');
  await page.waitForSelector('#dProgs[open]');
  const nBefore = await H.progCount();
  const [ex] = await Promise.all([page.waitForEvent('download'), H.tap('#pexp')]);
  const jf = path.join(STEP, tag + '-export.json'); await ex.saveAs(jf);
  const exp = JSON.parse(fs.readFileSync(jf, 'utf8'));
  ok(exp.app === 'editor-c' && exp.version === 1 && exp.programs.length === nBefore && exp.programs.every((p) => typeof p.name === 'string' && typeof p.code === 'string'), 'exporta todos los programas en un .json (' + exp.programs.length + ')');
  await page.setInputFiles('#fileJson', jf);
  await page.waitForSelector('#dImp[open]');
  ok(/omite/.test(await page.textContent('#impList')) && !(await page.isVisible('#impOk')), 'importar el mismo archivo: todo repetido, no hay nada para agregar');
  await H.tap('#dImp [data-close]');
  ok((await H.progCount()) === nBefore, 'importar repetidos no agrega ni pisa nada');
  const mod = JSON.parse(JSON.stringify(exp));
  const orig0 = exp.programs[0];
  mod.programs[0].code = orig0.code + '// editado en el archivo\n';
  mod.programs.push({ name: 'Importado nuevo', code: 'int main(){return 0;}\n', input: '1\n2' }, { name: '', code: 5 }, 'basura');
  const mf = path.join(STEP, tag + '-import.json'); fs.writeFileSync(mf, JSON.stringify(mod));
  await page.setInputFiles('#fileJson', mf);
  await page.waitForSelector('#dImp[open]');
  const impTxt = await page.textContent('#dImp');
  ok(/1 programa nuevo/.test(impTxt) && /otro nombre/.test(impTxt) && /inválidas/.test(impTxt), 'importar: avisa nuevos, mismo nombre con otro contenido e inválidos antes de tocar nada');
  ok((await H.progCount()) === nBefore, 'importar: no cambia nada hasta aceptar');
  await shot('7-importar');
  await H.tap('#impOk');
  await page.waitForFunction((n) => JSON.parse(localStorage.getItem('editorc.progs')).length === n, nBefore + 2);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('editorc.progs')));
  ok(after.some((p) => p.name === 'Importado nuevo' && p.input === '1\n2') && after.some((p) => /\(importado\)/.test(p.name)), 'importar: agrega el nuevo y el de nombre repetido con otro nombre');
  ok(after.find((p) => p.name === orig0.name).code === orig0.code, 'importar: el programa original queda intacto (no se sobrescribe)');
  for (const bad of [['no.json', '{esto no es json'], ['otro.json', JSON.stringify({ app: 'otra-cosa', version: 1, programs: [] })], ['vacio.json', JSON.stringify({ app: 'editor-c', version: 1, programs: [{ x: 1 }] })], ['ver.json', JSON.stringify({ app: 'editor-c', version: 99, programs: [] })]]) {
    const bf = path.join(STEP, tag + '-' + bad[0]); fs.writeFileSync(bf, bad[1]);
    await page.setInputFiles('#fileJson', bf);
    await page.waitForFunction(() => /No se importó nada/.test((document.getElementById('toast') || {}).textContent || ''), null, { timeout: 3000 }).catch(() => {});
    ok(/No se importó nada/.test(await page.textContent('#toast')) && (await H.progCount()) === nBefore + 2, 'importar archivo inválido (' + bad[0] + '): se rechaza sin tocar nada');
    await page.evaluate(() => { document.getElementById('toast').hidden = true; });
  }
  await page.keyboard.press('Escape');

  // ---- 15) ajustes y tema
  await page.reload();
  await H.menu();
  await H.tap('#settings');
  await page.fill('#uName', 'Pérez, Ana'); await page.fill('#uCurso', '5° 2da'); await page.fill('#uMat', 'Lenguajes Electrónicos V'); await page.fill('#uCiclo', '2026');
  await page.selectOption('#theme', 'light');
  await shot('6-ajustes');
  await page.click('#dSet [data-close]');
  ok((await page.getAttribute('html', 'data-theme')) === 'light', 'tema claro');
  await shot('7-claro');
  await page.selectOption('#theme', 'auto').catch(() => {});

  // ---- 16) códigos de diagnóstico: mostrar y silenciar (si el motor no manda `code`, no pasa nada)
  await page.evaluate(() => { localStorage.removeItem('editorc.muted'); });
  await page.reload();
  const fake = { errors: [], warnings: [{ line: 2, msg: 'aviso A', code: 'scanf-sin-amp' }, { line: 3, msg: 'aviso B', code: 'printf-tipo' }, { line: 4, msg: 'aviso sin código' }] };
  await H.tab('co');
  await page.evaluate((r) => window.__editorc.showDiag(r), fake);
  ok((await page.locator('#diagList .cd').count()) === 2 && /scanf-sin-amp/.test(await page.textContent('#diagList')), 'código estable visible en el panel de problemas');
  ok((await page.locator('#diagList .mute').count()) === 2, 'solo los avisos con código se pueden silenciar');
  await H.tap('#diagList .it.w .mute');
  ok((await page.locator('#diagList .it.w').count()) === 2 && !/scanf-sin-amp/.test(await page.textContent('#diagList .it.w')), 'silenciar oculta ese aviso');
  ok(/scanf-sin-amp/.test(await page.evaluate(() => localStorage.getItem('editorc.muted'))), 'el silencio se guarda en el dispositivo');
  await page.reload(); await H.tab('co');
  await page.evaluate((r) => window.__editorc.showDiag(r), fake);
  ok((await page.locator('#diagList .it.w').count()) === 2 && !/scanf-sin-amp/.test(await page.textContent('#diagList')), 'el silencio sobrevive a recargar');
  await H.menu(); await H.tap('#settings');
  ok(await page.isVisible('#mutedRow'), 'Ajustes lista los avisos silenciados');
  await H.tap('#mutedReset'); await page.click('#dSet [data-close]');
  await page.evaluate((r) => window.__editorc.showDiag(r), fake);
  ok((await page.locator('#diagList .it.w').count()) === 3, 'restaurar vuelve a mostrar los avisos silenciados');
  await page.evaluate(() => window.__editorc.showDiag({ errors: [{ line: 1, msg: 'sin campo code' }], warnings: [] }));
  ok((await page.locator('#diagList .cd').count()) === 0 && (await page.locator('#diagList .it.e').count()) === 1, 'sin campo `code` el panel funciona igual');

  ok(errors.length === 0, 'sin errores ni avisos en consola' + (errors.length ? ': ' + errors.join(' | ') : ''));
  ok(net.length === 0, 'cero pedidos de red externos' + (net.length ? ': ' + net.join(' ') : ''));
  await ctx.close();
}

// ------------------------------------------------------------------ escritorio: divisor
async function dividerSuite(browser, target) {
  console.log('\n== divisor · ' + target.label + ' (escritorio)');
  const ctx = await newCtx(browser, false), page = await ctx.newPage();
  const errors = []; page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(target.url);
  const W = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().width, sel);
  const Hh = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().height, sel);
  const vnow = () => page.evaluate(() => +document.getElementById('divider').getAttribute('aria-valuenow'));
  ok(await page.getAttribute('#divider', 'role') === 'separator' && (await page.getAttribute('#divider', 'tabindex')) === '0', 'divisor: role separator y accesible con Tab');
  const w0 = await W('#paneEd');
  const box = await page.locator('#divider').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + box.height / 2, { steps: 8 }); await page.mouse.up();
  const w1 = await W('#paneEd');
  ok(w1 > w0 + 120, 'divisor: arrastrar con el mouse agranda el editor (' + Math.round(w0) + ' -> ' + Math.round(w1) + ' px)');
  await page.screenshot({ path: path.join(STEP, 'd-divisor-' + target.label.replace(/\W+/g, '') + '.png') });
  const saved = await page.evaluate(() => localStorage.getItem('editorc.split.row'));
  ok(!!saved && Math.abs(parseFloat(saved) - (await vnow())) < 1.01, 'divisor: la posición se guarda (' + saved + ')');
  await page.reload();
  ok(Math.abs((await W('#paneEd')) - w1) < 3, 'divisor: la posición se recuerda al recargar');
  await page.focus('#divider');
  await page.keyboard.press('Enter');
  ok((await vnow()) === 55, 'divisor: Enter restablece (55)');
  await page.keyboard.press('ArrowLeft');
  ok((await vnow()) === 53, 'divisor: flecha izquierda mueve 2 puntos');
  await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('ArrowRight');
  ok((await vnow()) === 65, 'divisor: Shift+flecha mueve 10');
  await page.keyboard.press('Home'); ok((await vnow()) === 20, 'divisor: Inicio = mínimo (20)');
  await page.keyboard.press('End'); ok((await vnow()) === 80, 'divisor: Fin = máximo (80)');
  await page.keyboard.press('Enter');
  ok((await page.getAttribute('#divider', 'aria-valuetext')).includes('55'), 'divisor: aria-valuetext legible');
  await page.setViewportSize({ width: 800, height: 700 });
  await page.waitForTimeout(100);
  ok((await page.getAttribute('#divider', 'aria-orientation')) === 'horizontal', 'divisor: en pantalla mediana pasa a horizontal (editor arriba, consola abajo)');
  const h0 = await Hh('#paneEd');
  await page.focus('#divider'); await page.keyboard.press('Shift+ArrowDown');
  ok((await Hh('#paneEd')) > h0 + 20, 'divisor horizontal: flecha abajo agranda el editor');
  const b2 = await page.locator('#divider').boundingBox(); const h1 = await Hh('#paneEd');
  await page.mouse.move(b2.x + b2.width / 2, b2.y + 4); await page.mouse.down(); await page.mouse.move(b2.x + b2.width / 2, b2.y - 120, { steps: 6 }); await page.mouse.up();
  ok((await Hh('#paneEd')) < h1 - 80, 'divisor horizontal: arrastrar hacia arriba achica el editor');
  await page.screenshot({ path: path.join(STEP, 'd-divisor-horizontal-' + target.label.replace(/\W+/g, '') + '.png') });
  ok(errors.length === 0, 'divisor: sin errores en consola' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();
}

// ------------------------------------------------------------------ celular: pestañas, teclado virtual, objetivos táctiles
async function phoneSuite(browser, target) {
  console.log('\n== celular · ' + target.label);
  const ctx = await newCtx(browser, true), page = await ctx.newPage();
  const errors = []; page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(target.url);
  const H = helpers(page, true);
  const shot = (n) => page.screenshot({ path: path.join(STEP, 'm-' + target.label.replace(/\W+/g, '') + '-' + n + '.png') });
  const visible = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
  ok((await visible('#tabs')) && (await visible('#code')) && !(await visible('#console')) && !(await visible('#divider')), 'celular: pestañas Editor/Consola, solo se ve el editor y no hay divisor');
  ok(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'el emulador reporta puntero táctil (pointer: coarse)');
  // scroll y foco se conservan al alternar
  let big = '#include <stdio.h>\nint main() {\n'; for (let i = 0; i < 200; i++) big += '    int V' + i + ' = ' + i + ';\n'; big += '    return 0;\n}\n';
  await H.setCode(big);
  await page.evaluate(() => { const t = document.getElementById('code'); t.scrollTop = 1500; t.focus(); t.setSelectionRange(100, 100); });
  const st0 = await page.evaluate(() => document.getElementById('code').scrollTop);
  await page.tap('#tabCo');
  ok((await visible('#console')) && !(await visible('#code')), 'celular: la pestaña Consola muestra la consola');
  await page.tap('#tabEd');
  const st1 = await page.evaluate(() => ({ s: document.getElementById('code').scrollTop, f: document.activeElement.id, a: document.getElementById('code').selectionStart }));
  ok(st1.s === st0 && st0 > 500, 'celular: el scroll del editor se conserva al alternar (' + st0 + ')');
  ok(st1.f === 'code' && st1.a === 100, 'celular: el foco y el cursor del editor se conservan');
  // al ejecutar pasa solo a la consola; el scroll de la consola también se conserva
  await H.setCode('#include <stdio.h>\nint main() {\n int I;\n for (I = 1; I <= 120; I++) printf("linea %d\\n", I);\n return 0;\n}\n');
  await H.run(); await H.done();
  ok(await visible('#console'), 'celular: Ejecutar pasa a la consola');
  await page.evaluate(() => { document.getElementById('console').scrollTop = 400; });
  await page.tap('#tabEd'); await page.tap('#tabCo');
  ok((await page.evaluate(() => document.getElementById('console').scrollTop)) === 400, 'celular: el scroll de la consola se conserva');
  await shot('consola');
  // teclado virtual: se simula achicando el viewport visible (el emulador no abre teclado real)
  await H.setCode(SCANF); await H.run();
  await page.waitForSelector('.stdin input');
  const focusedInput = () => page.evaluate(() => document.activeElement && document.activeElement.parentElement && document.activeElement.parentElement.className === 'stdin');
  ok(await focusedInput(), 'celular: la línea de entrada recibe el foco');
  const geom = () => page.evaluate(() => { const i = document.querySelector('.stdin input').getBoundingClientRect(), c = document.getElementById('console').getBoundingClientRect(), v = window.visualViewport; return { it: i.top, ib: i.bottom, ct: c.top, cb: c.bottom, vh: v.height, ah: getComputedStyle(document.documentElement).getPropertyValue('--app-h'), kb: document.documentElement.classList.contains('kb'), bodyB: document.body.getBoundingClientRect().bottom }; });
  await page.setViewportSize({ width: 390, height: 440 });
  await page.waitForFunction(() => document.documentElement.classList.contains('kb'), null, { timeout: 3000 });
  await page.waitForTimeout(150);
  let g = await geom();
  ok(g.kb && Math.abs(parseFloat(g.ah) - g.vh) <= 1, 'teclado simulado: el alto de la app sigue al área visible (' + g.ah + ' / ' + g.vh + ')');
  ok(g.ib <= g.vh && g.it >= g.ct - 1 && g.ib <= g.cb + 1, 'teclado simulado: la línea de entrada queda dentro de la consola y del área visible');
  ok(g.bodyB <= g.vh + 1, 'teclado simulado: el diseño no se sale del área visible');
  await shot('teclado');
  await page.keyboard.type('9'); await page.keyboard.press('Enter');
  await page.waitForSelector('.stdin input');
  g = await geom();
  ok(g.ib <= g.vh && g.it >= g.ct - 1, 'teclado simulado: la segunda línea de entrada también queda visible');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => !document.documentElement.classList.contains('kb'), null, { timeout: 3000 });
  ok(true, 'teclado simulado: al volver el alto completo se restablece el diseño');
  await page.keyboard.type('1'); await page.keyboard.press('Enter'); await H.done();
  // objetivos táctiles de 44 px
  async function small(extra) {
    return page.evaluate((x) => {
      const sel = 'button, select, summary, input:not([type=hidden]):not([type=file]):not([type=checkbox]), [role=separator], .chk, [role=tab], textarea';
      const bad = [];
      document.querySelectorAll(sel).forEach((e) => {
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        if (!r.width || !r.height || cs.visibility === 'hidden' || e.closest('[hidden]') || e.closest('dialog:not([open])')) return;
        if (r.width < 43.5 || r.height < 43.5) bad.push((e.id || e.className || e.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (e.textContent ? ' "' + e.textContent.trim().slice(0, 14) + '"' : ''));
      });
      return bad;
    }, extra);
  }
  let bad = await small(); ok(bad.length === 0, 'objetivos táctiles >= 44 px, vista consola' + (bad.length ? ': ' + bad.join(', ') : ''));
  await H.setCode(WARN); await H.run(); await page.waitForSelector('#diag:not([hidden])');
  await page.evaluate((r) => window.__editorc.showDiag(r), { errors: [], warnings: [{ line: 5, msg: 'aviso con código', code: 'scanf-sin-amp' }] });
  await page.tap('#inBtn');
  bad = await small(); ok(bad.length === 0, 'objetivos táctiles >= 44 px, consola con problemas, silenciar y entrada' + (bad.length ? ': ' + bad.join(', ') : ''));
  await page.tap('#inBtn');
  await page.tap('#tabEd'); await page.tap('#findBtn');
  bad = await small(); ok(bad.length === 0, 'objetivos táctiles >= 44 px, vista editor con buscar' + (bad.length ? ': ' + bad.join(', ') : ''));
  await page.tap('#fclose');
  await page.tap('#more > summary');
  bad = await small(); ok(bad.length === 0, 'objetivos táctiles >= 44 px, menú Más' + (bad.length ? ': ' + bad.join(', ') : ''));
  await page.tap('#progs'); await page.waitForSelector('#dProgs[open]');
  bad = await small(); ok(bad.length === 0, 'objetivos táctiles >= 44 px, diálogo Programas' + (bad.length ? ': ' + bad.join(', ') : ''));
  await page.keyboard.press('Escape');
  await page.tap('#more > summary'); await page.tap('#settings'); await page.waitForSelector('#dSet[open]');
  bad = await small(); ok(bad.length === 0, 'objetivos táctiles >= 44 px, diálogo Ajustes' + (bad.length ? ': ' + bad.join(', ') : ''));
  await page.keyboard.press('Escape');
  await page.tap('#more > summary'); await page.tap('#shot'); await page.waitForSelector('#dShot[open]');
  bad = await small(); ok(bad.length === 0, 'objetivos táctiles >= 44 px, vista previa de la captura' + (bad.length ? ': ' + bad.join(', ') : ''));
  await page.keyboard.press('Escape');
  // sin desplazamiento horizontal de la página
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'celular: sin desplazamiento horizontal');
  ok(errors.length === 0, 'celular: sin errores en consola' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();
}

// ------------------------------------------------------------------ sin Worker: respaldo en la página
async function fallbackSuite(browser, target) {
  console.log('\n== sin Worker · ' + target.label);
  const ctx = await newCtx(browser, false), page = await ctx.newPage();
  const errors = []; page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.Worker = function () { throw new Error('Workers bloqueados (prueba)'); }; });
  await page.goto(target.url);
  const H = helpers(page, false);
  await H.runScanf('2', '3');
  ok(/Suma = 5/.test(await H.out()), 'sin Worker: compila y ejecuta en la página (Suma = 5)');
  await H.setCode(ERR); await H.run(); await page.waitForSelector('#diagList .it.e');
  ok(true, 'sin Worker: los errores de compilación se muestran igual');
  await H.setCode(LOOP); await H.run(); await page.waitForTimeout(500);
  ok((await H.alive()) < 800, 'sin Worker: un bucle infinito no congela la página (los lazos ceden el control)');
  await page.click('#stop'); await page.waitForFunction(() => /Detenido/.test(document.getElementById('out').textContent), null, { timeout: 5000 });
  ok(await page.isEnabled('#run'), 'sin Worker: Detener corta el bucle');
  ok(errors.length === 0, 'sin Worker: sin errores en consola' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();
}

// ------------------------------------------------------------------ PWA: service worker solo en http, sin conexión y actualización
async function pwaSuite(browser, mobile) {
  console.log('\n== PWA / sin conexión' + (mobile ? ' (celular)' : ' (escritorio)'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'editorc-'));
  copySite(tmp);
  const S = await serve(tmp);
  const ctx = await newCtx(browser, mobile), page = await ctx.newPage();
  const errors = [], net = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  ctx.on('request', (r) => { if (!r.url().startsWith(S.url) && !/^(data|blob|about):/.test(r.url())) net.push(r.url()); });
  await page.goto(S.url + 'index.html');
  await until(page, () => navigator.serviceWorker.getRegistration().then((r) => !!(r && r.active)), 15000);
  ok(true, 'por http se registra el service worker');
  await until(page, () => caches.keys().then((k) => Promise.all(k.map((x) => caches.open(x).then((c) => c.keys())))).then((l) => l.length > 0 && l[0].length >= 12), 15000);
  const keys1 = await page.evaluate(() => caches.keys());
  ok(keys1.length === 1 && /^editor-c-[0-9a-f]{12}$/.test(keys1[0]), 'caché versionada con el hash del contenido (' + keys1[0] + ')');
  const swText = fs.readFileSync(path.join(tmp, 'sw.js'), 'utf8');
  ok(swText.includes(keys1[0].replace('editor-c-', '')), 'la versión de la caché es la del sw.js generado por el build');
  const cached = await page.evaluate(() => caches.keys().then((k) => caches.open(k[0])).then((c) => c.keys()).then((r) => r.map((x) => new URL(x.url).pathname.replace(/^\//, ''))));
  ok(['index.html', 'manifest.webmanifest', 'assets/app.js', 'assets/compiler.js', 'assets/runtime.js', 'assets/styles.css', 'assets/examples.js', 'assets/icon-192.png', 'assets/icon-512.png'].every((f) => cached.includes(f)), 'se precachea todo lo necesario (' + cached.length + ' archivos)');
  // manifest e íconos
  const mf = JSON.parse(await page.evaluate(() => fetch(document.querySelector('link[rel=manifest]').href).then((r) => r.text())));
  ok(mf.name === 'Editor C' && mf.display === 'standalone' && mf.start_url && mf.theme_color === '#141922' && mf.background_color === '#0e1116', 'manifest: nombre, display y colores de los tokens');
  const sizes = {};
  for (const ic of mf.icons) {
    const buf = fs.readFileSync(path.join(tmp, ic.src));
    sizes[ic.src] = buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20);
    ok(buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && sizes[ic.src] === ic.sizes.replace('x', 'x'), 'ícono ' + ic.src + ' (' + ic.purpose + ') es un PNG de ' + ic.sizes);
  }
  ok(mf.icons.some((i) => i.purpose === 'maskable') && (await page.evaluate(() => !!document.querySelector('link[rel=apple-touch-icon]'))), 'ícono maskable y apple-touch-icon declarados');
  // segunda carga con el servidor apagado
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
  await S.close();
  errors.length = 0;
  await page.reload();
  const H = helpers(page, mobile);
  await H.runScanf('30', '12');
  ok(/Suma = 42/.test(await H.out()), 'sin servidor y sin conexión: la página recarga desde la caché y ejecuta (Suma = 42)');
  const page2 = await ctx.newPage();
  const e2 = []; page2.on('pageerror', (e) => e2.push(e.message));
  await page2.goto(S.url + 'index.html');
  ok((await page2.title()) === 'Editor C' && (await page2.evaluate(() => typeof window.__editorc)) === 'object', 'una pestaña nueva también abre sin servidor');
  await page2.close();
  ok(errors.filter((e) => !/ERR_CONNECTION_REFUSED|Failed to fetch|sw\.js|ServiceWorker/i.test(e)).length === 0, 'sin conexión: sin errores de la página' + (errors.length ? ' (ruido de red ignorado: ' + errors.length + ')' : ''));
  // actualización: se enciende de nuevo el servidor y se publica otra versión
  const again = await serve(tmp, +new URL(S.url).port);   // vuelve a encender el servidor en el mismo origen
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  // nueva "versión" del sitio: otro hash en sw.js y un archivo que cambia
  fs.writeFileSync(path.join(tmp, 'sw.js'), swText.replace(/const VERSION = '[0-9a-f]+'/, "const VERSION = 'aaaaaaaaaaaa'"));
  fs.appendFileSync(path.join(tmp, 'assets', 'app.js'), '\nwindow.__v2 = 1;\n');
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  await page.waitForFunction(() => /versión nueva/.test((document.getElementById('toast') || {}).textContent || '') && !document.getElementById('toast').hidden, null, { timeout: 10000 });
  ok(true, 'actualización: avisa "Hay una versión nueva del editor"');
  ok((await page.evaluate(() => window.__v2)) === undefined, 'actualización: la página no cambia sola (hasta que se acepta)');
  ok((await page.evaluate(() => caches.keys())).length === 2, 'actualización: conviven la caché vieja y la nueva hasta recargar');
  await page.screenshot({ path: path.join(STEP, (mobile ? 'm' : 'd') + '-pwa-actualizacion.png') });
  await Promise.all([page.waitForNavigation({ timeout: 10000 }), page.click('#toast .btn:has-text("Recargar")')]);
  await page.waitForFunction(() => window.__v2 === 1, null, { timeout: 10000 });
  ok(true, 'actualización: al aceptar recarga con la versión nueva');
  const keys2 = await page.evaluate(() => caches.keys());
  ok(keys2.length === 1 && keys2[0] === 'editor-c-aaaaaaaaaaaa', 'actualización: se borra la caché vieja (' + keys2.join(',') + ')');
  ok((await page.evaluate(() => !!document.getElementById('code').value)), 'actualización: el trabajo del usuario se conserva');
  await again.close();
  ok(net.length === 0, 'PWA: cero pedidos de red externos' + (net.length ? ': ' + net.join(' ') : ''));
  await ctx.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ------------------------------------------------------------------ capturas finales (SHOTS_FINAL=1)
async function finalShots(browser, url) {
  console.log('\n== capturas finales');
  for (const mobile of [false, true]) {
    const ctx = await newCtx(browser, mobile);
    if (!mobile) await ctx.addInitScript(() => { try { localStorage.setItem('editorc.theme', 'dark'); } catch (e) { /* nada */ } });
    const page = await ctx.newPage(); await page.goto(url);
    const H = helpers(page, mobile), p = mobile ? 'celular' : 'escritorio';
    const snap = (n) => page.screenshot({ path: path.join(SHOTS, p + '-' + n + '.png') });
    await page.evaluate(() => { localStorage.setItem('editorc.user', JSON.stringify({ name: 'Pérez, Ana', curso: '5° 2da', mat: 'Lenguajes Electrónicos V', ciclo: '2026' })); });
    await page.reload();
    await H.setCode('// Pérez, Ana\n// 5° 2da\n// Lenguajes Electrónicos V\n// Ciclo lectivo 2026\n\n#include <stdio.h>\n\nint main() {\n    int A, B;\n    printf("A: ");\n    scanf("%d", &A);\n    printf("B: ");\n    scanf("%d", B);\n    printf("Promedio = %d\\n", (A + B) / 2.0);\n    return 0;\n}\n');
    await H.run(); await page.waitForSelector('#diag:not([hidden])'); await page.waitForTimeout(300);
    await snap('problemas');
    await H.setCode(SCANF); await H.run(); await H.typeLine('7'); await H.typeLine('5'); await page.waitForFunction(() => /código de salida/.test(document.getElementById('out').textContent));
    await snap('consola');
    if (mobile) { await page.tap('#tabEd'); await snap('editor'); await H.run(); await page.waitForSelector('.stdin input'); await page.setViewportSize({ width: 390, height: 480 }); await page.waitForTimeout(300); await snap('teclado'); await page.setViewportSize({ width: 390, height: 844 }); await page.keyboard.type('1'); await page.keyboard.press('Enter'); await H.typeLine('2'); await H.done(); }
    await H.run(); await H.typeLine('7'); await H.typeLine('5'); await H.done();
    await H.menu(); await H.tap('#shot'); await page.waitForFunction(() => { const i = document.getElementById('shotImg'); return i.complete && i.naturalWidth > 0; }); await snap('vista-previa'); await page.keyboard.press('Escape');
    await H.menu(); await H.tap('#progs'); await page.waitForSelector('#dProgs[open]'); await snap('programas'); await page.keyboard.press('Escape');
    if (!mobile) { const b = await page.locator('#divider').boundingBox(); await page.mouse.move(b.x + 5, b.y + 100); await page.mouse.down(); await page.mouse.move(b.x - 160, b.y + 100, { steps: 6 }); await page.mouse.up(); await snap('divisor'); }
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  const fileIdx = 'file://' + path.join(ROOT, 'index.html'), fileOne = 'file://' + path.join(ROOT, 'dist', 'editor-c.html');
  const web = await serve(ROOT);
  const T = {
    idx: { label: 'index', url: fileIdx, realSlow: true },
    idxHttp: { label: 'index-http', url: web.url + 'index.html', origin: web.url },
    one: { label: 'dist', url: fileOne },
    oneHttp: { label: 'dist-http', url: web.url + 'dist/editor-c.html', origin: web.url }
  };
  const only = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;   // ONLY=pwa node tools/ui-smoke.js  -> solo las suites cuyo nombre coincide
  const guard = async (name, f) => { if (only && !only.test(name)) return; try { await f(); } catch (e) { fail++; console.log('  FAIL ' + name + ' se interrumpió: ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); } };
  for (const m of [false, true]) {
    await guard('index file', () => suite(browser, T.idx, m));
    await guard('index http', () => suite(browser, T.idxHttp, m));
    await guard('dist file', () => suite(browser, T.one, m));
  }
  await guard('dist http', () => suite(browser, T.oneHttp, false));
  await guard('divisor', () => dividerSuite(browser, T.idx));
  await guard('divisor dist', () => dividerSuite(browser, T.one));
  await guard('celular index', () => phoneSuite(browser, T.idx));
  await guard('celular dist', () => phoneSuite(browser, T.one));
  await guard('sin worker', () => fallbackSuite(browser, T.idx));
  await guard('sin worker dist', () => fallbackSuite(browser, T.one));
  // el service worker solo se registra en http(s) y solo en el sitio (no en el archivo único)
  for (const [name, t] of [['file://', T.idx], ['dist por file://', T.one], ['dist por http', T.oneHttp]]) {
    await guard('sw no ' + name, async () => {
      const ctx = await browser.newContext(); const page = await ctx.newPage(); await page.goto(t.url); await page.waitForTimeout(800);
      const n = await page.evaluate(() => navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then((r) => r.length, () => 0) : 0);
      if (/^file:/.test(t.url)) ok(await page.evaluate(() => !navigator.serviceWorker || navigator.serviceWorker.controller === null), 'file://: no hay service worker controlando la página');
      ok(n === 0, 'no se registra service worker en ' + name + ' (' + n + ')'); await ctx.close();
    });
  }
  await guard('pwa escritorio', () => pwaSuite(browser, false));
  await guard('pwa celular', () => pwaSuite(browser, true));
  if (FINAL) await guard('capturas', () => finalShots(browser, T.idxHttp.url));
  await web.close();
  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('FAIL error no controlado: ' + (e && e.stack || e)); process.exit(1); });

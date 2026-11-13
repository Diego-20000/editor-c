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
  page.on('pageerror', (e) => { errors.push('pageerror: ' + e.message); if (process.env.DBG) console.log('PAGEERROR', e.message); });
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
  // ayuda 1 (apagada, predeterminada): ni línea, ni mensaje, ni marca en el margen, ni subrayado; solo el tipo general
  const pan = await page.textContent('#diagList'), cons = await page.textContent('#out');
  ok((await page.locator('.gut .e').count()) === 0 && (await page.locator('#ul .e').count()) === 0, 'ayuda apagada: no se marca la línea del error');
  ok(/Error de sintaxis/.test(pan) && !/l[ií]nea|falta|;/i.test(pan), 'ayuda apagada: el panel dice solo "Error de sintaxis" (' + pan.trim().slice(0, 60) + ')');
  ok(/no compiló/.test(cons) && !/l[ií]nea \d|falta un/.test(cons), 'ayuda apagada: la consola dice que no compiló, sin línea ni mensaje');
  await page.evaluate(() => window.__editorc.setNivel(2)); await setCode(ERR); await clickRun();
  await page.waitForSelector('#diag:not([hidden])');
  ok((await page.locator('.gut .e').count()) >= 1, 'ayuda con línea: marca en el margen');
  ok((await page.locator('#ul .e').count()) >= 1, 'ayuda con línea: subrayado en la línea');
  ok(/línea 3/.test(await page.textContent('#diagList')) && !/falta|;/.test(await page.textContent('#diagList')), 'ayuda con línea: el panel indica la línea y nada más');
  ok(/en la línea 3/.test(await page.textContent('#out')) && !/falta un/.test(await page.textContent('#out')), 'ayuda con línea: la consola indica la línea, sin el mensaje');
  ok(await page.isEnabled('#run') && !(await page.isEnabled('#stop')), 'tras un error de compilación se puede volver a ejecutar');
  await shot('2-error');
  await page.click('#diagList .it.e button');
  if (mobile) ok(await page.isVisible('#code'), 'clic en un problema pasa al editor (celular)');
  ok(true, 'clic en el problema (saltar a la línea) sin fallar');

  // ---- 3) aviso
  await setCode(WARN); await clickRun();
  await page.waitForSelector('#diag:not([hidden])');
  ok((await page.locator('#diagList .it.w').count()) >= 1, 'avisos listados');
  ok((await page.locator('.gut .w').count()) >= 1, 'ayuda con línea: marca de aviso en el margen');
  await shot('3-aviso');
  await page.evaluate(() => window.__editorc.setNivel(1));

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
  ok(/Error al ejecutar/.test(t) && !/demasiado grande|memoria/.test(t) && (await H.alive()) < 500, 'arreglo gigante: dice que falló al ejecutar (sin detalle) y la página sigue viva');

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

  // ---- 11) cierre automático (apagado por defecto), comentar, sangría (solo escritorio: teclado físico)
  if (!mobile) {
    await setCode(''); await page.click('#code');
    await page.keyboard.type('if (x');
    ok((await page.inputValue('#code')) === 'if (x', 'por defecto no autocierra paréntesis (que el alumno tipee todo)');
    await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace');
    await H.menu(); await H.tap('#settings'); await page.waitForSelector('#dSet[open]'); await page.check('#autoCierre'); await page.keyboard.press('Escape');
    await page.click('#code');
    await page.keyboard.type('if (x');
    ok((await page.inputValue('#code')) === 'if (x)', 'encendido en Ajustes: autocierra paréntesis');
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
    await H.menu(); await H.tap('#settings'); await page.waitForSelector('#dSet[open]'); await page.uncheck('#autoCierre'); await page.keyboard.press('Escape');
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
  const wDef = +(await page.getAttribute('#shotImg', 'data-w'));
  await page.selectOption('#shotLay', 'lado'); await page.waitForTimeout(500);
  const wLado = +(await page.getAttribute('#shotImg', 'data-w'));
  await page.selectOption('#shotLay', 'abajo'); await page.waitForTimeout(500);
  const wAbajo = +(await page.getAttribute('#shotImg', 'data-w'));
  ok(wLado > wAbajo, 'vista previa: «lado a lado» es más ancha que «abajo» (' + wLado + ' vs ' + wAbajo + ')');
  ok(await page.$eval('#shotLay', (e) => e.value) === 'abajo' && wDef > 0, 'vista previa: hay selector de disposición');
  const hWith = +(await page.getAttribute('#shotImg', 'data-h'));
  const txt = await page.evaluate(async () => { const b = new Uint8Array(await (await fetch(document.getElementById('shotImg').src)).arrayBuffer()); let t = ''; for (let i = 0; i < b.length; i++) t += String.fromCharCode(b[i]); return t; });
  ok(!txt.includes('iTXt') && !txt.includes('EditorC-Proceso'), 'la imagen no lleva datos de proceso dentro del archivo');
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
  await page.click('#theme [data-v="light"]');
  await shot('6-ajustes');
  await page.click('#dSet [data-close]');
  ok((await page.getAttribute('html', 'data-theme')) === 'light', 'tema claro');
  await shot('7-claro');
  await page.click('#theme [data-v="auto"]').catch(() => {});

  // ---- 16) el panel nunca muestra mensajes ni códigos del compilador (ni con la ayuda con línea)
  await page.reload();
  const fake = { errors: [], warnings: [{ line: 2, msg: 'aviso A', code: 'scanf-sin-amp' }, { line: 3, msg: 'aviso B', code: 'printf-tipo' }, { line: 4, msg: 'aviso sin código' }] };
  await H.tab('co');
  await page.evaluate((r) => window.__editorc.showDiag(r), fake);
  ok((await page.locator('#diagList .it.w').count()) === 3 && !/aviso A|scanf-sin-amp|línea/.test(await page.textContent('#diagList')) && (await page.locator('#diagList .mute, #diagList .cd').count()) === 0, 'ayuda apagada: tres avisos, sin mensaje, sin código y sin línea');
  await page.evaluate(() => window.__editorc.setNivel(2));
  await page.evaluate((r) => window.__editorc.showDiag(r), fake);
  ok(/línea 2/.test(await page.textContent('#diagList')) && !/aviso A|scanf-sin-amp/.test(await page.textContent('#diagList')), 'ayuda con línea: avisos con su línea y sin mensaje ni código');
  await page.evaluate(() => window.__editorc.setNivel(1));
  await page.evaluate(() => window.__editorc.showDiag({ errors: [{ line: 1, msg: 'sin campo code' }], warnings: [] }));
  ok((await page.locator('#diagList .it.e').count()) === 1, 'sin campo `code` el panel funciona igual');

  ok(errors.length === 0, 'sin errores ni avisos en consola' + (errors.length ? ': ' + errors.join(' | ') : ''));
  ok(net.length === 0, 'cero pedidos de red externos' + (net.length ? ': ' + net.join(' ') : ''));
  await ctx.close();
}

// ------------------------------------------------------------------ escritorio: divisor
// ------------------------------------------------------------------ diseño (estilo iOS) y ayudas de lectura
async function disenoSuite(browser, target, mobile) {
  console.log('\n== diseño y lectura · ' + target.label + (mobile ? ' (celular)' : ' (escritorio)'));
  const ctx = await newCtx(browser, mobile), page = await ctx.newPage();
  const errors = []; page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
  const H = helpers(page, mobile);
  await page.goto(target.url); await page.waitForSelector('#code');
  const PROG = '#include <stdio.h>\nint main() {\n    int A;\n    if (A > 0) {\n        printf("}(");\n    }\n    return 0;\n}\n';
  await H.setCode(PROG);
  const caret = (pos) => page.evaluate((p) => { const t = document.getElementById('code'); t.focus(); t.setSelectionRange(p, p); document.dispatchEvent(new Event('selectionchange')); }, pos);
  const marks = (c) => page.evaluate((k) => document.querySelectorAll('#br .' + k).length, c);
  // 1) pareja de llaves
  await caret(PROG.indexOf('{') + 1); await page.waitForTimeout(80);
  ok(await marks('bm') === 2, 'pareja: con el cursor junto a "{" se marcan las dos llaves del bloque');
  const txt = await page.evaluate(() => Array.from(document.querySelectorAll('#br .bm')).map((e) => e.textContent).join(''));
  ok(txt === '{}', 'pareja: las marcadas son "{" y "}" (' + txt + ')');
  await caret(PROG.indexOf('(', PROG.indexOf('if')) + 1); await page.waitForTimeout(80);
  const par = await page.evaluate(() => document.getElementById('br').textContent);
  ok(await marks('bm') === 2, 'pareja: con "(" del if se marcan los dos paréntesis (los de la cadena "}(" no cuentan)');
  await caret(PROG.indexOf('A;') ); await page.waitForTimeout(80);
  ok(await marks('bm') === 0 && await marks('bu') === 0, 'pareja: sin llave junto al cursor no se marca nada');
  await H.setCode('int main() {\n    return 0;\n');
  await caret(12); await page.waitForTimeout(80);
  ok(await marks('bu') === 1 && await marks('bm') === 0, 'pareja: una llave sin cerrar se marca como sin pareja');
  await H.setCode(PROG);
  // 2) línea actual
  await caret(PROG.indexOf('return')); await page.waitForTimeout(80);
  const cur = await page.evaluate(() => { const g = document.querySelector('#gut .cur'); return g ? g.textContent : null; });
  ok(cur === '7', 'línea actual: el número de la línea del cursor está resaltado (' + cur + ')');
  const geo = await page.evaluate(() => { const c = document.getElementById('curline').getBoundingClientRect(), g = document.querySelector('#gut .cur').getBoundingClientRect(); return { dy: Math.abs((c.top + c.height / 2) - (g.top + g.height / 2)), h: c.height }; });
  ok(geo.dy < 2 && geo.h > 10, 'línea actual: la banda coincide con el renglón (desvío ' + geo.dy.toFixed(1) + ' px)');
  const pos = await page.textContent('#pos');
  ok(/Lín 7, Col 5/.test(pos), 'contador: Lín/Col del cursor (' + pos + ')');
  // 3) guías de sangría y espacios
  const guides = () => page.evaluate(() => document.querySelectorAll('#gd i.ig').length);
  ok(await guides() >= 6, 'guías de sangría: hay guías en las líneas sangradas (' + await guides() + ')');
  ok(await page.evaluate(() => getComputedStyle(document.getElementById('gd')).pointerEvents === 'none'), 'guías: la capa no intercepta clics');
  // 4) ajustes: sangría, espacios, renglones
  await H.menu(); await H.tap('#settings'); await page.waitForSelector('#tabSel', { state: 'visible' });
  await page.selectOption('#tabSel', '2');
  ok(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tab').trim() === '2'), 'sangría: --tab pasa a 2');
  ok(await guides() >= 12, 'sangría 2: las guías se recalculan (' + await guides() + ')');
  await page.check('#wsChk');
  ok(await page.evaluate(() => document.querySelectorAll('#gd b.sp').length) > 5, 'espacios visibles: se dibujan puntos en los espacios');
  await page.uncheck('#wsChk');
  ok(await page.evaluate(() => document.querySelectorAll('#gd b.sp').length) === 0, 'espacios visibles: se apagan');
  ok(await page.evaluate(() => !document.getElementById('ruleChk') && getComputedStyle(document.getElementById('codeBox')).backgroundImage === 'none'), 'sin renglones de cuaderno: ni ajuste ni fondo rayado');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.gut')).borderRightColor !== 'rgb(192, 57, 43)'), 'sin margen rojo junto a los números');
  await page.evaluate(() => { document.getElementById('dSet').close(); if (innerWidth < 900) document.getElementById('more').open = false; });
  await H.setCode('int main() {\n');
  await page.evaluate(() => { const t = document.getElementById('code'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
  await page.keyboard.press('Tab');
  ok((await page.$eval('#code', (t) => t.value)) === 'int main() {\n  ', 'sangría 2: Tab inserta 2 espacios');
  await H.menu(); await H.tap('#settings'); await page.selectOption('#tabSel', '4'); await page.evaluate(() => { document.getElementById('dSet').close(); if (innerWidth < 900) document.getElementById('more').open = false; });
  ok(await page.evaluate(() => localStorage.getItem('editorc.sang')) === '4', 'sangría: se recuerda en el dispositivo');
  // 5) cartel de ejecución
  await H.setCode(LOOP);
  await H.run(); await H.tab('co');
  await page.waitForSelector('#runBar:not([hidden])', { timeout: 4000 });
  await page.waitForFunction(() => /Ejecutando/.test(document.getElementById('runBarTxt').textContent), null, { timeout: 8000 });
  ok(/Ejecutando/.test(await page.textContent('#runBarTxt')), 'cartel: mientras corre dice "Ejecutando…" (' + await page.textContent('#runBarTxt') + ')');
  await H.tap('#stop'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.getElementById('runBar').hidden), 'cartel: se oculta al detener');
  await H.setCode(SCANF); await H.tab('ed'); await H.run();
  await page.waitForSelector('.stdin input');
  ok(/Esperando datos/.test(await page.textContent('#runBarTxt')) && await page.evaluate(() => document.getElementById('runBar').classList.contains('wait')), 'cartel: pidiendo datos dice "Esperando datos"');
  await H.typeLine('1'); await H.typeLine('2'); await H.done();
  ok(await page.evaluate(() => document.getElementById('runBar').hidden), 'cartel: al terminar no queda a la vista');
  ok(await page.evaluate(() => { const i = document.querySelector('#out .in'); return !!i && +getComputedStyle(i).fontWeight >= 600 && getComputedStyle(i).color !== getComputedStyle(document.getElementById('out')).color; }), 'consola: lo tipeado se distingue (matiz y peso), no solo por el color');
  // 6) modo lectura
  await H.tab('ed'); await H.setCode(PROG);
  await H.tap('#readBtn'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.documentElement.classList.contains('lectura') && document.getElementById('code').readOnly), 'lectura: se activa y el código queda de solo lectura');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.bar')).display === 'none' && getComputedStyle(document.getElementById('paneCo')).display === 'none'), 'lectura: se ocultan la barra y la consola');
  const r0 = await page.$eval('#code', (t) => t.value);
  await page.evaluate(() => { const t = document.getElementById('code'); t.focus(); t.setSelectionRange(0, 0); });
  await page.keyboard.type('zzz'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  ok((await page.$eval('#code', (t) => t.value)) === r0, 'lectura: tipear, Tab y Enter no cambian el código');
  const rb = await page.locator('#readBtn').boundingBox();
  ok(rb && rb.height >= (mobile ? 43.5 : 27), 'lectura: el botón para salir está a la vista (' + Math.round(rb.width) + 'x' + Math.round(rb.height) + ')');
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'lectura: sin desplazamiento horizontal de la página');
  await page.screenshot({ path: path.join(STEP, 'd-lectura-' + (mobile ? 'cel' : 'esc') + '.png') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => !document.documentElement.classList.contains('lectura') && !document.getElementById('code').readOnly), 'lectura: Esc vuelve a editar');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.bar')).display !== 'none'), 'lectura: vuelve la barra');
  // 7) contraste WCAG AA de la paleta (claro y oscuro)
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  for (const th of ['light', 'dark']) {
    const v = await page.evaluate((t) => { document.documentElement.dataset.theme = t; const cs = getComputedStyle(document.documentElement), o = {}; ['panel', 'panel2', 'bg', 'text', 'muted', 'accent', 'accent-ink', 'danger', 'warn', 'input', 'ok', 'kw', 'ty', 'st', 'nu', 'co', 'fn', 'pp', 'gut', 'lineS'].forEach((k) => { o[k] = cs.getPropertyValue('--' + k).trim(); }); return o; }, th);
    const bad = [];
    for (const k of ['text', 'muted', 'accent', 'danger', 'warn', 'input', 'ok', 'kw', 'ty', 'st', 'nu', 'co', 'fn', 'pp']) for (const bg of ['panel', 'panel2']) if (cr(v[k], v[bg]) < 4.5) bad.push(k + ' sobre ' + bg + ' ' + cr(v[k], v[bg]).toFixed(2));
    for (const k of ['text', 'muted', 'danger', 'warn', 'input', 'ok']) if (cr(v[k], v.bg) < 4.5) bad.push(k + ' sobre bg ' + cr(v[k], v.bg).toFixed(2));
    if (cr(v.gut, v.panel) < 4.5) bad.push('números de línea sobre panel ' + cr(v.gut, v.panel).toFixed(2));
    if (cr(v['accent-ink'], v.accent) < 4.5) bad.push('texto de botón primario');
    if (cr(v.lineS, v.panel) < 3) bad.push('borde de campos');
    ok(bad.length === 0, 'contraste WCAG AA (' + th + '): texto >= 4,5:1 y bordes de campos >= 3:1' + (bad.length ? ' -> ' + bad.join('; ') : ''));
  }
  await page.evaluate(() => { delete document.documentElement.dataset.theme; });
  // 8) hoja de atajos incluye Esc; tabla de atajos sin choque con F1/?
  await page.evaluate(() => document.getElementById('dlg').showModal());
  ok(/Esc/.test(await page.textContent('#dlg .keys')) && /F1/.test(await page.textContent('#dlg .keys')), 'atajos: la hoja muestra F1 y Esc');
  await page.evaluate(() => document.getElementById('dlg').close());
  // 9) celular: nada se sale, cabecera de la hoja en una sola fila
  if (mobile) {
    const hh = await page.$eval('#paneEd .pane-head', (e) => e.getBoundingClientRect().height);
    ok(hh <= 60, 'celular: la cabecera del editor cabe en una fila (' + Math.round(hh) + ' px)');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'celular: sin desplazamiento horizontal');
    const small = await page.evaluate(() => Array.from(document.querySelectorAll('.bar .btn, .tab, #readBtn, #findBtn, #whatBtn, #pname')).filter((e) => e.offsetParent && (e.getBoundingClientRect().height < 43.5 || e.getBoundingClientRect().width < 43.5)).map((e) => e.id || e.className));
    ok(small.length === 0, 'celular: objetivos táctiles de 44 px en la barra, pestañas y cabecera' + (small.length ? ' -> ' + small.join(',') : ''));
  }
  // 10) la imagen de la captura: hoja blanca con tira azul arriba, sin pedir nada a la red
  await H.setCode(PROG);
  await H.menu(); await H.tap('#shot'); await page.waitForFunction(() => document.getElementById('shotImg').getAttribute('src'));
  await page.waitForTimeout(300);
  await page.selectOption('#shotLay', 'abajo'); await page.waitForTimeout(500);   // en escritorio el valor por defecto es «lado a lado» (más ancha); acá se mide la vertical
  const px = await page.evaluate(() => new Promise((res) => { const im = new Image(); im.onload = () => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    const W = im.width, H = im.height, d = x.getImageData(0, 0, W, H).data;
    let head = 0, logo = 0, tealN = 0, edge = 0, nonwhite = 0;
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const o = (Y * W + X) * 4, r = d[o], g = d[o + 1], b = d[o + 2];
      if (r > 245 && g > 245 && b > 245) continue;
      nonwhite++;
      const dk = r < 90 && g < 90 && b < 90, tl = r < 40 && g > 90 && g < 150 && b > 100 && b < 160;
      if (Y < H * 0.07 && dk) head++;
      if (Y > H - 80 && X < W * 0.2) { if (dk) logo++; if (tl) tealN++; }
      if (X > W - 8 || Y > H - 3 || X < 8 || Y < 3) edge++;
    }
    res({ w: W, h: H, frac: nonwhite / (W * H), head, logo, tealN, edge });
  }; im.src = document.getElementById('shotImg').src; }));
  ok(px.frac > 0.012 && px.frac < 0.6, 'captura: no es una hoja en blanco ni está saturada (' + (px.frac * 100).toFixed(1) + ' % de píxeles con tinta)');
  ok(px.head > 150, 'captura: la cabecera tiene texto oscuro (' + px.head + ' px)');
  ok(px.head > 150, 'captura: la cabecera tiene texto oscuro (' + px.head + ' px)');
  ok(px.edge === 0, 'captura: nada toca los bordes (el texto cabe) (' + px.edge + ' px)');
  ok(px.w <= 1400, 'captura: ancho razonable para verla en el celular (' + px.w + ' px)');
  await page.evaluate(() => { document.getElementById('dShot').close(); if (innerWidth < 900) document.getElementById('more').open = false; });
  ok(errors.length === 0, 'diseño: sin errores ni avisos en la consola del navegador' + (errors.length ? ' -> ' + errors.slice(0, 2).join(' | ') : ''));
  await ctx.close();
}


// ------------------------------------------------------------------ identidad: temas, contraste, íconos de la app, favicon, sprite
async function identidadSuite(browser, target) {
  console.log('\n== identidad · ' + target.label);
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const css = fs.readFileSync(path.join(ROOT, 'src', 'app.css'), 'utf8');
  // 1) la paleta oscura del modo automático es idéntica a la del tema oscuro elegido a mano
  const bloque = (re) => { const m = css.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : null; };
  const auto = bloque(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme\]\) \{([^}]*)\}/), manual = bloque(/:root\[data-theme="dark"\] \{([^}]*)\}/);
  ok(auto && auto === manual, 'tema oscuro: el automático y el manual tienen los mismos valores');
  ok(!/gradient/.test(css) && !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(fs.readFileSync(path.join(ROOT, 'src', 'template.html'), 'utf8')), 'estilo: sin degradados en el CSS ni emoji en la página');
  // 2) tres temas, con la preferencia del sistema emulada
  for (const [scheme, tema, esperado] of [['light', 'auto', 'light'], ['dark', 'auto', 'dark'], ['dark', 'light', 'light'], ['light', 'dark', 'dark']]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme });
    await ctx.addInitScript((t) => { try { localStorage.setItem('editorc.theme', t); } catch (e) {} }, tema);
    const page = await ctx.newPage(); await page.goto(target.url); await page.waitForSelector('#code');
    const v = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement), o = {}; ['bg', 'panel', 'panel2', 'text', 'muted', 'accent', 'accent-ink', 'danger', 'warn', 'ok', 'input', 'gut', 'lineS', 'kw', 'ty', 'st', 'nu', 'co', 'fn', 'pp'].forEach((k) => { o[k] = cs.getPropertyValue('--' + k).trim(); }); o.body = getComputedStyle(document.body).backgroundColor; o.fill = cs.getPropertyValue('--fill').trim(); return o; });
    const oscuro = lum(v.panel) < .2;
    ok(oscuro === (esperado === 'dark'), 'tema ' + tema + ' con sistema ' + scheme + ': se ve ' + esperado + ' (panel ' + v.panel + ')');
    const bodyHex = hex(v.body.match(/\d+/g).slice(0, 3).map(Number));
    ok(bodyHex === v.bg, 'tema ' + tema + '/' + scheme + ': el fondo de la página es --bg (' + bodyHex + ')');
    // contraste AA de cada par que se usa, y de los textos sobre el relleno gris de los botones
    const f = v.fill.match(/[\d.]+/g).map(Number), base = v.panel, bb = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16));
    const comp = hex([0, 1, 2].map((i) => f[i] * f[3] + bb[i] * (1 - f[3])));
    const bad = [];
    for (const k of ['text', 'muted', 'accent', 'danger', 'warn', 'ok', 'input', 'kw', 'ty', 'st', 'nu', 'co', 'fn', 'pp', 'gut']) if (cr(v[k], v.panel) < 4.5) bad.push(k + '/panel ' + cr(v[k], v.panel).toFixed(2));
    for (const k of ['text', 'muted', 'accent', 'danger', 'warn', 'ok']) { if (cr(v[k], v.bg) < 4.5) bad.push(k + '/bg ' + cr(v[k], v.bg).toFixed(2)); if (cr(v[k], comp) < 4.5) bad.push(k + '/relleno ' + cr(v[k], comp).toFixed(2)); }
    if (cr(v['accent-ink'], v.accent) < 4.5) bad.push('botón primario ' + cr(v['accent-ink'], v.accent).toFixed(2));
    if (cr(v.lineS, v.panel) < 3) bad.push('borde de campos ' + cr(v.lineS, v.panel).toFixed(2));
    ok(bad.length === 0, 'contraste AA (' + tema + '/' + scheme + '): textos >= 4,5:1, bordes >= 3:1' + (bad.length ? ' -> ' + bad.join('; ') : ''));
    // meta theme-color de claro y de oscuro
    const metas = await page.evaluate(() => Array.from(document.querySelectorAll('meta[name=theme-color]')).map((m) => m.getAttribute('content')));
    ok(metas.length === 2, 'theme-color: hay una meta para claro y otra para oscuro (' + metas.join(', ') + ')');
    await ctx.close();
  }
  // 3) íconos del manifest, favicon y pantalla de inicio: existen y tienen el tamaño declarado
  const png = (f) => { const b = fs.readFileSync(path.join(ROOT, f)); return { ok: b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
  const mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  ok(mf.theme_color && mf.background_color && /^#[0-9a-f]{6}$/i.test(mf.theme_color), 'manifest: theme_color y background_color definidos (' + mf.theme_color + ', ' + mf.background_color + ')');
  for (const ic of mf.icons) { const i = png(ic.src); ok(i.ok && i.w + 'x' + i.h === ic.sizes, 'manifest: ' + ic.src + ' (' + ic.purpose + ') existe y mide ' + ic.sizes); }
  for (const [f, n] of [['assets/apple-touch-icon.png', 180], ['assets/favicon-32.png', 32]]) { const i = png(f); ok(i.ok && i.w === n && i.h === n, f + ' mide ' + n + 'x' + n); }
  const ico = fs.readFileSync(path.join(ROOT, 'assets', 'favicon.ico'));
  ok(ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1 && ico.readUInt16LE(4) === 3 && [16, 32, 48].every((n, i) => ico[6 + 16 * i] === n), 'favicon.ico: contiene 16, 32 y 48 px');
  const fsvg = fs.readFileSync(path.join(ROOT, 'assets', 'favicon.svg'), 'utf8');
  ok(/<svg[^>]+viewBox/.test(fsvg) && /prefers-color-scheme:dark/.test(fsvg), 'favicon.svg: válido y con variante para pestañas oscuras');
  const sp = png('assets/splash-claro.png'); ok(sp.ok && sp.w === 1170 && sp.h === 2532, 'pantalla de inicio: 1170x2532');
  // 4) el ícono «maskable»: el símbolo cabe en el círculo seguro (radio 40 %) y el fondo llega a las esquinas (por http, para poder leer los píxeles)
  if (target.origin) {
    const ctx = await browser.newContext(); const page = await ctx.newPage(); await page.goto(target.url);
    const r = await page.evaluate(async () => {
      const im = new Image(); im.src = 'assets/icon-maskable-512.png'; await new Promise((x, y) => { im.onload = x; im.onerror = y; });
      const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, 512, 512).data, bg = [d[0], d[1], d[2]]; let fuera = 0, dentro = 0;
      for (let Y = 0; Y < 512; Y++) for (let X = 0; X < 512; X++) { const o = (Y * 512 + X) * 4; if (Math.abs(d[o] - bg[0]) + Math.abs(d[o + 1] - bg[1]) + Math.abs(d[o + 2] - bg[2]) > 40) { if (Math.hypot(X - 256, Y - 256) > 0.4 * 512) fuera++; else dentro++; } }
      const esq = [[0, 0], [511, 0], [0, 511], [511, 511]].every(([X, Y]) => { const o = (Y * 512 + X) * 4; return d[o + 3] === 255 && d[o] === bg[0]; });
      return { fuera, dentro, esq };
    }, null);
    ok(r.fuera === 0 && r.dentro > 2000, 'ícono maskable: todo el símbolo está dentro de la zona segura (' + r.dentro + ' px dentro, ' + r.fuera + ' fuera)');
    ok(r.esq, 'ícono maskable: el fondo opaco llega a las cuatro esquinas');
    // el ícono «any» tiene esquinas transparentes y símbolo en el centro
    const a = await page.evaluate(async () => { const im = new Image(); im.src = 'assets/icon-512.png'; await new Promise((x, y) => { im.onload = x; im.onerror = y; }); const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return { esq: x.getImageData(2, 2, 1, 1).data[3], centro: x.getImageData(256, 256, 1, 1).data[3] }; });
    ok(a.esq === 0 && a.centro === 255, 'ícono any: esquinas transparentes y centro opaco');
    await ctx.close();
  }
  // 5) el sprite: cada ícono pedido por la página existe, y la marca de la barra coincide con el SVG del símbolo
  {
    const ctx = await browser.newContext(); const page = await ctx.newPage(); await page.goto(target.url); await page.waitForSelector('#code');
    const faltan = await page.evaluate(() => Array.from(document.querySelectorAll('use')).map((u) => u.getAttribute('href')).filter((h, i, a) => a.indexOf(h) === i && !document.querySelector(h)));
    ok(faltan.length === 0, 'sprite: todos los íconos que usa la página existen' + (faltan.length ? ' -> faltan ' + faltan.join(', ') : ''));
    const n = await page.evaluate(() => document.querySelectorAll('symbol').length);
    ok(n >= 25, 'sprite: ' + n + ' íconos propios en la página');
    const mark = await page.evaluate(() => Array.from(document.querySelectorAll('.mark path')).map((p) => p.getAttribute('d')));
    const sim = fs.readFileSync(path.join(ROOT, 'docs', 'identidad', 'simbolo.svg'), 'utf8');
    ok(mark.length === 2 && mark.every((d) => sim.includes(d)), 'marca: el logo de la barra es el mismo trazo que docs/identidad/simbolo.svg');
    await ctx.close();
  }
}

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
  page.on('pageerror', (e) => { errors.push('pageerror: ' + e.message); if (process.env.DBG) console.log('PAGEERROR', e.message); });
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
  ok(mf.name === 'Editor C' && mf.display === 'standalone' && mf.start_url && mf.theme_color === '#141517' && mf.background_color === '#17181b', 'manifest: nombre, display y colores (grafito del tema oscuro y del ícono)');
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

// ------------------------------------------------------------------ el entrenador: ayuda por niveles, panel Ayuda, «¿Qué es esto?», casos sin respuesta, proceso, cierre automático
const SCANF_MAL = '#include <stdio.h>\nint main() {\n    int A;\n    scanf("%d", A);\n    printf("%d\\n", A);\n    return 0;\n}\n';
const CON_CABECERA = '// Pérez, Ana\n// 5° 2da\n// Lenguajes Electrónicos V\n// Ciclo lectivo 2026\n\n#include <stdio.h>\nint main() {\n    int A;\n    A = 1;\n    printf("%d\\n", A);\n    return 0;\n}\n';
const DESCONOCIDO = { errors: [{ line: 9, msg: 'zzz error inventado que la base no conoce (prueba)', code: 'E-prueba-sin-kb' }], warnings: [] };

async function entrenadorSuite(browser, target, mobile) {
  const label = target.label;
  console.log('\n== entrenador · ' + label + (mobile ? ' (celular)' : ' (escritorio)'));
  const ctx = await newCtx(browser, mobile);
  const page = await ctx.newPage();
  const errors = [], net = [], extra = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => { errors.push('pageerror: ' + e.message); if (process.env.DBG) console.log('PAGEERROR', e.message); });
  ctx.on('page', (p) => extra.push(p.url()));
  ctx.on('request', (r) => { const u = r.url(); if (/^(file|data|blob|about):/.test(u)) return; if (target.origin && u.startsWith(target.origin)) return; net.push(u); });
  const H = helpers(page, mobile), tg = (mobile ? 'm' : 'd') + '-ent-' + label.replace(/\W+/g, '');
  const shot = (n) => page.screenshot({ path: path.join(STEP, tg + '-' + n + '.png') });
  const open = async (q) => { await page.goto(target.url + (q || '')); await page.waitForSelector('#code'); };
  const openSettings = async () => { await H.menu(); await H.tap('#settings'); await page.waitForSelector('#dSet[open]'); };
  const closeDlg = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('dialog[open]')); };
  const runShow = async (code) => { await H.setCode(code); await H.run(); await page.waitForSelector('#diag:not([hidden])'); await H.tab('co'); };
  const items = (cls) => page.locator('#diagList .it' + (cls || ''));
  const vis = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]'); }, sel);
  // punto de pantalla (centro) del carácter `idx`-ésimo del texto, para tocar el editor sin mover el cursor
  const pointOf = (needle, delta) => page.evaluate(([n, d]) => {
    const t = document.getElementById('code'), v = t.value, i = v.indexOf(n) + (d || 0), lines = v.slice(0, i).split('\n');
    const cs = getComputedStyle(t), r = t.getBoundingClientRect(), c = document.createElement('canvas').getContext('2d'); c.font = cs.fontSize + ' ' + cs.fontFamily;
    const cw = c.measureText('M').width, lh = parseFloat(cs.lineHeight);
    return { x: r.left + parseFloat(cs.paddingLeft) + (lines[lines.length - 1].length + 0.5) * cw - t.scrollLeft, y: r.top + parseFloat(cs.paddingTop) + (lines.length - 0.5) * lh - t.scrollTop };
  }, [needle, delta]);
  const tapAt = (pt) => (mobile ? page.touchscreen.tap(pt.x, pt.y) : page.mouse.click(pt.x, pt.y));
  await open();
  await H.tab('ed');

  // ---- A) ayuda apagada por defecto: no dice dónde está el error ni qué dice el compilador
  ok((await page.evaluate(() => window.__editorc.nivelAyuda())) === 1, 'ayuda: el nivel por defecto es 1 (apagada)');
  await runShow(SCANF_MAL);
  const it0 = items('.e').first();
  ok(/Error en una llamada/.test(await it0.textContent()) && !/l[ií]nea|&|scanf/i.test(await it0.textContent()), 'apagada: solo el tipo general, sin línea ni mensaje (' + (await it0.textContent()).trim() + ')');
  ok((await it0.locator('.help, .pistas, .hexp, .orig, .cd, button.mute').count()) === 0 && (await page.locator('.gut .e, #ul .e').count()) === 0, 'apagada: sin ayuda, sin pistas, sin código del error y sin marcas en el editor');
  ok(!(await page.evaluate(() => document.getElementById('out').textContent.match(/l[ií]nea|falta el &/i))), 'apagada: la consola tampoco dice la línea');
  await shot('1-apagada');
  // el buscador y la ayuda de elementos de C siguen funcionando
  await H.tab('ed');

  // ---- B) ayuda con línea, desde Ajustes y desde el enlace
  await openSettings();
  ok(!(await page.isChecked('#autoCierre')), 'ajustes: el cierre automático está apagado por defecto');
  ok((await page.locator('#ayudaSel button').count()) === 2 && /Apagada/.test(await page.textContent('#ayudaSel')) && /Línea/.test(await page.textContent('#ayudaSel')), 'ajustes: selector segmentado «Apagada / Línea» (solo dos niveles)');
  await page.click('#ayudaSel [data-v="2"]');
  await closeDlg();
  await runShow(SCANF_MAL);
  const it2 = items('.e').first();
  ok(/línea \d+/.test(await it2.textContent()) && !/&|scanf|falta/.test(await it2.textContent()), 'línea: el panel indica la línea y nada más (' + (await it2.textContent()).trim() + ')');
  ok((await it2.locator('.help, .pistas, .hexp, .orig, .cd').count()) === 0 && (await page.locator('.gut .e').count()) >= 1, 'línea: sin pistas ni explicación, y la línea queda marcada');
  await shot('2-linea');
  await page.reload(); await page.waitForSelector('#code');
  ok((await page.evaluate(() => window.__editorc.nivelAyuda())) === 2, 'el nivel elegido se recuerda en el dispositivo');
  await open('?ayuda=1');
  ok((await page.evaluate(() => window.__editorc.nivelAyuda())) === 1, '?ayuda=1 en el enlace fija la ayuda apagada');
  await page.goto(target.url); await page.waitForSelector('#code');
  ok((await page.evaluate(() => window.__editorc.nivelAyuda())) === 1, '?ayuda= además se recuerda para la próxima vez');
  await open('?ayuda=2');
  ok((await page.evaluate(() => window.__editorc.nivelAyuda())) === 2, '?ayuda=2 en el enlace fija la ayuda con línea');
  await open('?ayuda=0');
  ok((await page.evaluate(() => window.__editorc.nivelAyuda())) === 1, '?ayuda=0 (viejo) cae en apagada: no hay nivel 0');
  await openSettings(); await page.click('#ayudaSel [data-v="1"]'); await closeDlg();

  // ---- C) sin explicación: el caso se guarda solo en el dispositivo y se manda desde Ajustes (el panel no ofrece nada)
  await H.setCode(CON_CABECERA);
  await page.evaluate((r) => window.__editorc.showDiag(r), DESCONOCIDO);
  await H.tab('co');
  ok(!/zzz error inventado|Todavía no tengo/.test(await items('.e').first().textContent()), 'sin explicación: el panel no muestra el mensaje ni ofrece nada (ayuda apagada)');
  await shot('3-sin-respuesta');
  await openSettings();
  ok(/Casos para enviar \(1\)/.test(await page.textContent('#casosBtn')), 'sin explicación: el caso quedó guardado (contador en Ajustes)');
  await page.evaluate(() => { window.CONFIG.WHATSAPP_NUMERO = ''; });   // las pruebas de «sin número» parten de la configuración vacía
  await H.tap('#casosBtn');
  await page.waitForSelector('#dCasos[open]');
  const prev = await page.textContent('#cPrev');
  ok(prev.includes('zzz error inventado') && prev.includes('printf("%d\\n", A);') && /```c/.test(prev), 'casos: la vista previa muestra el mensaje y el código que se enviaría');
  ok(!/Pérez|Ana|5° 2da|Lenguajes Electrónicos/.test(prev), 'casos: sin nombre ni datos personales (se quitó la cabecera)');
  ok(/Nada se envía solo/.test(await page.textContent('#dCasos')) && /sin nombre ni datos personales/i.test(await page.textContent('#dCasos')), 'casos: aviso de privacidad visible');
  const href0 = await page.getAttribute('#cWa', 'href');
  ok(/^https:\/\/wa\.me\/\?text=/.test(href0) && decodeURIComponent(href0).includes('zzz error inventado'), 'WhatsApp sin número: abre wa.me sin destinatario con el texto armado');
  ok(/sin destinatario/.test(await page.textContent('#cNota')), 'WhatsApp sin número: lo dice');
  ok((await page.getAttribute('#cWa', 'target')) === '_blank' && /noopener/.test(await page.getAttribute('#cWa', 'rel')), 'WhatsApp: pestaña nueva con rel=noopener');
  await page.evaluate(() => { window.CONFIG.WHATSAPP_NUMERO = '5491112345678'; });
  await H.tap('#cList input[type=checkbox]'); await H.tap('#cList input[type=checkbox]');
  const href1 = await page.getAttribute('#cWa', 'href');
  ok(/^https:\/\/wa\.me\/5491112345678\?text=/.test(href1) && !/sin destinatario/.test(await page.textContent('#cNota')), 'WhatsApp con número configurado: enlace wa.me/<número>?text=…');
  await page.evaluate(() => { window.CONFIG.WHATSAPP_NUMERO = ''; });
  await shot('4-casos');
  // copiar: éxito y portapapeles bloqueado
  await page.evaluate(() => { window.__copiado = null; navigator.clipboard.writeText = (t) => { window.__copiado = t; return Promise.resolve(); }; });
  await H.tap('#cCopy');
  await page.waitForFunction(() => window.__copiado !== null);
  ok(/#DATOS/.test(await page.evaluate(() => window.__copiado)), 'Copiar: copia el texto completo');
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('bloqueado')); document.execCommand = () => false; });
  await H.tap('#cCopy');
  await page.waitForFunction(() => /no dejó copiar/.test(document.getElementById('cNota').textContent));
  ok(true, 'Copiar con el portapapeles bloqueado: estado claro y texto seleccionado para copiar a mano');
  // descargar
  const dl = page.waitForEvent('download');
  await H.tap('#cDl');
  const d = await dl;
  const dj = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
  ok(/^casos-editor-c-\d{8}\.json$/.test(d.suggestedFilename()) && dj.formato === 'casos-sin-respuesta-v1' && dj.casos.length === 1 && !/Pérez/.test(JSON.stringify(dj)), 'Descargar .json: archivo exportado sin datos personales (' + d.suggestedFilename() + ')');
  // borrar uno (con deshacer) y todos
  await H.tap('#cList button[aria-label="Borrar este caso"]');
  ok((await page.locator('#cList li').count()) === 0 && (await vis('#cVacio')), 'borrar un caso: queda el estado vacío');
  await H.tap('#toast button:has-text("Deshacer")');
  ok((await page.locator('#cList li').count()) === 1, 'Deshacer devuelve el caso');
  await H.tap('#cDelAll');
  ok((await page.locator('#cList li').count()) === 0 && !(await vis('#cWa')), 'Borrar todos');
  await closeDlg();
  // desde Ajustes
  await page.evaluate((r) => window.__editorc.showDiag(r), DESCONOCIDO);
  await openSettings();
  ok(/Casos para enviar \(1\)/.test(await page.textContent('#casosBtn')), 'Ajustes: «Casos para enviar» con el contador');
  await H.tap('#casosBtn'); await page.waitForSelector('#dCasos[open]');
  ok((await page.locator('#cList li').count()) === 1, 'Ajustes → Casos para enviar: la lista');
  await H.tap('#cDelAll'); await closeDlg();
  ok(extra.length === 0, 'casos: no se abrió ninguna pestaña sola');

  // ---- D) panel Ayuda
  await H.tap('#ayudaBtn'); await page.waitForSelector('#dAyuda[open]');
  ok((await page.evaluate(() => document.activeElement.id)) === 'aQ', 'Ayuda: el foco queda en la búsqueda');
  await page.keyboard.type('por qué 7/2 da 3');
  await page.waitForFunction(() => document.querySelectorAll('#aList button').length > 0);
  ok(/Lección/.test(await page.textContent('#aList')), 'Ayuda: «por qué 7/2 da 3» encuentra una lección');
  await shot('5-ayuda');
  if (!mobile) {
    await page.keyboard.press('ArrowDown');
    ok(await page.evaluate(() => !!document.activeElement.closest('#aList')), 'Ayuda: la flecha abajo pasa a los resultados');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp');
    ok((await page.evaluate(() => document.activeElement.id)) === 'aQ', 'Ayuda: la flecha arriba vuelve a la búsqueda');
  }
  await page.fill('#aQ', 'scanf');
  const tipos = await page.$$eval('#aList .tipo', (l) => Array.from(new Set(l.map((x) => x.textContent))));
  ok(tipos.length >= 2, 'Ayuda: resultados mezclados con su tipo (' + tipos.join(', ') + ')');
  await page.fill('#aQ', 'scanf sin &');
  await H.tap('#aList .tipo.error >> xpath=ancestor::button');
  ok((await page.locator('#aDet .tipo.error').count()) === 1 && (await page.locator('#aDet button:has-text("Abrir en el editor")').count()) >= 1 && (await page.locator('#aDet button:has-text("Pista")').count()) === 1, 'Ayuda: detalle de un error con ejemplo y pistas por demanda');
  ok(/Qué pasa|Cómo arreglarlo/i.test(await page.textContent('#aDet')), 'Ayuda: detalle de un error con explicación y cómo arreglarlo');
  await H.tap('#aDet button:has-text("Pista")');
  ok((await page.locator('#aDet .pistas li').count()) === 1, 'Ayuda: las pistas del detalle se piden de a una');
  const nprog = await H.progCount();
  await H.tap('#aDet button:has-text("Abrir en el editor") >> nth=-1');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  ok((await H.progCount()) === nprog + 1 && /scanf/.test(await page.inputValue('#code')), 'Ayuda: «Abrir en el editor» abre el ejemplo como programa nuevo');
  // lección con «Probar»
  await H.tap('#ayudaBtn'); await page.waitForSelector('#dAyuda[open]');
  await page.fill('#aQ', 'por qué 7/2 da 3');
  await H.tap('#aList .tipo.leccion >> xpath=ancestor::button >> nth=0');
  ok((await page.locator('#aDet button:has-text("Probar")').count()) === 1, 'Ayuda: la lección trae un ejemplo con «Probar»');
  // navegación a un relacionado y volver
  const rel = page.locator('#aDet .rel button');
  if (await rel.count()) { const t0 = await page.textContent('#aDet h2.dt'); await H.tap('#aDet .rel button >> nth=0'); ok((await page.textContent('#aDet h2.dt')) !== t0, 'Ayuda: navegar a un relacionado'); await H.tap('#aDet button:has-text("Volver")'); ok((await page.textContent('#aDet h2.dt')) === t0, 'Ayuda: «Volver» regresa al anterior'); }
  else ok(true, 'Ayuda: (esta lección no trae relacionados)');
  await H.tap('#aDet button:has-text("Probar")');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  ok((await H.progCount()) === nprog + 2 && (await page.inputValue('#code')).length > 20, 'Ayuda: «Probar» carga el ejemplo en un programa nuevo');
  await H.tap('#ayudaBtn'); await page.waitForSelector('#dAyuda[open]');
  await page.keyboard.press('Escape');
  ok(!(await page.evaluate(() => document.getElementById('dAyuda').open)), 'Ayuda: Esc cierra el panel');

  // ---- E) «¿Qué es esto?» sobre el código
  await H.tab('ed');
  await H.setCode(SCANF_MAL.replace('int A;', 'int A;\n    float PROM;'));
  await page.evaluate(() => { const t = document.getElementById('code'); t.focus(); t.setSelectionRange(7, 7); });
  const code0 = await page.inputValue('#code'), sel0 = await page.evaluate(() => document.getElementById('code').selectionStart);
  await H.tap('#whatBtn');
  ok((await page.getAttribute('#whatBtn', 'aria-pressed')) === 'true' && (await vis('#whatLay')), '¿Qué es esto?: el modo se activa con el botón');
  await tapAt(await pointOf('%d', 1));
  await page.waitForSelector('#bubble:not([hidden])');
  ok(/%d/.test(await page.textContent('#bubble')) && /formato|int/i.test(await page.textContent('#bubble')), '¿Qué es esto?: tocar un %d abre la burbuja con su ayuda');
  await shot('6-burbuja');
  ok((await page.inputValue('#code')) === code0 && (await page.evaluate(() => document.getElementById('code').selectionStart)) === sel0, '¿Qué es esto?: no cambia el código ni mueve el cursor');
  await H.tap('#bubble button[aria-label^="Cerrar"]');
  if (mobile) ok((await page.getAttribute('#whatBtn', 'aria-pressed')) === 'false' && !(await vis('#whatLay')), 'celular: el modo se desactiva al cerrar la burbuja');
  else { ok(await vis('#whatLay'), 'escritorio: el modo sigue activo hasta apagarlo'); await H.tap('#whatBtn'); }
  if ((await page.getAttribute('#whatBtn', 'aria-pressed')) !== 'true') await H.tap('#whatBtn');
  await tapAt(await pointOf('printf', 2));
  await page.waitForSelector('#bubble:not([hidden])');
  ok(/printf/.test(await page.textContent('#bubble')), '¿Qué es esto?: tocar una palabra (printf)');
  await page.keyboard.press('Escape');
  ok(!(await vis('#bubble')), '¿Qué es esto?: Esc cierra la burbuja');
  if ((await page.getAttribute('#whatBtn', 'aria-pressed')) === 'true') { if (mobile) await H.tap('#whatBtn'); else await page.keyboard.press('Escape'); }
  ok((await page.getAttribute('#whatBtn', 'aria-pressed')) === 'false', '¿Qué es esto?: se apaga');
  // fuera del modo, tocar edita normalmente y no abre nada
  const v0 = await page.inputValue('#code');
  await tapAt(await pointOf('return', 0));
  await page.keyboard.type('Z');
  const v1 = await page.inputValue('#code');
  ok(!(await vis('#bubble')) && v1.length === v0.length + 1 && v1.replace('Z', '') === v0, '¿Qué es esto?: fuera del modo se puede editar con normalidad');
  if (!mobile) {
    await page.keyboard.press('Control+Z');
    const p2 = await pointOf('scanf', 1);
    await page.keyboard.down('Alt'); await page.mouse.click(p2.x, p2.y); await page.keyboard.up('Alt');
    await page.waitForSelector('#bubble:not([hidden])');
    ok(/scanf/.test(await page.textContent('#bubble')), 'escritorio: Alt+clic abre la burbuja sin activar el modo');
    await page.keyboard.press('Escape');
  }

  // ---- F) cierre automático: apagado por defecto, con interruptor
  if (!mobile) {
    await H.setCode(''); await page.click('#code');
    await page.keyboard.type('if (x');
    ok((await page.inputValue('#code')) === 'if (x', 'cierre automático apagado: tipear "(" no agrega ")"');
    await page.keyboard.type(') {'); await page.keyboard.press('Enter');
    ok((await page.inputValue('#code')) === 'if (x) {\n    ', 'cierre automático apagado: la sangría automática sigue funcionando');
    await page.keyboard.type('puts("hola');
    ok(!(await page.inputValue('#code')).includes('")') && !(await page.inputValue('#code')).includes('"hola")'), 'cierre automático apagado: tampoco cierra comillas');
    await openSettings(); await page.check('#autoCierre'); await closeDlg();
    await H.setCode(''); await page.click('#code');
    await page.keyboard.type('if (x');
    ok((await page.inputValue('#code')) === 'if (x)', 'cierre automático encendido desde Ajustes: cierra paréntesis');
    await page.reload(); await page.waitForSelector('#code');
    await H.setCode(''); await page.click('#code'); await page.keyboard.type('(');
    ok((await page.inputValue('#code')) === '()', 'el interruptor se recuerda al recargar');
    await openSettings(); await page.uncheck('#autoCierre'); await closeDlg();
  }
  ok(!/sugerencia|autocompletar/i.test(await page.evaluate(() => document.body.innerText)), 'no hay autocompletado ni sugerencias en el editor');

  ok(errors.length === 0, 'entrenador: consola limpia' + (errors.length ? ': ' + errors.join(' | ') : ''));
  ok(net.length === 0, 'entrenador: cero pedidos de red externos' + (net.length ? ': ' + net.join(' ') : ''));
  await ctx.close();
}

// proceso (tipeado vs pegado) y modo práctica: teclado y portapapeles reales, solo escritorio
async function procesoSuite(browser, target) {
  console.log('\n== proceso y modo práctica · ' + target.label);
  const ctx = await newCtx(browser, false), page = await ctx.newPage();
  const errors = [], net = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => { errors.push('pageerror: ' + e.message); if (process.env.DBG) console.log('PAGEERROR', e.message); });
  ctx.on('request', (r) => { const u = r.url(); if (/^(file|data|blob|about):/.test(u)) return; if (target.origin && u.startsWith(target.origin)) return; net.push(u); });
  const H = helpers(page, false);
  // copia texto con teclado real: textarea temporal, Ctrl+A, Ctrl+C
  const copiar = async (texto) => {
    await page.evaluate((t) => { const x = document.createElement('textarea'); x.id = 'tmpclip'; x.value = t; document.body.appendChild(x); x.focus(); x.select(); }, texto);
    await page.keyboard.press('Control+C');
    await page.evaluate(() => document.getElementById('tmpclip').remove());
  };
  await page.goto(target.url); await page.waitForSelector('#code');
  await page.click('#code'); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace');
  await page.evaluate(() => window.__editorc.setCode(''));
  await page.click('#code');
  const tipeado = '#include <stdio.h>\nint main() {\nprintf("hola");\nreturn 0;\n}';
  await page.keyboard.type(tipeado);
  let r = await page.evaluate(() => window.__editorc.proceso());
  ok(r.tipeado >= 70 && r.pegado === 0, 'proceso: lo tipeado cuenta como tipeado (' + r.tipeado + ' % tipeado, ' + r.pegado + ' % pegado, ' + r.automatico + ' % automático)');
  const pegar = '\nint FUNCION_PEGADA(int X) {\n    return X * 2 + 1;\n}\n';
  await copiar(pegar);
  await page.click('#code'); await page.keyboard.press('Control+End'); await page.keyboard.press('Control+V');
  ok((await page.inputValue('#code')).includes('FUNCION_PEGADA'), 'se pudo pegar con el teclado real (Ctrl+V)');
  r = await page.evaluate(() => window.__editorc.proceso());
  const esperado = Math.round(pegar.length * 100 / (tipeado.length + pegar.length));
  ok(r.pegado >= esperado - 8 && r.pegado <= esperado + 8 && r.tipeado >= 40 && r.pegados >= 1, 'proceso: lo pegado cuenta como pegado (' + r.tipeado + ' % tipeado, ' + r.pegado + ' % pegado; esperado ~' + esperado + ' %)');
  const linea = await page.evaluate(() => window.__editorc.procLinea());
  ok(/% tipeado/.test(linea) && /% pegado/.test(linea) && /ejecuci/.test(linea) && !/\bIA\b/.test(linea), 'proceso: la línea de la captura (' + linea + ')');
  // ejecutar cuenta ejecuciones y todo se guarda con el programa
  await page.evaluate(() => window.__editorc.setCode('')); await page.click('#code'); await page.keyboard.type('int A;');
  await page.keyboard.press('F5'); await page.waitForTimeout(700);
  const antes = await page.evaluate(() => window.__editorc.proceso());
  ok(antes.ejecuciones >= 1, 'proceso: cuenta las ejecuciones (' + antes.ejecuciones + ')');
  await page.waitForTimeout(500);
  await page.reload(); await page.waitForSelector('#code');
  const desp = await page.evaluate(() => window.__editorc.proceso());
  ok(desp.caracteres.t === antes.caracteres.t && desp.ejecuciones === antes.ejecuciones, 'proceso: se guarda y se restaura con el programa (' + desp.caracteres.t + ' caracteres tipeados)');
  // captura: línea opcional
  await page.keyboard.press('Control+End');
  await H.tap('#shot');
  await page.waitForFunction(() => { const i = document.getElementById('shotImg'); return i.complete && i.naturalWidth > 0; });
  ok(!(await page.$('#shotProc')) && !(await page.$('#shotProcRow')), 'captura: ya no hay opción de línea de proceso');
  await page.screenshot({ path: path.join(STEP, 'd-proceso-captura-' + target.label.replace(/\W+/g, '') + '.png') });
  await page.keyboard.press('Escape');
  // transparencia: el texto de Ajustes, sin la palabra IA en ningún lado
  await H.menu(); await H.tap('#settings'); await page.waitForSelector('#dSet[open]');
  ok(!/tipeaste|Cómo se escribió/.test(await page.textContent('#dSet')), 'Ajustes ya no muestra nada del tipeado');
  await page.keyboard.press('Escape');
  const visible = await page.evaluate(() => Array.from(document.body.children).filter((e) => e.tagName !== 'SCRIPT').map((e) => e.textContent).join(' '));
  ok(!/\bIA\b|inteligencia artificial/i.test(visible), 'la palabra «IA» no aparece en la interfaz');
  // modo práctica
  const pg2 = await ctx.newPage();
  const e2 = []; pg2.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') e2.push(m.text()); }); pg2.on('pageerror', (e) => e2.push(e.message));
  await pg2.goto(target.url + '?practica=1'); await pg2.waitForSelector('#code');
  ok(await pg2.isVisible('#practica') && /Modo práctica/.test(await pg2.textContent('#practica')), 'modo práctica: cartel visible mientras esté activo');
  await pg2.evaluate(() => window.__editorc.setCode('')); await pg2.click('#code');
  await pg2.evaluate((t) => { const x = document.createElement('textarea'); x.id = 'tmpclip'; x.value = t; document.body.appendChild(x); x.focus(); x.select(); }, 'PEGADO_PROHIBIDO();');
  await pg2.keyboard.press('Control+C'); await pg2.evaluate(() => document.getElementById('tmpclip').remove());
  await pg2.click('#code'); await pg2.keyboard.press('Control+V');
  ok((await pg2.inputValue('#code')) === '', 'modo práctica: pegar con Ctrl+V no escribe nada');
  ok(/no se puede pegar/i.test(await pg2.textContent('#toast')), 'modo práctica: avisa por qué no pegó');
  await pg2.keyboard.type('int A;');
  ok((await pg2.inputValue('#code')) === 'int A;', 'modo práctica: tipear sigue funcionando');
  await pg2.evaluate(() => { const t = document.getElementById('code'); const dt = new DataTransfer(); dt.setData('text/plain', 'SOLTADO();'); t.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); });
  ok(!(await pg2.inputValue('#code')).includes('SOLTADO'), 'modo práctica: soltar texto tampoco');
  await pg2.screenshot({ path: path.join(STEP, 'd-practica-' + target.label.replace(/\W+/g, '') + '.png') });
  const pg3 = await ctx.newPage(); await pg3.goto(target.url); await pg3.waitForSelector('#code');
  ok(!(await pg3.isVisible('#practica')), 'sin ?practica=1 no hay cartel ni bloqueo');
  ok(errors.length === 0 && e2.length === 0, 'proceso: consola limpia' + (errors.concat(e2).length ? ': ' + errors.concat(e2).join(' | ') : ''));
  ok(net.length === 0, 'proceso: cero pedidos de red externos' + (net.length ? ': ' + net.join(' ') : ''));
  await ctx.close();
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
  for (const [n, t] of [['index file', T.idx], ['index http', T.idxHttp], ['dist file', T.one], ['dist http', T.oneHttp]]) await guard('entrenador ' + n, () => entrenadorSuite(browser, t, false));
  for (const [n, t] of [['index file', T.idx], ['index http', T.idxHttp], ['dist file', T.one]]) await guard('entrenador ' + n + ' celular', () => entrenadorSuite(browser, t, true));
  await guard('proceso index', () => procesoSuite(browser, T.idx));
  await guard('proceso dist', () => procesoSuite(browser, T.one));
  await guard('identidad index', () => identidadSuite(browser, T.idxHttp));
  await guard('identidad dist', () => identidadSuite(browser, T.one));
  await guard('divisor', () => dividerSuite(browser, T.idx));
  await guard('divisor dist', () => dividerSuite(browser, T.one));
  await guard('diseño index', () => disenoSuite(browser, T.idx, false));
  await guard('diseño dist', () => disenoSuite(browser, T.one, false));
  await guard('diseño index celular', () => disenoSuite(browser, T.idx, true));
  await guard('diseño dist celular', () => disenoSuite(browser, T.one, true));
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

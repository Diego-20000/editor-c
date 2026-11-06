// Prueba de humo de la interfaz con Chromium headless (Playwright).
// Uso: node tools/ui-smoke.js [carpeta-de-capturas]
// Abre index.html y dist/editor-c.html desde file:// y recorre los flujos principales.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const SHOTS = path.resolve(process.argv[2] || path.join(ROOT, 'tools', 'capturas'));
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const SCANF = '#include <stdio.h>\nint main() {\n    int A, B;\n    printf("A: ");\n    scanf("%d", &A);\n    printf("B: ");\n    scanf("%d", &B);\n    printf("Suma = %d\\n", A + B);\n    return 0;\n}\n';
const ERR = '#include <stdio.h>\nint main() {\n    int A\n    A = 5;\n    printf("%d\\n", A);\n    return 0;\n}\n';
const WARN = '#include <stdio.h>\nint main() {\n    int A;\n    float P;\n    scanf("%d", A);\n    P = 2.5;\n    printf("%d\\n", P);\n    return 0;\n}\n';
const LOOP = '#include <stdio.h>\nint main() {\n    int I;\n    I = 0;\n    while (1) { I++; }\n    return 0;\n}\n';

async function suite(browser, url, label, mobile) {
  console.log('\n== ' + label + (mobile ? ' (celular)' : ' (escritorio)'));
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, acceptDownloads: true }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], net = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u)) net.push(u); });
  await page.goto(url);
  const tag = (mobile ? 'm' : 'd') + '-' + label.replace(/\W+/g, '');
  const setCode = async (s) => { await page.evaluate((c) => window.__editorc.setCode(c), s); };
  const outText = () => page.evaluate(() => document.getElementById('out').textContent);
  const clickRun = async () => { await (mobile ? page.tap('#run') : page.click('#run')); };

  // 1) scanf
  await setCode(SCANF); await clickRun();
  await page.waitForSelector('.stdin input'); await page.keyboard.type('7'); await page.keyboard.press('Enter');
  await page.waitForSelector('.stdin input'); await page.keyboard.type('5'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => /código de salida/.test(document.getElementById('out').textContent));
  let t = await outText();
  ok(/Suma = 12/.test(t), 'scanf/printf: Suma = 12');
  ok(/código de salida 0/.test(t), 'muestra código de salida');
  ok((await page.textContent('#status')).includes('Terminó'), 'estado Terminó');
  await page.screenshot({ path: path.join(SHOTS, tag + '-1-scanf.png') });

  // 2) error de compilación
  await setCode(ERR); await clickRun();
  await page.waitForSelector('#diag:not([hidden])');
  ok(await page.isVisible('#diagList .it.e'), 'panel de problemas con error');
  ok((await page.locator('.gut .e').count()) >= 1, 'marca en el margen');
  ok((await page.locator('#ul .e').count()) >= 1, 'subrayado en la línea');
  await page.screenshot({ path: path.join(SHOTS, tag + '-2-error.png') });
  await page.click('#diagList .it.e button');
  ok(true, 'clic en el problema (saltar a la línea) sin fallar');

  // 3) aviso
  await setCode(WARN); await clickRun();
  await page.waitForSelector('#diag:not([hidden])');
  ok((await page.locator('#diagList .it.w').count()) >= 1, 'avisos listados');
  ok((await page.locator('.gut .w').count()) >= 1, 'marca de aviso en el margen');
  await page.screenshot({ path: path.join(SHOTS, tag + '-3-aviso.png') });

  // 4) bucle infinito + Detener
  await setCode(LOOP); await clickRun();
  await page.waitForFunction(() => !document.getElementById('stop').disabled);
  await page.waitForTimeout(400);
  await (mobile ? page.tap('#stop') : page.click('#stop'));
  await page.waitForFunction(() => /Detenido/.test(document.getElementById('out').textContent), null, { timeout: 5000 });
  ok(await page.isEnabled('#run'), 'Detener corta el bucle infinito y se puede volver a ejecutar');

  // 5) entrada precargada
  await setCode(SCANF);
  await page.click('#inBtn'); await page.fill('#inTxt', '20\n22');
  await clickRun();
  await page.waitForFunction(() => /código de salida/.test(document.getElementById('out').textContent));
  t = await outText();
  ok(/A: 20\nB: 22\nSuma = 42/.test(t), 'entrada precargada se consume sola');
  await page.screenshot({ path: path.join(SHOTS, tag + '-4-entrada.png') });
  await page.click('#copy');
  await page.click('#clear'); ok((await outText()) === '', 'Limpiar vacía la consola');

  // 6) buscar y reemplazar
  await setCode('int A;\nA = 1;\nA = A + 1;\n');
  await page.click('#findBtn'); await page.fill('#fq', 'A'); await page.fill('#fr', 'X');
  ok((await page.textContent('#fcount')).includes('de 5') || /de \d+/.test(await page.textContent('#fcount')), 'cuenta coincidencias');
  await page.click('#frepall');
  ok((await page.inputValue('#code')) === 'int X;\nX = 1;\nX = X + 1;\n', 'reemplazar todos');
  await page.keyboard.press('Escape');

  // 7) cierre automático, comentar, sangría (solo escritorio: teclado físico)
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

  // 8) varios programas y recuperación al recargar
  await setCode('// PROGRAMA UNO\nint main() { return 0; }\n');
  await page.waitForTimeout(500);
  await page.click('#pname'); await page.click('#pnew');
  await setCode('// PROGRAMA DOS\n');
  await page.waitForTimeout(500);
  await page.click('#pname');
  ok((await page.locator('#plist li').count()) >= 2, 'lista de programas');
  await page.screenshot({ path: path.join(SHOTS, tag + '-5-programas.png') });
  await page.keyboard.press('Escape');
  await page.reload();
  ok((await page.inputValue('#code')).startsWith('// PROGRAMA DOS'), 'recupera el programa tras recargar');

  // 9) captura PNG
  await setCode(SCANF); await clickRun();
  await page.waitForSelector('.stdin input'); await page.keyboard.type('3'); await page.keyboard.press('Enter');
  await page.waitForSelector('.stdin input'); await page.keyboard.type('4'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => /código de salida/.test(document.getElementById('out').textContent));
  if (mobile) await page.tap('#more > summary');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#shot')]);
  const png = path.join(SHOTS, tag + '-captura.png'); await dl.saveAs(png);
  ok(fs.statSync(png).size > 3000 && dl.suggestedFilename().endsWith('.png'), 'exporta PNG (' + dl.suggestedFilename() + ')');

  // 10) ajustes y tema
  await page.reload();
  if (mobile) await page.tap('#more > summary');
  await page.click('#settings');
  await page.fill('#uName', 'Pérez, Ana'); await page.fill('#uCurso', '5° 2da'); await page.fill('#uMat', 'Lenguajes Electrónicos V'); await page.fill('#uCiclo', '2026');
  await page.selectOption('#theme', 'light');
  await page.screenshot({ path: path.join(SHOTS, tag + '-6-ajustes.png') });
  await page.click('#dSet [data-close]');
  ok((await page.getAttribute('html', 'data-theme')) === 'light', 'tema claro');
  await page.screenshot({ path: path.join(SHOTS, tag + '-7-claro.png') });
  await page.selectOption('#theme', 'auto').catch(() => {});

  ok(errors.length === 0, 'sin errores ni avisos en consola' + (errors.length ? ': ' + errors.join(' | ') : ''));
  ok(net.length === 0, 'cero tráfico de red' + (net.length ? ': ' + net.join(' ') : ''));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const idx = 'file://' + path.join(ROOT, 'index.html'), one = 'file://' + path.join(ROOT, 'dist', 'editor-c.html');
  await suite(browser, idx, 'index', false);
  await suite(browser, one, 'dist', false);
  await suite(browser, idx, 'index', true);
  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})();

// App de escritorio: el editor servido por app/servidor.js con el gcc de esta máquina (interruptor «gcc real» en Ajustes).
const { chromium } = require('playwright'); const path = require('path'); const { execFileSync } = require('child_process');
const { crearServidor } = require('../app/servidor');
let ok = 0, bad = 0; const check = (c, m) => { if (c) { ok++; console.log('  ok   ' + m); } else { bad++; console.log('  FALLA ' + m); } };
(async () => {
  const raiz = path.join(__dirname, '..'); const gcc = execFileSync('which', ['gcc']).toString().trim();
  const S = await crearServidor(() => raiz, 18437, { gcc, marcar: true, actualizar: async () => ({ version: '0123456789ab', cambio: false }) });
  const br = await chromium.launch(); const cx = await br.newContext({ viewport: { width: 1280, height: 800 } }); const pg = await cx.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('http://127.0.0.1:' + S.port + '/?ayuda=2'); await pg.waitForSelector('#code');
  await pg.click('#settings'); await pg.waitForSelector('#dSet[open]');
  await pg.waitForSelector('#gccSet:not([hidden])', { timeout: 5000 });
  check(await pg.isHidden('#gccBtn'), 'app: el botón «gcc real» está apagado por defecto');
  check(/directamente en esta computadora/.test(await pg.textContent('#gccSet')), 'app: Ajustes avisa que el programa corre en la computadora');
  await pg.evaluate(() => { document.getElementById('gccRealChk').click(); });
  await pg.keyboard.press('Escape');
  check(await pg.isVisible('#gccBtn'), 'app: al activar el interruptor aparece el botón «gcc real»');
  await pg.fill('#code', '#include <stdio.h>\nint main() {\n    int A;\n    scanf("%d", &A);\n    printf("doble: %d\\n", A * 2);\n}\n');
  await pg.click('#inBtn'); await pg.fill('#inTxt', '21'); await pg.click('#gccBtn');
  await pg.waitForFunction(() => /código de salida/.test(document.getElementById('out').textContent), null, { timeout: 15000 });
  const t = await pg.textContent('#out'); check(/gcc real/.test(t) && /doble: 42/.test(t), 'app: «gcc real» compila y ejecuta con la entrada');
  await pg.click('#settings'); await pg.waitForSelector('#dSet[open]');
  check(await pg.isHidden('#instBtn') && await pg.isHidden('#instMsg'), 'app: dentro de la app no aparece «Instalar la app»');
  await pg.click('#updBtn'); await pg.waitForFunction(() => /última versión|Actualizado|No se pudo/.test(document.getElementById('updMsg').textContent), null, { timeout: 8000 });
  check(/No se pudo comprobar|última versión|Actualizado/.test(await pg.textContent('#updMsg')) && !/Buscando/.test(await pg.textContent('#updMsg')), 'app: «Buscar actualización» responde usando el programa (no la copia local)');
  await pg.keyboard.press('Escape');
  await pg.reload(); await pg.waitForSelector('#code'); await pg.waitForSelector('#gccBtn:not([hidden])', { timeout: 5000 });
  check(true, 'app: el interruptor se recuerda al volver a abrir');
  check(errs.length === 0, 'app: consola limpia' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await br.close();
  // sitio normal: sin marca, sin botón
  const br2 = await chromium.launch(); const pg2 = await (await br2.newContext()).newPage(); const pedidos = []; pg2.on('request', (r) => { if (/^https?:/.test(r.url())) pedidos.push(r.url()); });
  await pg2.goto('file://' + path.join(raiz, 'index.html')); await pg2.waitForSelector('#code'); await pg2.waitForTimeout(400);
  check(await pg2.isHidden('#gccBtn') && await pg2.isHidden('#gccSet') && pedidos.length === 0, 'sitio normal: no aparece nada de gcc y no hay pedidos de red');
  await br2.close(); await S.close();
  console.log(ok + ' ok, ' + bad + ' fallas'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('ERROR', e.message); process.exit(1); });

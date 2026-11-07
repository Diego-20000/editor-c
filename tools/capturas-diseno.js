// Capturas para revisar el diseño. Uso: node tools/capturas-diseno.js <prefijo> [carpeta]
//   ej.: node tools/capturas-diseno.js antes docs/capturas   -> docs/capturas/antes-escritorio-claro.png, ...
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const PRE = process.argv[2] || 'despues';
const DIR = path.resolve(process.argv[3] || path.join(ROOT, 'docs', 'capturas'));
fs.mkdirSync(DIR, { recursive: true });
const url = 'file://' + path.join(ROOT, 'index.html');
const PROG = '#include <stdio.h>\n\n/* Promedio de dos notas */\nint main() {\n    float A, B, PROM;\n    printf("Nota 1: ");\n    scanf("%f", &A);\n    printf("Nota 2: ");\n    scanf("%f", &B);\n    PROM = (A + B) / 2;\n    if (PROM >= 7) {\n        printf("Aprobado\\n");\n    } else {\n        printf("Desaprobado\\n");\n    }\n    printf("Promedio = %5.2f\\n", PROM);\n    return 0;\n}\n';
const ERR = '#include <stdio.h>\nint main() {\n    int A\n    A = 5;\n    printf("%d\\n", A);\n    return 0;\n}\n';
const WARN = '#include <stdio.h>\nint main() {\n    int A;\n    float P;\n    scanf("%d", A);\n    P = 2.5;\n    printf("%d\\n", P);\n    return 0;\n}\n';
async function ctx(br, mobile, tema) {
  const c = await br.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: tema } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme: tema, acceptDownloads: true });
  await c.addInitScript((t) => { try { localStorage.setItem('editorc.theme', t); localStorage.setItem('editorc.user', JSON.stringify({ name: 'Pérez, Juan', curso: '5° 2da', mat: 'Lenguajes Electrónicos V', ciclo: '2026' })); } catch (e) {} }, tema);
  const p = await c.newPage(); await p.goto(url); await p.waitForSelector('#code');
  return { c, p };
}
(async () => {
  const br = await chromium.launch();
  const S = (p, n) => p.screenshot({ path: path.join(DIR, PRE + '-' + n + '.png') });
  for (const tema of ['light', 'dark']) {
    const T = tema === 'light' ? 'claro' : 'oscuro';
    for (const mobile of [false, true]) {
      const M = mobile ? 'celular' : 'escritorio';
      const { c, p } = await ctx(br, mobile, tema);
      await p.evaluate((s) => window.__editorc.setCode(s), PROG);
      await p.waitForTimeout(200);
      await S(p, M + '-' + T + '-editor');
      await p.evaluate(() => { const t = document.getElementById('code'); t.focus(); const i = t.value.indexOf('if (PROM') ; const k = t.value.indexOf('{', i) + 1; t.setSelectionRange(k, k); document.dispatchEvent(new Event('selectionchange')); });
      await p.waitForTimeout(150);
      await S(p, M + '-' + T + '-pareja-llaves');
      if (tema === 'light') { await p.click('#readBtn'); await p.waitForTimeout(200); await S(p, M + '-' + T + '-lectura'); await p.click('#readBtn'); }
      // ejecutar con datos de entrada precargados
      await p.evaluate(() => { document.getElementById('inTxt').value = '6\n9'; document.getElementById('inTxt').dispatchEvent(new Event('input')); });
      if (mobile) await p.tap('#run'); else await p.click('#run');
      await p.waitForTimeout(1500);
      if (mobile) await p.tap('#tabCo');
      await S(p, M + '-' + T + '-consola');
      // problemas con pistas
      if (mobile) await p.tap('#tabEd');
      await p.evaluate((s) => window.__editorc.setCode(s), ERR);
      if (mobile) await p.tap('#run'); else await p.click('#run');
      await p.waitForTimeout(800);
      if (mobile) await p.tap('#tabCo');
      const b = await p.$('.help .hact button:has-text("ista")'); if (b) { await b.click(); await p.waitForTimeout(200); }
      await S(p, M + '-' + T + '-problemas');
      if (!mobile || tema === 'light') {
        // ayuda
        await p.evaluate(() => { const d = document.getElementById('dAyuda'); if (!d.open) document.getElementById('ayudaBtn').click(); });
        await p.fill('#aQ', 'scanf'); await p.waitForTimeout(400);
        await S(p, M + '-' + T + '-ayuda');
        await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
        // ajustes
        await p.evaluate(() => { document.getElementById('more').open = true; document.getElementById('settings').click(); }); await p.waitForTimeout(200);
        await S(p, M + '-' + T + '-ajustes');
        await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
        // programas
        await p.evaluate(() => { document.getElementById('more').open = true; document.getElementById('progs').click(); }); await p.waitForTimeout(200);
        await S(p, M + '-' + T + '-programas');
        await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
        await p.evaluate(() => { const t = document.getElementById('inTxt'); t.value = ''; t.dispatchEvent(new Event('input')); });
        // captura de entrega
        await p.evaluate((s) => window.__editorc.setCode(s), PROG);
        if (mobile) await p.tap('#run'); else await p.click('#run');
        await p.waitForSelector('.stdin input'); await p.keyboard.type('6'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.type('9'); await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
        await p.evaluate(() => { document.getElementById('more').open = true; document.getElementById('shot').click(); });
        await p.waitForFunction(() => document.getElementById('shotImg').getAttribute('src'));
        await p.waitForTimeout(400);
        await S(p, M + '-' + T + '-vista-captura');
        if (!mobile && tema === 'light') {
          const b64 = await p.evaluate(async () => { const r = await fetch(document.getElementById('shotImg').src); const bl = await r.blob(); return await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1]); f.readAsDataURL(bl); }); });
          fs.writeFileSync(path.join(DIR, PRE + '-imagen-entrega.png'), Buffer.from(b64, 'base64'));
        }
      }
      await c.close();
    }
  }
  await br.close();
})().catch((e) => { console.error(e); process.exit(1); });

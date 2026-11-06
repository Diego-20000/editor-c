// Pruebas de los reparos de la revisión final:
// tipear un programa completo, «Deshacer» con un toque y la barra de buscar en celular.
// uso: node tools/ui-reparos.js   (necesita playwright; termina con código distinto de cero si algo falla)
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.join(__dirname, '..', 'index.html');
let ok = 0, fallas = 0;
const check = (c, m) => { if (c) { ok++; console.log('  ok   ' + m); } else { fallas++; console.log('  FALLA ' + m); } };

(async () => {
  const br = await chromium.launch();

  // 1) tipear un programa completo con teclado real
  {
    const pg = await (await br.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await pg.goto(url); await pg.waitForSelector('#code');
    await pg.click('#code'); await pg.keyboard.press('Control+A'); await pg.keyboard.press('Backspace');
    await pg.keyboard.type('#include <stdio.h>'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('int main() {'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('printf("hola\\n");'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('return 0;'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('}');
    const v = await pg.$eval('#code', (t) => t.value);
    check((v.match(/\}/g) || []).length === 1 && (v.match(/\{/g) || []).length === 1, 'tipear un programa completo deja una sola llave de cierre');
    await pg.keyboard.press('F5'); await pg.waitForTimeout(1200);
    const out = await pg.$eval('#out', (o) => o.textContent);
    check(/hola/.test(out), 'el programa tipeado compila y ejecuta');
    // una llave de más en un programa con una llave sin cerrar sigue permitida
    await pg.click('#code'); await pg.keyboard.press('Control+A'); await pg.keyboard.press('Backspace');
    await pg.keyboard.type('int main() {'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('if (1) {'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('}'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('}');
    const v2 = await pg.$eval('#code', (t) => t.value);
    check((v2.match(/\}/g) || []).length === 2 && (v2.match(/\{/g) || []).length === 2, 'dos bloques anidados tipeados dejan dos llaves de cierre');
    await pg.close();
  }

  // 2) «Deshacer» tras borrar un programa: un solo toque
  {
    const pg = await (await br.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await pg.goto(url); await pg.waitForSelector('#code');
    await pg.click('#progs');
    await pg.waitForSelector('#dProgs[open]');
    // crear otro programa si hace falta (menú de la lista)
    let n0 = await pg.$$eval('#plist li', (l) => l.length);
    if (n0 < 2) {
      const nuevo = await pg.$('#dProgs button:has-text("Nuevo")');
      if (nuevo) { await nuevo.click(); await pg.waitForTimeout(200); if (!(await pg.$('#dProgs[open]'))) { await pg.click('#progs'); await pg.waitForSelector('#dProgs[open]'); } }
      n0 = await pg.$$eval('#plist li', (l) => l.length);
    }
    await pg.click('#plist li:last-child button[aria-label^="Borrar"]');
    const n1 = await pg.$$eval('#plist li', (l) => l.length);
    await pg.click('#toast button');
    await pg.waitForTimeout(250);
    const abierto = await pg.$('#dProgs[open]');
    const n2 = await pg.$$eval('#plist li', (l) => l.length);
    check(n1 === n0 - 1, 'borrar quita un programa de la lista (' + n0 + ' → ' + n1 + ')');
    check(!!abierto && n2 === n0, '«Deshacer» restaura el programa con un solo toque (' + n1 + ' → ' + n2 + ')');
    await pg.close();
  }

  // 3) barra de buscar y reemplazar en celular
  for (const w of [390, 360, 320]) {
    const pg = await (await br.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true })).newPage();
    await pg.goto(url); await pg.waitForSelector('#code');
    await pg.evaluate(() => { document.getElementById('find').hidden = false; });
    const r = await pg.evaluate(() => {
      const f = document.getElementById('find'); let max = 0;
      f.querySelectorAll('button,input').forEach((e) => { const x = e.getBoundingClientRect(); if (x.width && x.right > max) max = x.right; });
      return { ancho: innerWidth, max, scroll: document.documentElement.scrollWidth };
    });
    check(r.max <= r.ancho + 1 && r.scroll <= r.ancho + 1, 'la barra de buscar entra en ' + w + ' px (borde derecho en ' + Math.round(r.max) + ')');
    await pg.close();
  }

  await br.close();
  console.log(ok + ' ok, ' + fallas + ' fallas');
  process.exit(fallas ? 1 : 0);
})();

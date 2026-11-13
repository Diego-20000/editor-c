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

  // 1) tipear un programa completo con teclado real, con el cierre automático apagado (por defecto) y encendido
  for (const cierre of [false, true]) {
    const cx = await br.newContext({ viewport: { width: 1280, height: 800 } });
    if (cierre) await cx.addInitScript(() => { try { localStorage.setItem('editorc.autocierre', '1'); } catch (e) { /* nada */ } });
    const pg = await cx.newPage();
    await pg.goto(url); await pg.waitForSelector('#code');
    await pg.click('#code'); await pg.keyboard.press('Control+A'); await pg.keyboard.press('Backspace');
    await pg.keyboard.type('#include <stdio.h>'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('int main() {'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('printf("hola\\n");'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('return 0;'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('}');
    const v = await pg.$eval('#code', (t) => t.value);
    check((v.match(/\}/g) || []).length === 1 && (v.match(/\{/g) || []).length === 1, 'tipear un programa completo deja una sola llave de cierre (cierre automático ' + (cierre ? 'encendido' : 'apagado') + ')');
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
    check((v2.match(/\}/g) || []).length === 2 && (v2.match(/\{/g) || []).length === 2, 'dos bloques anidados tipeados dejan dos llaves de cierre (cierre automático ' + (cierre ? 'encendido' : 'apagado') + ')');
    await cx.close();
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

  // 4) barra de símbolos: solo en pantallas táctiles, un toque escribe un solo símbolo (y cuenta como tipeado) y el código conserva el foco
  {
    const pc = await (await br.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await pc.goto(url); await pc.waitForSelector('#code'); await pc.focus('#code');
    check(!(await pc.isVisible('#symbar')), 'barra de símbolos: no aparece en escritorio');
    const pm = await (await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    await pm.goto(url); await pm.waitForSelector('#code');
    await pm.evaluate(() => { const t = document.getElementById('code'); t.value = ''; t.dispatchEvent(new Event('input')); });
    check(!(await pm.isVisible('#symbar')), 'barra de símbolos: oculta mientras el código no tiene el foco');
    await pm.focus('#code');
    check(await pm.isVisible('#symbar'), 'barra de símbolos: aparece en el celular al tocar el código');
    await pm.click('#symbar button[aria-label="Símbolo {"]'); await pm.click('#symbar button[aria-label="Símbolo ;"]');
    check((await pm.inputValue('#code')) === '{;', 'barra de símbolos: cada toque escribe un solo símbolo, sin completar nada');
    check((await pm.evaluate(() => document.activeElement.id)) === 'code', 'barra de símbolos: el código no pierde el foco (el teclado sigue abierto)');
    check(/100 % tipeado/.test(await pm.evaluate(() => window.__editorc.procLinea())), 'barra de símbolos: lo escrito con la barra cuenta como tipeado');
    const r = await pm.evaluate(() => ({ p: document.documentElement.scrollWidth, w: innerWidth }));
    check(r.p <= r.w + 1, 'barra de símbolos: no ensancha la página en celular');
  }

  // 5) captura: el alumno le pone el nombre a la imagen (por ejemplo «Ejercicio 20 b, prueba 2») y ese nombre es el del archivo
  {
    const cx5 = await br.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
    const p5 = await cx5.newPage(); await p5.goto(url); await p5.waitForSelector('#code');
    await p5.click('#shot'); await p5.waitForSelector('#dShot[open]');
    check((await p5.inputValue('#shotName')) === (await p5.textContent('#pnameTxt')), 'captura: el nombre de la imagen arranca con el del programa');
    await p5.fill('#shotName', 'Ejercicio 20 b: "prueba" 2/3'); await p5.waitForTimeout(700);
    const [dl] = await Promise.all([p5.waitForEvent('download'), p5.click('#shotDl')]);
    check(dl.suggestedFilename() === 'Ejercicio 20 b prueba 2 3.png', 'captura: el archivo se llama como lo escribió el alumno, sin los caracteres que no se aceptan (' + dl.suggestedFilename() + ')');
    await cx5.close();
  }

  // 6) captura con muchos valores: la entrada se compacta, la salida larga se recorta (principio y final) y la imagen no se vuelve gigante
  {
    const p6 = await (await br.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p6.goto(url); await p6.waitForSelector('#code');
    const vals = ['150']; for (let i = 1; i <= 150; i++) vals.push(String((i * 7) % 100));
    await p6.evaluate(([c, inp]) => { const t = document.getElementById('code'); t.value = c; t.dispatchEvent(new Event('input')); const i = document.getElementById('inTxt'); i.value = inp; i.dispatchEvent(new Event('input')); },
      ['#include <stdio.h>\nint main() {\n  int N, I, V, S = 0;\n  scanf("%d", &N);\n  for (I = 0; I < N; I++) { scanf("%d", &V); S = S + V; }\n  printf("Suma de %d valores: %d\\n", N, S);\n  return 0;\n}\n', vals.join('\n') + '\n']);
    await p6.keyboard.press('F5'); await p6.waitForTimeout(1500);
    await p6.click('#shot'); await p6.waitForSelector('#dShot[open]'); await p6.selectOption('#shotLay', 'abajo'); await p6.waitForTimeout(900);
    const h6 = +(await p6.getAttribute('#shotImg', 'data-h'));
    check(h6 > 0 && h6 < 3400, 'captura con 150 valores: la imagen no se vuelve gigante (' + h6 + ' px de alto)');
  }

  // 7) tiempo de ejecución: se muestra en segundos al terminar y no cuenta lo que se tarda en tipear los datos
  {
    const p7 = await (await br.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p7.goto(url); await p7.waitForSelector('#code');
    await p7.evaluate(() => { const t = document.getElementById('code'); t.value = '#include <stdio.h>\nint main() {\n  int A;\n  scanf("%d", &A);\n  printf("%d\\n", A * 2);\n  return 0;\n}\n'; t.dispatchEvent(new Event('input')); });
    await p7.keyboard.press('F5'); await p7.waitForSelector('.stdin input'); await p7.waitForTimeout(2500);
    await p7.keyboard.type('21'); await p7.keyboard.press('Enter'); await p7.waitForTimeout(900);
    const o7 = await p7.$eval('#out', (o) => o.textContent);
    const m7 = /código de salida 0 · (menos de 0,01 s|(\d+),(\d+) s) —/.exec(o7);
    check(!!m7, 'tiempo de ejecución: la consola lo muestra en segundos (' + (m7 ? m7[1] : 'no aparece') + ')');
    check(!m7 || m7[1].startsWith('menos') || +(m7[2] + '.' + m7[3]) < 2, 'tiempo de ejecución: no cuenta los 2,5 s que se tardó en tipear el dato');
    check(/Terminó \(código 0\) · /.test(await p7.textContent('#status')), 'tiempo de ejecución: también figura en el estado');
  }

  // 8) DNI opcional en Ajustes: se guarda en el dispositivo y no se agrega a la cabecera del código
  {
    const p8 = await (await br.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p8.goto(url); await p8.waitForSelector('#code');
    await p8.click('#settings').catch(() => {}); await p8.waitForSelector('#dSet[open]');
    await p8.fill('#uDni', '12345678'); await p8.waitForTimeout(200);
    await p8.reload(); await p8.waitForSelector('#code'); await p8.click('#settings'); await p8.waitForSelector('#dSet[open]');
    check((await p8.inputValue('#uDni')) === '12345678', 'DNI: queda guardado en el dispositivo');
    check(!(await p8.inputValue('#code')).includes('12345678'), 'DNI: no se agrega a la cabecera del código');
  }

  // 9) Ejemplos: botón + diálogo por temas; al elegir uno se abre el programa con su entrada de muestra, en escritorio y en celular
  for (const [lab, o] of [['escritorio', { viewport: { width: 1280, height: 800 } }], ['celular', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const p9 = await (await br.newContext(o)).newPage();
    await p9.goto(url); await p9.waitForSelector('#code');
    if (lab === 'celular') await p9.click('#more summary');
    await p9.click('#exBtn'); await p9.waitForSelector('#dEj[open]');
    check((await p9.$$('#exList h3')).length >= 8, 'ejemplos (' + lab + '): se listan los temas');
    await p9.click('.chipbtn:has-text("Repetitivas")');
    check((await p9.$$('#exList h3')).length === 1, 'ejemplos (' + lab + '): filtrar por tema muestra solo ese tema');
    await p9.click('.exrow:has-text("Suma de los dígitos")'); await p9.waitForTimeout(300);
    check(!(await p9.$('#dEj[open]')), 'ejemplos (' + lab + '): el diálogo se cierra al elegir');
    check((await p9.inputValue('#inTxt')) === '4825\n', 'ejemplos (' + lab + '): la entrada de muestra queda cargada');
  }

  // 10) aviso del cierre automático: una sola vez, a la tercera ejecución, y no cambia el valor por defecto
  {
    const p10 = await (await br.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p10.goto(url); await p10.waitForSelector('#code');
    for (let i = 0; i < 3; i++) { await p10.click('#run'); await p10.waitForTimeout(700); }
    await p10.waitForTimeout(3200);
    check(/se cierren solas/.test(await p10.evaluate(() => (document.getElementById('toast') || {}).textContent || '')), 'aviso del cierre automático: aparece a la tercera ejecución');
    await p10.click('#toast .btn'); await p10.waitForSelector('#dSet[open]');
    check(!(await p10.isChecked('#autoCierre')), 'aviso del cierre automático: sigue apagado por defecto');
    await p10.reload(); await p10.waitForSelector('#code');
    for (let i = 0; i < 3; i++) { await p10.click('#run'); await p10.waitForTimeout(700); }
    await p10.waitForTimeout(3200);
    check(!/se cierren solas/.test(await p10.evaluate(() => (document.getElementById('toast') || {}).textContent || '')), 'aviso del cierre automático: no se repite');
  }

  // 11) «¿Qué es esto?» con un nombre propio: explica qué papel cumple la variable leyendo el código
  {
    const p11 = await (await br.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
    await p11.goto(url); await p11.waitForSelector('#code');
    const prog = '#include <stdio.h>\nint main() {\n    int CP = 0, NOTA;\n    scanf("%d", &NOTA);\n    while (NOTA != 0) {\n        CP++;\n        scanf("%d", &NOTA);\n    }\n    return 0;\n}\n';
    await p11.evaluate((sx) => { const t = document.getElementById('code'); t.value = sx; t.dispatchEvent(new Event('input', { bubbles: true })); }, prog);
    await p11.evaluate((off) => { const t = document.getElementById('code'); t.focus(); t.setSelectionRange(off, off); }, prog.indexOf('CP++') + 1);
    await p11.keyboard.press('F1'); await p11.waitForTimeout(300);
    const tx = await p11.textContent('#bubble');
    check(/Contador CP/.test(tx) && /línea 3/.test(tx), 'nombre propio: explica que CP es un contador y dónde se declara');
    check(!/\{[A-Z_]+\}/.test(tx), 'nombre propio: no quedan marcadores sin completar');
    await p11.click('#bubble button:has-text("Ver más")');
    check(await p11.isVisible('#bubble .nbmas'), 'nombre propio: «Ver más» muestra el detalle');
  }

  // 12) «¿Qué es esto?» con un signo y un número: «Ver más» trae el uso que corresponde al lugar tocado
  {
    const p12 = await (await br.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
    await p12.goto(url); await p12.waitForSelector('#code');
    const prog = 'int main() {\n    int A, B = 10;\n    for (A = 1; A < B; A++) {\n        B = B - 1;\n    }\n    return 0;\n}\n';
    await p12.evaluate((sx) => { const t = document.getElementById('code'); t.value = sx; t.dispatchEvent(new Event('input', { bubbles: true })); }, prog);
    const tocar = async (off) => { await p12.evaluate((o) => { const t = document.getElementById('code'); t.focus(); t.setSelectionRange(o, o); }, off); await p12.keyboard.press('F1'); await p12.waitForTimeout(300); return p12.textContent('#bubble'); };
    const t1 = await tocar(prog.indexOf('; A <'));
    check(/En este lugar/.test(t1) && /for/i.test(t1), 'signo ; dentro de un for: dice «En este lugar» y habla del for');
    await p12.click('#bubble button:has-text("Ver más")');
    check(await p12.isVisible('#bubble .nbmas') && (await p12.$$('#bubble .nbocas')).length >= 2, 'signo ;: «Ver más» lista los demás usos');
    const t2 = await tocar(prog.indexOf('10;'));
    check(/10/.test(t2) && /entero|número/i.test(t2), 'número 10: se explica como un literal entero');
  }

  await br.close();
  console.log(ok + ' ok, ' + fallas + ' fallas');
  process.exit(fallas ? 1 : 0);
})();

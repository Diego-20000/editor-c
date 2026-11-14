// Auditoría de seguridad, parte del motor (sin navegador): lo que escribe el alumno, lo que llega por un enlace o un archivo
// y lo que está guardado nunca tiene que convertirse en código que se ejecuta, ni romper el compilador, la ayuda o «Avisar a Diego».
// La parte de la interfaz (innerHTML, enlaces, importación, service worker, CSP) está en tools/ui-seguridad.js.
// uso: node test/seguridad.test.js   (sale con código distinto de cero si algo falla)
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const { compile } = require('../src/compiler.js'), { runProgram } = require('../src/runtime.js');
const KB = require('../src/kb.js'), Nombres = require('../src/nombres.js'), Compartir = require('../src/compartir.js'), Ordenar = require('../src/ordenar.js');

let total = 0, fallas = 0; const pend = [];
function t(nombre, f) { total++; pend.push(Promise.resolve().then(f).catch((e) => { fallas++; console.log('FALLA  ' + nombre + '\n       ' + String(e && e.message).split('\n').join('\n       ')); })); }
function ok(c, m) { if (!c) throw new Error(m || 'condición falsa'); }
async function correr(src, entrada) {
  const r = compile(src);
  if (r.errors.length) return { errores: r.errors, salida: '', js: null };
  const lineas = (entrada || '').split('\n'); let out = '';
  const res = await runProgram(r.js, { write: (s) => { out += s; }, readLine: async () => (lineas.length ? lineas.shift() : null) });
  return { errores: [], salida: out, res, js: r.js };
}
// si un texto o un nombre del programa en C lograra salirse del código generado, dejaría esta marca
const MARCAS = ['PWNED', '__pwn', 'contaminado'];
const sinMarcas = () => MARCAS.every((m) => globalThis[m] === undefined && ({})[m] === undefined);

/* ---------- 1) el código generado: textos y nombres del alumno nunca pasan a ser JavaScript ---------- */
const NOMBRES_JS = ['constructor', '__proto__', 'prototype', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', '__defineGetter__', 'arguments', 'eval', 'await', 'async', 'let', 'var', 'function',
  'this', 'new', 'class', 'yield', 'NaN', 'undefined', 'Infinity', 'null', 'delete', 'in', 'of', 'with', 'try', 'catch', 'throw', 'finally', 'length', 'name', 'Math', 'BigInt', 'Number', 'Object',
  'self', 'window', 'globalThis', 'export', 'import', 'super', 'instanceof', 'debugger', 'extends', 'process', 'require', 'module', 'postMessage', 'importScripts', 'caches', 'fetch', 'Function'];
t('cada nombre de JavaScript sirve como variable, parámetro, arreglo y función de C', async () => {
  for (const n of NOMBRES_JS) {
    const src = '#include <stdio.h>\nint ' + n + '_g = 1;\nint f_' + n + '(int ' + n + ') { return ' + n + ' + 1; }\nint ' + n + '(int a, int b) { return a * b; }\nint main() {\n    int V[3] = {1, 2, 3};\n    {\n        int ' + n + ' = 5, ' + n + '2[2] = {7, 8};\n        ' + n + ' += V[1] + ' + n + '2[1] + ' + n + '_g;\n        printf("%d %d\\n", ' + n + ', f_' + n + '(' + n + '));\n    }\n    printf("%d\\n", ' + n + '(6, 7));\n    return 0;\n}\n';
    const r = await correr(src);
    ok(!r.errores.length, n + ': no compila: ' + (r.errores[0] && r.errores[0].msg));
    ok(r.salida === '16 17\n42\n', n + ': salida ' + JSON.stringify(r.salida));
  }
  ok(sinMarcas(), 'quedó una marca global');
});
// cuerpos de literales de C (ya escapados como en C): comillas, barras, plantillas de JavaScript, cierres de comentario y de script
const HOSTILES = ['\\"); globalThis.PWNED = 1; (\\"', "'); globalThis.PWNED = 1; ('", '\\\\\\"); globalThis.PWNED = 1; //', '${globalThis.PWNED=1}', '`+(globalThis.PWNED=1)+`', '*/ globalThis.PWNED = 1; /*', '</script><script>globalThis.PWNED=1</script>',
  '\\x22); globalThis.PWNED = 1; (\\x22', '\\042); globalThis.PWNED = 1; (\\042', '\\n\\r\\t\\\\', 'LS_PS', '%s%s%s%n%d', '\\\\', '\\\\\\\\\\"', "\\'\\?\\a\\b\\f\\v"];
t('textos hostiles en printf, puts, formatos de scanf, char[], strcpy y #define: se imprimen tal cual', async () => {
  for (let h of HOSTILES) {
    h = h.replace('LS_PS', String.fromCharCode(0x2028) + String.fromCharCode(0x2029));
    const lit = h;
    const src = '#include <stdio.h>\n#include <string.h>\n#define M "' + lit + '"\nint main() {\n    char A[300] = "' + lit + '", B[300];\n    int X = 0;\n    strcpy(B, "' + lit + '");\n    strcat(B, M);\n    puts("' + lit + '");\n    printf("%s|%s|%d\\n", A, M, (int) strlen(B));\n    printf("' + lit.replace(/%/g, '%%') + '\\n");\n    scanf("' + lit.replace(/%/g, '%%') + '%d", &X);\n    printf("%d\\n", strcmp(A, "' + lit + '"));\n    return 0;\n}\n';
    const r = await correr(src, '5');
    ok(!r.errores.length, JSON.stringify(h) + ': no compila: ' + (r.errores[0] && r.errores[0].msg));
    ok(sinMarcas(), JSON.stringify(h) + ': el texto se ejecutó como código');
    ok(/\n0\n$/.test(r.salida), JSON.stringify(h) + ': salida inesperada ' + JSON.stringify(r.salida.slice(-40)));
    try { new Function('$rt', r.js); } catch (e) { throw new Error(JSON.stringify(h) + ': el código generado no es JavaScript válido: ' + e.message); }
  }
});
t('caracteres y números raros no rompen el código generado', async () => {
  const src = "#include <stdio.h>\nint main() {\n    char C[] = {'\\'', '\"', '\\\\', '\\n', '\\0', '`', '$', '{', '\\x7f', '\\377'};\n    double D[] = {1e308, 1e-320, 0x10, 017, 1e999, .5e-10, 5.};\n    long L = 9223372036854775807L;\n    unsigned long UL = 18446744073709551615UL;\n    int k, s = 0;\n    for (k = 0; k < 10; k++) s += C[k];\n    printf(\"%d %g %g %g %ld %lu\\n\", s, D[0], D[2], D[4], L, UL);\n    return 0;\n}\n";
  const r = await correr(src);
  ok(!r.errores.length && r.salida === '556 1e+308 16 inf 9223372036854775807 18446744073709551615\n', 'salida ' + JSON.stringify(r.salida) + ' ' + JSON.stringify(r.errores[0] || ''));
});
t('los casos fable_00x de test/cases (nombres y textos hostiles) no dejan marcas', async () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'test', 'cases')).filter((x) => /^fable_00[1-4]_.*\.c$/.test(x))) {
    const r = await correr(fs.readFileSync(path.join(ROOT, 'test', 'cases', f), 'utf8'));
    ok(!r.errores.length && r.salida.length > 0, f + ': ' + JSON.stringify(r.errores[0] || 'sin salida'));
  }
  ok(sinMarcas());
});

/* ---------- 2) el compilador no se rompe con nombres heredados de Object ni con directivas raras ---------- */
t('#include, #define e #if con nombres y expresiones raras: error o aviso, nunca una excepción', () => {
  const raros = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'];
  for (const n of raros) for (const src of [
    '#include <stdio.h>\nint x;\n#include <' + n + '>\nint main() { printf("%d", x); return 0; }\n',
    'int x;\n#include "' + n + '"\nint main() { ' + n + '(); return ' + n + '; }\n',
    '#include <stdio.h>\n#define ' + n + '\n#ifdef ' + n + '\nint main() { printf("si"); return 0; }\n#endif\n',
    '#include <stdio.h>\n#if ' + n + ' > 0 || defined(' + n + ')\n#endif\nint main() { ' + n + ' = 3; printf("%d", ' + n + '.' + n + '); return 0; }\n'
  ]) { const r = compile(src); ok(r && Array.isArray(r.errors) && Array.isArray(r.warnings), 'sin resultado'); for (const d of r.errors.concat(r.warnings)) ok(typeof d.msg === 'string' && typeof d.line === 'number' && (d.kb === undefined || typeof d.kb === 'string'), n + ': diagnóstico mal formado ' + JSON.stringify(d)); }
});
t('la condición de un #if no ejecuta código', () => {
  for (const e of ['(()=>1)()', '(()=>{globalThis.PWNED=1})()', 'globalThis.PWNED=1', '1;globalThis.PWNED=1', '/a/.constructor("globalThis.PWNED=1")()', '[].constructor.constructor("globalThis.PWNED=1")()', '`${globalThis.PWNED=1}`', '1) ; globalThis.PWNED=1 ; (1', "'a'", '1 ? 2 : 3', '1 << 40', '0x10 == 16', '1/0', '((((1))))', ''.padEnd(5000, '(') + '1' + ''.padEnd(5000, ')')]) {
    let r; try { r = compile('#include <stdio.h>\n#if ' + e + '\nint a;\n#else\nint b;\n#endif\nint main() { return 0; }\n'); } catch (x) { throw new Error(JSON.stringify(e.slice(0, 40)) + ': excepción ' + x.message); }
    ok(sinMarcas(), JSON.stringify(e.slice(0, 40)) + ': se ejecutó código en el #if');
    ok(r.errors.every((d) => typeof d.msg === 'string'), 'diagnóstico mal formado');
  }
});
t('un case o un tamaño de arreglo raros no ejecutan código al compilar', () => {
  for (const e of ['(globalThis.PWNED = 1)', 'sizeof(int) + 1', "'a' + 1", '1 ? 2 : 3', '(int) 2.5', '-(-3)', '~0', '1 << 31', '08', '1e3', '"x"', 'M_PI', 'INT_MAX + 1', 'x', 'f()', 'x++']) {
    for (const src of ['#include <stdio.h>\nint main() { int x = 1; switch (x) { case ' + e + ': printf("a"); break; } return 0; }\n', '#include <stdio.h>\nint V[' + e + '];\nint main() { int W[' + e + ']; return 0; }\n']) {
      try { compile(src); } catch (x) { throw new Error(e + ': excepción ' + x.message); }
      ok(sinMarcas(), e + ': se ejecutó código al compilar');
    }
  }
});

/* ---------- 3) la ayuda y «¿qué es esto?» con nombres heredados de Object ---------- */
const ctx = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'kb-data.js'), 'utf8'), ctx);
const D = ctx.window.KB_DATA; KB.cargar(D);
const RAROS = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty', 'prototype', 'isPrototypeOf', '__defineGetter__', 'propertyIsEnumerable', 'toLocaleString', '__lookupGetter__', 'length', 'name'];
const esRaro = (v) => { const s = JSON.stringify(v, (k, x) => (typeof x === 'function' ? '<<FUNCION>>' : x)); return typeof v === 'function' || /<<FUNCION>>|native code/.test(String(s)); };
t('«¿qué es esto?» sobre un nombre como toString o constructor no devuelve objetos internos ni falla', () => {
  for (const r of RAROS) for (const src of [
    '#include <stdio.h>\nint ' + r + ' = 3;\nint main() {\n    int X;\n    scanf("%d", &X);\n    ' + r + ' = ' + r + ' + X;\n    printf("%d\\n", ' + r + ');\n    return 0;\n}\n',
    '#include <stdio.h>\nint ' + r + '(int A) { return A; }\nint main() {\n    printf("%d\\n", ' + r + '(2));\n}\n',
    '#include <' + r + '>\n#define ' + r + ' 3\nint main() { int V[' + r + ']; for (int ' + r + '_ = 0; ' + r + '_ < 3; ' + r + '_++) V[' + r + '_] = 0; }\n'
  ]) for (let off = 0; off < src.length; off++) {
    const clave = KB.elementoEnPosicion(src, off), a = clave ? KB.ayudaDe(clave) : null;
    ok(!esRaro(a) && (a === null || typeof a.elemento === 'string'), r + ' @' + off + ': ayudaDe devolvió algo que no es una entrada de la base');
    if (a) ok(!esRaro(Nombres.ocasionAqui(a, src, off)), r + ' @' + off + ': ocasionAqui');
    else { const nb = Nombres.explicar(src, off, D.nombres || []); ok(!esRaro(nb) && (nb === null || typeof nb.nombre === 'string'), r + ' @' + off + ': explicar'); }
  }
});
t('una variable llamada toString se explica como variable del alumno', () => {
  const src = '#include <stdio.h>\nint main() {\n    int toString = 0, constructor;\n    scanf("%d", &constructor);\n    toString = toString + constructor;\n    printf("%d\\n", toString);\n    return 0;\n}\n';
  for (const n of ['toString', 'constructor']) { const nb = Nombres.explicar(src, src.indexOf(n) + 2, D.nombres || []); ok(nb && nb.nombre === n && typeof nb.que_es === 'string' && nb.que_es.length > 10, n + ': ' + JSON.stringify(nb)); }
});
t('el buscador y explicar() aceptan cualquier texto', () => {
  for (const q of RAROS.concat(['<img src=x onerror=1>', '%', '%%%', '\\', ''.padEnd(20000, 'scanf '), '(((', '[a-', String.fromCharCode(0), 'ñ́́́', '__proto__ constructor toString'])) {
    const res = KB.buscar(q, { max: 12 }); ok(Array.isArray(res) && !esRaro(res.map((x) => [x.tipo, x.titulo, x.resumen])), 'buscar ' + JSON.stringify(q.slice(0, 30)));
    for (const kb of [q, undefined]) { const ex = KB.explicar({ line: 1, msg: "'" + q + "' no está declarada", code: 'E-' + q, kb }, 2); ok(!esRaro(ex && ex.entrada && ex.entrada.id), 'explicar ' + JSON.stringify(q.slice(0, 30))); }
    ok(!esRaro(KB.entrada(q)), 'entrada ' + JSON.stringify(q.slice(0, 30)));
  }
});
t('ordenar no se cuelga ni falla con código que no es C', () => {
  for (const src of ['<img src=x onerror=1>', '{{{{{{{{', '}}}}}}}}', '"sin cerrar', "'", '/* sin cerrar', '#define X {\n}\n}', ''.padEnd(50000, '{ if (x) '), ''.padEnd(3000, '\t \n'), '\ufffd'.repeat(100)]) { const r = Ordenar.ordenar(src, '    '); ok(typeof r === 'string'); }
});

/* ---------- 4) casos sin respuesta: lo guardado y lo importado se revisan; un medio carácter no rompe el enlace ---------- */
function almacen(v) { const mem = {}; if (v !== undefined) mem['editor-c-casos'] = typeof v === 'string' ? v : JSON.stringify(v); return { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, x) => { mem[k] = x; }, mem }; }
const ALTO = String.fromCharCode(0xD83D), BAJO = String.fromCharCode(0xDC00);
t('un programa con medio carácter (mitad de un par) no rompe el enlace de WhatsApp', () => {
  const alm = almacen();
  const c = Compartir.nuevoCaso({ codigo: 'int main() { printf("' + ALTO + ' ' + BAJO + BAJO + ' ' + ALTO + String.fromCharCode(0xDE00) + '"); }', entrada: BAJO + ALTO, diag: { msg: 'mensaje ' + ALTO, line: 2 } });
  Compartir.guardar(c, alm);
  const lista = Compartir.listar(alm), texto = Compartir.mensajeWhatsApp(lista, 'nota ' + ALTO), url = Compartir.urlWhatsApp(texto, '5491100000000');
  ok(/^https:\/\/wa\.me\/5491100000000\?text=/.test(url), url.slice(0, 40));
  ok(decodeURIComponent(url.slice(url.indexOf('=') + 1)).indexOf(ALTO + String.fromCharCode(0xDE00)) >= 0, 'el par completo (un emoji) se conserva');
  ok(typeof Compartir.exportarJSON(lista, { nota: ALTO }) === 'string');
  // sin toWellFormed (navegadores anteriores a 2023)
  const tw = String.prototype.toWellFormed; String.prototype.toWellFormed = undefined;
  try { const c2 = Compartir.nuevoCaso({ codigo: 'a' + BAJO + BAJO + 'b' + ALTO, diag: {} }); ok(c2.codigo === 'a\ufffd\ufffdb\ufffd', JSON.stringify(c2.codigo)); } finally { String.prototype.toWellFormed = tw; }
});
t('el enlace de WhatsApp siempre apunta a wa.me y respeta el largo máximo', () => {
  for (const num of ['5491137781528', '+54 9 11 3778-1528', 'javascript:alert(1)', '//evil.example/', '', null, { a: 1 }]) for (const largo of [10, 5000, 60000]) {
    const url = Compartir.urlWhatsApp('x'.repeat(largo) + '\n```c\n' + 'int a;\n'.repeat(largo / 7) + '```\n#DATOS {"a":1}', num);
    ok(/^https:\/\/wa\.me\/\d*\?text=[A-Za-z0-9%._~!*'()-]*$/.test(url), 'URL inesperada: ' + url.slice(0, 60));
    ok(url.length < 2000, 'URL de ' + url.length + ' caracteres');
  }
});
t('casos guardados con tipos equivocados o dañados: se limpian o se descartan, nunca fallan', () => {
  const P = '"><img src=x onerror="globalThis.__pwn=1">';
  for (const guardado of [
    [{ v: 1, diag: { msg: 5, line: 'x', nivel: {} }, codigo: 'a', entrada: 42, fecha: 7, nivel_ayuda: {} }], [{ diag: {}, codigo: 'a', entrada: { replace: 1 }, version: ['x'] }],
    [{ diag: { msg: [P], code: {} }, codigo: 'x', aviso: {}, fecha: P, recortado: 'mucho' }], [null, 1, 'x', [], { diag: null, codigo: 'x' }, { diag: {}, codigo: 3 }], { length: 3 }, 'texto', 5, [[]], '[[[[', '{"__proto__":{"contaminado":1}}',
    [{ v: 1, fecha: P, version: P, nivel_ayuda: P, diag: { nivel: P, code: P, msg: P, line: P }, codigo: P, entrada: P, aviso: P }], Array.from({ length: 500 }, (x, i) => ({ diag: { msg: 'm' + i }, codigo: 'c'.repeat(20000) }))
  ]) {
    const alm = almacen(guardado), lista = Compartir.listar(alm);
    ok(Array.isArray(lista) && lista.length <= Compartir.MAX_CASOS, 'lista');
    for (const c of lista) {
      ok(typeof c.codigo === 'string' && c.codigo.length <= Compartir.MAX_CODIGO && typeof c.entrada === 'string' && typeof c.diag.msg === 'string' && typeof c.diag.line === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(c.fecha) && /^[\w.-]*$/.test(c.version) && /^[\w-]*$/.test(c.diag.code), 'caso mal formado: ' + JSON.stringify(c).slice(0, 200));
      Compartir.clave(c);
    }
    const url = Compartir.urlWhatsApp(Compartir.mensajeWhatsApp(lista, P), '549'); ok(/^https:\/\/wa\.me\/549\?text=/.test(url));
    Compartir.exportarJSON(lista); Compartir.guardar(Compartir.nuevoCaso({ codigo: 'int x;', diag: { msg: 'm' } }), alm); Compartir.borrar(0, alm);
  }
  ok(sinMarcas());
});
t('importar casos: archivos enormes, anidados o con claves especiales se rechazan sin fallar', () => {
  const F = '{"formato":"casos-sin-respuesta-v1","casos":';
  for (const txt of [F + '['.repeat(100000) + ']'.repeat(100000) + '}', F + '[{"v":1,"codigo":"x","diag":{"msg":"m"},"__proto__":{"contaminado":1},"constructor":{"prototype":{"contaminado":1}}}]}', 'x'.repeat(2000001), F + '[' + Array.from({ length: 300 }, () => '{"v":1,"codigo":"x","diag":{"msg":"m"}}').join(',') + ']}', '#DATOS ' + F + '[]}', '\ufeff' + F + '[{"v":1,"codigo":"\\ud800","diag":{"msg":"\\udc00"}}]}', 'null', '5', '[]', '']) {
    const r = Compartir.importarJSON(txt);
    ok(r && Array.isArray(r.casos) && Array.isArray(r.descartados) && r.casos.length <= 200, 'resultado');
    for (const c of r.casos) Compartir.urlWhatsApp(Compartir.mensajeWhatsApp([c], ''), '');
  }
  ok(sinMarcas());
});

Promise.all(pend).then(() => { console.log((total - fallas) + '/' + total + ' pruebas bien'); process.exit(fallas ? 1 : 0); });

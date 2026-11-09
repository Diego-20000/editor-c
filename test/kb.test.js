// Pruebas del entrenador: src/kb.js, src/compartir.js, src/config.js y tools/kb-agregar-caso.js.
// uso: node test/kb.test.js   (sale con código distinto de cero si algo falla)
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..'), FIX = path.join(__dirname, 'fixtures', 'kb');
const KB = require('../src/kb.js'), Compartir = require('../src/compartir.js'), CONFIG = require('../src/config.js');

let total = 0, fallas = 0;
function t(nombre, f) {
  total++;
  try { f(); } catch (e) { fallas++; console.log('FALLA  ' + nombre + '\n       ' + String(e.message).split('\n').join('\n       ')); }
}
function ok(c, m) { if (!c) throw new Error(m || 'condición falsa'); }
function eq(a, b, m) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'distinto') + '\n  obtenido: ' + JSON.stringify(a) + '\n  esperado: ' + JSON.stringify(b)); }

const datos = {
  errores: fs.readdirSync(path.join(FIX, 'errores')).filter((f) => /\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(path.join(FIX, 'errores', f), 'utf8'))),
  ayuda: JSON.parse(fs.readFileSync(path.join(FIX, 'ayuda.json'), 'utf8')),
  lecciones: JSON.parse(fs.readFileSync(path.join(FIX, 'lecciones.json'), 'utf8'))
};
t('cargar cuenta las entradas', () => { const r = KB.cargar(datos); eq(r, { errores: datos.errores.length, ayuda: datos.ayuda.length, lecciones: datos.lecciones.length }); ok(KB.cargado); });

/* ---------- buscador: [consulta, id esperado, posición máxima (1 = primero)] ---------- */
const CONSULTAS = [
  ['por qué 7/2 da 3', 'L-008', 1], ['scanf &', 'SCN-001', 3], ['punto y coma', 'L-001', 3], ['qué es un prototipo', 'prototipo', 3],
  ['dividir por cero', 'EJE-001', 2], ['comparar decimales', 'TIP-003', 2], ['texto', 'L-036', 1], ['ciclo infinito', 'CTL-002', 1],
  ['&&', '&&', 1], ['%d', '%d', 1], ['for', 'for', 1], ['raíz cuadrada', 'sqrt', 1], ['número aleatorio', 'rand', 1],
  ['comparar cadenas', 'ARR-001', 1], ['strcmp', 'ARR-001', 1], ['variable sin valor', 'L-009', 1], ['mi programa se cuelga', 'CTL-002', 1],
  ['índice fuera de rango', 'EJE-002', 1], ['if con un solo igual', 'CTL-001', 1], ['valor absoluto', 'abs', 1], ['scanf no lee el dato', 'L-017', 3],
  ['salto de linea', '\\n', 2], ['llaves', 'L-002', 3], ['potencia', 'pow', 1], ['declarar una función', 'FUN-001', 3], ['++', '++', 1],
  ['stdio', 'stdio.h', 1], ['el while no termina', 'CTL-002', 1], ['división entera', 'L-008', 1], ['&', '&', 1], ['mayúsculas', 'L-004', 1],
  ['mostrar en pantalla', 'printf', 1], ['para qué sirve el resto', '%', 1], ['qué es un bucle', 'while', 3], ['float con %d', 'TIP-002', 3],
  ['ciclos', 'while', 3], ['decimales', 'float', 3], ['ampersand', 'SCN-001', 3], ['dividir enteros', 'L-008', 2], ['0.1 + 0.2', 'TIP-003', 3],
  ['bucle infinito', 'CTL-002', 1], ['SCANF SIN &', 'SCN-001', 1], ['Division', 'L-008', 3], ['cadena', 'L-036', 3], ['string', 'L-036', 3],
  ['qué hace el módulo', '%', 3], ['como declaro una funcion', 'FUN-001', 3], ['basura en una variable', 'DEC-001', 3], ['igual igual', '==', 2]
];
for (const [q, id, pos] of CONSULTAS) {
  t('buscar «' + q + '» → ' + id, () => {
    const r = KB.buscar(q, { max: 10 }), i = r.findIndex((x) => x.id === id);
    ok(i >= 0 && i < pos, 'esperaba ' + id + ' entre los primeros ' + pos + ' y salió: ' + r.slice(0, 4).map((x) => x.id).join(', '));
  });
}
t('buscar: forma de cada resultado', () => {
  const r = KB.buscar('scanf', { max: 3 })[0];
  eq(Object.keys(r).sort(), ['entrada', 'id', 'puntaje', 'resumen', 'tipo', 'titulo']);
  ok(['error', 'ayuda', 'leccion'].includes(r.tipo) && r.puntaje > 0 && r.resumen.length > 0 && r.titulo.length > 0);
});
t('buscar: ordenado por puntaje y respeta max', () => {
  const r = KB.buscar('scanf', { max: 5 }); eq(r.length, 5);
  for (let i = 1; i < r.length; i++) ok(r[i - 1].puntaje >= r[i].puntaje, 'desordenado');
  eq(KB.buscar('scanf', { max: 2 }).length, 2);
});
t('buscar: filtro por tipos', () => {
  const r = KB.buscar('scanf', { max: 20, tipos: ['error'] }); ok(r.length > 0 && r.every((x) => x.tipo === 'error'));
  const l = KB.buscar('scanf', { max: 20, tipos: ['leccion', 'ayuda'] }); ok(l.length > 0 && l.every((x) => x.tipo !== 'error'));
});
t('buscar: vacío, solo palabras vacías y sin coincidencias', () => {
  eq(KB.buscar(''), []); eq(KB.buscar('   '), []); eq(KB.buscar('la de el que'), []); eq(KB.buscar('zzqxk'), []); eq(KB.buscar(null), []);
});
t('buscar: sin tildes ni mayúsculas da lo mismo', () => {
  eq(KB.buscar('División ENTERA').map((x) => x.id), KB.buscar('division entera').map((x) => x.id));
});
t('buscar: determinista', () => { eq(KB.buscar('ciclo').map((x) => x.id), KB.buscar('ciclo').map((x) => x.id)); });
t('buscar: menos de 20 ms con ~1000 entradas', () => {
  const E = [], A = [], L = [], pal = ['variable', 'ciclo', 'texto', 'arreglo', 'funcion', 'decimal', 'entero', 'condicion', 'indice', 'memoria', 'formato', 'lectura', 'pantalla', 'resultado', 'programa'];
  for (let i = 0; i < 600; i++) { const e = JSON.parse(JSON.stringify(datos.errores[i % datos.errores.length])); e.id = 'SIN-' + (1000 + i); e.nombre_corto += ' ' + pal[i % 15] + i; e.explicacion += ' ' + pal[(i * 7) % 15] + ' ' + pal[(i * 3) % 15]; e.mensaje_editor_actual = null; e.codigo_editor_actual = null; E.push(e); }
  for (let i = 0; i < 250; i++) { const a = JSON.parse(JSON.stringify(datos.ayuda[i % datos.ayuda.length])); a.elemento += '_' + i; A.push(a); }
  for (let i = 0; i < 200; i++) { const l = JSON.parse(JSON.stringify(datos.lecciones[i % datos.lecciones.length])); l.id = 'L-' + (500 + i); l.titulo += ' ' + pal[i % 15]; L.push(l); }
  KB.cargar({ errores: E, ayuda: A, lecciones: L });
  const qs = ['por qué 7/2 da 3', 'scanf &', 'punto y coma', 'ciclo infinito', 'comparar decimales', 'texto', 'variable sin valor', 'qué es un prototipo'];
  let peor = 0;
  for (const q of qs) { const t0 = process.hrtime.bigint(); KB.buscar(q, { max: 8 }); const ms = Number(process.hrtime.bigint() - t0) / 1e6; peor = Math.max(peor, ms); }
  KB.cargar(datos);
  ok(peor < 20, 'la consulta más lenta tardó ' + peor.toFixed(1) + ' ms');
});

/* ---------- explicar ---------- */
t('explicar: por campo kb explícito', () => {
  const r = KB.explicar({ line: 3, msg: 'cualquier cosa', code: 'X', kb: 'EJE-001' }); ok(r && r.via === 'kb' && r.entrada.id === 'EJE-001');
  eq(KB.explicar({ msg: 'x', kb: 'NO-999' }), null, 'un kb inexistente cae a null si nada más coincide');
});
t('explicar: por plantilla (nombres y números distintos)', () => {
  let r = KB.explicar({ line: 5, msg: "a scanf le falta el '&' delante de 'TOTAL' (scanf necesita &TOTAL)", code: 'E-scanf-sin-amp' });
  ok(r && r.via === 'plantilla' && r.entrada.id === 'SCN-001');
  r = KB.explicar({ line: 9, msg: "índice 25 fuera del arreglo 'W' (tamaño 20)", code: 'R-runtime' });
  ok(r && r.via === 'plantilla' && r.entrada.id === 'EJE-002', 'salió ' + (r && r.entrada.id));
});
t('explicar: por código si es único', () => {
  const r = KB.explicar({ line: 1, msg: 'mensaje que no está', code: 'E-funcion-sin-prototipo' }); ok(r && r.via === 'codigo' && r.entrada.id === 'FUN-001');
});
t('explicar: código repetido en varias entradas o desconocido → null', () => {
  eq(KB.explicar({ line: 1, msg: 'mensaje que no está', code: 'R-runtime' }), null);
  eq(KB.explicar({ line: 1, msg: 'algo raro', code: 'E-inventado' }), null);
  eq(KB.explicar(null), null); eq(KB.explicar({}), null);
});
t('explicar: el orden es kb, plantilla, código', () => {
  const r = KB.explicar({ msg: "la división 'A / B' es entera: se pierden los decimales", code: 'E-funcion-sin-prototipo', kb: 'DEC-001' }); eq(r.entrada.id, 'DEC-001');
  const p = KB.explicar({ msg: "la división 'A / B' es entera: se pierden los decimales", code: 'E-funcion-sin-prototipo' }); eq(p.entrada.id, 'TIP-001');
});
t('explicar: devuelve el nivel pedido (y 1 por defecto)', () => {
  eq(KB.explicar({ kb: 'SCN-001' }).nivel, 1); eq(KB.explicar({ kb: 'SCN-001' }, 2).nivel, 2); eq(KB.explicar({ kb: 'SCN-001' }, 0).nivel, 0); eq(KB.explicar({ kb: 'SCN-001' }, 9).nivel, 2);
  eq(KB.explicar({ kb: 'SCN-001' }, '2').nivel, 2);
});
t('normalizarMensaje como tools/catalogo-errores.js', () => {
  eq(KB.normalizarMensaje("la variable 'Total' línea 12"), "la variable '‹nombre›' línea N");
  eq(KB.normalizarMensaje("falta 'if' y 3.5"), "falta 'if' y N");
  eq(KB.normalizarMensaje("falta el '&' delante de 'A' (necesita &A)"), "falta el '&' delante de '‹nombre›' (necesita &‹nombre›)");
});

/* ---------- ayudaNivel y pista ---------- */
const ent = () => KB.entrada('SCN-001');
t('ayudaNivel 0: solo el mensaje original', () => {
  const a = KB.ayudaNivel(ent(), 0, { msg: 'mensaje de gcc' });
  eq(a.mensaje, 'mensaje de gcc'); eq(a.pistas, []); eq(a.explicacion, null);
  eq(KB.ayudaNivel(ent(), 0).mensaje, ent().mensaje_editor_actual);
});
t('ayudaNivel 1: mensaje corto y primera pista', () => {
  const a = KB.ayudaNivel(ent(), 1); eq(a.mensaje, ent().mensaje_editor); eq(a.pistas, [ent().pistas[0]]); eq(a.explicacion, null); ok(a.hayMasPistas);
});
t('ayudaNivel 2: explicación y dos pistas, nunca la tercera', () => {
  const a = KB.ayudaNivel(ent(), 2); eq(a.explicacion, ent().explicacion); eq(a.pistas, ent().pistas.slice(0, 2));
  for (const n of [0, 1, 2, 3, 99, -1, 'x']) ok(!JSON.stringify(KB.ayudaNivel(ent(), n)).includes(ent().pistas[2]), 'la pista 3 apareció con nivel ' + n);
});
t('pista: de a una y la solución solo confirmada', () => {
  eq(KB.pista(ent(), 1).texto, ent().pistas[0]); eq(KB.pista(ent(), 2).texto, ent().pistas[1]);
  const b = KB.pista(ent(), 3); ok(b.bloqueada && b.texto === null && b.esSolucion);
  ok(KB.pista(ent(), 3, { vistas: 2 }).bloqueada, 'sin confirmar sigue bloqueada');
  ok(KB.pista(ent(), 3, { confirmar: true }).bloqueada, 'sin haber visto la 2 sigue bloqueada');
  eq(KB.pista(ent(), 3, { vistas: 2, confirmar: true }).texto, ent().pistas[2]);
  ok(KB.pista(ent(), 2, { vistas: 0 }).bloqueada, 'no se saltea la pista 1');
  eq(KB.pista(ent(), 0), null); eq(KB.pista(ent(), 4), null);
});

/* ---------- elementoEnPosicion y ayudaDe ---------- */
const CODIGO = '// hola\n#include <stdio.h>\nint main() {\n    int A;\n    float X = 3.5;\n    scanf("%d", &A);\n    printf("Dato: %5.2f\\n", X);\n    if (A >= 2 && X != 0) { A++; } else if (A) { A += 2; }\n    return 0;\n}\n';
const en = (frag, d) => KB.elementoEnPosicion(CODIGO, CODIGO.indexOf(frag) + (d || 0));
const POS = [['#include', 2, '#include'], ['stdio.h', 2, 'stdio.h'], ['int main', 1, 'int'], ['main', 2, 'main'], ['scanf', 0, 'scanf'], ['scanf', 4, 'scanf'], ['%d', 1, '%d'], ['&A', 0, '&'], ['printf', 3, 'printf'],
  ['%5.2f', 2, '%5.2f'], ['\\n', 1, '\\n'], ['>=', 0, '>='], ['>=', 1, '>='], ['&&', 1, '&&'], ['!=', 0, '!='], ['A++', 1, '++'], ['if (A >= 2', 1, 'if'], ['else', 0, 'else if'], ['if (A) {', 1, 'else if'], ['+= 2', 0, '+='], ['return', 2, 'return'], ['float', 0, 'float'], ['{ A++', 0, '{}']];
for (const [frag, d, esperado] of POS) t('elementoEnPosicion «' + frag.replace(/\n/g, '\\n') + '»+' + d + ' → ' + esperado, () => eq(en(frag, d), esperado));
t('elementoEnPosicion: nada que explicar → null', () => {
  eq(en('hola', 1), null, 'comentario'); eq(en('Dato', 1), null, 'texto dentro de un string'); eq(en('3.5', 1), null, 'número');
  eq(en('X = 3', 0), null, 'variable del alumno'); eq(KB.elementoEnPosicion(CODIGO, -1), null); eq(KB.elementoEnPosicion(CODIGO, 9999), null); eq(KB.elementoEnPosicion('', 0), null);
});
t('elementoEnPosicion: al final de la palabra (cursor pegado)', () => { eq(KB.elementoEnPosicion('printf', 6), 'printf'); eq(KB.elementoEnPosicion('x = 1; /* c */ while', 20), 'while'); });
t('ayudaDe: entrada, y formato con ancho cae al más general', () => {
  eq(KB.ayudaDe('printf').elemento, 'printf'); eq(KB.ayudaDe('%d').elemento, '%d');
  eq(KB.ayudaDe('%5.2f').elemento, '%5.2f'); eq(KB.ayudaDe('%7.3f').elemento, '%f'); eq(KB.ayudaDe('%-12d').elemento, '%d');
  eq(KB.ayudaDe('noexiste'), null); eq(KB.ayudaDe(null), null);
});
t('elementoEnPosicion + ayudaDe: del toque a la ayuda', () => { eq(KB.ayudaDe(en('&&', 1)).elemento, '&&'); eq(KB.ayudaDe(en('printf', 2)).elemento, 'printf'); });

/* ---------- Compartir ---------- */
const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, _m: m }; };
const CASO = { codigo: '#include <stdio.h>\nint main() { int A; scanf("%d", A); return 0; }', entrada: '5', diag: { nivel: 'aviso', code: 'W-x', msg: "falta '&'", line: 2 }, nivelAyuda: 1, version: 'abc123' };
t('nuevoCaso: forma exacta', () => {
  const c = Compartir.nuevoCaso(CASO);
  eq(Object.keys(c), ['v', 'fecha', 'version', 'nivel_ayuda', 'diag', 'codigo', 'entrada']); eq(c.v, 1); ok(/^\d{4}-\d{2}-\d{2}$/.test(c.fecha));
  eq(c.diag, { nivel: 'aviso', code: 'W-x', msg: "falta '&'", line: 2 }); eq(c.nivel_ayuda, 1); eq(c.version, 'abc123');
});
t('nuevoCaso: quita la cabecera con nombre y curso, y corrige la línea', () => {
  const c = Compartir.nuevoCaso({ codigo: '// Perez, Juan\n// 5° 2da\n// Lenguajes Electrónicos V\n// Ciclo lectivo 2026\n\n#include <stdio.h>\nint main() {}', diag: { msg: 'm', line: 7 } });
  ok(!/Perez|2da|Ciclo/.test(JSON.stringify(c)), 'quedaron datos personales'); eq(c.codigo.split('\n')[0], '#include <stdio.h>'); eq(c.diag.line, 2);
});
t('nuevoCaso: quita correos, enlaces y teléfonos', () => {
  const c = Compartir.nuevoCaso({ codigo: 'int main() { /* juan@mail.com https://x.com/y 11 5555-4444 */ return 0; }', entrada: 'mi tel 1155554444', diag: { msg: 'a juan@mail.com' } });
  ok(!/juan@|https|5555|1155554444/.test(JSON.stringify(c)), JSON.stringify(c));
});
t('nuevoCaso: recorta el código a 4000 y avisa', () => {
  const c = Compartir.nuevoCaso({ codigo: 'int x;\n'.repeat(1000), diag: { msg: 'm' } });
  eq(c.codigo.length, 4000); eq(c.recortado, 7000); ok(/recortado/.test(c.aviso));
  ok(!('recortado' in Compartir.nuevoCaso(CASO)));
});
t('nuevoCaso: límites de mensaje, entrada y nivel', () => {
  const c = Compartir.nuevoCaso({ codigo: 'x', entrada: 'e'.repeat(2000), nivelAyuda: 77, diag: { msg: 'm'.repeat(1000), line: -4, nivel: 'raro' } });
  eq(c.entrada.length, 500); eq(c.diag.msg.length, 300); eq(c.nivel_ayuda, 1); eq(c.diag.line, 0); eq(c.diag.nivel, 'error');
  eq(Compartir.nuevoCaso({}).codigo, ''); eq(Compartir.nuevoCaso().diag.msg, '');
});
t('almacén: guardar, listar, borrar', () => {
  const a = mem(); const c = Compartir.nuevoCaso(CASO);
  eq(Compartir.listar(a), []); const r = Compartir.guardar(c, a); ok(r.ok && !r.duplicado && r.total === 1);
  eq(Compartir.listar(a).length, 1); eq(Compartir.listar(a)[0].codigo, c.codigo);
  ok(Compartir.borrar(0, a)); eq(Compartir.listar(a), []); ok(!Compartir.borrar(0, a));
  Compartir.guardar(c, a); ok(Compartir.borrar(Compartir.clave(c), a)); eq(Compartir.listar(a), []);
});
t('almacén: no duplica el mismo código + mensaje (ignora espacios)', () => {
  const a = mem(); Compartir.guardar(Compartir.nuevoCaso(CASO), a);
  const r = Compartir.guardar(Compartir.nuevoCaso(Object.assign({}, CASO, { codigo: CASO.codigo.replace(/ /g, '  ') })), a); ok(r.duplicado); eq(Compartir.listar(a).length, 1);
  Compartir.guardar(Compartir.nuevoCaso(Object.assign({}, CASO, { diag: { msg: 'otro mensaje' } })), a); eq(Compartir.listar(a).length, 2);
});
t('almacén: tope de 50 casos (se van los más viejos)', () => {
  const a = mem();
  for (let i = 0; i < 60; i++) Compartir.guardar(Compartir.nuevoCaso({ codigo: 'int a' + i + ';', diag: { msg: 'm' + i } }), a);
  const l = Compartir.listar(a); eq(l.length, 50); eq(l[0].codigo, 'int a10;'); eq(l[49].codigo, 'int a59;');
});
t('almacén: tolera fallas, datos rotos y sin almacén', () => {
  const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('lleno'); } };
  eq(Compartir.listar(roto), []); const r = Compartir.guardar(Compartir.nuevoCaso(CASO), roto); ok(!r.ok && r.error);
  const basura = mem(); basura.setItem('editor-c-casos', '{no es json'); eq(Compartir.listar(basura), []);
  basura.setItem('editor-c-casos', '[1,"a",{"x":1}]'); eq(Compartir.listar(basura), []);
  eq(Compartir.listar(null), []); ok(!Compartir.guardar(Compartir.nuevoCaso(CASO), null).ok); ok(!Compartir.borrar(0, null));
});
t('mensajeWhatsApp: título, versión, diagnóstico, código y línea de datos', () => {
  const c = Compartir.nuevoCaso(CASO), m = Compartir.mensajeWhatsApp([c]);
  ok(m.startsWith('Caso para el entrenador del Editor C')); ok(m.includes('abc123') && m.includes("falta '&'") && m.includes('línea 2'));
  ok(m.includes('```c\n' + c.codigo + '\n```')); const ult = m.split('\n').pop(); ok(ult.startsWith('#DATOS {')); eq(JSON.parse(ult.slice(7)).casos[0].codigo, c.codigo);
  ok(Compartir.mensajeWhatsApp([c, c]).includes('Caso 2') && Compartir.mensajeWhatsApp([c, c]).includes('2 casos'));
});
t('urlWhatsApp: con y sin número, y codificado', () => {
  eq(Compartir.urlWhatsApp('hola ñ & 1', ''), 'https://wa.me/?text=' + encodeURIComponent('hola ñ & 1'));
  eq(Compartir.urlWhatsApp('hola', '+54 9 11 5555-4444'), 'https://wa.me/5491155554444?text=hola'); eq(Compartir.urlWhatsApp('x'), 'https://wa.me/?text=x');
  ok(!Compartir.recortado);
});
t('urlWhatsApp: texto corto, sin recorte y textoCompleto', () => {
  const m = Compartir.mensajeWhatsApp([Compartir.nuevoCaso(Object.assign({}, CASO, { codigo: 'int main(){}' }))]);
  const u = Compartir.urlWhatsApp(m, '549'); eq(decodeURIComponent(u.split('?text=')[1]), m); eq(Compartir.textoCompleto, m); ok(!Compartir.recortado);
});
t('urlWhatsApp: texto largo se recorta con aviso y queda en ~1800', () => {
  const m = Compartir.mensajeWhatsApp([Compartir.nuevoCaso({ codigo: '#include <stdio.h>\n' + 'printf("lineaañ %d\\n", 1);\n'.repeat(120), diag: { msg: 'm', line: 3 }, version: 'v1' })]);
  const u = Compartir.urlWhatsApp(m, ''), enc = u.split('?text=')[1], txt = decodeURIComponent(enc);
  ok(enc.length <= 1800, 'quedó en ' + enc.length); ok(txt.endsWith('(recortado: copiá el resto con Copiar)')); ok(Compartir.recortado); eq(Compartir.textoCompleto, m);
  ok(txt.includes('Caso para el entrenador') && txt.includes('```c'), 'conserva el encabezado y el bloque de código');
});
t('urlWhatsApp: corte duro con un mensaje enorme', () => {
  const u = Compartir.urlWhatsApp('ñ'.repeat(5000), '549'), enc = u.split('?text=')[1]; ok(enc.length <= 1800); ok(decodeURIComponent(enc).endsWith('Copiar)'));
});
t('exportar e importar: ida y vuelta', () => {
  const c = Compartir.nuevoCaso(CASO), j = Compartir.exportarJSON([c]); eq(JSON.parse(j).formato, 'casos-sin-respuesta-v1');
  const r = Compartir.importarJSON(j); eq(r.casos, [c]); eq(r.descartados, []);
  eq(Compartir.importarJSON(Compartir.exportarJSON([c], { compacto: true })).casos, [c]);
  eq(Compartir.importarJSON(Compartir.mensajeWhatsApp([c])).casos, [c], 'también lee el mensaje de WhatsApp');
});
t('importar: rechaza lo que no es del formato', () => {
  for (const x of ['', 'no json', '[]', '{}', '{"formato":"otro","casos":[]}', '{"formato":"casos-sin-respuesta-v1"}', '{"formato":"casos-sin-respuesta-v1","casos":5}', null, 42, undefined]) {
    const r = Compartir.importarJSON(x); eq(r.casos, [], 'entrada ' + String(x)); ok(r.descartados.length === 1 && r.descartados[0].indice === -1);
  }
  eq(Compartir.importarJSON('x'.repeat(2000001)).casos, []);
});
t('importar: descarta casos malos y limpia los dudosos', () => {
  const bueno = Compartir.nuevoCaso(CASO);
  const casos = [bueno, null, 'texto', { v: 2, codigo: 'x', diag: { msg: 'm' } }, { v: 1, codigo: '', diag: { msg: 'm' } }, { v: 1, codigo: 'x' }, { v: 1, codigo: 'x', diag: { msg: 'm' }, extra: 'z'.repeat(500) },
    { v: 1, codigo: 'x'.repeat(9000), diag: { msg: 'm' } }, { v: 1, codigo: 'x', diag: { msg: 'm' }, fecha: 'ayer' }, { v: 1, codigo: 'x', diag: { msg: 'm' }, entrada: 5 },
    { v: 1, codigo: 'ok', diag: { msg: 'm'.repeat(500), line: 'abc', code: 'E x<script>', nivel: 'otro' }, nivel_ayuda: 9, version: '<b>1</b>', chico: 1, nombre: 'Juan' }];
  const r = Compartir.importarJSON(JSON.stringify({ formato: 'casos-sin-respuesta-v1', casos }));
  eq(r.casos.length, 2); eq(r.descartados.length, 9); eq(r.casos[0], bueno);
  const l = r.casos[1]; eq(l.diag.msg.length, 300); eq(l.diag.line, 0); eq(l.diag.code, 'Exscript'); eq(l.diag.nivel, 'error'); eq(l.nivel_ayuda, 1); eq(l.version, 'b1b'); ok(!('nombre' in l) && !('chico' in l), 'campos desconocidos no pasan');
});
t('importar: código entre 4000 y 8000 se recorta; más de 200 casos se ignoran; __proto__ no contamina', () => {
  const r = Compartir.importarJSON(JSON.stringify({ formato: 'casos-sin-respuesta-v1', casos: [{ v: 1, codigo: 'x'.repeat(5000), diag: { msg: 'm' } }] }));
  eq(r.casos[0].codigo.length, 4000); eq(r.casos[0].recortado, 5000);
  const muchos = Array.from({ length: 205 }, (_, i) => ({ v: 1, codigo: 'c' + i, diag: { msg: 'm' } }));
  eq(Compartir.importarJSON(JSON.stringify({ formato: 'casos-sin-respuesta-v1', casos: muchos })).casos.length, 200);
  Compartir.importarJSON('{"formato":"casos-sin-respuesta-v1","casos":[{"__proto__":{"polluted":1},"v":1,"codigo":"x","diag":{"msg":"m"}}]}'); ok(({}).polluted === undefined);
});
t('config: forma', () => { ok(/^(|\d{10,15})$/.test(CONFIG.WHATSAPP_NUMERO), 'solo dígitos con código de país'); ok(typeof CONFIG.VERSION === 'string' && CONFIG.VERSION.length > 0); });

/* ---------- tools/kb-agregar-caso.js ---------- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kbtest-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* nada */ } });
const herramienta = (...a) => cp.spawnSync('node', [path.join(ROOT, 'tools', 'kb-agregar-caso.js'), ...a], { encoding: 'utf8', timeout: 120000 });
const CASOS = [
  Compartir.nuevoCaso({ codigo: '#include <stdio.h>\nint main() {\n    int A;\n    scanf("%d", A);\n    return 0;\n}\n', diag: { nivel: 'aviso', code: 'E-scanf-sin-amp', msg: "a scanf le falta el '&' delante de 'A' (scanf necesita &A)", line: 4 }, version: 'v1', fecha: '2026-03-01' }),
  Compartir.nuevoCaso({ codigo: '#include <stdio.h>\nint main() {\n    printf("hola\\n");\n    return 0;\n}\n', diag: { nivel: 'aviso', msg: 'no entiendo', line: 3 }, version: 'v1' })
];
t('herramienta: agrega borradores NUE-nnn sin pisar y sin repetir', () => {
  const entra = path.join(TMP, 'casos.json'), sale = path.join(TMP, 'out', 'NUEVOS.json');
  fs.writeFileSync(entra, Compartir.exportarJSON(CASOS));
  let r = herramienta(entra, '--salida', sale); eq(r.status, 0, r.stderr + r.stdout); ok(/agregados: 2/.test(r.stdout), r.stdout);
  const d = JSON.parse(fs.readFileSync(sale, 'utf8')); eq(d.map((e) => e.id), ['NUE-001', 'NUE-002']);
  const e = d[0];
  for (const k of ['id', 'categoria', 'nombre_corto', 'frecuencia', 'codigo_mal', 'codigo_bien', 'entrada', 'que_dice_gcc', 'mensaje_editor', 'explicacion', 'como_arreglarlo', 'pistas', 'relacion_con_la_materia', 'deteccion', 'como_detectarlo', 'riesgo_falso_positivo', 'nivel', 'verificado_gcc13', 'detectado_editor', 'mensaje_editor_actual', 'codigo_editor_actual', 'verificado_editor_corrige', 'notas']) ok(k in e, 'falta ' + k);
  eq(e.codigo_mal, CASOS[0].codigo); eq(e.notas.indexOf('pendiente de revisión'), 0); eq(e.pistas.length, 3); eq(e.codigo_editor_actual, 'E-scanf-sin-amp'); ok(e.detectado_editor && e.nivel === 'error');
  eq(d[1].detectado_editor, false); eq(d[1].deteccion, 'no_detectable'); eq(d[1].mensaje_editor_actual, null);
  if (cp.spawnSync('gcc', ['--version']).status === 0) ok(/warning|error/.test(e.que_dice_gcc), 'gcc: ' + e.que_dice_gcc), eq(d[1].que_dice_gcc, 'nada');
  // segunda corrida: no repite y no pisa; un caso nuevo recibe NUE-003
  const antes = fs.readFileSync(sale, 'utf8'); r = herramienta(entra, '--salida', sale); ok(/agregados: 0/.test(r.stdout)); eq(fs.readFileSync(sale, 'utf8'), antes);
  const mas = Compartir.nuevoCaso({ codigo: 'int main() { return 1; }', diag: { msg: 'otro' } }); fs.writeFileSync(entra, Compartir.exportarJSON([mas]));
  herramienta(entra, '--salida', sale); eq(JSON.parse(fs.readFileSync(sale, 'utf8')).map((x) => x.id), ['NUE-001', 'NUE-002', 'NUE-003']);
});
t('herramienta: lee el mensaje de WhatsApp (con y sin la línea de datos)', () => {
  const msg = Compartir.mensajeWhatsApp(CASOS), a = path.join(TMP, 'wa.txt'), b = path.join(TMP, 'wa2.txt');
  fs.writeFileSync(a, 'reenviado:\n' + msg + '\n'); fs.writeFileSync(b, msg.replace(/\n#DATOS.*$/, ''));
  for (const [f, s] of [[a, 'a.json'], [b, 'b.json']]) { const r = herramienta(f, '--salida', path.join(TMP, s)); ok(/agregados: 2/.test(r.stdout), r.stdout + r.stderr); eq(JSON.parse(fs.readFileSync(path.join(TMP, s), 'utf8'))[0].codigo_mal, CASOS[0].codigo); }
});
t('herramienta: archivo malo o sin uso → error y no escribe', () => {
  const mala = path.join(TMP, 'mala.json'), sale = path.join(TMP, 'nada.json'); fs.writeFileSync(mala, '{"formato":"x"}');
  const r = herramienta(mala, '--salida', sale); ok(/descartado/.test(r.stdout)); ok(!fs.existsSync(sale));
  ok(herramienta().status === 2); ok(herramienta(path.join(TMP, 'noexiste.json')).status === 2);
  const rota = path.join(TMP, 'rota.json'); fs.writeFileSync(rota, 'no es json');
  fs.writeFileSync(path.join(TMP, 'c.json'), Compartir.exportarJSON(CASOS)); const r2 = herramienta(path.join(TMP, 'c.json'), '--salida', rota); ok(r2.status === 1); eq(fs.readFileSync(rota, 'utf8'), 'no es json');
});

/* ---------- build: el sitio incluye la base ---------- */
t('build: assets/kb-data.js y los scripts del entrenador', () => {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const orden = ['compiler.js', 'runtime.js', 'examples.js', 'app.js', 'kb-data.js', 'config.js', 'kb.js', 'compartir.js'].map((f) => idx.indexOf('assets/' + f));
  ok(orden.every((p, i) => p > 0 && (i === 0 || p > orden[i - 1])), 'orden de scripts: ' + orden);
  ok(/<script defer src="assets\/kb\.js">/.test(idx));
  ok(/^(\/\*[\s\S]*?\*\/\s*)?window\.KB_DATA=\{"errores":/.test(fs.readFileSync(path.join(ROOT, 'assets', 'kb-data.js'), 'utf8')));
  ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes('assets/kb-data.js'));
  const one = fs.readFileSync(path.join(ROOT, 'dist', 'editor-c.html'), 'utf8'); ok(one.includes('window.KB_DATA=') && one.includes('Compartir') && !/<script[^>]*src=/.test(one));
});

console.log((total - fallas) + '/' + total + ' pruebas bien' + (fallas ? ', ' + fallas + ' fallan' : ''));
process.exit(fallas ? 1 : 0);

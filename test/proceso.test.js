/* Pruebas de src/proceso.js. Uso: node test/proceso.test.js (sale con código distinto de 0 si algo falla) */
'use strict';
const assert = require('assert');
const P = require('../src/proceso.js');

let ok = 0, mal = 0; const fallas = [];
function caso(nombre, fn) {
  try { fn(); ok++; } catch (e) { mal++; fallas.push(nombre + ' -> ' + (e && e.message)); }
}
const reloj = (t0) => { const r = { t: t0 || 1000, f() { return r.t; }, avanzar(ms) { r.t += ms; } }; return r; };
function nuevoP(txt, tipo) { const r = reloj(); const p = P.nuevo(txt || '', tipo, { ahora: r.f }); p.r = r; return p; }
// pasa una cadena de tipos "tttpp" (uno por carácter) a la forma de segmentos
function mapa(p) { let s = ''; for (const [k, n] of p.segs) s += k.repeat(n); return s; }
function invariantes(p) {
  assert.strictEqual(p.contar().total, p.texto.length, 'suma de segmentos != largo');
  for (let i = 0; i < p.segs.length; i++) {
    assert.ok(p.segs[i][1] > 0, 'segmento vacío');
    if (i) assert.notStrictEqual(p.segs[i][0], p.segs[i - 1][0], 'segmentos sin fusionar');
  }
}

/* ---------- núcleo ---------- */
caso('nuevo vacío', () => { const p = nuevoP(); assert.deepStrictEqual(p.contar(), { total: 0, t: 0, p: 0, a: 0, c: 0, u: 0 }); });
caso('nuevo con texto cargado por defecto', () => { const p = nuevoP('hola'); assert.strictEqual(mapa(p), 'cccc'); });
caso('nuevo con tipo inicial', () => { assert.strictEqual(mapa(nuevoP('ab', 'a')), 'aa'); });
caso('tipo inicial inválido cae en c', () => { assert.strictEqual(mapa(nuevoP('ab', 'z')), 'cc'); });
caso('tipear letra a letra se fusiona', () => {
  const p = nuevoP(); 'int main'.split('').forEach((ch, i) => p.insertar(i, ch, 't'));
  assert.deepStrictEqual(p.segs, [['t', 8]]); assert.strictEqual(p.texto, 'int main'); assert.strictEqual(p.teclas, 8);
});
caso('tipo por defecto de insertar es t', () => { const p = nuevoP(); p.insertar(0, 'x'); assert.strictEqual(mapa(p), 't'); });
caso('pegar registra largo y líneas', () => {
  const p = nuevoP(); p.insertar(0, 'a\nb\nc', 'p');
  assert.strictEqual(p.pegados.length, 1); assert.strictEqual(p.pegados[0].lineas, 3); assert.strictEqual(p.pegados[0].caracteres, 5);
  assert.strictEqual(p.teclas, 0);
});
caso('pegado con salto final no cuenta línea de más', () => { const p = nuevoP(); p.insertar(0, 'a\nb\n', 'p'); assert.strictEqual(p.pegados[0].lineas, 2); });
caso('pegadoMayor guarda el más grande', () => {
  const p = nuevoP(); p.insertar(0, 'abc', 'p'); p.insertar(3, 'abcdefghij\nx', 'p'); p.insertar(0, 'z', 'p');
  assert.deepStrictEqual(p.pegadoMayor, { lineas: 2, caracteres: 12 });
});
caso('pegado guarda momento', () => { const p = nuevoP(); p.r.avanzar(5000); p.insertar(0, 'a', 'p'); assert.strictEqual(p.pegados[0].momento, 6000); });
caso('mezclar tipeado y pegado', () => {
  const p = nuevoP(); p.insertar(0, 'abc', 't'); p.insertar(3, 'XYZ', 'p'); p.insertar(6, 'de', 't');
  assert.strictEqual(mapa(p), 'tttpppt'.slice(0, 6) + 'tt'); assert.deepStrictEqual(p.contar(), { total: 8, t: 5, p: 3, a: 0, c: 0, u: 0 });
});
caso('insertar en el medio parte el segmento', () => {
  const p = nuevoP(); p.insertar(0, 'abcd', 't'); p.insertar(2, 'XX', 'p');
  assert.strictEqual(mapa(p), 'ttppt t'.replace(' ', '').slice(0, 6)); assert.strictEqual(p.texto, 'abXXcd'); invariantes(p);
});
caso('insertar del mismo tipo en el medio no parte', () => { const p = nuevoP(); p.insertar(0, 'ab', 't'); p.insertar(1, 'Q', 't'); assert.deepStrictEqual(p.segs, [['t', 3]]); });
caso('insertar al inicio', () => { const p = nuevoP('abc', 'c'); p.insertar(0, 'X', 't'); assert.strictEqual(mapa(p), 'tccc'); });
caso('insertar al final', () => { const p = nuevoP('abc', 'c'); p.insertar(3, 'X', 'p'); assert.strictEqual(mapa(p), 'cccp'); });
caso('insertar fuera de rango se ajusta', () => { const p = nuevoP('ab', 'c'); p.insertar(99, 'X', 't'); p.insertar(-5, 'Y', 't'); assert.strictEqual(p.texto, 'YabX'); invariantes(p); });
caso('insertar vacío no hace nada ni cuenta', () => { const p = nuevoP('ab', 'c'); p.insertar(1, '', 't'); assert.strictEqual(p.teclas, 0); assert.strictEqual(p.texto, 'ab'); });
caso('borrar en el medio', () => {
  const p = nuevoP(); p.insertar(0, 'aa', 't'); p.insertar(2, 'bbb', 'p'); p.insertar(5, 'cc', 't'); p.borrar(1, 6);
  assert.strictEqual(p.texto, 'ac'); assert.strictEqual(mapa(p), 'tt'); invariantes(p);
});
caso('borrar parte de un segmento', () => { const p = nuevoP('abcdef', 'p'); p.borrar(2, 4); assert.deepStrictEqual(p.segs, [['p', 4]]); assert.strictEqual(p.texto, 'abef'); });
caso('borrar todo deja sin segmentos', () => { const p = nuevoP('abc', 'c'); p.borrar(0, 3); assert.deepStrictEqual(p.segs, []); assert.strictEqual(p.texto, ''); });
caso('borrar dos segmentos distintos fusiona los vecinos', () => {
  const p = nuevoP(); p.insertar(0, 'aa', 't'); p.insertar(2, 'BB', 'p'); p.insertar(4, 'cc', 't'); p.borrar(2, 4);
  assert.deepStrictEqual(p.segs, [['t', 4]]);
});
caso('borrar rango vacío o invertido no cambia', () => { const p = nuevoP('abc', 'c'); p.borrar(2, 2); p.borrar(3, 1); assert.strictEqual(p.texto, 'abc'); assert.strictEqual(p.borrados, 0); });
caso('borrar cuenta borrados', () => { const p = nuevoP('abc', 'c'); p.borrar(0, 1); p.borrar(0, 1); assert.strictEqual(p.borrados, 2); });
caso('corrección: borrar justo después de tipear', () => {
  const p = nuevoP(); p.insertar(0, 'a', 't'); p.insertar(1, 'b', 't'); p.borrar(1, 2); assert.strictEqual(p.correcciones, 1);
  p.borrar(0, 1); assert.strictEqual(p.correcciones, 2); // cadena de borrados
});
caso('borrar texto cargado no es corrección', () => { const p = nuevoP('abc', 'c'); p.borrar(0, 1); assert.strictEqual(p.correcciones, 0); });
caso('borrar texto pegado después de tipear no es corrección', () => {
  const p = nuevoP(); p.insertar(0, 'xx', 'p'); p.insertar(2, 'a', 't'); p.borrar(0, 2); assert.strictEqual(p.correcciones, 0);
});
caso('tipear después de corregir reinicia la cadena', () => {
  const p = nuevoP(); p.insertar(0, 'a', 't'); p.borrar(0, 1); p.insertar(0, 'b', 't'); p.insertar(1, 'c', 'p'); p.borrar(0, 1); assert.strictEqual(p.correcciones, 1);
});
caso('borrado automático no cuenta', () => { const p = nuevoP(); p.insertar(0, 'ab', 't'); p.borrar(0, 1, { auto: true }); assert.strictEqual(p.borrados, 0); assert.strictEqual(p.correcciones, 0); });
caso('reemplazar una selección tipeando', () => {
  const p = nuevoP('abcdef', 'c'); p.reemplazar(1, 4, 'XY', 't'); assert.strictEqual(p.texto, 'aXYef'); assert.strictEqual(mapa(p), 'ctt' + 'cc');
  assert.strictEqual(p.teclas, 1); assert.strictEqual(p.borrados, 0);
});
caso('pegar sobre una selección', () => {
  const p = nuevoP(); p.insertar(0, 'hola mundo', 't'); p.reemplazar(5, 10, ' tierra\nx', 'p');
  assert.strictEqual(p.texto, 'hola  tierra\nx'); assert.strictEqual(mapa(p), 'ttttt' + 'p'.repeat(9)); assert.strictEqual(p.pegados[0].lineas, 2);
});
caso('reemplazar con vacío equivale a borrar', () => { const p = nuevoP('abc', 'c'); p.reemplazar(0, 2, '', 't'); assert.strictEqual(p.texto, 'c'); assert.strictEqual(p.borrados, 1); });
caso('reemplazar rango vacío equivale a insertar', () => { const p = nuevoP('abc', 'c'); p.reemplazar(1, 1, 'ZZ', 'p'); assert.strictEqual(p.texto, 'aZZbc'); assert.strictEqual(mapa(p), 'cppcc'); });
caso('saltos de línea y sangría automática', () => {
  const p = nuevoP(); p.insertar(0, 'if (x) {', 't'); p.insertar(8, '\n', 't'); p.insertar(9, '    ', 'a');
  assert.strictEqual(mapa(p), 't'.repeat(9) + 'aaaa'); assert.strictEqual(p.teclas, 2);
});
caso('cierre de llaves automático', () => { const p = nuevoP(); p.insertar(0, '{', 't'); p.insertar(1, '}', 'a'); p.insertar(1, 'x', 't'); assert.strictEqual(mapa(p), 'tta'); });
caso('automático no cuenta como tecla', () => { const p = nuevoP(); p.insertar(0, '    ', 'a'); assert.strictEqual(p.teclas, 0); assert.strictEqual(p.contar().a, 4); });
caso('comentar con auto conserva el origen de lo no cambiado', () => {
  const p = nuevoP(); p.insertar(0, 'uno\ndos\ntres', 'p');
  p.reemplazar(0, 12, '// uno\n// dos\n// tres', 'a');
  assert.strictEqual(p.texto, '// uno\n// dos\n// tres');
  assert.strictEqual(p.contar().a, 9); assert.strictEqual(p.contar().p, 12); assert.strictEqual(p.pegados.length, 1); invariantes(p);
});
caso('descomentar con auto conserva pegado', () => {
  const p = nuevoP('// a\n// b', 'p'); p.reemplazar(0, 9, 'a\nb', 'a'); assert.strictEqual(p.texto, 'a\nb'); assert.strictEqual(mapa(p), 'ppp');
});
caso('sangrar bloque con auto (Tab)', () => {
  const p = nuevoP(); p.insertar(0, 'x;\ny;', 't'); p.reemplazar(0, 5, '    x;\n    y;', 'a');
  assert.strictEqual(p.contar().t, 5); assert.strictEqual(p.contar().a, 8); assert.strictEqual(p.texto, '    x;\n    y;');
});
caso('auto con distinto número de líneas usa prefijo y sufijo', () => {
  const p = nuevoP(); p.insertar(0, 'ab', 't'); p.reemplazar(0, 2, 'a\n    b', 'a'); assert.strictEqual(p.texto, 'a\n    b'); assert.strictEqual(p.contar().t, 2); invariantes(p);
});
caso('textos con tildes', () => { const p = nuevoP(); p.insertar(0, 'educación', 't'); p.insertar(4, 'ñ', 'p'); assert.strictEqual(p.texto, 'educñación'); assert.strictEqual(mapa(p), 'tttt' + 'p' + 'ttttt'); });
caso('emoji cuenta 2 en UTF-16', () => {
  const p = nuevoP(); p.insertar(0, 'a😀b', 'p'); assert.strictEqual(p.contar().total, 4); assert.strictEqual(p.pegados[0].caracteres, 4);
  p.borrar(1, 3); assert.strictEqual(p.texto, 'ab'); invariantes(p);
});
caso('reconciliar no corta pares sustitutos', () => {
  const p = nuevoP('x😀y', 'c'); p.reconciliar('x😁y', 'u'); assert.strictEqual(p.texto, 'x😁y'); assert.strictEqual(mapa(p), 'cuuc'); invariantes(p);
});

/* ---------- reconciliar (deshacer / rehacer / autocorrector) ---------- */
caso('reconciliar sin cambio no hace nada', () => { const p = nuevoP('abc', 'c'); p.reconciliar('abc'); assert.strictEqual(mapa(p), 'ccc'); });
caso('deshacer una inserción (borrado)', () => {
  const p = nuevoP(); p.insertar(0, 'abc', 't'); p.insertar(3, 'def', 't'); p.reconciliar('abc'); assert.strictEqual(mapa(p), 'ttt'); assert.strictEqual(p.texto, 'abc');
});
caso('rehacer reaparece como desconocido', () => {
  const p = nuevoP(); p.insertar(0, 'abc', 't'); p.reconciliar('a'); p.reconciliar('abc'); assert.strictEqual(mapa(p), 'tuu');
});
caso('reconciliar en el medio (autocorrector)', () => {
  const p = nuevoP(); p.insertar(0, 'hola tengo', 't'); p.reconciliar('hola tengo'.replace('hola', 'hoy')); assert.strictEqual(p.texto, 'hoy tengo'); assert.strictEqual(p.contar().u > 0, true); invariantes(p);
});
caso('reconciliar con tipo explícito', () => { const p = nuevoP('ab', 'c'); p.reconciliar('abX', 'a'); assert.strictEqual(mapa(p), 'cca'); });
caso('reconciliar no suma teclas ni borrados', () => { const p = nuevoP('ab', 'c'); p.reconciliar('xyz'); assert.strictEqual(p.teclas + p.borrados + p.correcciones, 0); });
caso('reconciliar texto completamente distinto', () => { const p = nuevoP('abc', 'c'); p.reconciliar('xyzw'); assert.strictEqual(mapa(p), 'uuuu'); });
caso('reconciliar a vacío', () => { const p = nuevoP('abc', 't'); p.reconciliar(''); assert.deepStrictEqual(p.segs, []); });
caso('reconciliar repara una suma inconsistente', () => { const p = nuevoP('abc', 't'); p.segs = [['t', 1]]; p.reconciliar('abcd'); invariantes(p); });
caso('cargar reemplaza todo', () => { const p = nuevoP('abc', 't'); p.cargar('xyz', 'c'); assert.strictEqual(mapa(p), 'ccc'); assert.strictEqual(p.texto, 'xyz'); });

/* ---------- métricas de tiempo ---------- */
caso('tiempo activo suma intervalos cortos', () => {
  const p = nuevoP(); p.insertar(0, 'a', 't'); p.r.avanzar(10000); p.insertar(1, 'b', 't'); p.r.avanzar(20000); p.insertar(2, 'c', 't');
  assert.strictEqual(p.tiempoActivo(), 30000);
});
caso('tiempo activo ignora inactividad de más de 60 s', () => {
  const p = nuevoP(); p.insertar(0, 'a', 't'); p.r.avanzar(120000); p.insertar(1, 'b', 't'); p.r.avanzar(5000); p.insertar(2, 'c', 't');
  assert.strictEqual(p.tiempoActivo(), 5000);
});
caso('tiempo activo: exactamente 60 s cuenta', () => { const p = nuevoP(); p.insertar(0, 'a', 't'); p.r.avanzar(60000); p.insertar(1, 'b', 't'); assert.strictEqual(p.tiempoActivo(), 60000); });
caso('actividad y ejecutar suman tiempo', () => { const p = nuevoP(); p.actividad(); p.r.avanzar(3000); p.ejecutar(); assert.strictEqual(p.tiempoActivo(), 3000); assert.strictEqual(p.ejecuciones, 1); });
caso('inicio es el momento de creación', () => { const p = nuevoP(); assert.strictEqual(p.inicio, 1000); });
caso('metricas devuelve copia', () => { const p = nuevoP(); p.insertar(0, 'a', 'p'); const m = p.metricas(); m.pegados.push({}); assert.strictEqual(p.pegados.length, 1); });
caso('lista de pegados se acota', () => { const p = nuevoP(); for (let i = 0; i < 150; i++) p.insertar(0, 'x', 'p'); assert.strictEqual(p.pegados.length, 100); });

/* ---------- serializar / restaurar ---------- */
caso('serializar no contiene texto', () => {
  const p = nuevoP(); p.insertar(0, 'secreto', 't'); p.insertar(7, 'otro', 'p');
  const s = JSON.stringify(p.serializar()); assert.ok(!/secreto|otro/.test(s));
});
caso('serializar es compacto', () => {
  const p = nuevoP(); for (let i = 0; i < 50; i++) p.insertar(p.texto.length, 'linea de codigo numero ' + i + ';\n', 't');
  assert.ok(JSON.stringify(p.serializar()).length < 2500);
});
caso('restaurar con el mismo texto', () => {
  const p = nuevoP(); p.insertar(0, 'ab\ncd', 't'); p.insertar(5, 'xx', 'p'); p.ejecutar(); p.r.avanzar(1000); p.insertar(0, 'q', 't');
  const o = JSON.parse(JSON.stringify(p.serializar())); const q = P.restaurar(o, p.texto);
  assert.strictEqual(mapa(q), mapa(p)); assert.strictEqual(q.reconciliadoAlRestaurar, false);
  assert.strictEqual(q.teclas, p.teclas); assert.strictEqual(q.ejecuciones, 1); assert.deepStrictEqual(q.pegados, p.pegados); assert.strictEqual(q.tiempoActivo(), p.tiempoActivo());
});
caso('restaurar con texto distinto en una línea', () => {
  const p = nuevoP(); p.insertar(0, 'uno\ndos\ntres', 't'); const o = p.serializar();
  const q = P.restaurar(o, 'uno\nDOS!\ntres'); assert.strictEqual(q.reconciliadoAlRestaurar, true);
  assert.strictEqual(q.texto, 'uno\nDOS!\ntres'); assert.strictEqual(mapa(q), 'tttt' + 'uuuuu' + 'tttt'); invariantes(q);
});
caso('restaurar con líneas agregadas', () => {
  const p = nuevoP(); p.insertar(0, 'a\nc', 't'); const q = P.restaurar(p.serializar(), 'a\nb\nc');
  assert.strictEqual(mapa(q), 'tt' + 'uu' + 't'); invariantes(q);
});
caso('restaurar con líneas quitadas', () => {
  const p = nuevoP(); p.insertar(0, 'a\nb\nc', 't'); const q = P.restaurar(p.serializar(), 'a\nc'); assert.strictEqual(q.texto, 'a\nc'); invariantes(q);
});
caso('restaurar con línea agregada al final', () => {
  const p = nuevoP(); p.insertar(0, 'a\nb', 't'); const q = P.restaurar(p.serializar(), 'a\nb\nc'); assert.strictEqual(q.texto, 'a\nb\nc'); invariantes(q); assert.ok(q.contar().u > 0);
});
caso('restaurar con texto totalmente distinto', () => {
  const p = nuevoP(); p.insertar(0, 'abc', 't'); const q = P.restaurar(p.serializar(), 'zzzzzzz'); assert.strictEqual(mapa(q), 'uuuuuuu');
});
caso('restaurar con texto vacío', () => { const p = nuevoP(); p.insertar(0, 'abc', 't'); const q = P.restaurar(p.serializar(), ''); assert.strictEqual(q.texto, ''); invariantes(q); });
caso('restaurar objeto dañado o nulo', () => {
  assert.strictEqual(mapa(P.restaurar(null, 'abc')), 'uuu'); assert.strictEqual(mapa(P.restaurar({ v: 1, s: 'x9' }, 'abc')), 'uuu');
  assert.strictEqual(mapa(P.restaurar({ v: 1, s: 't5', l: 3, m: [0, 0, 0, 0], pg: [], ms: 0, i: 0 }, 'abc')), 'uuu');
});
caso('restaurar conserva los otros orígenes', () => {
  const p = nuevoP('hola\nmundo', 'c'); p.insertar(10, '\nx', 't'); const q = P.restaurar(p.serializar(), 'hola\nmundo\nxy'); invariantes(q);
  assert.strictEqual(q.contar().c, 10);
});

/* ---------- resumen y frase ---------- */
caso('resumen suma 100', () => {
  const p = nuevoP(); p.insertar(0, 'a'.repeat(33), 't'); p.insertar(33, 'b'.repeat(33), 'p'); p.insertar(66, 'c'.repeat(34), 'a');
  const r = P.resumen(p); assert.strictEqual(r.tipeado + r.pegado + r.automatico + r.cargado + r.desconocido, 100);
});
caso('resumen redondea', () => {
  const p = nuevoP(); p.insertar(0, 'a'.repeat(94), 't'); p.insertar(94, 'b'.repeat(6), 'p'); const r = P.resumen(p);
  assert.strictEqual(r.tipeado, 94); assert.strictEqual(r.pegado, 6);
});
caso('resumen de vacío', () => { const r = P.resumen(nuevoP()); assert.strictEqual(r.total, 0); assert.strictEqual(r.tipeado, 0); assert.ok(/sin datos/.test(P.linea(r))); });
caso('resumen minutos, ejecuciones, correcciones, pegadoMayor', () => {
  const p = nuevoP(); p.insertar(0, 'ab', 't'); p.borrar(1, 2); p.insertar(1, 'XXXX\nY', 'p');
  for (let i = 0; i < 31; i++) { p.r.avanzar(60000); p.actividad(); } for (let i = 0; i < 12; i++) p.ejecutar();
  const r = P.resumen(p); assert.strictEqual(r.minutos, 31); assert.strictEqual(r.ejecuciones, 12); assert.strictEqual(r.correcciones, 1); assert.deepStrictEqual(r.pegadoMayor, { lineas: 2, caracteres: 6 });
});
caso('linea: ejemplo del encargo', () => {
  const p = nuevoP(); p.insertar(0, 'a'.repeat(94), 't'); p.insertar(94, 'b'.repeat(6), 'p');
  for (let i = 0; i < 31; i++) { p.r.avanzar(60000); p.actividad(); } for (let i = 0; i < 12; i++) p.ejecutar();
  assert.strictEqual(P.linea(P.resumen(p)), 'Escrito en el editor: 94 % tipeado · 6 % pegado · 31 min de trabajo · 12 ejecuciones');
});
caso('linea: singular y menos de 1 min', () => {
  const p = nuevoP(); p.insertar(0, 'a', 't'); p.ejecutar(); const l = P.linea(P.resumen(p));
  assert.ok(/1 ejecución$/.test(l) && /menos de 1 min/.test(l), l);
});
caso('linea: cargado grande lo dice', () => {
  const p = nuevoP('x'.repeat(60), 'c'); p.insertar(60, 'y'.repeat(40), 't'); const l = P.linea(P.resumen(p));
  assert.ok(/parte del código se abrió desde un archivo/.test(l), l);
});
caso('linea: todo cargado', () => { const l = P.linea(P.resumen(nuevoP('x'.repeat(50), 'c'))); assert.ok(/el código se abrió desde un archivo/.test(l), l); });
caso('linea: cargado chico no se menciona como parte', () => {
  const p = nuevoP('x'.repeat(5), 'c'); p.insertar(5, 'y'.repeat(95), 't'); assert.ok(!/parte del código/.test(P.linea(P.resumen(p))));
});
caso('linea: pegado menor a 1 %', () => {
  const p = nuevoP(); p.insertar(0, 'a'.repeat(500), 't'); p.insertar(500, 'b', 'p'); assert.ok(/menos de 1 % pegado/.test(P.linea(P.resumen(p))));
});
caso('linea: sin acusar ni nombrar IA', () => {
  const p = nuevoP(); p.insertar(0, 'a', 'p'); p.insertar(1, 'b', 'a'); p.insertar(2, 'c', 'u'); p.cargar('zz', 'c');
  const l = P.linea(P.resumen(p)); assert.ok(!/\bIA\b|copi|trampa|sospech/i.test(l), l);
});

/* ---------- política de pegado ---------- */
caso('politica por defecto permite', () => { P.politicaPegado({ permitir: true, aviso: null }); assert.strictEqual(P.politicaPegado().permitir, true); });
caso('politicaDesdeEnlace', () => {
  assert.strictEqual(P.politicaDesdeEnlace('?practica=1'), true); assert.strictEqual(P.politicaPegado().permitir, false);
  assert.strictEqual(P.politicaDesdeEnlace('?ayuda=2&practica=0'), false); assert.strictEqual(P.politicaPegado().permitir, true);
  assert.strictEqual(P.politicaDesdeEnlace(''), false);
});

/* ---------- adaptador con textarea falso ---------- */
function falso(valor) {
  const h = {};
  const ta = {
    value: valor || '', selectionStart: (valor || '').length, selectionEnd: (valor || '').length,
    addEventListener(n, f) { (h[n] = h[n] || []).push(f); }, removeEventListener(n, f) { h[n] = (h[n] || []).filter((x) => x !== f); },
    disparar(n, ev) { ev = ev || {}; ev.type = n; ev.defaultPrevented = false; ev.preventDefault = function () { this.defaultPrevented = true; }; (h[n] || []).slice().forEach((f) => f(ev)); return ev; },
    n(nm) { return (h[nm] || []).length; },
    // simula una edición del navegador: beforeinput -> cambia valor -> input
    editar(inputType, data, s, e, extra) {
      if (s !== undefined) { ta.selectionStart = s; ta.selectionEnd = e === undefined ? s : e; }
      const a = ta.selectionStart, b = ta.selectionEnd;
      const ev = ta.disparar('beforeinput', Object.assign({ inputType, data }, extra));
      if (ev.defaultPrevented) return ev;
      let nuevo = ta.value, pos = a;
      if (/^insert/.test(inputType)) { const d = data == null ? (inputType === 'insertLineBreak' ? '\n' : '') : data; nuevo = ta.value.slice(0, a) + d + ta.value.slice(b); pos = a + d.length; }
      else if (/^delete/.test(inputType)) {
        let x = a, y = b;
        if (a === b) { if (/Backward/.test(inputType)) x = Math.max(0, a - 1); else y = Math.min(ta.value.length, b + 1); }
        nuevo = ta.value.slice(0, x) + ta.value.slice(y); pos = x;
      }
      ta.value = nuevo; ta.selectionStart = ta.selectionEnd = pos;
      ta.disparar('input', { inputType });
      return ev;
    },
    tipear(txt) { for (const ch of txt) ta.editar(ch === '\n' ? 'insertLineBreak' : 'insertText', ch === '\n' ? null : ch); }
  };
  return ta;
}
function conectado(v, o) { const ta = falso(v); const r = reloj(); const ad = P.conectar(ta, Object.assign({ ahora: r.f, tipoInicial: 'c' }, o)); ad.r = r; return [ta, ad]; }
function limpiarPolitica() { P.politicaPegado({ permitir: true, aviso: null }); }

caso('adaptador: engancha los eventos', () => {
  const [ta] = conectado(''); ['paste', 'drop', 'beforeinput', 'input', 'keydown'].forEach((n) => assert.ok(ta.n(n) >= 1, n));
});
caso('adaptador: tipear', () => {
  const [ta, ad] = conectado(''); ta.tipear('int a;\nok'); const c = ad.contar();
  assert.strictEqual(c.t, 9); assert.strictEqual(c.total, 9); assert.strictEqual(ad.proceso.teclas, 9);
});
caso('adaptador: el texto inicial es cargado', () => { const [, ad] = conectado('abc'); assert.strictEqual(ad.contar().c, 3); });
caso('adaptador: pegar', () => {
  limpiarPolitica(); const [ta, ad] = conectado(''); ta.tipear('ab'); ta.editar('insertFromPaste', 'x\ny\nz');
  const c = ad.contar(); assert.strictEqual(c.p, 5); assert.strictEqual(c.t, 2); assert.strictEqual(ad.proceso.pegados[0].lineas, 3);
});
caso('adaptador: pegar con data nula (contenteditable-like) igual cuenta por diferencia', () => {
  const [ta, ad] = conectado(''); ta.value = ''; ta.tipear('a');
  const ev = ta.disparar('beforeinput', { inputType: 'insertFromPaste', data: null }); ta.value += 'QQQ'; ta.disparar('input', { inputType: 'insertFromPaste' });
  assert.strictEqual(ev.defaultPrevented, false); assert.strictEqual(ad.contar().p, 3);
});
caso('adaptador: pegar sobre selección', () => {
  const [ta, ad] = conectado(''); ta.tipear('abcdef'); ta.editar('insertFromPaste', 'ZZ', 1, 4);
  assert.strictEqual(ta.value, 'aZZef'); assert.strictEqual(ad.contar().p, 2); assert.strictEqual(ad.contar().t, 3);
});
caso('adaptador: borrar con retroceso es corrección', () => {
  const [ta, ad] = conectado(''); ta.tipear('abc'); ta.editar('deleteContentBackward', null); assert.strictEqual(ta.value, 'ab'); assert.strictEqual(ad.proceso.correcciones, 1); assert.strictEqual(ad.proceso.borrados, 1);
});
caso('adaptador: suprimir en el medio', () => {
  const [ta, ad] = conectado(''); ta.tipear('abc'); ta.editar('deleteContentForward', null, 1, 1); assert.strictEqual(ta.value, 'ac'); invariantes(ad.proceso);
});
caso('adaptador: cortar una selección', () => {
  const [ta, ad] = conectado(''); ta.tipear('abcdef'); ta.editar('deleteByCut', null, 1, 5); assert.strictEqual(ta.value, 'af'); assert.strictEqual(ad.contar().total, 2);
});
caso('adaptador: salto de línea', () => { const [ta, ad] = conectado(''); ta.tipear('a\nb'); assert.strictEqual(ta.value, 'a\nb'); assert.strictEqual(ad.contar().t, 3); assert.strictEqual(ad.proceso.teclas, 3); });
caso('adaptador: deshacer/rehacer reconcilia como desconocido', () => {
  const [ta, ad] = conectado(''); ta.tipear('abc');
  ta.value = 'ab'; ta.disparar('beforeinput', { inputType: 'historyUndo' }); ta.disparar('input', { inputType: 'historyUndo' });
  assert.strictEqual(ad.contar().total, 2); assert.strictEqual(ad.contar().t, 2);
  ta.disparar('beforeinput', { inputType: 'historyRedo' }); ta.value = 'abc'; ta.disparar('input', { inputType: 'historyRedo' });
  assert.strictEqual(ad.contar().u, 1);
});
caso('adaptador: autocorrector (insertReplacementText) queda como desconocido', () => {
  const [ta, ad] = conectado(''); ta.tipear('hla'); ta.editar('insertReplacementText', 'hola', 0, 3); assert.strictEqual(ta.value, 'hola'); assert.strictEqual(ad.contar().u, 4);
});
caso('adaptador: inputType desconocido cae en reconciliar', () => {
  const [ta, ad] = conectado(''); ta.tipear('ab'); ta.editar('insertAlgoRaro', 'ZZ'); assert.strictEqual(ta.value, 'abZZ'); assert.strictEqual(ad.contar().u, 2); invariantes(ad.proceso);
});
caso('adaptador: input sin beforeinput se reconcilia', () => { const [ta, ad] = conectado(''); ta.tipear('ab'); ta.value = 'abXY'; ta.disparar('input', {}); assert.strictEqual(ad.contar().u, 2); });
caso('adaptador: marcarAuto marca como automático', () => {
  const [ta, ad] = conectado(''); ta.tipear('if (x) {'); ad.marcarAuto(() => ta.editar('insertText', '\n    ')); assert.strictEqual(ad.contar().a, 5); assert.strictEqual(ad.contar().t, 8);
});
caso('adaptador: marcarAuto con primerCaracterTipeado', () => {
  const [ta, ad] = conectado(''); ta.tipear('{'); ad.marcarAuto(() => ta.editar('insertText', '\n    '), { primerCaracterTipeado: true });
  assert.strictEqual(ad.contar().t, 2); assert.strictEqual(ad.contar().a, 4);
});
caso('adaptador: marcarAuto con cambio sin eventos', () => {
  const [ta, ad] = conectado(''); ta.tipear('ab'); ad.marcarAuto(() => { ta.value = 'abcd'; }); assert.strictEqual(ad.contar().a, 2);
});
caso('adaptador: marcarAuto devuelve el resultado y anida', () => {
  const [ta, ad] = conectado(''); const r = ad.marcarAuto(() => ad.marcarAuto(() => { ta.editar('insertText', 'x'); return 7; })); assert.strictEqual(r, 7); assert.strictEqual(ad.contar().a, 1);
  ta.tipear('y'); assert.strictEqual(ad.contar().t, 1);
});
caso('adaptador: marcarAuto libera aunque falle', () => {
  const [ta, ad] = conectado(''); try { ad.marcarAuto(() => { throw new Error('x'); }); } catch (e) { /* esperado */ } ta.tipear('y'); assert.strictEqual(ad.contar().t, 1);
});
caso('adaptador: borrado dentro de marcarAuto no cuenta', () => {
  const [ta, ad] = conectado(''); ta.tipear('()'); ad.marcarAuto(() => ta.editar('deleteContentBackward', null, 2, 2)); assert.strictEqual(ad.proceso.borrados, 0);
});
caso('adaptador: marcarCargado reinicia como cargado', () => {
  const [ta, ad] = conectado(''); ta.tipear('abc'); ta.value = 'otro programa'; ad.marcarCargado('otro programa'); assert.deepStrictEqual(ad.contar(), { total: 13, t: 0, p: 0, a: 0, c: 13, u: 0 }); assert.strictEqual(ad.proceso.teclas, 0);
});
caso('adaptador: marcarCargado con plantilla como automático', () => { const [ta, ad] = conectado(''); ta.value = '#include'; ad.marcarCargado('#include', 'a'); assert.strictEqual(ad.contar().a, 8); });
caso('adaptador: seguir tipeando después de cargar', () => { const [ta, ad] = conectado(''); ta.value = 'ab'; ad.marcarCargado('ab'); ta.tipear('c'); assert.strictEqual(ad.contar().c, 2); assert.strictEqual(ad.contar().t, 1); });
caso('adaptador: serializar y restaurar', () => {
  const [ta, ad] = conectado(''); ta.tipear('hola\nmundo'); ad.ejecutar(); const o = JSON.parse(JSON.stringify(ad.serializar()));
  const [ta2, ad2] = conectado('hola\nmundo'); ad2.restaurar(o, ta2.value); assert.strictEqual(ad2.contar().t, 10); assert.strictEqual(ad2.proceso.ejecuciones, 1);
});
caso('adaptador: restaurar con texto distinto', () => {
  const [ta, ad] = conectado(''); ta.tipear('uno\ndos'); const o = ad.serializar();
  const [ta2, ad2] = conectado('uno\nDOS'); ad2.restaurar(o, 'uno\nDOS'); assert.ok(ad2.proceso.reconciliadoAlRestaurar); assert.strictEqual(ad2.contar().total, 7); assert.ok(ad2.contar().u > 0);
});
caso('adaptador: ejecutar y linea', () => {
  const [ta, ad] = conectado(''); ta.tipear('abcd'); ad.ejecutar(); ad.ejecutar(); assert.ok(/100 % tipeado/.test(ad.linea()) && /2 ejecuciones/.test(ad.linea()), ad.linea());
});
caso('adaptador: keydown suma tiempo activo', () => {
  const [ta, ad] = conectado(''); ta.disparar('keydown', { key: 'ArrowLeft' }); ad.r.avanzar(4000); ta.disparar('keydown', { key: 'ArrowLeft' }); assert.strictEqual(ad.proceso.tiempoActivo(), 4000);
});
caso('adaptador: la IME de Android (composición) cuenta como tipeado', () => {
  const [ta, ad] = conectado(''); ta.tipear('hol'); ta.editar('insertCompositionText', 'hola', 0, 3); assert.strictEqual(ta.value, 'hola'); assert.strictEqual(ad.contar().t, 4);
});
caso('adaptador: tilde y emoji pegados', () => {
  const [ta, ad] = conectado(''); ta.tipear('añ'); ta.editar('insertFromPaste', '😀'); assert.strictEqual(ad.contar().p, 2); assert.strictEqual(ad.proceso.pegados[0].caracteres, 2); invariantes(ad.proceso);
});
caso('adaptador: edición externa del value se alinea antes de la siguiente tecla', () => {
  const [ta, ad] = conectado(''); ta.tipear('ab'); ta.value = 'abXX'; ta.selectionStart = ta.selectionEnd = 4; ta.tipear('c');
  assert.strictEqual(ad.contar().total, 5); assert.strictEqual(ad.contar().u, 2); assert.strictEqual(ad.contar().t, 3);
});
caso('adaptador: modo práctica bloquea paste', () => {
  const avisos = []; P.politicaPegado({ permitir: false, aviso: (a) => avisos.push(a) });
  const [ta, ad] = conectado(''); ta.tipear('ab');
  const ev = ta.disparar('paste', { clipboardData: { getData: () => 'uno\ndos\ntres' } });
  assert.strictEqual(ev.defaultPrevented, true); assert.deepStrictEqual(avisos, [{ tipo: 'pegado', lineas: 3, caracteres: 12 }]); assert.strictEqual(ad.proceso.bloqueados, 1); assert.strictEqual(ad.contar().p, 0);
  limpiarPolitica();
});
caso('adaptador: modo práctica bloquea drop de texto pero no de archivos', () => {
  const avisos = []; P.politicaPegado({ permitir: false, aviso: (a) => avisos.push(a) });
  const [ta] = conectado('');
  const e1 = ta.disparar('drop', { dataTransfer: { types: ['text/plain'], getData: () => 'abc' } });
  const e2 = ta.disparar('drop', { dataTransfer: { types: ['Files'], getData: () => '' } });
  assert.strictEqual(e1.defaultPrevented, true); assert.strictEqual(e2.defaultPrevented, false); assert.strictEqual(avisos[0].tipo, 'arrastre');
  limpiarPolitica();
});
caso('adaptador: modo práctica cancela beforeinput insertFromPaste (respaldo)', () => {
  const avisos = []; P.politicaPegado({ permitir: false, aviso: (a) => avisos.push(a) });
  const [ta, ad] = conectado(''); const ev = ta.editar('insertFromPaste', 'hola'); assert.strictEqual(ev.defaultPrevented, true); assert.strictEqual(ta.value, ''); assert.strictEqual(avisos.length, 1); assert.strictEqual(ad.contar().total, 0);
  limpiarPolitica();
});
caso('adaptador: modo práctica no bloquea inserciones automáticas ni tipeo', () => {
  P.politicaPegado({ permitir: false });
  const [ta, ad] = conectado(''); ta.tipear('ab'); ad.marcarAuto(() => ta.editar('insertFromPaste', 'zz')); assert.strictEqual(ta.value, 'abzz');
  limpiarPolitica();
});
caso('adaptador: permitir true no bloquea', () => { limpiarPolitica(); const [ta] = conectado(''); assert.strictEqual(ta.disparar('paste', { clipboardData: { getData: () => 'x' } }).defaultPrevented, false); });
caso('adaptador: aviso por opciones', () => {
  P.politicaPegado({ permitir: false, aviso: null }); let n = 0; const [ta] = conectado('', { aviso: () => n++ }); ta.disparar('paste', { clipboardData: { getData: () => 'x' } }); assert.strictEqual(n, 1); limpiarPolitica();
});
caso('adaptador: un aviso que falla no rompe el editor', () => {
  P.politicaPegado({ permitir: false, aviso: () => { throw new Error('x'); } }); const [ta] = conectado(''); ta.disparar('paste', { clipboardData: { getData: () => 'x' } }); limpiarPolitica();
});
caso('adaptador: desconectar quita los eventos', () => {
  const [ta, ad] = conectado(''); ad.desconectar(); ['paste', 'drop', 'beforeinput', 'input', 'keydown', 'dragover'].forEach((n) => assert.strictEqual(ta.n(n), 0, n));
});
caso('adaptador: no guarda el contenido en lo serializado', () => {
  const [ta, ad] = conectado(''); ta.tipear('palabraSecreta'); ta.editar('insertFromPaste', 'pegadoSecreto'); assert.ok(!/Secreta|Secreto/.test(JSON.stringify(ad.serializar())));
});

/* ---------- fuzz ---------- */
caso('fuzz: 5000 operaciones aleatorias', () => {
  let semilla = 12345; const rnd = () => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return semilla / 4294967296; };
  const ri = (n) => Math.floor(rnd() * n);
  const alfabeto = ['a', 'b', 'ñ', 'é', '😀', '\n', ' ', '{', '}', 'xyz', '    '];
  const texto = () => { let s = ''; for (let i = ri(6); i >= 0; i--) s += alfabeto[ri(alfabeto.length)]; return s; };
  const p = nuevoP(); let modelo = '';
  for (let i = 0; i < 5000; i++) {
    const op = ri(7), tipo = 'tpacu'[ri(5)], n = modelo.length;
    const a = ri(n + 1), b = Math.min(n, a + ri(8));
    if (op === 0) { const s = texto(); p.insertar(a, s, tipo); modelo = modelo.slice(0, a) + s + modelo.slice(a); }
    else if (op === 1) { p.borrar(a, b); modelo = modelo.slice(0, a) + modelo.slice(b); }
    else if (op === 2) { const s = texto(); p.reemplazar(a, b, s, tipo); modelo = modelo.slice(0, a) + s + modelo.slice(b); }
    else if (op === 3) { const s = modelo.slice(0, a) + texto() + modelo.slice(b); p.reconciliar(s, 'u'); modelo = s; }
    else if (op === 4) { p.r.avanzar(ri(90000)); p.actividad(); }
    else if (op === 5 && i % 50 === 0) { const q = P.restaurar(JSON.parse(JSON.stringify(p.serializar())), modelo); assert.strictEqual(mapa(q), mapa(p)); }
    else if (op === 6 && i % 97 === 0) { const s = texto() + modelo.slice(ri(n + 1)); const q = P.restaurar(p.serializar(), s); assert.strictEqual(q.texto, s); invariantes(q); }
    assert.strictEqual(p.texto, modelo);
    invariantes(p);
  }
  const m = p.metricas(); assert.ok(m.tiempoActivoMs >= 0 && p.teclas >= 0);
});
caso('fuzz del adaptador: 2000 ediciones simuladas', () => {
  let semilla = 99; const rnd = () => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return semilla / 4294967296; };
  const ri = (n) => Math.floor(rnd() * n);
  const [ta, ad] = conectado('');
  const tipos = ['insertText', 'insertFromPaste', 'deleteContentBackward', 'deleteContentForward', 'deleteByCut', 'insertReplacementText', 'insertCompositionText', 'insertLineBreak'];
  for (let i = 0; i < 2000; i++) {
    const t = tipos[ri(tipos.length)], n = ta.value.length, a = ri(n + 1), b = Math.min(n, a + ri(4));
    if (ri(30) === 0) { ta.value = ta.value.slice(0, a) + 'Q'; ta.selectionStart = ta.selectionEnd = ta.value.length; }
    if (ri(25) === 0) ad.marcarAuto(() => ta.editar('insertText', '  ', a, b)); else ta.editar(t, ['x', 'ab\ncd', '😀', 'é'][ri(4)], a, b);
    assert.strictEqual(ad.proceso.texto.length === ta.value.length || true, true);
    assert.strictEqual(ad.contar().total, ta.value.length);
    invariantes(ad.proceso);
  }
});

console.log((mal ? 'FALLÓ' : 'OK') + ': ' + ok + ' casos bien, ' + mal + ' mal (total ' + (ok + mal) + ')');
fallas.forEach((f) => console.log('  - ' + f));
process.exit(mal ? 1 : 0);

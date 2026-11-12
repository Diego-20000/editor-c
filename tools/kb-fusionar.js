// Fusiona las entregas de ChatGPT (kb/nuevo/{PUNTUACION,LITERALES,OPERADORES,BIBLIOTECA}.json) con kb/ayuda.json.
// uso: node tools/kb-fusionar.js        (reescribe kb/ayuda.json; se puede correr más de una vez: da siempre el mismo resultado)
// Criterio (decidido con Diego):
//  - Si el elemento ya existía, se MANTIENEN sus textos (que_es, como_se_usa, error_tipico, en_la_materia): están revisados.
//    De la entrega se suman: detalle, ocasiones, relacionados, y las palabras de búsqueda nuevas.
//  - Si el elemento es nuevo, entra completo.
//  - No se copia el relleno genérico: el «detalle» de plantilla de las palabras clave y las ocasiones que dicen lo mismo para todos
//    («En una expresión o instrucción donde se llama a la función»).
const fs = require('fs'), path = require('path');
const KB = path.join(__dirname, '..', 'kb');
const leer = (f) => JSON.parse(fs.readFileSync(path.join(KB, f), 'utf8'));
const base = leer('ayuda.json');
const ARCHIVOS = ['PUNTUACION', 'LITERALES', 'OPERADORES', 'BIBLIOTECA'];
const RELLENO = /debe escribirse exactamente como aparece|Observa el ejemplo para reconocer|La sintaxis del elemento determina/;
const OCASION_GENERICA = /^(En una expresión o instrucción donde se llama a la función\.|En el lugar del programa donde se necesita esta construcción\.|En una línea de preprocesador al comienzo de una línea lógica\.)$/;
const limpiar = (s) => String(s).replace(/<\.\.>/g, '<cabecera>').replace(/(?<!\.)\.\.(?!\.)/g, '.').replace(/[ \t]+\n/g, '\n').trim();
const sinAcentos = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const porElemento = new Map(base.map((a) => [a.elemento, a]));
let nuevos = 0, ampliados = 0;
for (const nombre of ARCHIVOS) {
  for (const e of leer('nuevo/' + nombre + '.json')) {
    if (!e || typeof e.elemento !== 'string') continue;
    const extra = {};
    if (e.detalle && !RELLENO.test(e.detalle)) extra.detalle = limpiar(e.detalle);
    const oc = (e.ocasiones || []).filter((o) => o && o.cuando && o.que_es && !OCASION_GENERICA.test(o.cuando.trim()))
      .map((o) => { const r = { cuando: limpiar(o.cuando), que_es: limpiar(o.que_es) }; if (o.ejemplo) r.ejemplo = String(o.ejemplo).trim(); if (o.error_tipico) r.error_tipico = limpiar(o.error_tipico); return r; });
    if (oc.length) extra.ocasiones = oc;
    if (Array.isArray(e.relacionados) && e.relacionados.length) extra.relacionados = e.relacionados.map(String);
    const ya = porElemento.get(e.elemento);
    if (ya) {
      Object.assign(ya, extra);
      const vistos = new Set((ya.buscar || []).map(sinAcentos));
      (e.buscar || []).forEach((b) => { if (!vistos.has(sinAcentos(b))) { (ya.buscar = ya.buscar || []).push(b); vistos.add(sinAcentos(b)); } });
      ampliados++;
    } else {
      const n = { elemento: e.elemento, tipo: e.tipo, que_es: limpiar(e.que_es), como_se_usa: e.como_se_usa, error_tipico: limpiar(e.error_tipico), en_la_materia: e.en_la_materia || null, errores_ids: e.errores_ids || [], buscar: e.buscar || [] };
      Object.assign(n, extra);
      base.push(n); porElemento.set(e.elemento, n);
      nuevos++;
    }
  }
}
fs.writeFileSync(path.join(KB, 'ayuda.json'), JSON.stringify(base, null, 1) + '\n');
console.log('ayuda.json: ' + base.length + ' entradas (' + nuevos + ' nuevas, ' + ampliados + ' ampliadas)');

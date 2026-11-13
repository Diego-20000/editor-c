// Suma a kb/ayuda.json el «Ver más» (detalle, ocasiones, relacionados) escrito en kb/nuevo/DETALLES_*.json.
// uso: node tools/kb-detalles.js   (no pisa nada: solo completa lo que falta; se puede correr más de una vez)
const fs = require('fs'), path = require('path');
const KB = path.join(__dirname, '..', 'kb');
const base = JSON.parse(fs.readFileSync(path.join(KB, 'ayuda.json'), 'utf8'));
const porNombre = new Map(base.map((a) => [a.elemento, a]));
let hechos = 0, faltan = [];
for (const f of fs.readdirSync(path.join(KB, 'nuevo')).filter((x) => /^DETALLES_.*\.json$/.test(x)).sort()) {
  for (const e of JSON.parse(fs.readFileSync(path.join(KB, 'nuevo', f), 'utf8'))) {
    const a = porNombre.get(e.elemento);
    if (!a) { faltan.push(e.elemento); continue; }
    if (e.detalle && !a.detalle) a.detalle = String(e.detalle).trim();
    if (Array.isArray(e.ocasiones) && e.ocasiones.length && !(a.ocasiones && a.ocasiones.length)) a.ocasiones = e.ocasiones.filter((o) => o && o.cuando && o.que_es).map((o) => { const r = { cuando: o.cuando, que_es: o.que_es }; if (o.ejemplo) r.ejemplo = o.ejemplo; if (o.error_tipico) r.error_tipico = o.error_tipico; return r; });
    if (Array.isArray(e.relacionados) && e.relacionados.length && !(a.relacionados && a.relacionados.length)) a.relacionados = e.relacionados.filter((r) => porNombre.has(r));
    hechos++;
  }
}
fs.writeFileSync(path.join(KB, 'ayuda.json'), JSON.stringify(base, null, 1) + '\n');
console.log('detalles integrados: ' + hechos + (faltan.length ? '; elementos que no existen en ayuda.json: ' + faltan.join(', ') : ''));
console.log('entradas con detalle: ' + base.filter((a) => a.detalle).length + ' de ' + base.length);

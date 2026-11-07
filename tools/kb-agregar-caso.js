// Agrega casos sin respuesta (los que mandan los alumnos) a kb/errores/NUEVOS.json como borradores.
// uso: node tools/kb-agregar-caso.js ARCHIVO [--salida kb/errores/NUEVOS.json]
//   ARCHIVO: un .json en formato casos-sin-respuesta-v1, o el mensaje de WhatsApp pegado en un .txt (línea #DATOS),
//            o el mensaje sin esa línea (se leen los bloques ```c con su línea "Diagnóstico:").
// Por cada caso: corre gcc (si está) y el editor sobre el código y completa lo que se pueda; el resto queda vacío
// para escribirlo a mano. Los ids son NUE-nnn, notas "pendiente de revisión". No pisa nada: solo agrega al final,
// y no repite un código que ya está. No usa la red.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const { compile } = require('../src/compiler.js');
const Compartir = require('../src/compartir.js');

function args() {
  const a = process.argv.slice(2), r = { archivo: null, salida: path.join(__dirname, '..', 'kb', 'errores', 'NUEVOS.json') };
  for (let i = 0; i < a.length; i++) { if (a[i] === '--salida') r.salida = path.resolve(a[++i] || ''); else if (!r.archivo) r.archivo = a[i]; }
  return r;
}

// Mensaje de WhatsApp sin la línea de datos: se reconstruyen los casos desde el texto legible.
function desdeTextoLegible(t) {
  const casos = [], re = /Diagnóstico: (\w+)(?: \(([^)]*)\))?(?: línea (\d+))?: ([^\n]*)\n[^\n]*\n(?:Entrada: ([^\n]*)\n)?```c\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(t))) casos.push(Compartir.nuevoCaso({ codigo: m[6], entrada: (m[5] || '').replace(/ \/ /g, '\n'), diag: { nivel: m[1], code: m[2] || '', msg: m[4], line: +m[3] || 0 } }));
  return casos;
}

function leerCasos(texto) {
  const r = Compartir.importarJSON(texto);
  if (r.casos.length || !/formato desconocido|no es JSON/.test((r.descartados[0] || {}).motivo || '')) return r;
  const c = desdeTextoLegible(texto);
  return c.length ? { casos: c, descartados: [] } : r;
}

const gccVer = (cp.spawnSync('gcc', ['--version'], { encoding: 'utf8' }).stdout || '').split('\n')[0];
const hayGcc = !!gccVer;
const esGcc13 = /\b13\.\d/.test(gccVer);
let T = null;
function tmp() { if (!T) { T = fs.mkdtempSync(path.join(os.tmpdir(), 'kba-')); process.on('exit', () => { try { fs.rmSync(T, { recursive: true, force: true }); } catch (e) { /* nada */ } }); } return T; }

function gcc(codigo) { // primer diagnóstico de gcc -std=gnu99 -Wall -Wextra, o 'nada'
  const f = path.join(tmp(), 'p' + Math.random().toString(36).slice(2) + '.c');
  fs.writeFileSync(f, codigo);
  const p = cp.spawnSync('gcc', ['-std=gnu99', '-Wall', '-Wextra', '-fsyntax-only', f], { encoding: 'utf8', timeout: 20000 });
  const l = String(p.stderr || '').split('\n').filter((x) => /(error|warning):/.test(x)).map((x) => x.replace(f, 'archivo.c').replace(/\s+/g, ' ').trim());
  return l.length ? l[0] : 'nada';
}
function editor(codigo, entrada) { // misma lógica que tools/kb-validar.js
  const r = compile(codigo), d = r.errors.concat(r.warnings);
  let runtime = null;
  if (!r.errors.length) {
    const f = path.join(tmp(), 'e' + Math.random().toString(36).slice(2) + '.c');
    fs.writeFileSync(f, codigo);
    const p = cp.spawnSync('node', [path.join(__dirname, '..', 'test', 'run1.js'), f], { input: entrada || '', encoding: 'utf8', timeout: 8000, maxBuffer: 1 << 24 });
    const m = /RUNTIME ERR l(\d+|undefined): (.*)/.exec(String(p.stderr || ''));
    if (m) runtime = m[2];
  }
  const primero = d[0] || null;
  return { msg: primero ? primero.msg : runtime, code: primero ? (primero.code || null) : (runtime ? 'R-runtime' : null), esError: r.errors.length > 0 };
}

function borrador(caso, id) {
  const ed = editor(caso.codigo, caso.entrada);
  const dg = hayGcc ? gcc(caso.codigo) : '';
  const dd = caso.diag || {};
  const linea = dd.line ? 'Línea ' + dd.line + ': ' : '';
  return {
    id, categoria: 'sin clasificar',
    nombre_corto: ('Caso de alumno: ' + (dd.msg || 'sin mensaje')).slice(0, 80),
    frecuencia: 'baja',
    codigo_mal: caso.codigo, codigo_bien: '', entrada: caso.entrada || '',
    que_dice_gcc: hayGcc ? dg : '',
    mensaje_editor: linea + (dd.msg || ''),
    explicacion: '', como_arreglarlo: '', pistas: ['', '', ''],
    relacion_con_la_materia: '',
    deteccion: ed.msg ? (ed.code === 'R-runtime' ? 'ejecucion' : 'estatica') : 'no_detectable',
    como_detectarlo: '', riesgo_falso_positivo: '',
    nivel: ed.msg ? (ed.esError ? 'error' : 'aviso') : (dd.nivel === 'aviso' ? 'aviso' : 'informacion'),
    verificado_gcc13: hayGcc && esGcc13,
    detectado_editor: !!ed.msg, mensaje_editor_actual: ed.msg || null, codigo_editor_actual: ed.code || null,
    verificado_editor_corrige: false,
    notas: 'pendiente de revisión' + (caso.version ? ' (versión del editor: ' + caso.version + ', ' + (caso.fecha || '') + ')' : '') + (hayGcc && !esGcc13 ? ' [gcc local no es 13: que_dice_gcc sin verificar]' : '')
  };
}

const clave = (c) => String(c).replace(/\s+/g, ' ').trim();

function main() {
  const a = args();
  if (!a.archivo) { console.error('uso: node tools/kb-agregar-caso.js ARCHIVO [--salida kb/errores/NUEVOS.json]'); return 2; }
  let texto;
  try { texto = fs.readFileSync(a.archivo, 'utf8'); } catch (e) { console.error('no se pudo leer ' + a.archivo); return 2; }
  const { casos, descartados } = leerCasos(texto);
  let actuales = [];
  if (fs.existsSync(a.salida)) {
    try { actuales = JSON.parse(fs.readFileSync(a.salida, 'utf8')); if (!Array.isArray(actuales)) throw new Error('no es un arreglo'); }
    catch (e) { console.error(a.salida + ' existe pero no se puede leer (' + e.message + '). No se tocó nada.'); return 1; }
  }
  const vistos = new Set(actuales.map((e) => clave(e.codigo_mal)));
  let n = actuales.reduce((m, e) => Math.max(m, +(/^NUE-(\d+)$/.exec(e.id || '') || [0, 0])[1]), 0);
  const nuevos = [], repetidos = [];
  for (const c of casos) {
    if (vistos.has(clave(c.codigo))) { repetidos.push(c); continue; }
    vistos.add(clave(c.codigo));
    n++;
    nuevos.push(borrador(c, 'NUE-' + String(n).padStart(3, '0')));
  }
  if (nuevos.length) {
    fs.mkdirSync(path.dirname(a.salida), { recursive: true });
    const tmpOut = a.salida + '.tmp' + process.pid;
    fs.writeFileSync(tmpOut, JSON.stringify(actuales.concat(nuevos), null, 1) + '\n');
    fs.renameSync(tmpOut, a.salida);
  }
  console.log('casos leídos: ' + casos.length + ' · agregados: ' + nuevos.length + ' · ya estaban: ' + repetidos.length + ' · descartados: ' + descartados.length);
  for (const e of nuevos) console.log('  ' + e.id + '  ' + e.nombre_corto + '  [editor: ' + (e.detectado_editor ? e.codigo_editor_actual : 'no lo detecta') + '; gcc: ' + (e.que_dice_gcc || 's/d').slice(0, 70) + ']');
  for (const d of descartados) console.log('  descartado #' + d.indice + ': ' + d.motivo);
  if (nuevos.length) console.log('→ ' + path.relative(process.cwd(), a.salida) + ' (completar codigo_bien, explicación y pistas; luego node tools/kb-validar.js)');
  if (!hayGcc) console.log('aviso: no hay gcc; que_dice_gcc quedó vacío y verificado_gcc13 en false');
  return casos.length || descartados.length ? 0 : 1;
}
process.exit(main());

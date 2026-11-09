// Valida (y opcionalmente completa) los archivos de la base de conocimiento contra gcc y contra el editor.
// uso: node tools/kb-validar.js ARCHIVO.json [--arreglar] [--silencio]
//   kb/errores/XXX.json   -> esquema, gcc 13 sobre codigo_mal y codigo_bien, el editor sobre los dos
//                            (los diagnósticos del editor traen `kb` = id del caso; ese es el que se registra en mensaje_editor_actual)
//   kb/lecciones.json     -> compila y ejecuta `ejemplo` con gcc y con el editor y compara con `resultado`
//   kb/ayuda.json         -> esquema y que errores_ids existan
// Con --arreglar escribe en el archivo los campos que se obtienen ejecutando de verdad
// (que_dice_gcc, verificado_gcc13, detectado_editor, mensaje_editor_actual, codigo_editor_actual, verificado_editor_corrige, resultado).
// Sale con código 1 si queda algún problema.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const { compile } = require('../src/compiler.js');

const archivo = process.argv[2];
const arreglar = process.argv.includes('--arreglar'), silencio = process.argv.includes('--silencio');
if (!archivo) { console.error('uso: node tools/kb-validar.js ARCHIVO.json [--arreglar]'); process.exit(2); }
const raiz = path.join(__dirname, '..');
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'kbv-'));
process.on('exit', () => { try { fs.rmSync(T, { recursive: true, force: true }); } catch (e) { /* nada */ } });

const PREF = ['SIN', 'DEC', 'TIP', 'OPE', 'PRF', 'SCN', 'CTL', 'FUN', 'ARR', 'PRE', 'EJE', 'LOG', 'POR', 'NOS'];
const gccVer = (cp.spawnSync('gcc', ['--version'], { encoding: 'utf8' }).stdout || '').split('\n')[0];
// la base promete «verificado con gcc 13»: con otra versión no se certifica nada
const gccMayor = (/(\d+)\.\d+\.\d+/.exec(gccVer) || [])[1];
if (gccMayor !== '13' && !process.env.KB_SIN_GCC13) { console.error('gcc no es de la versión 13 (' + (gccVer || 'no se encontró') + '): no se puede validar ni marcar verificado_gcc13.'); process.exit(2); }

function gcc(codigo, args) { // compila con gcc; devuelve { exe, diag, ok }
  const f = path.join(T, 'p' + Math.random().toString(36).slice(2) + '.c');
  fs.writeFileSync(f, codigo);
  const exe = f.replace(/\.c$/, '.exe');
  const p = cp.spawnSync('gcc', ['-std=gnu99', '-Wall', '-Wextra', ...(args || []), f, '-o', exe, '-lm'], { encoding: 'utf8', timeout: 20000 });
  const lineas = String(p.stderr || '').split('\n').filter((l) => /(error|warning):/.test(l)).map((l) => l.replace(f, 'archivo.c').replace(/^archivo\.c:(\d+):\d+: /, 'archivo.c:$1: ').replace(/\s+/g, ' ').trim());
  return { exe, diag: lineas, ok: p.status === 0 };
}
function correr(exe, entrada) {
  const p = cp.spawnSync(exe, [], { input: entrada || '', encoding: 'utf8', timeout: 5000, maxBuffer: 1 << 24 });
  return { out: String(p.stdout || ''), code: p.status === null ? 'señal' : p.status };
}
function editor(codigo, entrada) { // compila con el editor y, si compila, lo ejecuta (en otro proceso, con tiempo límite)
  const r = compile(codigo);
  const d = r.errors.concat(r.warnings);
  const res = { errores: r.errors, avisos: r.warnings, primero: d[0] || null, out: null, runtime: null, code: null };
  if (!r.errors.length) {
    const f = path.join(T, 'e' + Math.random().toString(36).slice(2) + '.c');
    fs.writeFileSync(f, codigo);
    const p = cp.spawnSync('node', [path.join(raiz, 'test', 'run1.js'), f], { input: entrada || '', encoding: 'utf8', timeout: 8000, maxBuffer: 1 << 24 });
    res.out = String(p.stdout || ''); res.code = p.status === null ? 'señal' : p.status;
    const m = /RUNTIME ERR l(\d+|undefined): (.*)/.exec(String(p.stderr || ''));
    if (m) res.runtime = m[2];
  }
  return res;
}
const oraciones = (t) => (String(t).match(/[.!?](\s|$)/g) || []).length;
const problemas = [];
const mal = (id, msg) => problemas.push(id + ': ' + msg);

const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
if (!Array.isArray(datos)) { console.error('el archivo tiene que ser un arreglo JSON'); process.exit(1); }
const nombre = path.basename(archivo);
const esLecciones = /lecciones\.json$/.test(archivo), esAyuda = /ayuda\.json$/.test(archivo);

// ids de errores existentes (para ayuda/lecciones)
const idsErr = new Set();
try { for (const f of fs.readdirSync(path.join(raiz, 'kb', 'errores'))) if (f.endsWith('.json')) for (const e of JSON.parse(fs.readFileSync(path.join(raiz, 'kb', 'errores', f), 'utf8'))) idsErr.add(e.id); } catch (e) { /* aún no hay */ }

if (esAyuda) {
  const vistos = new Set();
  datos.forEach((a, i) => {
    const id = 'ayuda[' + i + '] ' + (a.elemento || '?');
    for (const k of ['elemento', 'tipo', 'que_es', 'como_se_usa', 'error_tipico', 'en_la_materia', 'errores_ids', 'buscar']) if (!(k in a)) mal(id, 'falta el campo ' + k);
    if (vistos.has(a.elemento)) mal(id, 'elemento repetido'); vistos.add(a.elemento);
    if (a.errores_ids && idsErr.size) for (const e of a.errores_ids) if (!idsErr.has(e)) mal(id, 'errores_ids apunta a un id que no existe: ' + e);
    if (!Array.isArray(a.buscar) || !a.buscar.length) mal(id, 'buscar tiene que ser un arreglo con palabras');
  });
} else if (esLecciones) {
  const vistos = new Set();
  datos.forEach((l, i) => {
    const id = 'leccion[' + i + '] ' + (l.id || l.titulo || '?');
    for (const k of ['id', 'titulo', 'explicacion', 'ejemplo', 'entrada', 'resultado', 'errores_ids', 'buscar']) if (!(k in l)) mal(id, 'falta el campo ' + k);
    if (vistos.has(l.id)) mal(id, 'id repetido'); vistos.add(l.id);
    if (!l.ejemplo) return;
    const g = gcc(l.ejemplo);
    if (!g.ok) { mal(id, 'el ejemplo no compila con gcc: ' + g.diag[0]); return; }
    if (g.diag.length) mal(id, 'el ejemplo da avisos en gcc: ' + g.diag[0]);
    const gr = correr(g.exe, l.entrada);
    const ed = editor(l.ejemplo, l.entrada);
    if (ed.errores.length) mal(id, 'el ejemplo no compila en el editor: ' + ed.errores[0].msg);
    else if (ed.out !== gr.out) mal(id, 'el editor da otra salida que gcc');
    else if (ed.code !== gr.code) mal(id, 'el editor termina con otro código de salida que gcc (' + ed.code + ' contra ' + gr.code + ')');
    if (arreglar) l.resultado = gr.out;
    else if (l.resultado !== gr.out) mal(id, 'resultado no coincide con lo que da gcc');
  });
} else {
  const vistos = new Set(), textos = new Set();
  datos.forEach((e, i) => {
    const id = e.id || 'registro[' + i + ']';
    const req = ['id', 'categoria', 'nombre_corto', 'frecuencia', 'codigo_mal', 'codigo_bien', 'entrada', 'que_dice_gcc', 'mensaje_editor', 'explicacion', 'como_arreglarlo', 'pistas', 'relacion_con_la_materia', 'deteccion', 'como_detectarlo', 'riesgo_falso_positivo', 'nivel'];
    for (const k of req) if (!(k in e)) mal(id, 'falta el campo ' + k);
    const m = /^([A-Z]{3})-(\d{3})$/.exec(e.id || '');
    if (!m || PREF.indexOf(m[1]) < 0) mal(id, 'id con formato inválido (PREFIJO-NNN)');
    if (vistos.has(e.id)) mal(id, 'id repetido'); vistos.add(e.id);
    const clave = String(e.codigo_mal).replace(/\s+/g, ' ');
    if (textos.has(clave)) mal(id, 'codigo_mal repetido en el archivo'); textos.add(clave);
    if (!Array.isArray(e.pistas) || e.pistas.length !== 3) mal(id, 'pistas tiene que tener exactamente 3 elementos');
    if (e.mensaje_editor && oraciones(e.mensaje_editor) > 2) mal(id, 'mensaje_editor tiene más de 2 oraciones');
    if (['estatica', 'ejecucion', 'heuristica', 'no_detectable'].indexOf(e.deteccion) < 0) mal(id, 'deteccion inválida');
    if (['error', 'aviso', 'informacion'].indexOf(e.nivel) < 0) mal(id, 'nivel inválido');
    if (!e.codigo_mal || !e.codigo_bien) return;
    // gcc sobre el programa con el error
    const g = gcc(e.codigo_mal);
    let gr = null;
    if (g.ok) gr = correr(g.exe, e.entrada);
    const dgcc = g.diag.length ? g.diag[0] : 'nada';
    const ed = editor(e.codigo_mal, e.entrada);
    // si algún diagnóstico del editor trae el id de este caso (campo kb o kbAlt) es ese el que cuenta; si no, el primero
    const todos = ed.errores.concat(ed.avisos);
    const coincide = (d) => d.kb === e.id || (d.kbAlt || []).indexOf(e.id) >= 0;
    // solo cuenta como «detectado» si el editor reconoce ESTE caso (su diagnóstico trae el id en kb o kbAlt) o si lo frena al ejecutarlo; un aviso de otro caso no explica este error
    const primero = todos.find(coincide) || null;
    const otrosKb = todos.filter((d) => d.kb && !coincide(d)).map((d) => d.kb);
    if (otrosKb.length && !todos.some(coincide) && !silencio) console.log('  nota ' + id + ': el editor avisa con otro caso de la base (' + otrosKb.join(', ') + ')');
    const actual = primero ? primero.msg : (ed.runtime ? ed.runtime : null);
    const codigoActual = primero ? (primero.code || null) : (ed.runtime ? 'R-runtime' : null);
    // programa corregido
    const gb = gcc(e.codigo_bien);
    let corrige = false;
    if (!gb.ok) mal(id, 'codigo_bien no compila con gcc: ' + gb.diag[0]);
    else {
      if (gb.diag.length) mal(id, 'codigo_bien da avisos en gcc: ' + gb.diag[0]);
      const grb = correr(gb.exe, e.entrada);
      const edb = editor(e.codigo_bien, e.entrada);
      if (edb.errores.length) mal(id, 'codigo_bien no compila en el editor: ' + edb.errores[0].msg);
      else if (edb.avisos.length) mal(id, 'codigo_bien da avisos en el editor: ' + edb.avisos[0].msg);
      else if (edb.out !== grb.out) mal(id, 'codigo_bien: el editor da otra salida que gcc');
      else if (edb.code !== grb.code) mal(id, 'codigo_bien: el editor termina con otro código de salida que gcc (' + edb.code + ' contra ' + grb.code + ')');
      else corrige = true;
    }
    if (arreglar) {
      e.que_dice_gcc = dgcc; e.verificado_gcc13 = true;
      e.detectado_editor = !!actual; e.mensaje_editor_actual = actual; e.codigo_editor_actual = codigoActual;
      e.verificado_editor_corrige = corrige;
    } else {
      if (e.que_dice_gcc !== dgcc) mal(id, 'que_dice_gcc no coincide con gcc real: "' + dgcc + '"');
      if (e.verificado_gcc13 !== true) mal(id, 'verificado_gcc13 no es true');
      if (e.detectado_editor !== !!actual) mal(id, 'detectado_editor desactualizado (hoy: ' + !!actual + ')');
    }
    if (e.deteccion === 'estatica' && g.ok && g.diag.length === 0 && e.nivel === 'error') mal(id, 'está marcado error estático pero gcc compila sin diagnósticos');
  });
}

if (arreglar) fs.writeFileSync(archivo, JSON.stringify(datos, null, 1) + '\n');
if (!silencio) {
  console.log(nombre + ': ' + datos.length + ' registros, gcc: ' + gccVer);
  if (!esAyuda && !esLecciones) {
    const det = datos.filter((e) => e.detectado_editor).length;
    console.log('  el editor ya detecta ' + det + ' de ' + datos.length + ' (' + (datos.length - det) + ' faltan implementar o son no_detectable)');
  }
  for (const p of problemas) console.log('  PROBLEMA ' + p);
  console.log(problemas.length ? problemas.length + ' problema(s)' : 'sin problemas');
}
process.exit(problemas.length ? 1 : 0);

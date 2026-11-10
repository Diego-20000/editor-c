// Cada ejemplo del editor: compila sin avisos (salvo los de práctica), su salida y código de salida son iguales a gcc con la entrada de muestra,
// y ninguno repite un ejercicio de la materia (títulos prohibidos abajo).
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const { compile } = require('../src/compiler.js');
const { runProgram } = require('../src/runtime.js');
const EX = new Function(fs.readFileSync(path.join(__dirname, '../src/examples.js'), 'utf8') + '; return EXAMPLES;')();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ej-'));
let ok = 0, mal = 0;
const check = (c, m) => { if (c) ok++; else { mal++; console.log('  FALLA: ' + m); } };
const PRACTICA = /^(Error|Aviso)/;
const PROHIBIDOS = /promedio de notas|multiplicaci[oó]n por sumas|a[ñn]o bisiesto|bisiesto|mayor de tres|n[uú]mero primo|divisi[oó]n por restas/i;
(async () => {
  for (const ex of EX) {
    const practica = PRACTICA.test(ex.t);
    check(!PROHIBIDOS.test(ex.t + ' ' + ex.d), ex.t + ': no repite un ejercicio de la materia');
    check(ex.g && ex.t && ex.d && typeof ex.c === 'string', ex.t + ': tiene tema, título y descripción');
    const r = compile(ex.c);
    if (practica) { check(r.errors.length + r.warnings.length > 0, ex.t + ': el ejemplo de práctica muestra algo'); continue; }
    check(r.errors.length === 0 && r.warnings.length === 0, ex.t + ': compila sin errores ni avisos');
    if (r.errors.length) continue;
    const entrada = ex.e || ''; const lines = entrada.length ? entrada.replace(/\n$/, '').split('\n') : [];
    let out = '';
    const res = await runProgram(r.js, { write: (s) => { out += s; }, readLine: async () => (lines.length ? lines.shift() : null) });
    const f = path.join(tmp, 'a.c'); fs.writeFileSync(f, ex.c);
    const g = cp.spawnSync('bash', ['-c', 'gcc -w -o a.out a.c -lm && ./a.out'], { cwd: tmp, input: entrada });
    check(out === g.stdout.toString('utf8') && ((res.code | 0) & 255) === g.status, ex.t + ': salida y código de salida iguales a gcc');
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(ok + ' ok, ' + mal + ' fallas (' + EX.length + ' ejemplos)');
  process.exit(mal ? 1 : 0);
})();

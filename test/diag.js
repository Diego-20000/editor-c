// uso: node test/diag.js   -> verifica los diagnósticos esperados de test/diag/*.c
// cada archivo empieza con "// espera: CODIGO" (por ejemplo E-scanf-sin-amp, W-sin-inicializar) o "// espera: limpio"
// una línea opcional "// errores: N" exige exactamente N errores (por ejemplo, gcc marca solo la primera vez que se usa una función sin declarar)
// una segunda línea opcional "// kb: LOG-002" exige además que algún diagnóstico traiga ese id de la base de conocimiento (kb o kbAlt)
const fs = require('fs'), path = require('path');
const { compile } = require('../src/compiler.js');
const dir = path.join(__dirname, 'diag');
let fallas = 0, n = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.c')).sort()) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const esp = (/^\/\/ espera: (\S+)/.exec(src) || [])[1];
  let r; const t0 = Date.now();
  try { r = compile(src); } catch (e) { console.log('FALLA ' + f + ': excepción ' + e.message); fallas++; n++; continue; }
  const codes = r.errors.concat(r.warnings).map((d) => d.code);
  let ok = esp === 'limpio' ? codes.length === 0 : codes.indexOf(esp) >= 0;
  const kb = (/^\/\/ espera: \S+\n\/\/ kb: (\S+)/.exec(src) || [])[1];
  if (ok && kb && !r.errors.concat(r.warnings).some((d) => d.kb === kb || (d.kbAlt || []).indexOf(kb) >= 0)) ok = false;
  const nerr = (/^\/\/ errores: (\d+)/m.exec(src) || [])[1];
  if (ok && nerr !== undefined && r.errors.length !== +nerr) ok = false;
  n++;
  if (!ok || Date.now() - t0 > 5000) { fallas++; console.log('FALLA ' + f + ': se esperaba ' + esp + ' y salió [' + codes.join(', ') + ']'); }
}
console.log((n - fallas) + '/' + n + ' diagnósticos como se esperaba');
process.exit(fallas ? 1 : 0);

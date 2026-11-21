// uso: node test/gcc14.js  -> programas que gcc 14 (Programiz, OnlineGDB) rechaza como ERROR y gcc 13 solo avisaba.
// Cada archivo de test/gcc14 tiene que ser un error de compilación en el editor y, si hay gcc-14 instalado, también en gcc 14.
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const { compile } = require('../src/compiler.js');
const dir = path.join(__dirname, 'gcc14');
let g14 = true; try { cp.execSync('gcc-14 --version', { stdio: 'ignore' }); } catch (e) { g14 = false; }
let fallas = 0, n = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.c')).sort()) {
  n++;
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const r = compile(src);
  let ok = r.errors.length > 0;
  if (!ok) { console.log('FALLA ' + f + ': el editor lo acepta y gcc 14 lo rechaza'); fallas++; continue; }
  if (g14) {
    const o = path.join(os.tmpdir(), 'g14_' + process.pid);
    try { cp.execSync('gcc-14 -std=gnu99 -Wall -Wextra -o ' + o + ' ' + path.join(dir, f), { stdio: 'ignore' }); console.log('FALLA ' + f + ': gcc 14 ahora lo compila (revisar el caso)'); fallas++; } catch (e) { /* esperado: gcc 14 lo rechaza */ }
  }
}
console.log((n - fallas) + '/' + n + ' casos de gcc 14 bien' + (g14 ? '' : ' (sin gcc-14: solo se revisó el editor)'));
process.exit(fallas ? 1 : 0);

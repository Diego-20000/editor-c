// uso: node run1.js archivo.c < entrada   -> imprime la salida del programa (y errores/avisos en stderr)
const fs = require('fs');
const { compile } = require('../src/compiler.js');
const { runProgram } = require('../src/runtime.js');
const src = fs.readFileSync(process.argv[2], 'utf8');
const input = fs.readFileSync(0, 'utf8');
const lines = input.length ? input.replace(/\n$/, '').split('\n') : [];
const r = compile(src, process.env.YIELD ? { yieldLoops: true } : undefined);
if (process.argv[3] === '--warn') for (const w of r.warnings) process.stderr.write('WARN l' + w.line + ': ' + w.msg + '\n');
if (r.errors.length) { for (const e of r.errors) process.stderr.write('ERR l' + e.line + ': ' + e.msg + '\n'); process.exit(2); }
if (process.argv[3] === '--js') { console.log(r.js); process.exit(0); }
let out = '';
runProgram(r.js, { write: (s) => { out += s; }, readLine: async () => (lines.length ? lines.shift() : null) }).then((res) => {
  process.stdout.write(out);
  if (res.error) process.stderr.write('RUNTIME ERR l' + res.line + ': ' + res.error + '\n');
  process.exit(res.error ? 3 : 0);
});

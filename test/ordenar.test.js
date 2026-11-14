// «Ordenar código»: solo cambia la forma. Pruebas:
//  1) ejemplos con el resultado esperado (estilo de las pizarras de la materia),
//  2) en todos los programas de test/: el contenido no cambia (sin contar espacios del código) y ordenar dos veces da lo mismo,
//  3) el programa ordenado da la misma salida que el original con gcc.
// uso: node test/ordenar.test.js
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const { ordenar, mascara } = require('../src/ordenar.js');
let ok = 0, mal = 0;
const check = (c, m) => { if (c) ok++; else { mal++; console.log('  FALLA ' + m); } };

// 1) ejemplos
const casos = [
  ['int main() {\nint A;\nif(A>1){\nA=2;\n}\n}\n', 'int main() {\n    int A;\n    if (A>1){\n        A=2;\n    }\n}\n', 'sangría por llaves y espacio después de if'],
  ['for(i=0;i<5;i++){\nprintf("%d",i);\n if(i>2){ACN=ACN+i;}}\n', 'for (i=0;i<5;i++){\n    printf("%d",i);\n    if (i>2){ACN=ACN+i;}}\n', 'cierres al final del renglón'],
  ['int main() {\nif (a)\nx = 1;\nelse\nx = 2;\ny = 3;\n}\n', 'int main() {\n    if (a)\n        x = 1;\n    else\n        x = 2;\n    y = 3;\n}\n', 'if y else sin llaves'],
  ['int main() {\nswitch (op) {\ncase 1:\nx = 1;\nbreak;\ndefault:\nx = 0;\n}\n}\n', 'int main() {\n    switch (op) {\n        case 1:\n            x = 1;\n            break;\n        default:\n            x = 0;\n    }\n}\n', 'switch: los case van un nivel adentro de las llaves'],
  ['#include <stdio.h>\n  #define A 1\nint main() {\n/* uno\n   dos */\nprintf("if(x)");\n}\n', '#include <stdio.h>\n#define A 1\nint main() {\n    /* uno\n   dos */\n    printf("if(x)");\n}\n', 'directivas a la izquierda; comentarios y textos intactos'],
  ['int main() {\nprintf("a %d %d",\n     1,\n     2);\nx = 1;\n}\n', 'int main() {\n    printf("a %d %d",\n         1,\n         2);\n    x = 1;\n}\n', 'continuación de argumentos: se conserva la alineación'],
  ['int main() {\nint M[2][2] = {\n{1, 2},\n{3, 4}\n};\nx = 1;\n}\n', 'int main() {\n    int M[2][2] = {\n        {1, 2},\n        {3, 4}\n    };\n    x = 1;\n}\n', 'inicializador de matriz en varios renglones'],
  ['int main() {\n\tif (a) {\n\t\tb = 1;   \n\t}\n}\n', 'int main() {\n    if (a) {\n        b = 1;\n    }\n}\n', 'tabuladores y espacios al final'],
  ['int main()\n{\nif (a)\n{\nb = 1;\n}\n}\n', 'int main()\n{\n    if (a)\n    {\n        b = 1;\n    }\n}\n', 'llaves en renglón propio']
];
casos.forEach(([e, esp, n]) => { const r = ordenar(e); check(r === esp, 'ejemplo «' + n + '»:\n' + r + '\n--- esperado:\n' + esp); });
check(ordenar('int main() { char C = \'{\'; printf("}"); }') === 'int main() { char C = \'{\'; printf("}"); }', 'las llaves dentro de textos y de letras no cuentan');

// 2) y 3) todos los programas del repositorio
const dirs = ['cases', 'ejercicios', 'diag'].map((d) => path.join(__dirname, d));
const archivos = [];
dirs.forEach((d) => fs.readdirSync(d).filter((f) => /\.c$/.test(f)).forEach((f) => archivos.push(path.join(d, f))));
const norm = (t) => { const mk = mascara(t); let o = ''; for (let i = 0; i < t.length; i++) { if (mk[i] && /\s/.test(t[i])) continue; o += t[i]; } return o.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n'); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ord-'));
let compilados = 0, distintos = 0;
const salida = (src, ent) => {
  fs.writeFileSync(tmp + '/a.c', src);
  const c = cp.spawnSync('gcc', ['-w', '-std=gnu99', '-fwrapv', '-o', tmp + '/a', tmp + '/a.c', '-lm'], { encoding: 'utf8' });
  if (c.status !== 0) return null;
  const r = cp.spawnSync(tmp + '/a', [], { input: ent, encoding: 'utf8', timeout: 3000 });
  return r.status + '|' + r.signal + '|' + r.stdout;
};
archivos.forEach((f) => {
  const src = fs.readFileSync(f, 'utf8'), ord = ordenar(src);
  check(norm(ord) === norm(src), path.basename(f) + ': el contenido cambió al ordenar');
  check(ordenar(ord) === ord, path.basename(f) + ': ordenar dos veces no da lo mismo');
  const inf = f.replace(/\.c$/, '.in'), ent = fs.existsSync(inf) ? fs.readFileSync(inf, 'utf8') : '';
  if (/test\/diag\//.test(f.replace(/\\/g, '/'))) return;   // los de diag no compilan a propósito
  const a = salida(src, ent);
  if (a === null || /^null\|SIGTERM/.test(a)) return;
  compilados++;
  const b = salida(ord, ent);
  if (a !== b) { distintos++; check(false, path.basename(f) + ': el programa ordenado da otra salida con gcc'); }
});
fs.rmSync(tmp, { recursive: true, force: true });
check(compilados > 100, 'se compararon ' + compilados + ' programas contra gcc');
console.log((mal ? '' : 'OK: ') + ok + ' pruebas bien, ' + mal + ' mal (' + archivos.length + ' programas revisados, ' + compilados + ' comparados con gcc)');
process.exit(mal ? 1 : 0);

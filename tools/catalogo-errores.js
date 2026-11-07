// Arma el catálogo de errores y avisos del editor a partir de programas reales.
// uso: node tools/catalogo-errores.js SALIDA_DIR carpeta1 [carpeta2 ...]
// Cada carpeta tiene archivos .c (con .in opcional). Por cada mensaje distinto (normalizado)
// guarda el programa más corto que lo provoca, lo que dice gcc, y escribe:
//   SALIDA_DIR/CATALOGO.md, SALIDA_DIR/catalogo.json, SALIDA_DIR/ejemplos/*.c
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { compile } = require('../src/compiler.js');
const { runProgram } = require('../src/runtime.js');

const [salida, ...dirs] = process.argv.slice(2);
if (!salida || !dirs.length) { console.error('uso: node tools/catalogo-errores.js SALIDA_DIR carpeta1 [carpeta2 ...]'); process.exit(2); }
fs.mkdirSync(path.join(salida, 'ejemplos'), { recursive: true });

// 'Total' -> ‹nombre›, números -> N (para agrupar mensajes iguales)
function normalizar(msg) {
  return msg
    .replace(/'([A-Za-z_]\w*)'/g, (m, id) => (/^(if|else|for|while|do|switch|case|default|break|continue|return|int|float|double|char|void|long|short|unsigned|printf|scanf|main)$/.test(id) ? m : "'‹nombre›'"))
    .replace(/\b\d+(\.\d+)?\b/g, 'N');
}

const grupos = new Map();
function anotar(nivel, code, msg, fuente, archivo, linea) {
  const clave = nivel + '|' + code + '|' + normalizar(msg);
  let g = grupos.get(clave);
  if (!g) { g = { nivel, code, plantilla: normalizar(msg), ejemploMsg: msg, cuenta: 0, fuente, archivo, linea }; grupos.set(clave, g); }
  g.cuenta++;
  if (fuente.length < g.fuente.length) { g.fuente = fuente; g.archivo = archivo; g.linea = linea; g.ejemploMsg = msg; }
}

// el programa se ejecuta en un proceso aparte para poder cortarlo si no termina
function ejecutar(archivo, entrada) {
  const p = cp.spawnSync('node', [path.join(__dirname, '..', 'test', 'run1.js'), archivo], { input: entrada, encoding: 'utf8', timeout: 2500, maxBuffer: 1 << 24 });
  const m = /RUNTIME ERR l(\d+|undefined): (.*)/.exec(String(p.stderr || ''));
  return m ? { error: m[2], line: m[1] === 'undefined' ? 0 : +m[1] } : null;
}

(async () => {
  let programas = 0;
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.c')).sort()) {
      const archivo = path.join(d, f);
      const fuente = fs.readFileSync(archivo, 'utf8');
      const inp = archivo.replace(/\.c$/, '.in');
      const entrada = fs.existsSync(inp) ? fs.readFileSync(inp, 'utf8') : '';
      programas++;
      let r;
      try { r = compile(fuente); } catch (e) { anotar('interno', 'E-excepcion', 'excepción del compilador: ' + e.message.split('\n')[0], fuente, archivo, 0); continue; }
      for (const e of r.errors) anotar('error', e.code || 'E-otro', e.msg, fuente, archivo, e.line);
      for (const w of r.warnings) anotar('aviso', w.code || 'W-otro', w.msg, fuente, archivo, w.line);
      if (!r.errors.length && r.js) {
        try {
          const res = ejecutar(archivo, entrada);
          if (res && res.error) anotar('ejecución', 'R-' + (/línea|índice|arreglo|división|resto|memoria|pila|formato|tamaño/i.test(res.error) ? 'runtime' : 'otro'), res.error, fuente, archivo, res.line || 0);
        } catch (e) { /* salida enorme o bucle: no es un error del programa que se pueda catalogar */ }
      }
    }
  }

  const lista = Array.from(grupos.values()).sort((a, b) => (a.nivel + a.code).localeCompare(b.nivel + b.code) || b.cuenta - a.cuenta);
  let k = 0;
  for (const g of lista) {
    k++;
    g.id = 'M' + String(k).padStart(3, '0');
    g.ejemplo = 'ejemplos/' + g.id + '.c';
    fs.writeFileSync(path.join(salida, g.ejemplo), g.fuente);
    // lo que dice gcc con -Wall -Wextra sobre el mismo programa
    const p = cp.spawnSync('gcc', ['-std=gnu99', '-Wall', '-Wextra', '-fsyntax-only', '-x', 'c', path.join(salida, g.ejemplo)], { encoding: 'utf8', timeout: 10000 });
    const sal = String(p.stderr || '').split('\n').filter((l) => /(error|warning):/.test(l)).slice(0, 2).map((l) => l.replace(/^.*?\.c:/, 'línea ').replace(/\s+/g, ' '));
    g.gcc = sal;
    delete g.fuente;
  }

  fs.writeFileSync(path.join(salida, 'catalogo.json'), JSON.stringify(lista, null, 1));
  const por = {};
  for (const g of lista) (por[g.nivel] = por[g.nivel] || []).push(g);
  let md = '# Catálogo de errores y avisos del editor\n\nGenerado con `node tools/catalogo-errores.js` sobre ' + programas + ' programas reales (de alumnos simulados, casos de gcc y reproductores). ' + lista.length + ' mensajes distintos. La plantilla reemplaza nombres por `‹nombre›` y números por `N`.\n\n';
  for (const nivel of ['error', 'aviso', 'ejecución', 'interno']) {
    if (!por[nivel]) continue;
    md += '## ' + nivel[0].toUpperCase() + nivel.slice(1) + ' (' + por[nivel].length + ')\n\n| Id | Código | Mensaje (plantilla) | Veces | Ejemplo | Qué dice gcc |\n|---|---|---|---|---|---|\n';
    for (const g of por[nivel]) md += '| ' + g.id + ' | `' + g.code + '` | ' + g.plantilla.replace(/\|/g, '\\|') + ' | ' + g.cuenta + ' | [' + g.id + '](' + g.ejemplo + ') (línea ' + g.linea + ') | ' + (g.gcc.length ? g.gcc.join('<br>').replace(/\|/g, '\\|') : (nivel === 'ejecución' ? '—' : 'no dice nada')) + ' |\n';
    md += '\n';
  }
  fs.writeFileSync(path.join(salida, 'CATALOGO.md'), md);
  console.log(programas + ' programas, ' + lista.length + ' mensajes distintos → ' + salida);
  process.exit(0);
})();

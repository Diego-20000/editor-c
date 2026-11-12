// «¿Qué es esto?» cubre todo lo que se puede tocar: palabras, signos, números y nombres propios.
// uso: node test/ayuda-completa.test.js   (usa la base real de kb/)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const KB = require('../src/kb.js'), N = require('../src/nombres.js');
const errores = fs.readdirSync(path.join(ROOT, 'kb', 'errores')).filter((f) => /\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'kb', 'errores', f), 'utf8')));
const AYUDA = JSON.parse(fs.readFileSync(path.join(ROOT, 'kb', 'ayuda.json'), 'utf8'));
const NOMBRES = JSON.parse(fs.readFileSync(path.join(ROOT, 'kb', 'nuevo', 'NOMBRES.json'), 'utf8'));
KB.cargar({ errores: errores, ayuda: AYUDA, lecciones: JSON.parse(fs.readFileSync(path.join(ROOT, 'kb', 'lecciones.json'), 'utf8')) });
let total = 0, fallas = 0;
function t(nombre, f) { total++; try { f(); } catch (e) { fallas++; console.log('FALLA  ' + nombre + '\n       ' + e.message); } }
function ok(c, m) { if (!c) throw new Error(m || 'condición falsa'); }
const clave = (src, desde, marca) => KB.elementoEnPosicion(src, src.indexOf(marca, desde || 0));

t('la base trae las entradas ampliadas', () => {
  ok(AYUDA.length >= 390, 'pocas entradas: ' + AYUDA.length);
  ok(AYUDA.filter((a) => a.detalle).length >= 200, 'pocas con detalle');
  ok(AYUDA.filter((a) => Array.isArray(a.ocasiones) && a.ocasiones.length).length >= 90, 'pocas con ocasiones');
  const vistos = new Set(); AYUDA.forEach((a) => { ok(!vistos.has(a.elemento), 'repetida: ' + a.elemento); vistos.add(a.elemento); });
  ok(!/\b(vos|fijate|usá|tenés|mirá|escribí|probá)\b/i.test(JSON.stringify(AYUDA.filter((a) => a.detalle || a.ocasiones).map((a) => [a.detalle, a.ocasiones]))), 'voseo en los textos nuevos');
});
t('los textos de siempre no cambiaron (se sumó, no se reemplazó)', () => { const p = AYUDA.find((a) => a.elemento === 'printf'); ok(/Muestra texto y valores en pantalla/.test(p.que_es), p.que_es); ok(!/[^.]\.\.[^.]/.test(JSON.stringify(AYUDA)), 'doble punto'); });

const P = 'int main() {\n  int A = 0, B = 10;\n  float X = 3.14, Y = 2.5f;\n  long Z = 100L;\n  int H = 0xFF;\n  for (A = 1; A < B; A++) { B = B - 1; }\n  printf("hola %d\\n", A / B);\n  return 0;\n}\n';
[['A = 0,', 'cero y uno'], ['10;', 'literal entero decimal'], ['3.14', 'literal de punto flotante'], ['2.5f', 'sufijos de literales'], ['100L', 'sufijos de literales'], ['0xFF', 'literal octal y hexadecimal']]
  .forEach(([m, k]) => t('el número ' + m + ' se explica como «' + k + '»', () => { const c = KB.elementoEnPosicion(P, P.indexOf(m) + (m === 'A = 0,' ? 4 : 0)); ok(c === k, 'dio ' + c); ok(KB.ayudaDe(c), 'sin entrada'); }));
t('el «;» pegado a un número o a un texto responde', () => { ok(KB.elementoEnPosicion(P, P.indexOf('10;') + 2) === ';'); ok(KB.elementoEnPosicion('printf("a");\n', 'printf("a")'.length) === ';'); });
t('«,» y «<» de un #include y el texto adentro de las comillas', () => {
  ok(KB.elementoEnPosicion('#include <stdio.h>\n', 9) === '#include');
  ok(KB.elementoEnPosicion(P, P.indexOf('hola') + 1) === '" "');
  ok(KB.elementoEnPosicion("char C = 'a';\n", 11) === "' '");
});
t('«;» dentro de un for explica el uso del for', () => {
  const a = AYUDA.find((x) => x.elemento === ';'), o = N.ocasionAqui(a, P, P.indexOf('; A <'));
  ok(o && /for/i.test(o.cuando + ' ' + o.que_es), 'dio ' + JSON.stringify(o));
  const o2 = N.ocasionAqui(a, P, P.indexOf('B - 1;') + 5);
  ok(!o2 || !/for/i.test(o2.cuando), 'un «;» fuera del encabezado no debería decir for: ' + (o2 && o2.cuando));
});
t('«:» se explica por sí mismo', () => { ok(KB.elementoEnPosicion('switch (A) { case 1: break; }', 'switch (A) { case 1'.length) === ':'); });

t('cobertura: en los programas de prueba casi nada queda sin explicación', () => {
  let tot = 0, sin = [];
  ['cases', 'ejercicios'].forEach((d) => fs.readdirSync(path.join(__dirname, d)).filter((f) => f.endsWith('.c')).forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, d, f), 'utf8');
    const re = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|[A-Za-z_]\w*|\d+\.?\d*[A-Za-z]*|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|<<|>>|->|[-+*\/%=<>!&|^~?:;,(){}\[\].#]/g;
    let m;
    while ((m = re.exec(src))) {
      const tk = m[0]; if (tk[0] === '/' && (tk[1] === '/' || tk[1] === '*')) continue;
      tot++;
      const off = m.index + ((tk[0] === '"' || tk[0] === "'") && tk.length > 1 ? 1 : 0);
      let c = null, a = null; try { c = KB.elementoEnPosicion(src, off); a = c ? KB.ayudaDe(c) : null; } catch (e) { /* se cuenta como sin explicación */ }
      if (!a) { try { a = N.explicar(src, off, NOMBRES); } catch (e) { a = null; } }
      if (!a) sin.push(d + '/' + f + ':' + tk);
    }
  }));
  ok(tot > 15000, 'pocos elementos: ' + tot);
  ok(sin.length <= tot * 0.005, sin.length + ' de ' + tot + ' sin explicación (' + (100 * sin.length / tot).toFixed(2) + ' %), por ejemplo ' + sin.slice(0, 6).join(', '));
});

console.log((total - fallas) + '/' + total + ' pruebas bien');
process.exit(fallas ? 1 : 0);

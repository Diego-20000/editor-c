// «¿Qué es esto?» para nombres del alumno: src/nombres.js + kb/nuevo/NOMBRES.json
// uso: node test/nombres.test.js   (sale con código distinto de cero si algo falla)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const N = require('../src/nombres.js');
const PL = JSON.parse(fs.readFileSync(path.join(ROOT, 'kb', 'nuevo', 'NOMBRES.json'), 'utf8'));
let total = 0, fallas = 0;
function t(nombre, f) { total++; try { f(); } catch (e) { fallas++; console.log('FALLA  ' + nombre + '\n       ' + e.message); } }
function ok(c, m) { if (!c) throw new Error(m || 'condición falsa'); }
const MARC = new Set(['NOMBRE', 'TIPO', 'LINEA_DECL', 'CANT_USOS', 'LINEAS_ASIGNA', 'LINEAS_LECTURA_SCANF', 'LINEAS_USO_PRINTF', 'PARAMS', 'RETORNO', 'FUNCION_ACTUAL', 'DIMENSIONES', 'VALOR_INICIAL', 'SIN_VALOR_INICIAL']);

t('las plantillas usan solo marcadores conocidos y traen todos los campos', () => {
  ok(PL.length >= 31, 'faltan plantillas: ' + PL.length);
  PL.forEach((p) => {
    ['rol', 'titulo', 'que_es', 'como_se_usa', 'error_tipico', 'detalle', 'variantes'].forEach((c) => ok(p[c] && p[c].length, p.rol + ': falta ' + c));
    (JSON.stringify(p).match(/\{[A-Z_]+\}/g) || []).forEach((m) => ok(MARC.has(m.slice(1, -1)), p.rol + ': marcador desconocido ' + m));
    ok(!/\b(vos|fijate|usá|tenés|mirá|escribí)\b/i.test(JSON.stringify(p)), p.rol + ': voseo');
  });
});

const PROG = `#include <stdio.h>
#define LIMITE 10
int TOTAL = 0;
long FACT(int N);
int main() {
    int CP = 0, I, NOTA, SUMA = 0, SIN_USO, V[5], BAJO = 100;
    float PROM;
    int HAY = 0;
    scanf("%d", &NOTA);
    while (NOTA != 0) {
        CP++;
        SUMA += NOTA;
        HAY = 1;
        if (NOTA < BAJO) BAJO = NOTA;
        scanf("%d", &NOTA);
    }
    HAY = 0;
    for (I = 0; I < 5; I++) V[I] = I;
    PROM = SUMA / CP;
    printf("%d %f %d\\n", CP, PROM, FACT(LIMITE));
    return 0;
}
long FACT(int N) { if (N <= 1) return 1; return N * FACT(N - 1); }
void SALUDAR(char C[]) { printf("hola %s\\n", C); }
`;
function rol(palabra, desde) { const i = PROG.indexOf(palabra, desde || 0); ok(i >= 0, 'no está ' + palabra); const r = N.explicar(PROG, i + 1, PL); return r && r.rol; }
const ESPERADOS = [
  ['CP++', 'contador'], ['SUMA +=', 'acumulador'], ['NOTA != 0', 'centinela'], ['HAY = 1', 'bandera'], ['BAJO = NOTA', 'minimo'],
  ['I = 0', 'indice_for'], ['V[I]', 'arreglo_1d'], ['SIN_USO', 'variable_no_usada'], ['PROM =', 'variable_float'],
  ['TOTAL', 'variable_no_usada'], ['main', 'main'], ['SALUDAR', 'funcion_void']
];
ESPERADOS.forEach(([p, r]) => t('rol de ' + p + ' = ' + r, () => { const x = rol(p); ok(x === r, 'dio ' + x); }));
t('FACT es recursiva y la llamada también', () => { ok(rol('FACT(int N);') === 'funcion_recursiva'); ok(rol('FACT(LIMITE)') === 'funcion_recursiva'); });
t('el parámetro N de FACT', () => { ok(rol('N <= 1') === 'parametro_valor'); });
t('el parámetro arreglo', () => { ok(rol('C[])') === 'parametro_arreglo'); });
t('LIMITE es una constante, tocando la definición o su uso', () => { ok(rol('LIMITE 10') === 'constante_define'); ok(rol('LIMITE)') === 'constante_define'); });
t('no inventa nada para lo que no es un nombre del alumno', () => {
  ok(N.explicar(PROG, PROG.indexOf('int main') + 1, PL) === null, 'int');
  ok(N.explicar(PROG, PROG.indexOf('return 0') + 1, PL) === null, 'return');
  ok(N.explicar(PROG, 5, PL) === null, 'include');
  ok(N.explicar(PROG, 0, []) === null, 'sin plantillas');
});
t('el texto sale completo: sin marcadores sin llenar y con los datos del código', () => {
  const r = N.explicar(PROG, PROG.indexOf('CP++') + 1, PL);
  ok(!/\{[A-Z_]+\}/.test(JSON.stringify(r)), 'quedó un marcador: ' + JSON.stringify(r));
  ok(/línea 6/.test(r.que_es) && /líneas 6 y 11/.test(r.como_se_usa), 'no usa los datos del código: ' + r.que_es + ' | ' + r.como_se_usa);
});
t('con dos funciones, el mismo nombre se explica según su función', () => {
  const c = 'int A() { int X = 0; X++; return X; }\nint B() { float X; return 1; }\nint main() { return 0; }\n';
  const r1 = N.explicar(c, c.indexOf('X = 0') + 1, PL), r2 = N.explicar(c, c.indexOf('float X') + 7, PL);
  ok(r1 && r2 && r1.rol !== r2.rol, 'ambos dieron ' + (r1 && r1.rol) + ' / ' + (r2 && r2.rol));
  ok(/línea 2/.test(r2.que_es) || /línea 2/.test(r2.como_se_usa), 'no usó la declaración de la función B: ' + r2.que_es);
});
t('código roto no rompe nada', () => {
  ['int main( {', 'int A[', '#define', 'int A = ;;;', '"abc', 'for (', 'int 5X;'].forEach((c) => { for (let o = 0; o <= c.length; o++) N.explicar(c, o, PL); });
});

// todo nombre que se declara en los programas de prueba tiene explicación
t('en test/cases y test/ejercicios, cada variable y función declarada se explica', () => {
  let n = 0, sin = [];
  ['cases', 'ejercicios'].forEach((d) => fs.readdirSync(path.join(__dirname, d)).filter((f) => f.endsWith('.c')).forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, d, f), 'utf8'), A = N.analizar(src);
    A.decls.concat(A.funcs.map((x) => ({ name: x.name, tokIdx: x.tokIdx }))).forEach((x) => {
      n++;
      const tk = A.T[x.tokIdx];
      if (!N.explicar(src, tk.i + 1, PL)) sin.push(d + '/' + f + ':' + x.name);
    });
  }));
  ok(n > 500, 'pocas declaraciones: ' + n);
  ok(sin.length === 0, sin.length + ' sin explicación, por ejemplo ' + sin.slice(0, 5).join(', '));
});

console.log((total - fallas) + '/' + total + ' pruebas bien');
process.exit(fallas ? 1 : 0);

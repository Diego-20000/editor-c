/* Compilador del Editor C: subconjunto de C de la materia -> JavaScript.
   Entrada: texto C. Salida: { js, errors:[{line,msg,code,kb?}], warnings:[{line,msg,code,kb?,kbAlt?}] } */
(function (root) {
  'use strict';

  class CErr extends Error { constructor(msg, line, kb, alt) { super(msg); this.cline = line; if (kb) this.kb = kb; if (alt) this.kbAlt = [].concat(alt); } }
  // casos gemelos de la base (mismo error con otro enunciado): el diagnóstico lleva uno en `kb` y los demás en `kbAlt`
  const GEMELOS = {
    'CTL-019': ['SIN-055'], 'CTL-023': ['SIN-033'], 'DEC-019': ['SIN-040'], 'DEC-015': ['SIN-041'], 'DEC-017': ['SIN-039'], 'CTL-014': ['SIN-034'], 'CTL-041': ['SIN-027'],
    'PRF-021': ['SIN-056'], 'PRF-034': ['SIN-061'], 'CTL-042': ['SIN-016'], 'CTL-038': ['OPE-030', 'SIN-018'], 'CTL-039': ['OPE-029', 'SIN-017'], 'OPE-039': ['SIN-019'], 'OPE-040': ['SIN-044'],
    'SCN-004': ['TIP-032'], 'SCN-005': ['TIP-033'], 'SCN-006': ['TIP-025'], 'SCN-007': ['TIP-026'], 'SCN-008': ['TIP-040'], 'SCN-015': [], 'TIP-023': ['PRF-001'], 'PRF-002': ['TIP-024'], 'TIP-027': ['PRF-031'], 'PRF-006': ['ARR-049'],
    'TIP-034': ['PRE-043'], 'FUN-018': ['DEC-025'], 'DEC-001': ['DEC-028'], 'PRF-023': [], 'CTL-016': ['LOG-033', 'SIN-005'], 'CTL-001': ['SIN-004'], 'CTL-034': ['LOG-016', 'OPE-008'], 'CTL-035': ['LOG-017', 'OPE-010'],
    'TIP-016': ['CTL-031', 'LOG-051'], 'TIP-029': ['CTL-032'], 'CTL-029': ['OPE-001', 'OPE-002'], 'CTL-040': ['OPE-028'], 'OPE-002': [], 'CTL-043': ['OPE-003'], 'DEC-004': [], 'FUN-041': ['DEC-031'],
    'ARR-047': ['SIN-053', 'TIP-015'], 'ARR-056': ['CTL-049', 'TIP-031'], 'CTL-011': ['SIN-036'], 'CTL-024': [], 'CTL-003': ['SIN-035'], 'DEC-038': [], 'DEC-018': ['SIN-048'], 'OPE-031': ['PRE-044'],
    'POR-003': ['PRE-037'], 'NOS-001': [], 'PRF-019': ['SIN-042'], 'PRE-047': ['POR-018'], 'PRF-036': [], 'DEC-005': ['POR-013', 'EJE-009'], 'DEC-014': [], 'TIP-001': ['LOG-003', 'LOG-027', 'TIP-002'], 'ARR-015': [], 'SCN-001': [], 'ARR-022': [], 'CTL-021': [], 'CTL-027': ['LOG-039'], 'EJE-013': [],
    'FUN-001': ['FUN-002'], 'FUN-008': ['FUN-009'], 'PRF-020': ['SCN-037', 'SIN-052'], 'ARR-046': [], 'SIN-013': [], 'POR-024': [], 'POR-004': [], 'PRE-016': ['SIN-059'], 'CTL-004': [], 'PRF-010': [], 'CTL-048': ['OPE-038'], 'OPE-036': []
  };
  const gem = (kb, alt) => { const a = [].concat(GEMELOS[kb] || [], alt || []).filter((x, i, arr) => x !== kb && arr.indexOf(x) === i); return a.length ? a : undefined; };

  const TYPE_KW = new Set(['int', 'float', 'double', 'char', 'void', 'long', 'short', 'unsigned', 'signed', 'const', 'static', 'bool', 'time_t', 'clock_t', 'size_t', 'register', 'volatile', 'auto']);
  const BIG = new Set(['long', 'ulong']);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const UNSUPPORTED_KW = { struct: 'struct', union: 'union', enum: 'enum', typedef: 'typedef', goto: 'goto', FILE: 'FILE' };
  const UNSUPPORTED_INFO = {
    struct: ['NOS-006', "(un registro que agrupa varios datos en una sola variable)"], union: ['NOS-007', '(varios datos que comparten el mismo lugar de memoria)'], enum: ['NOS-008', '(nombres para un grupo de constantes enteras)'],
    typedef: ['NOS-009', '(le pone un nombre nuevo a un tipo)'], goto: ['NOS-017', '(salta a una etiqueta del programa)'], FILE: ['NOS-010', '(el manejo de archivos con fopen, fprintf y fclose)']
  };
  const CONSTS = {
    EOF: [-1, 'int'], NULL: [0, 'int'], RAND_MAX: [2147483647, 'int'], INT_MAX: [2147483647, 'int'],
    INT_MIN: [-2147483648, 'int'], M_PI: [Math.PI, 'double'], M_E: [Math.E, 'double'], true: [1, 'int'], false: [0, 'int'],
    stdout: [0, 'int'], stdin: [0, 'int'], stderr: [0, 'int'], CHAR_BIT: [8, 'int'], UINT_MAX: [4294967295, 'uint'],
    LONG_MAX: [9223372036854775807n, 'long'], LONG_MIN: [-9223372036854775808n, 'long'], ULONG_MAX: [18446744073709551615n, 'ulong'], LLONG_MAX: [9223372036854775807n, 'long'], LLONG_MIN: [-9223372036854775808n, 'long'], ULLONG_MAX: [18446744073709551615n, 'ulong'], CLOCKS_PER_SEC: [1000000n, 'long'],
    SHRT_MAX: [32767, 'int'], SHRT_MIN: [-32768, 'int'], USHRT_MAX: [65535, 'int'], CHAR_MAX: [127, 'int'], CHAR_MIN: [-128, 'int'], UCHAR_MAX: [255, 'int'],
    EXIT_SUCCESS: [0, 'int'], EXIT_FAILURE: [1, 'int'], INFINITY: [Infinity, 'float'], NAN: [NaN, 'float'], HUGE_VAL: [Infinity, 'double'],
    DBL_MAX: [1.7976931348623157e308, 'double'], DBL_MIN: [2.2250738585072014e-308, 'double'], DBL_EPSILON: [2.220446049250313e-16, 'double'],
    FLT_MAX: [3.4028234663852886e38, 'float'], FLT_MIN: [1.1754943508222875e-38, 'float'], FLT_EPSILON: [1.1920928955078125e-7, 'float'],
    M_LOG2E: [Math.LOG2E, 'double'], M_LOG10E: [Math.LOG10E, 'double'], M_1_PI: [1 / Math.PI, 'double'], M_2_PI: [2 / Math.PI, 'double'], M_2_SQRTPI: [2 / Math.sqrt(Math.PI), 'double'], M_SQRT1_2: [Math.SQRT1_2, 'double'],
    FLT_DIG: [6, 'int'], DBL_DIG: [15, 'int'], FLT_MANT_DIG: [24, 'int'], DBL_MANT_DIG: [53, 'int'],
    M_SQRT2: [Math.SQRT2, 'double'], M_LN2: [Math.LN2, 'double'], M_LN10: [Math.LN10, 'double'], M_PI_2: [Math.PI / 2, 'double'], M_PI_4: [Math.PI / 4, 'double']
  };

  const HDR_FUNCS = { 'stdio.h': ['printf', 'scanf', 'puts', 'getchar', 'putchar', 'fgets'], 'math.h': ['sqrt', 'pow', 'fabs', 'floor', 'ceil'], 'string.h': ['strlen', 'strcpy', 'strcmp', 'strcat'], 'stdlib.h': ['rand', 'srand', 'abs', 'exit', 'atoi', 'system'], 'ctype.h': ['toupper', 'tolower', 'isdigit', 'isalpha'] };
  /* ================= LEXER ================= */
  function tokenize(text, line0, top, includes, defines) {
    const out = [];
    let i = 0, line = line0;
    const n = text.length;
    let atStart = true;
    const cs = []; // pila de #if/#ifdef: { on, taken, par }
    const active = () => cs.every((x) => x.on);
    const ppVal = (txt, ln) => {
      let e = txt.replace(/defined\s*\(\s*(\w+)\s*\)|defined\s+(\w+)/g, (_, a, b) => (defines.has(a || b) ? '1' : '0'));
      e = e.replace(/[A-Za-z_]\w*/g, (id) => { const b = defines.get(id); return Array.isArray(b) && b.length === 1 && b[0].t === 'num' ? String(b[0].v) : '0'; });
      e = e.replace(/(\d)[uUlL]+/g, '$1');
      if (!/^[\d\s+\-*\/%()<>=!&|^~?:]*$/.test(e)) throw new CErr('la condición del #if no se entiende', ln);
      try { return !!Number(Function('return (' + (e.trim() || '0') + ')')()); } catch (x) { throw new CErr('la condición del #if no se entiende', ln); }
    };
    const OPS = ['<<=', '>>=', '...', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '->'];
    while (i < n) {
      const c = text[i];
      if (c === '\n') { line++; i++; atStart = true; continue; }
      if (c === '\ufeff' && i === 0) { i++; continue; }
      if (c === '\u00a0' || c === '\u200b' || c === '\ufeff') throw new CErr('hay un carácter invisible (' + (c === '\u00a0' ? 'espacio no separable' : c === '\u200b' ? 'espacio de ancho cero' : 'marca BOM') + ') en esta línea, seguramente por copiar y pegar: borrá el espacio y volvé a escribirlo', line, 'SIN-045');
      if (c === '–' || c === '—' || c === '−') throw new CErr("el símbolo '" + c + "' no es el signo menos de C: escribí '-'", line, 'SIN-063');
      if (c === '×' || c === '÷' || c === '≠' || c === '≤' || c === '≥') throw new CErr("el símbolo '" + c + "' no existe en C: " + ({ '×': "multiplicar es '*'", '÷': "dividir es '/'", '≠': "distinto es '!='", '≤': "menor o igual es '<='", '≥': "mayor o igual es '>='" })[c], line, c === '×' ? 'SIN-064' : undefined);
      if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') { i++; continue; }
      if (c === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue; }
      if (c === '/' && text[i + 1] === '*') {
        const e = text.indexOf('*/', i + 2);
        if (e < 0) throw new CErr('comentario /* sin cerrar', line, 'SIN-014');
        for (let k = i; k < e; k++) if (text[k] === '\n') line++;
        i = e + 2; continue;
      }
      if (c === '#' && top && atStart) {
        let j = i, extra = 0;
        while (j < n && text[j] !== '\n') { if (text[j] === '\\' && text[j + 1] === '\n') { j += 2; extra++; continue; } j++; }
        const d = text.slice(i + 1, j).replace(/\\\n/g, ' ');
        const m = /^\s*(\w+)\s*([\s\S]*)$/.exec(d);
        if (m) {
          const dir = m[1], arg = m[2].replace(/\/\/.*$|\/\*.*?\*\//g, '').trim();
          if (dir === 'ifdef' || dir === 'ifndef') {
            const par = active(); const on = (dir === 'ifdef') === defines.has(arg.split(/\s/)[0]);
            cs.push({ on: par && on, taken: on, par });
          } else if (dir === 'if') {
            const par = active(); const on = par ? ppVal(arg, line) : false;
            cs.push({ on, taken: on, par });
          } else if (dir === 'elif') {
            const t = cs[cs.length - 1]; if (!t) throw new CErr('#elif sin #if', line);
            if (t.taken || !t.par) t.on = false; else { const v = ppVal(arg, line); t.on = v; t.taken = v; }
          } else if (dir === 'else') {
            const t = cs[cs.length - 1]; if (!t) throw new CErr('#else sin #if', line);
            t.on = t.par && !t.taken; t.taken = true;
          } else if (dir === 'endif') {
            if (!cs.length) throw new CErr('#endif sin #if', line); cs.pop();
          } else if (!active()) { /* zona descartada */ }
          else if (dir === 'undef') defines.delete(arg);
          else if (dir === 'include') {
            if (top) {
              let prof = 0; for (const q of out) { if (q.t === 'op' && q.v === '{') prof++; else if (q.t === 'op' && q.v === '}') prof--; }
              const hm = /^[<"]([^>"\s]+)[>"]$/.exec(arg);
              if (prof > 0) includes.avisos.push({ line, kb: 'PRE-041', msg: 'el #include va al principio del programa, afuera de las funciones: acá adentro rompe el programa' });
              else if (hm && HDR_FUNCS[hm[1]]) { const usada = out.find((q) => q.t === 'id' && HDR_FUNCS[hm[1]].indexOf(q.v) >= 0); if (usada) includes.avisos.push({ line, kb: 'PRE-042', msg: "usás " + usada.v + " antes de este #include: los #include van todos al principio, antes de usar sus funciones" }); }
            }
            if (/^(<[^>\s]+>|"[^"]+")$/.test(arg)) includes.push(arg); else includes.avisos.push({ line, kb: /;\s*$/.test(arg) ? 'PRE-018' : 'PRE-014', msg: 'el #include está mal escrito: tiene que ser #include <stdio.h> (con < y >) o #include "archivo.h"' }); }
          else if (dir === 'pragma' || dir === 'line' || dir === 'warning') { /* se ignora */ }
          else if (dir === 'error') throw new CErr('#error: ' + arg, line);
          else if (dir === 'define') {
            const m2 = /^(\w+)([\s\S]*)$/.exec(m[2]);
            if (!m2) throw new CErr('#define mal escrito', line);
            if (TYPE_KW.has(m2[1])) throw new CErr("#define no lleva el tipo: el nombre de la constante va primero y después su valor (#define N 5)", line, 'PRE-033');
            if (m2[2][0] === '(') {
              const mp = /^\(([^)]*)\)\s*([\s\S]*)$/.exec(m2[2]);
              if (!mp) throw new CErr('#define mal escrito: falta cerrar el paréntesis de los parámetros', line);
              const params = mp[1].split(',').map((x) => x.trim()).filter((x) => x.length);
              defines.set(m2[1], { params, body: tokenize(mp[2], line, false, includes, defines) });
            } else {
              if (/;\s*$/.test(m2[2])) includes.avisos.push({ line, kb: 'PRE-019', msg: "el #define de " + m2[1] + " termina en ';': ese ';' se copia en cada uso y suele causar errores raros. Sacalo" });
              defines.set(m2[1], tokenize(m2[2], line, false, includes, defines));
            }
          } else includes.avisos.push({ line, kb: /^include$/i.test(dir) ? 'PRE-016' : /^(inlcude|incldue|inculde|includ|includes|iclude|defin|deifne|defne|dfine)$/.test(dir) ? undefined : 'SIN-059', msg: "'#" + dir + "' no es una directiva de C" + (/^(inlcude|incldue|inculde|includ|includes|iclude)$/.test(dir) ? ': ¿quisiste escribir #include?' : (/^(defin|deifne|defne|dfine)$/.test(dir) ? ': ¿quisiste escribir #define?' : ' (los comentarios en C empiezan con // o /* */)')) });
        }
        i = j; line += extra; continue;
      }
      if (!active()) { while (i < n && text[i] !== '\n') i++; continue; }
      atStart = false;
      if (/[A-Za-z_]/.test(c)) {
        let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(text[j])) j++;
        out.push({ t: 'id', v: text.slice(i, j), line, s: i }); i = j; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(text[i + 1] || ''))) {
        const m = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)[fFlLuU]*/.exec(text.slice(i, i + 64));
        let s = m[0]; i += s.length;
        let v, kind, big;
        const esHex = /^0[xX]/.test(s), esBin = /^0[bB]/.test(s);
        const body0 = s.replace(/[fFlLuU]+$/, '');
        if (!esHex && !esBin && /[.eE]/.test(body0)) {
          const isF = /[fF]$/.test(s);
          v = parseFloat(body0); kind = isF ? 'float' : 'double'; if (isF) v = Math.fround(v);
        } else {
          const suf = (/[uUlL]*$/.exec(s)[0]).toLowerCase();
          const bd = s.slice(0, s.length - suf.length);
          let digits = bd, radix = 10;
          if (esHex) { radix = 16; digits = bd.slice(2); }
          else if (esBin) { radix = 2; digits = bd.slice(2); }
          else if (bd.length > 1 && bd[0] === '0') {
            if (!/^[0-7]+$/.test(bd)) throw new CErr("el número '" + bd + "' no es válido: los números que empiezan con 0 son octales (solo dígitos del 0 al 7)", line, 'SIN-038');
            radix = 8; digits = bd.slice(1);
          }
          if (!(radix === 16 ? /^[0-9a-fA-F]+$/ : radix === 2 ? /^[01]+$/ : /^[0-9]+$/).test(digits)) throw new CErr("el número '" + s + "' no es válido: un entero no lleva letras (para un decimal escribí 5.0f o 5.0)", line, 'SIN-024');
          big = BigInt((radix === 16 ? '0x' : radix === 8 ? '0o' : radix === 2 ? '0b' : '') + digits);
          const u = suf.indexOf('u') >= 0, l = suf.indexOf('l') >= 0;
          const I = 0x7fffffffn, U = 0xffffffffn, L = 0x7fffffffffffffffn;
          if (!u && !l) kind = big <= I ? 'int' : (radix !== 10 && big <= U) ? 'uint' : big <= L ? 'long' : 'ulong';
          else if (u && !l) kind = big <= U ? 'uint' : 'ulong';
          else if (!u && l) kind = big <= L ? 'long' : 'ulong';
          else kind = 'ulong';
          v = Number(big);
        }
        out.push({ t: 'num', v, kind, big, line, s: i - s.length, en: i }); continue;
      }
      if (c === '"') {
        let j = i + 1, s = '';
        while (j < n && text[j] !== '"') {
          if (text[j] === '\\' && text[j + 1] === '\n') { j += 2; line++; continue; }
          if (text[j] === '\n') {
            const resto = text.slice(i, j);
            throw new CErr('cadena sin cerrar (falta la comilla ")', line, /\)/.test(resto) ? 'PRF-019' : 'SIN-042');
          }
          if (text[j] === '\\') { const r = esc(text, j, { includes, line }); s += r[0]; j = r[1]; } else s += text[j++];
        }
        if (j >= n) throw new CErr('cadena sin cerrar (falta la comilla ")', line, 'PRF-019');
        out.push({ t: 'str', v: s, line }); i = j + 1; continue;
      }
      if (c === "'") {
        let j = i + 1, s;
        if (text[j] === '\\') { const r = esc(text, j, { includes, line }); s = r[0]; j = r[1]; } else { s = text[j++]; }
        if (text[j] !== "'") {
          const eol = text.indexOf('\n', i); const resto = text.slice(j, eol < 0 ? n : eol);
          const cierra = resto.indexOf("'") >= 0;
          const p1 = out[out.length - 1], p2 = out[out.length - 2];
          let kb = 'SIN-013';
          if (cierra && s.charCodeAt(0) < 128) { // como gcc: varios caracteres entre comillas simples es un AVISO y vale un int armado con los bytes
            const vals = [s.charCodeAt(0)]; let k = j, bien = true;
            while (k < n && text[k] !== "'" && text[k] !== '\n') { let ch; if (text[k] === '\\') { const r = esc(text, k, { includes, line }); ch = r[0]; k = r[1]; } else ch = text[k++]; if (ch.charCodeAt(0) > 127) { bien = false; break; } vals.push(ch.charCodeAt(0)); }
            if (bien && text[k] === "'") {
              let v = 0; for (const x of vals) v = ((v << 8) | x) | 0;
              const p1 = out[out.length - 1], p2 = out[out.length - 2];
              const kbm = p1 && p1.v === '(' && p2 && p2.v === 'printf' ? 'PRF-020' : p1 && p1.v === '(' && p2 && p2.v === 'scanf' ? 'SCN-037' : p1 && p1.v === '==' ? 'ARR-059' : p1 && p1.v === '=' && p2 && p2.v === ']' ? 'ARR-046' : vals.length > 4 ? 'SIN-052' : 'SIN-050';
              includes.avisos.push({ line, kb: kbm, msg: "entre comillas simples hay " + vals.length + " caracteres, y ahí va uno solo. ¿Qué tipo de dato guarda un solo carácter y cómo se escribe un texto?" });
              out.push({ t: 'num', v, kind: 'int', line }); i = k + 1; continue;
            }
          }
          if (cierra) {
            if (p1 && p1.v === '(' && p2 && p2.v === 'printf') kb = 'PRF-020';
            else if (p1 && p1.v === '(' && p2 && p2.v === 'scanf') kb = 'SCN-037';
            else if (p1 && p1.v === '==') kb = 'ARR-059';
            else if (p1 && p1.v === '=' && p2 && p2.v === ']') kb = 'ARR-046';
            else kb = 'SIN-050';
          }
          throw new CErr(cierra ? "entre comillas simples va un solo carácter: un texto lleva comillas dobles (\"Hola\")" : "falta cerrar la comilla simple del carácter (usá 'a' con un solo carácter)", line, kb);
        }
        out.push({ t: 'num', v: s.charCodeAt(0), kind: 'int', line, ch: true }); i = j + 1; continue;
      }
      let op = null;
      for (const o of OPS) if (text.startsWith(o, i)) { op = o; break; }
      if (!op && '+-*/%=<>!&|^~?:;,.(){}[]'.indexOf(c) >= 0) op = c;
      if (c === '\\') {
        const pv = out[out.length - 1], nx = /^\s*(\w)/.exec(text.slice(i + 1, i + 8));
        const entre = pv && (pv.t === 'id' || pv.t === 'num' || pv.v === ')') && nx;
        throw new CErr(entre ? "la barra invertida '\\' no es la división: dividir es '/'" : "carácter no válido '\\': si querías escribir un texto, ponelo entre comillas, por ejemplo printf(\"Hola\\n\");", line, entre ? 'OPE-040' : 'SIN-044');
      }
      if (c === '“' || c === '”' || c === '‘' || c === '’') throw new CErr("las comillas tipográficas " + c + " no sirven en C: usá las comillas rectas " + (c === '“' || c === '”' ? '"' : "'"), line, c === '“' || c === '”' ? 'SIN-011' : 'SIN-012');
      if (!op) throw new CErr("carácter no válido '" + c + "'" + (c === '\u037e' ? ': parece un punto y coma pero es otro carácter (viene de copiar y pegar); escribilo de nuevo' : ''), line, c === '\u037e' ? 'SIN-025' : /[\uff00-\uffef]/.test(c) ? 'SIN-047' : c === '@' ? 'SIN-046' : undefined);
      // OPE-016: «X =+ Y» / «X =- Y» (el signo pegado al = y separado del operando) no es += ni -=
      if ((op === '+' || op === '-') && out.length >= 2) {
        const eq = out[out.length - 1], nm = out[out.length - 2];
        if (eq.t === 'op' && eq.v === '=' && eq.e === i && (nm.t === 'id' || (nm.t === 'op' && nm.v === ']')) && (text[i + 1] === ' ' || text[i + 1] === '\t')) {
          const nom = nm.t === 'id' ? nm.v : 'variable';
          const mo = /^\s*([A-Za-z_]\w*|\d[\w.]*)/.exec(text.slice(i + 1, i + 40)); const opd = mo ? mo[1] : 'valor';
          includes.avisos.push({ line, kb: 'OPE-016', msg: nom + ' =' + op + ' ' + opd + ' asigna ' + op + opd + ' en lugar de ' + (op === '+' ? 'sumar' : 'restar') + ". En C el operador es '" + op + "=', o escribí " + nom + ' = ' + nom + ' ' + op + ' ' + opd + '.' });
        }
      }
      out.push(op === '=' ? { t: 'op', v: op, line, e: i + 1, s: i } : { t: 'op', v: op, line, s: i }); i += op.length;
    }
    if (cs.length) throw new CErr('falta el #endif de un #if / #ifdef', line);
    return out;
  }
  function esc(text, j, ctx) { // text[j] === '\\'
    const c = text[j + 1];
    if (c >= '0' && c <= '7') { const mo = /^[0-7]{1,3}/.exec(text.slice(j + 1)); return [String.fromCharCode(parseInt(mo[0], 8) & 255), j + 1 + mo[0].length]; }
    if (c === 'e' || c === 'E') return ['\x1b', j + 2];
    const map = { n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', f: '\f', v: '\v', '\\': '\\', '"': '"', "'": "'", '?': '?' };
    if (c === 'x') { const m = /^[0-9a-fA-F]{1,2}/.exec(text.slice(j + 2)); if (m) return [String.fromCharCode(parseInt(m[0], 16)), j + 2 + m[0].length]; }
    if (c in map) return [map[c], j + 2];
    if (ctx && c !== 'u' && c !== 'U' && c !== '\n' && c !== undefined) ctx.includes.avisos.push({ line: ctx.line, kb: 'SIN-043', msg: "'\\" + c + "' no es una secuencia de escape conocida: C la reemplaza por el carácter " + c + " solo" });
    return [c, j + 2];
  }
  const t0line = (arr) => (arr && arr[0] && arr[0].line) || 1;
  function expandDefines(toks, defines) {
    if (!defines.size) return toks;
    const out = []; let trabajo = 0, vacia = null;
    const go = (arr, depth, line, mac) => {
      for (let i = 0; i < arr.length; i++) {
        if (++trabajo > 1500000) throw new CErr('las macros se expanden demasiado (más de un millón de elementos): ¿una macro se llama a sí misma?', line || t0line(arr));
        const t = arr[i];
        const d = t.t === 'id' && depth < 12 ? defines.get(t.v) : undefined;
        if (d && Array.isArray(d)) { if (!d.length) vacia = t.v; go(d, depth + 1, t.line, t.v); continue; }
        if (d && arr[i + 1] && arr[i + 1].t === 'op' && arr[i + 1].v === '(') {
          const args = []; let cur = [], lvl = 0, j = i + 2;
          for (; j < arr.length; j++) {
            const x = arr[j];
            if (x.t === 'op' && x.v === '(') lvl++;
            if (x.t === 'op' && x.v === ')') { if (lvl === 0) break; lvl--; }
            if (x.t === 'op' && x.v === ',' && lvl === 0) { args.push(cur); cur = []; continue; }
            cur.push(x);
          }
          if (j >= arr.length) throw new CErr("a la macro '" + t.v + "' le falta cerrar el paréntesis", t.line);
          if (cur.length || args.length) args.push(cur);
          if (args.length !== d.params.length) throw new CErr("la macro '" + t.v + "' recibe " + d.params.length + ' argumento(s) y se la usó con ' + args.length, t.line);
          const eargs = args.map((a) => expandDefines(a, defines));
          const sub = [];
          for (const b of d.body) { const k = b.t === 'id' ? d.params.indexOf(b.v) : -1; if (k >= 0) for (const x of eargs[k]) sub.push(Object.assign({}, x, { line: t.line })); else sub.push(Object.assign({}, b, { line: t.line, mac: t.v })); }
          go(sub, depth + 1, t.line); i = j; continue;
        }
        if (vacia) { out.push(Object.assign({}, t, { emptyMac: vacia })); vacia = null; continue; }
        out.push(depth ? Object.assign({}, t, { line: line, mac: t.mac || mac }) : t);
      }
    };
    go(toks, 0, 0);
    return out;
  }

  /* ================= PARSER ================= */
  class Parser {
    constructor(toks) { this.t = toks; this.p = 0; this.lastLine = toks.length ? toks[toks.length - 1].line : 1; }
    peek(k) { return this.t[this.p + (k || 0)] || { t: 'eof', v: '<fin del archivo>', line: this.lastLine }; }
    next() { const t = this.peek(); this.p++; return t; }
    prevLine() { return this.p > 0 ? this.t[this.p - 1].line : 1; }
    isOp(v, k) { const t = this.peek(k); return t.t === 'op' && t.v === v; }
    isId(v, k) { const t = this.peek(k); return t.t === 'id' && t.v === v; }
    accept(v) { if (this.isOp(v)) { this.p++; return true; } return false; }
    // cx = contexto de la sentencia que se estaba leyendo (decide qué caso de la base explica el error)
    expect(v, cx) {
      if (this.isOp(v)) return this.next();
      const t = this.peek(), pv = this.t[this.p - 1] || t;
      const line = (v === ';' || v === ')' || v === ']') && t.line > this.prevLine() ? this.prevLine() : t.line;
      const found = t.t === 'eof' ? 'el final del archivo' : "'" + t.v + "'";
      if (t.t === 'id' && (t.v === 'and' || t.v === 'or' || t.v === 'not')) throw new CErr("en C la \"y\" lógica es '&&', la \"o\" es '||' y el \"no\" es '!' (no se escribe '" + t.v + "')", t.line, 'OPE-039');
      if (v === ';' && t.t === 'id' && (t.v === 'then' || t.v === 'endif' || t.v === 'end')) throw new CErr("'" + t.v + "' no existe en C: el cuerpo del if va entre llaves { }", t.line, t.v === 'then' ? 'SIN-015' : undefined);
      const r = (v === ';' ? this.kbPuntoComa(cx, t, pv) : this.kbEsperaba(v, t, pv, cx)) || {};
      if (v === ';') throw new CErr(r.msg || "falta un ';' al final de esta línea (antes de " + found + ')', line, r.kb);
      throw new CErr(r.msg || "se esperaba '" + v + "' pero se encontró " + found, line, r.kb);
    }
    kbPuntoComa(cx, t, pv) {
      if (!cx) return null;
      const nl = t.line > pv.line;
      switch (cx.k) {
        case 'decl':
          if (cx.fase === 'nombre' && t.t === 'op' && t.v === '(') return { kb: 'FUN-020', msg: "las funciones no se escriben dentro de otras: definí '" + pv.v + "' fuera de main" };
          if (nl) return { kb: 'SIN-001' };
          if (cx.fase === 'nombre' && t.t === 'op' && t.v === '==') return { kb: 'DEC-027', msg: "para darle un valor inicial a '" + pv.v + "' se usa un solo '=': el '==' es para comparar" };
          if (cx.fase === 'nombre' && t.t === 'op' && t.v === '-') return { kb: 'DEC-019', msg: "el guion '-' es el operador resta: no puede ir en el nombre de una variable" };
          if (cx.fase === 'nombre' && t.t === 'id' && pv.t === 'id') return { kb: 'DEC-016', msg: "el nombre de una variable no puede tener espacios: '" + pv.v + " " + t.v + "' son dos palabras" };
          if (pv.t === 'num' && t.t === 'id' && pv.en === t.s) return { kb: 'SIN-057', msg: "en C la multiplicación siempre se escribe con '*': '" + pv.v + t.v + "' no es " + pv.v + ' por ' + t.v };
          if (pv.t === 'num' && t.t === 'num' && pv.en === t.s) return { kb: 'SIN-037', msg: 'ese número tiene dos puntos decimales: un número lleva uno solo' };
          return { kb: 'SIN-001' };
        case 'expr': {
          const e = cx.e;
          if (e.k === 'call' && /^(if|while|for|switch|do|else)$/i.test(e.name) && e.name !== e.name.toLowerCase()) return { kb: 'SIN-058', msg: "'" + e.name + "' no es una palabra de C: se escribe todo en minúscula ('" + e.name.toLowerCase() + "')" };
          if (e.k === 'call' && e.name === 'printf') return { kb: 'PRF-022' };
          if (e.k === 'assign' || e.k === 'incdec') return { kb: 'SIN-002' };
          return null;
        }
        case 'return': return { kb: 'SIN-003' };
        case 'do': return { kb: 'CTL-023' };
        case 'for1': return { kb: cx.e && cx.e.k === 'comma' ? 'CTL-019' : 'SIN-032', msg: cx.e && cx.e.k === 'comma' ? "las tres partes del for se separan con ';' y no con comas" : undefined };
        case 'for2': return { kb: t.t === 'op' && t.v === ')' ? 'CTL-020' : 'SIN-032', msg: t.t === 'op' && t.v === ')' ? "al for le falta una parte: se esperaba ';' antes de ')'" : undefined };
        default: return null;
      }
    }
    kbEsperaba(v, t, pv, cx) {
      if (!cx) return null;
      if (v === '(' && cx.k === 'if') return t.v === '{' ? { kb: 'SIN-060', msg: 'la condición del if va entre paréntesis ( ), no entre llaves { }' } : { kb: 'CTL-041', msg: "se esperaba '(' después del if: la condición va entre paréntesis" };
      if (v === ')' && cx.k === 'if') return { kb: 'SIN-006', msg: 'a la condición del if le falta cerrar el paréntesis' };
      if (v === ')' && cx.k === 'call') {
        if (t.t === 'op' && t.v === ';') return t.mac ? { kb: 'PRE-025', msg: "el ';' del #define de '" + t.mac + "' se copia dentro de la cuenta: sacalo del #define" } : { kb: 'SIN-007', msg: 'a la llamada de ' + cx.name + ' le falta el paréntesis de cierre antes del ;' };
        if ((t.t === 'id' || t.t === 'num') && pv.t === 'str') {
          const nx = this.peek(1);
          return nx.t === 'str' ? { kb: 'PRF-034', msg: 'las comillas de adentro cierran el texto antes de tiempo: para mostrar comillas hay que escribir \\"' } : { kb: 'PRF-021', msg: "falta una coma entre el texto y '" + t.v + "'" };
        }
        return null;
      }
      if (v === ')' && cx.k === 'params' && t.t === 'op' && t.v === ';') return { kb: 'FUN-034', msg: 'los parámetros de una función se separan con coma, no con punto y coma' };
      if (v === ']' && t.t === 'op' && t.v === ',') return { kb: 'ARR-020', msg: "una matriz se declara con un corchete por dimensión: int M[2][3], no M[2, 3]" };
      if (v === ']' && t.t === 'op' && t.v === ';') return { kb: 'SIN-010', msg: 'abriste un corchete y falta el ] que lo cierra' };
      if (v === ':' && cx.k === 'case') return t.v === ',' ? { kb: 'CTL-013', msg: 'un case lleva un solo valor: para agrupar varios, escribí un case debajo del otro' } : t.v === ';' ? { kb: 'CTL-014', msg: "se esperaba ':' después del valor del case" } : { kb: 'SIN-034', msg: "después del valor del case falta el signo ':'" };
      if (v === ':' && cx.k === 'default') return { kb: 'SIN-034', msg: "después de default falta el signo ':'" };
      return null;
    }
    ident(cx) {
      const t = this.peek(), pv = this.t[this.p - 1] || t, nx = this.peek(1);
      if (t.t !== 'id') {
        let kb, msg;
        if (cx === 'decl') {
          if (t.mac) { kb = 'PRE-031'; msg = "'" + t.mac + "' está definida con #define: acá se reemplaza por su valor y queda un nombre inválido. Cambiá el nombre de la constante o el de la variable"; }
          else if (t.t === 'op' && t.v === '=') { kb = 'SIN-049'; msg = 'después del tipo tiene que venir el nombre de la variable, y acá aparece directamente el ='; }
          else if (t.t === 'op' && t.v === '(') { kb = 'NOS-019'; msg = 'los punteros a función todavía no están soportados en este editor'; }
          else if (t.t === 'num' && pv.v === ',' && this.t[this.p - 2] && this.t[this.p - 2].t === 'num' && this.t[this.p - 2].en === pv.s) { kb = 'DEC-015'; msg = 'los decimales se escriben con punto (12.5), no con coma: la coma separa variables'; }
          else if (t.t === 'num' && nx.t === 'id' && t.en === nx.s) { kb = 'DEC-017'; msg = 'un nombre de variable no puede empezar con un número: tiene que empezar con una letra o con _'; }
        }
        throw new CErr(msg || 'se esperaba un nombre pero se encontró ' + (t.t === 'eof' ? 'el final del archivo' : "'" + t.v + "'"), t.line, kb);
      }
      if (TYPE_KW.has(t.v) || RESERVED.has(t.v)) throw new CErr("'" + t.v + "' es una palabra reservada, no puede usarse como nombre", t.line, TYPE_KW.has(t.v) && pv.v === ',' ? 'DEC-038' : cx === 'decl' ? 'DEC-018' : undefined);
      return this.next();
    }
    isTypeStart(k) { const t = this.peek(k); return t.t === 'id' && TYPE_KW.has(t.v); }
    checkUnsupported() {
      const t = this.peek();
      if (t.t === 'id' && own(UNSUPPORTED_KW, t.v)) throw new CErr("'" + t.v + "' " + UNSUPPORTED_INFO[t.v][1] + ' todavía no está soportado en este editor', t.line, UNSUPPORTED_INFO[t.v][0]);
    }
    typeSpec() {
      let seen = false, base = null, uns = false, longs = 0, shorts = false;
      this.sawStatic = false; this.sawConst = false;
      while (this.peek().t === 'id' && TYPE_KW.has(this.peek().v)) {
        const v = this.next().v; seen = true;
        if (v === 'unsigned') uns = true;
        else if (v === 'long') longs++;
        else if (v === 'short') shorts = true;
        else if (v === 'static') this.sawStatic = true;
        else if (v === 'const') this.sawConst = true;
        else if (v === 'register' || v === 'volatile' || v === 'auto') { /* se ignoran */ }
        else if (v === 'signed') { /* ignorar */ }
        else base = v;
      }
      if (!seen) return null;
      if (base === 'time_t' || base === 'clock_t') return 'long';
      if (base === 'size_t') return 'ulong';
      if (base === 'double' && longs > 0) throw new CErr('long double (un decimal de más precisión) todavía no está soportado en este editor: usá double', this.peek().line, 'NOS-016');
      if (base === 'double') return 'double';
      if (base === 'float') return 'float';
      if (base === 'char') return uns ? 'uchar' : 'char';
      if (base === 'void') return 'void';
      if (base === 'bool') return 'bool';
      if (shorts) return uns ? 'ushort' : 'short';
      if (longs > 0) return uns ? 'ulong' : 'long';
      if (uns) return 'uint';
      return 'int';
    }

    program() {
      const items = [];
      while (this.peek().t !== 'eof') {
        this.checkUnsupported();
        const line = this.peek().line;
        let type = this.typeSpec();
        if (type === null) {
          // función sin tipo (ej. main() ) = int implícito
          if (this.peek().t === 'id' && this.isOp('(', 1)) { const a2 = this.peek(2); if (a2.t === 'str' || a2.t === 'num') throw new CErr('esta instrucción está fuera de una función: va adentro de main() { ... }', this.peek().line); type = 'int'; }
          else {
            const t = this.peek();
            const ult = items[items.length - 1];
            const kb0 = t.t === 'op' && t.v === '}' ? 'SIN-009' : t.t === 'op' && t.v === '{' && ult && ult.k === 'proto' ? (ult.name === 'main' ? 'SIN-054' : 'FUN-033') : t.t === 'id' && t.v === 'include' ? 'PRE-015' : t.t === 'id' && t.v === 'define' ? 'PRE-032' : t.mac && TYPE_KW.has(t.mac) ? 'PRE-033' : undefined;
            const msg0 = kb0 === 'SIN-009' ? "hay una '}' de más: la función ya estaba cerrada" : kb0 === 'FUN-033' || kb0 === 'SIN-054' ? "el ';' después del paréntesis cierra la declaración y la llave queda suelta" : kb0 === 'PRE-015' ? "falta el # al principio de include" : kb0 === 'PRE-032' ? 'falta el # delante de define' : null;
            throw new CErr(msg0 || "no se entiende '" + t.v + "' fuera de una función", t.line, kb0);
          }
        }
        const cn = this.sawConst;
        let ptrTok = false;
        if (this.isOp('*')) {
          if (type === 'char' || type === 'uchar') { this.next(); ptrTok = true; }
          else throw new CErr('los punteros todavía no están soportados en este editor (solo char * para textos)', this.peek().line);
        }
        const nameTok = this.ident();
        if (this.isOp('{')) throw new CErr("a '" + nameTok.v + "' le faltan los paréntesis: " + nameTok.v + '() { ... }', nameTok.line, nameTok.v === 'main' ? 'SIN-026' : undefined);
        if (this.isOp('(')) { if (ptrTok) throw new CErr('las funciones que devuelven char * (un puntero a un texto) todavía no están soportadas en este editor', nameTok.line, 'NOS-014'); items.push(this.funcRest(type, nameTok, line)); }
        else { this.p--; if (ptrTok) this.p--; const d = this.declRest(type, line); d.const = cn; items.push(d); }
      }
      return items;
    }
    funcRest(ret, nameTok, line) {
      this.expect('(');
      const params = []; let vacioVoid = false;
      if (this.isId('void') && this.isOp(')', 1)) { this.next(); vacioVoid = true; }
      else if (!this.isOp(')')) {
        for (;;) {
          const pt = this.typeSpec();
          if (!pt || pt === 'void') throw new CErr('parámetro mal escrito: se esperaba un tipo (int, float, ...)', this.peek().line, 'FUN-035');
          let pdims = 0;
          if (this.isOp('*')) {
            if (pt === 'char' || pt === 'uchar') { this.next(); pdims = 1; if (this.isOp('*')) { this.next(); pdims = 2; if (this.isOp('*')) throw new CErr('tres niveles de punteros no están soportados en este editor', this.peek().line); } }
            else throw new CErr('los punteros todavía no están soportados en este editor (solo char * para textos)', this.peek().line);
          }
          const pn = (this.isOp(',') || this.isOp(')') || this.isOp('[')) ? { v: null, line: this.peek().line } : this.ident();
          while (this.accept('[')) { if (!this.isOp(']')) this.assign(); this.expect(']', { k: 'dim' }); pdims++; }
          params.push({ name: pn.v, type: pt, line: pn.line, array: pdims > 0, dims: pdims });
          if (!this.accept(',')) break;
        }
      }
      this.expect(')', { k: 'params' });
      if (!this.isOp(';') && !this.isOp('{') && this.peek().t !== 'eof' && this.peek().line > this.prevLine() && (this.isTypeStart() || this.peek().t === 'id')) throw new CErr("falta un ';' al final de este prototipo (la declaración de la función)", this.prevLine(), 'FUN-032');
      const sinParams = params.length === 0 && !vacioVoid;
      if (this.accept(';')) return { k: 'proto', name: nameTok.v, ret, params, line, unspec: sinParams };
      const sinNombre = params.find((p) => p.name === null);
      if (sinNombre) throw new CErr('al definir la función falta el nombre de un parámetro', sinNombre.line);
      const body = this.block();
      return { k: 'func', name: nameTok.v, ret, params, body, line, unspec: sinParams };
    }
    declRest(type, line) {
      if (type === 'void') throw new CErr('una variable no puede ser de tipo void: void es la ausencia de valor', line, 'DEC-035');
      const vars = [];
      let fase = 'nombre';
      for (;;) {
        let ptr = false;
        if (this.isOp('*')) {
          if (type === 'char' || type === 'uchar') { this.next(); ptr = true; if (this.isOp('*')) throw new CErr('los punteros a punteros todavía no están soportados en este editor', this.peek().line); }
          else throw new CErr('los punteros todavía no están soportados en este editor (solo char * con un texto entre comillas)', this.peek().line);
        }
        const nt = this.ident('decl');
        const dims = [];
        fase = 'nombre';
        while (this.accept('[')) {
          if (this.isOp(']')) dims.push(null); else dims.push(this.assign());
          this.expect(']', { k: 'dim' }); fase = 'dim';
        }
        let init = null;
        if (this.accept('=')) { fase = 'init'; init = this.isOp('{') ? this.initList() : this.assign(); }
        vars.push({ name: nt.v, dims, init, ptr, line: nt.line });
        if (!this.accept(',')) break;
      }
      this.expect(';', { k: 'decl', fase });
      return { k: 'decl', type, vars, line };
    }
    initList() {
      const line = this.expect('{').line;
      const items = [];
      while (!this.isOp('}')) {
        items.push(this.isOp('{') ? this.initList() : this.assign());
        if (!this.accept(',')) break;
      }
      this.expect('}');
      return { k: 'list', items, line };
    }

    block() {
      const line = this.expect('{').line;
      const body = [];
      while (!this.isOp('}')) {
        if (this.peek().t === 'eof') throw new CErr("falta cerrar la llave '{' abierta en la línea " + line, this.prevLine(), 'SIN-008');
        body.push(this.stmt());
      }
      const close = this.expect('}');
      return { k: 'block', body, line, end: close.line };
    }
    stmt() {
      const t = this.peek();
      const line = t.line;
      this.checkUnsupported();
      if (this.isOp('{')) return this.block();
      if (this.isOp(';')) { this.next(); return { k: 'empty', line }; }
      if (this.isTypeStart()) { const type = this.typeSpec(); const st = this.sawStatic, cn = this.sawConst; const d = this.declRest(type, line); d.static = st; d.const = cn; return d; }
      if (t.t === 'id' && (t.v === 'elseif' || t.v === 'elif') && this.isOp('(', 1)) throw new CErr("'" + t.v + "' no existe en C: se escribe 'else if (condición)'", line, 'CTL-042');
      if (t.t === 'id' && !RESERVED.has(t.v) && !TYPE_KW.has(t.v) && this.isOp(':', 1) && this.peek(2).t !== 'eof') throw new CErr("goto y las etiquetas ('" + t.v + ":') todavía no están soportados en este editor. Usá un while o un for para repetir", line, 'NOS-017');
      if (t.t === 'id' && !RESERVED.has(t.v) && !TYPE_KW.has(t.v) && this.peek(1).t === 'id' && !RESERVED.has(this.peek(1).v) && !TYPE_KW.has(this.peek(1).v)) {
        const tipos = ['int', 'float', 'double', 'char', 'void', 'long', 'short', 'unsigned'];
        const lev = (a, b) => { const d = []; for (let i = 0; i <= a.length; i++) d[i] = [i]; for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
        let best = null, bd = 99; for (const ty of tipos) { const dd = lev(t.v.toLowerCase(), ty); if (dd < bd) { bd = dd; best = ty; } }
        if (t.v === 'string') throw new CErr("en C no existe 'string': para un carácter usá char (los textos completos todavía no están soportados en este editor)", line, 'SIN-051');
        if (bd <= 2) throw new CErr("'" + t.v + "' no es un tipo de C: ¿quisiste escribir '" + best + "'? (C distingue mayúsculas y minúsculas)", line, t.v.toLowerCase() === best ? 'DEC-037' : 'SIN-023', t.v.toLowerCase() === best ? 'SIN-022' : undefined);
        if (t.v === 'then') throw new CErr("'then' no existe en C: el cuerpo del if va después de la condición, con llaves si son varias instrucciones", line, 'SIN-015');
        throw new CErr("no se entiende '" + t.v + ' ' + this.peek(1).v + "': ¿falta un operador, un ';' o es un tipo mal escrito?", line);
      }
      if (t.t === 'id') {
        switch (t.v) {
          case 'if': {
            this.next(); this.expect('(', { k: 'if' }); const c = this.expr(); this.expect(')', { k: 'if' });
            const a = this.stmt(); let b = null;
            if (this.isId('else')) { this.next(); if (this.isOp('(')) throw new CErr("después de 'else' no va una condición: si querías otra condición escribí 'else if (…)'", this.peek().line, 'CTL-004'); b = this.stmt(); }
            return { k: 'if', c, a, b, line };
          }
          case 'while': {
            this.next(); this.expect('('); const c = this.expr(); this.expect(')');
            return { k: 'while', c, body: this.stmt(), line };
          }
          case 'do': {
            this.next(); const body = this.stmt();
            if (!this.isId('while')) throw new CErr("falta 'while' después del cuerpo del do", this.peek().line);
            this.next(); this.expect('('); const c = this.expr(); this.expect(')'); this.expect(';', { k: 'do' });
            return { k: 'do', c, body, line };
          }
          case 'for': {
            this.next(); this.expect('(');
            let init = null;
            if (this.isOp(';')) this.next();
            else if (this.isTypeStart()) { const type = this.typeSpec(); init = this.declRest(type, line); }
            else { init = { k: 'expr', e: this.expr(), line }; this.expect(';', { k: 'for1', e: init.e }); }
            let c = null; if (!this.isOp(';')) c = this.expr(); this.expect(';', { k: 'for2' });
            let step = null; if (!this.isOp(')')) step = this.expr(); this.expect(')');
            return { k: 'for', init, c, step, body: this.stmt(), line };
          }
          case 'return': {
            this.next(); let e = null;
            if (!this.isOp(';')) e = this.expr();
            this.expect(';', { k: 'return' });
            return { k: 'return', e, line };
          }
          case 'break': this.next(); this.expect(';'); return { k: 'break', line };
          case 'continue': this.next(); this.expect(';'); return { k: 'continue', line };
          case 'switch': {
            this.next(); this.expect('('); const e = this.expr(); this.expect(')');
            this.expect('{');
            const items = [];
            while (!this.isOp('}')) {
              if (this.peek().t === 'eof') throw new CErr('falta cerrar la llave del switch', this.prevLine(), 'SIN-008');
              if (this.isId('case')) { const l = this.next().line; const ce = this.ternary(); this.expect(':', { k: 'case' }); items.push({ k: 'case', e: ce, line: l }); }
              else if (this.isId('default')) { const l = this.next().line; this.expect(':', { k: 'default' }); items.push({ k: 'default', line: l }); }
              else items.push(this.stmt());
            }
            this.expect('}');
            return { k: 'switch', e, items, line };
          }
          case 'else': throw new CErr("'else' sin su 'if' (revisá las llaves y los ';')", line, 'CTL-003');
          case 'case': case 'default': throw new CErr("'" + t.v + "' fuera de un switch", line);
        }
      }
      const e = this.expr();
      this.expect(';', { k: 'expr', e });
      return { k: 'expr', e, line };
    }

    expr() {
      let e = this.assign();
      while (this.isOp(',')) { const line = this.next().line; e = { k: 'comma', l: e, r: this.assign(), line }; }
      return e;
    }
    assign() {
      const l = this.ternary();
      const t = this.peek();
      if (t.t === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='].indexOf(t.v) >= 0) {
        this.next();
        const nx = this.peek(), bang = t.v === '=' && nx.t === 'op' && nx.v === '!' && t.e === nx.s;
        const r = this.assign();
        return { k: 'assign', op: t.v, l, r, line: t.line, bang };
      }
      return l;
    }
    ternary() {
      const c = this.binary(0);
      if (this.isOp('?')) {
        const line = this.next().line;
        const a = this.expr(); this.expect(':'); const b = this.ternary();
        return { k: 'cond', c, a, b, line };
      }
      return c;
    }
    binary(minPrec) {
      let l = this.unary();
      for (;;) {
        const t = this.peek();
        if (t.t !== 'op') break;
        const prec = PREC[t.v];
        if (prec === undefined || prec < minPrec) break;
        this.next();
        const r = this.binary(prec + 1);
        l = { k: 'bin', op: t.v, l, r, line: t.line };
      }
      return l;
    }
    unary() {
      const t = this.peek();
      if (t.t === 'op') {
        if (t.v === '++' || t.v === '--') { this.next(); return { k: 'incdec', op: t.v, prefix: true, e: this.unary(), line: t.line }; }
        if (t.v === '-' || t.v === '+' || t.v === '!' || t.v === '~') { this.next(); return { k: 'un', op: t.v, e: this.unary(), line: t.line }; }
        if (t.v === '&') { this.next(); return { k: 'addr', e: this.unary(), line: t.line }; }
        if (t.v === '*') { const pv = this.t[this.p - 1]; if (pv && pv.t === 'op' && pv.v === '*') throw new CErr("en C no existe '**' (potencia): usá pow(base, exponente) de <math.h>", t.line, 'OPE-032'); const mp = pv && pv.mac && pv.v === ';' ? pv.mac : null; if (mp || t.emptyMac) throw new CErr(mp ? "el ';' del #define de '" + mp + "' se copia en cada uso y deja una instrucción suelta: sacalo del #define" : "'" + t.emptyMac + "' está definida sin valor (#define " + t.emptyMac + ") y al usarla queda una cuenta incompleta", t.line, mp ? 'PRE-019' : 'PRE-021'); throw new CErr('los punteros todavía no están soportados en este editor', t.line); }
        if (t.v === '(' && this.isTypeStart(1)) {
          this.next(); const type = this.typeSpec();
          if (this.isOp('*')) throw new CErr('los punteros todavía no están soportados en este editor', this.peek().line);
          this.expect(')');
          return { k: 'cast', type, e: this.unary(), line: t.line };
        }
      }
      if (t.t === 'id' && t.v === 'sizeof') {
        this.next();
        if (this.isOp('(') && this.isTypeStart(1)) { this.next(); const type = this.typeSpec(); this.expect(')'); return { k: 'sizeof', type, line: t.line }; }
        return { k: 'sizeof', e: this.unary(), line: t.line };
      }
      return this.postfix();
    }
    postfix() {
      let e = this.primary();
      for (;;) {
        const t = this.peek();
        if (t.t !== 'op') break;
        if (t.v === '[') { this.next(); const i = this.expr(); this.expect(']', { k: 'dim' }); e = { k: 'idx', base: e, i, line: t.line }; }
        else if (t.v === '(') {
          if (e.k !== 'id') throw new CErr('solo se pueden llamar funciones por su nombre' + (this.t[this.p - 1].mac ? ": ¿el #define tiene un espacio entre el nombre y el paréntesis?" : ''), t.line, this.t[this.p - 1].mac ? 'PRE-026' : undefined);
          this.next(); const args = []; this.inCall = (this.inCall || 0) + 1;
          if (!this.isOp(')')) { for (;;) { args.push(this.assign()); if (!this.accept(',')) break; } }
          this.expect(')', { k: 'call', name: e.name }); this.inCall--;
          e = { k: 'call', name: e.name, args, line: t.line };
        } else if (t.v === '++' || t.v === '--') { this.next(); e = { k: 'incdec', op: t.v, prefix: false, e, line: t.line }; }
        else if (t.v === '.' || t.v === '->') throw new CErr('struct / punteros todavía no están soportados en este editor', t.line);
        else break;
      }
      return e;
    }
    primary() {
      const t = this.next();
      if (t.t === 'num') return { k: 'num', v: t.v, kind: t.kind, big: t.big, line: t.line, ch: t.ch, mac: t.mac };
      if (t.t === 'str') {
        let s = t.v;
        while (this.peek().t === 'str') s += this.next().v;
        return { k: 'str', v: s, line: t.line };
      }
      if (t.t === 'id') {
        if (TYPE_KW.has(t.v)) throw new CErr(this.inCall ? "en la llamada se escribe solo el valor, sin el tipo ('" + t.v + "' sobra)" : "no se esperaba el tipo '" + t.v + "' acá (¿falta un ';' antes?)", t.line, this.inCall ? 'FUN-036' : undefined);
        if (RESERVED.has(t.v)) throw new CErr("no se esperaba '" + t.v + "' acá", t.line);
        return { k: 'id', name: t.v, line: t.line };
      }
      if (t.t === 'op' && t.v === '(') { const e = this.expr(); this.expect(')'); e.par = true; return e; }
      const found = t.t === 'eof' ? 'el final del archivo' : "'" + t.v + "'";
      const line = t.t === 'eof' ? this.prevLine() : t.line;
      const ant = this.t[this.p - 2];
      if (t.t === 'op' && t.v === '>' && ant && ant.t === 'op' && ant.v === '<') throw new CErr("en C \"distinto\" se escribe '!=' (no '<>')", line, 'CTL-039');
      if (t.t === 'op' && t.v === '>' && ant && ant.t === 'op' && ant.v === '=') throw new CErr("\"mayor o igual\" se escribe '>=' (no '=>')", line, 'CTL-038');
      if (t.t === 'op' && t.v === '=' && ant && ant.t === 'op' && ant.v === '<') throw new CErr("\"menor o igual\" se escribe '<=' (no '=<')", line);
      const pv = this.t[this.p - 2];
      let kb, msg;
      if (t.emptyMac) { kb = 'PRE-021'; msg = "'" + t.emptyMac + "' está definida sin valor (#define " + t.emptyMac + ") y al usarla queda una cuenta incompleta"; }
      else if (t.t === 'op' && t.v === '=' && t.mac) { kb = 'PRE-020'; msg = "el #define de '" + t.mac + "' no lleva '=': es #define " + t.mac + ' valor'; }
      else if (t.t === 'op' && t.v === ')' && pv && pv.v === ',') { kb = 'SIN-031'; msg = 'hay una coma antes del paréntesis de cierre y después no hay ningún dato'; }
      else if (t.t === 'op' && t.v === ')' && pv && pv.v === ')') { kb = 'SIN-028'; msg = 'hay un paréntesis de cierre de más'; }
      else if (t.t === 'op' && t.v === ';' && pv && pv.t === 'op' && pv.v === '=') { kb = 'SIN-029'; msg = "después del '=' falta el valor que querés guardar"; }
      else if (t.t === 'op' && (t.v === '/' || t.v === '%') && pv && pv.t === 'op' && pv.v === '=') { kb = 'SIN-030'; msg = "la operación necesita un valor a la izquierda del '" + t.v + "' y otro a la derecha"; }
      else if (t.t === 'op' && REL_PARSE.has(t.v) && pv && (pv.v === '&&' || pv.v === '||')) { kb = 'OPE-012'; msg = "falta una expresión antes de '" + t.v + "': a cada lado del '" + pv.v + "' tiene que haber una comparación completa"; }
      else if (t.t === 'op' && t.v === '%' && pv && pv.v === '(' && this.t[this.p - 3] && this.t[this.p - 3].v === 'scanf') { kb = 'SCN-025'; msg = 'el formato de scanf va entre comillas: scanf("%d", ...)'; }
      else if (t.t === 'op' && t.v === '{' && pv && pv.t === 'op' && pv.v === '=') { kb = 'ARR-012'; msg = 'las llaves { } solo sirven para dar valores al declarar un arreglo; después hay que cargar posición por posición'; }
      throw new CErr(msg || 'falta una expresión antes de ' + found, line, kb);
    }
  }
  const REL_PARSE = new Set(['<', '>', '<=', '>=', '==', '!=']);
  const RESERVED = new Set(['if', 'else', 'while', 'do', 'for', 'return', 'break', 'continue', 'switch', 'case', 'default', 'sizeof', 'struct', 'union', 'enum', 'typedef', 'goto']);
  const PREC = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };

  /* ================= GENERADOR ================= */
  const INTLIKE = new Set(['int', 'uint', 'long', 'ulong', 'char', 'uchar', 'short', 'ushort', 'bool']);
  const FLOATLIKE = new Set(['float', 'double']);
  function arith(a, b) {
    if (a === 'short' || a === 'ushort' || a === 'uchar' || a === 'bool') a = 'int';
    if (b === 'short' || b === 'ushort' || b === 'uchar' || b === 'bool') b = 'int';
    if (a === 'double' || b === 'double') return 'double';
    if (a === 'float' || b === 'float') return 'float';
    if (a === 'ulong' || b === 'ulong') return 'ulong';
    if (a === 'long' || b === 'long') return 'long';
    if (a === 'uint' || b === 'uint') return 'uint';
    return 'int';
  }
  const TNAME = { int: 'int', uint: 'unsigned', long: 'long', ulong: 'unsigned long', char: 'char', bool: 'bool', uchar: 'unsigned char', short: 'short', ushort: 'unsigned short', float: 'float', double: 'double' };

  // identificadores que no existen en C estándar y que la base explica por nombre: [caso, mensaje]
  const NOMBRES_KB = {
    cout: ['SIN-021', "'cout' es de C++ y no existe en C: para mostrar datos se usa printf"], cin: ['SIN-021', "'cin' es de C++ y no existe en C: para leer datos se usa scanf"],
    FILE: ['NOS-010', 'FILE y el manejo de archivos (fopen, fclose) todavía no están soportados en este editor. Por ahora mostrá los datos con printf']
  };
  const FUNC_KB = {
    print: ['SIN-020', "la función 'print' no existe en C: para mostrar datos se usa printf"], Printf: ['PRF-023', "'Printf' no existe: en C todo se escribe en minúscula, la función es printf"], Scanf: ['SCN-027', "'Scanf' no existe: la función se escribe scanf, todo en minúscula"],
    scanf_s: ['POR-023', "scanf_s es una función de Visual Studio y no existe en gcc (ni en Programiz ni en OnlineGDB). Usá scanf"], strrev: ['PRE-048', "strrev no existe en gcc (es de Windows)"], itoa: ['PRE-047', "itoa no es del estándar de C y no existe en gcc"],
    clrscr: ['POR-004', "clrscr() es de Windows (conio.h) y no existe en Programiz ni en OnlineGDB"], Sleep: ['POR-017', "Sleep() es de Windows (windows.h) y no existe en Programiz ni en OnlineGDB"], delay: ['POR-019', "delay() es de Turbo C / DOS (dos.h) y no existe en Programiz ni en OnlineGDB"],
    sscanf: ['NOS-015', 'sscanf (leer datos desde un texto) todavía no está soportada en este editor. Leé el número directamente con scanf'],
    fopen: ['NOS-010', 'el manejo de archivos (fopen, fclose, fscanf) todavía no está soportado en este editor'], fclose: ['NOS-010', 'el manejo de archivos (fopen, fclose, fscanf) todavía no está soportado en este editor'], fscanf: ['NOS-010', 'el manejo de archivos (fopen, fclose, fscanf) todavía no está soportado en este editor']
  };
  // función de biblioteca que necesita un #include: caso de la base
  const INC_KB = { printf: 'PRE-001', scanf: 'PRE-002', sqrt: 'PRE-003', pow: 'PRE-004', abs: 'PRE-005', strlen: 'PRE-006', strcmp: 'PRE-007', srand: 'PRE-008', time: 'PRE-009', exit: 'PRE-010', toupper: 'PRE-011', M_PI: 'PRE-036', getch: 'PRE-038' };

  class Gen {
    constructor(items, opts) {
      this.items = items;
      this.opts = opts || {};
      this.errors = []; this.warnings = [];
      this.funcs = new Map();
      this.scopes = [new Map()];
      this.cur = null;
      this.seenW = new Set(); this.protoMal = new Set();
      this.hoisted = []; this.sid = 0;
      this.loopStack = []; this.ntemp = 0; this.fnHoist = []; this.assignLog = []; this.curLine = 1; this.loopDepth = 0; this.switchDepth = 0; this.undeclared = new Set(); this.inSC = 0;
      this.incl = new Set((this.opts.includes || []).map((h) => h.replace(/^[<"]|[>"]$/g, '')));
    }
    // kb = id del caso de la base de conocimiento (kb/errores) que explica este diagnóstico; alt = ids de casos gemelos
    err(msg, line, kb, alt) { const d = { line: line || this.curLine, msg }; if (kb) { d.kb = kb; const a = gem(kb, alt); if (a) d.kbAlt = a; } this.errors.push(d); }
    warn(msg, line, kb, alt) { line = line || this.curLine; const k = line + '|' + msg; if (this.seenW.has(k)) return; this.seenW.add(k); const d = { line, msg }; if (kb) { d.kb = kb; const a = gem(kb, alt); if (a) d.kbAlt = a; } this.warnings.push(d); }
    push() { this.scopes.push(new Map()); }
    pop() { this.scopes.pop(); }
    declare(name, info, line) {
      const sc = this.scopes[this.scopes.length - 1];
      if (sc.has(name)) {
        const pv = sc.get(name);
        const kb = pv.param ? 'FUN-041' : (pv.type !== info.type && !pv.array && !info.array) ? 'DEC-022' : 'DEC-004';
        this.err("'" + name + "' ya fue declarada antes en este bloque" + (pv.param ? ' (es un parámetro de la función)' : pv.type !== info.type ? ' con otro tipo (' + TNAME[pv.type] + ')' : ''), line, kb);
      }
      sc.set(name, info);
    }
    // ctx: 'read' | 'write' | 'for' (contador del for) | 'decl' (cadena int A = B = 0) | 'letra' (printf("%c", A))
    undeclErr(name, line, ctx) {
      if (this.undeclared.has(name)) return; this.undeclared.add(name);
      const sug = this.suggest(name);
      let kb, alt, msg = null;
      const fn = this.cur ? this.cur.name : null;
      const mio = fn && this.declInfo.get(fn);
      const dm = mio && mio.get(name);
      if (dm && dm.kind !== 'param') {
        if (dm.kind === 'top') { kb = dm.line === line ? 'DEC-032' : 'DEC-011'; msg = kb === 'DEC-032' ? "'" + name + "' se usa antes de estar declarada: declarala antes en la lista" : "'" + name + "' se usa antes de declararla: la declaración tiene que estar antes de la primera línea que la usa"; }
        else { kb = dm.kind === 'for' ? 'DEC-008' : dm.kind === 'bucle' ? 'DEC-030' : 'DEC-007'; msg = "'" + name + "' no está declarada en este lugar: se declaró " + (dm.kind === 'for' ? 'dentro del for' : dm.kind === 'bucle' ? 'dentro del lazo' : 'entre llaves { }') + ' (línea ' + dm.line + ') y solo existe ahí'; }
      } else {
        let otra = null;
        for (const [f2, m2] of this.declInfo) if (f2 !== fn && m2.has(name) && !this.globalNames.has(name)) { otra = f2; if (f2 === 'main') break; }
        if (otra) { kb = fn === 'main' ? 'FUN-018' : otra === 'main' ? 'FUN-019' : 'FUN-018'; msg = "'" + name + "' no existe en " + fn + ": es una variable local de " + otra + (fn === 'main' ? '' : '. Pasala como parámetro'); }
        else if (ctx === 'for') { kb = 'DEC-029'; msg = "'" + name + "' no está declarada: el contador del for también hay que declararlo"; }
        else if (ctx === 'decl') { kb = 'DEC-023'; msg = "'" + name + "' no está declarada: en una declaración el '=' solo inicializa la variable que se declara"; }
        else if (ctx === 'letra' && name.length === 1) { kb = 'PRF-044'; msg = "'" + name + "' no está declarada: si querías la letra " + name + " escribila entre comillas simples; si querías una variable, usá su nombre"; }
        else if (this.opts.defines && this.opts.defines.has(name)) { kb = 'PRE-030'; msg = "'" + name + "' se usa antes de su #define: el #define tiene que estar arriba del primer uso"; }
        else if (own(NOMBRES_KB, name)) { kb = NOMBRES_KB[name][0]; msg = NOMBRES_KB[name][1]; }
        else if (sug && sug.toLowerCase() === name.toLowerCase()) kb = 'DEC-003';
        else if (sug && ctx !== 'write') kb = 'DEC-002';
        else if (ctx === 'write') kb = 'DEC-001';
      }
      this.err(msg || "'" + name + "' no está declarada" + (sug ? ". ¿Quisiste decir '" + sug + "'? (C distingue mayúsculas y minúsculas)" : ' (¿falta declararla o está mal escrita?)'), line, kb, alt);
    }
    suggest(name) {
      if (name.length > 40) return null;
      if (name.length <= 2) { for (const sc of this.scopes) for (const k of sc.keys()) if (k !== name && k.toLowerCase() === name.toLowerCase()) return k; return null; }
      const cand = new Set();
      for (const sc of this.scopes) for (const k of sc.keys()) cand.add(k);
      for (const k of this.funcs.keys()) cand.add(k);
      for (const k of ['printf', 'scanf', 'sqrt', 'pow', 'fabs', 'floor', 'ceil', 'abs', 'rand', 'srand', 'getchar', 'putchar', 'puts', 'toupper', 'tolower', 'strlen', 'strcpy', 'strcmp', 'strcat', 'sprintf', 'fgets']) cand.add(k);
      const lev = (a, b) => { const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; } for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
      let best = null, bd = 99;
      let nc = 0;
      for (const c of cand) { if (c === name || Math.abs(c.length - name.length) > 3) continue; if (++nc > 400) break; const traspone = (a, b) => { if (a.length !== b.length) return false; for (let q = 0; q < a.length - 1; q++) if (a[q] !== b[q]) return a[q] === b[q + 1] && a[q + 1] === b[q] && a.slice(q + 2) === b.slice(q + 2); return false; };
        const dist = c.toLowerCase() === name.toLowerCase() ? 0 : traspone(name.toLowerCase(), c.toLowerCase()) ? 1 : lev(name.toLowerCase(), c.toLowerCase()); const lim = name.length <= 5 ? 1 : 2; if (dist <= lim && dist < bd) { bd = dist; best = c; } }
      return best;
    }
    lookup(name) {
      for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) return this.scopes[i].get(name);
      return null;
    }

    checkIncludes() {
      for (const a of ((this.opts.includes && this.opts.includes.avisos) || [])) this.warn(a.msg, a.line, a.kb);
      const ok = ['stdio.h', 'math.h', 'stdlib.h', 'string.h', 'ctype.h', 'time.h', 'limits.h', 'stdbool.h', 'conio.h', 'float.h', 'stdint.h', 'stddef.h', 'assert.h', 'errno.h', 'locale.h', 'stdarg.h', 'inttypes.h', 'signal.h'];
      for (const h of (this.opts.includes || [])) {
        const nm = h.replace(/^[<"]|[>"]$/g, '');
        if (nm === 'conio.h') this.warn("<conio.h> solo existe en Windows (Code::Blocks): en Programiz y OnlineGDB no compila. Para esperar una tecla usá getchar() o scanf", 1, 'PRE-037', 'POR-003');
        else if (ok.indexOf(nm) < 0) {
          const sg = nm === 'studio.h' || nm === 'stdoi.h' || nm === 'stido.h' || nm === 'stdio' ? 'stdio.h' : (nm === 'maths.h' || nm === 'math' ? 'math.h' : null);
          this.warn('no se conoce la biblioteca <' + nm + '>' + (sg ? ': ¿quisiste escribir <' + sg + '>?' : ''), 1, { 'studio.h': 'PRE-012', stdio: 'PRE-013', 'STDIO.H': 'PRE-017', 'stdafx.h': 'POR-024', 'windows.h': 'POR-017', 'dos.h': 'POR-019' }[nm]);
        }
      }
    }
    // antes de generar: dónde se declara cada variable (para explicar por qué «no está declarada») y qué variables se leen con scanf
    prePass() {
      this.declInfo = new Map(); this.scanVars = new Map(); this.globalNames = new Set();
      for (const it of this.items) if (it.k === 'decl') for (const v of it.vars) this.globalNames.add(v.name);
      for (const it of this.items) if (it.k !== 'func') continue; else {
        const m = new Map(); this.declInfo.set(it.name, m);
        const sv = new Set(); this.scanVars.set(it.name, sv);
        for (const p of it.params) if (p.name) m.set(p.name, { kind: 'param', line: it.line });
        const rec = (n, kind) => {
          if (!n || typeof n !== 'object') return;
          if (Array.isArray(n)) { for (const x of n) rec(x, kind); return; }
          if (n.k === 'decl') for (const v of n.vars) if (!m.has(v.name)) m.set(v.name, { kind, line: v.line });
          if (n.k === 'call' && n.name === 'scanf') for (const a of n.args) if (a.k === 'addr') { const r = rootName(a.e); if (r) sv.add(r); }
          switch (n.k) {
            case 'for': rec(n.init, 'for'); rec(n.body, 'bucle'); return;
            case 'while': case 'do': rec(n.body, 'bucle'); return;
            case 'if': rec(n.a, kind === 'bucle' ? 'bucle' : 'if'); rec(n.b, kind === 'bucle' ? 'bucle' : 'if'); return;
            case 'block': rec(n.body, kind === 'top' ? 'if' : kind); return;
            case 'switch': rec(n.items, 'if'); return;
          }
          for (const key in n) { const v = n[key]; if (key !== 'line' && key !== 'end' && v && typeof v === 'object') rec(v, kind); }
        };
        for (const st of it.body.body) rec(st, 'top');
      }
    }
    run() {
      this.prePass();
      this.checkIncludes();
      // 1) firmas de funciones
      for (const it of this.items) {
        if (it.k === 'func' || it.k === 'proto') {
          const prev = this.funcs.get(it.name);
          if (prev && prev.node && it.k === 'func') { this.err("la función '" + it.name + "' está definida dos veces", it.line, 'FUN-026'); continue; }
          if (prev) {
            const dif = []; let kbp = null;
            if (prev.ret !== it.ret) dif.push('devuelve ' + TNAME[prev.ret] + ' en una y ' + TNAME[it.ret] + ' en la otra'), kbp = kbp || 'FUN-004';
            if (!prev.unspec && !it.unspec && prev.params.length !== it.params.length) dif.push('una tiene ' + prev.params.length + ' parámetro(s) y la otra ' + it.params.length), kbp = kbp || 'FUN-005', this.protoMal.add(it.name);
            else if (!prev.unspec && !it.unspec && prev.params.some((p, i) => p.type !== it.params[i].type || !!p.array !== !!it.params[i].array)) dif.push('los tipos de los parámetros no coinciden'), kbp = kbp || 'FUN-003';
            if (dif.length) this.err("el prototipo y la definición de '" + it.name + "' no coinciden: " + dif.join('; '), it.line, kbp);
          }
          if (!prev || it.k === 'func') this.funcs.set(it.name, { name: it.name, ret: it.ret, params: it.params, node: it.k === 'func' ? it : (prev && prev.node), hasProto: it.k === 'proto' || !!(prev && prev.hasProto), unspec: !!it.unspec || !!(prev && prev.unspec), line: it.line, async: false, calls: new Set(), reads: false });
        }
      }
      if (!this.funcs.has('main')) this.err("no hay función main(): el programa empieza en 'main() { ... }'", 1);
      else {
        const mf = this.funcs.get('main');
        if (mf.ret === 'void') this.warn("main tiene que devolver int: con 'void main' funciona en algunos compiladores (Code::Blocks), pero gcc avisa", mf.line, 'POR-005', 'FUN-023');
        if (mf.params.length === 1) this.warn("main recibe cero parámetros o dos (argc y argv), no uno solo", mf.line, 'FUN-025');
      }
      // 2) async: funciones que llegan a scanf/getchar
      for (const f of this.funcs.values()) if (f.node) this.scan(f.node.body, f);
      const llamadas = new Set();
      for (const f of this.funcs.values()) if (f.node) for (const c of f.calls) llamadas.add(c);
      for (const f of this.funcs.values()) if (!f.node && llamadas.has(f.name)) this.err("la función '" + f.name + "' se declara y se usa pero nunca se define", f.line, 'FUN-006');
      let ch = true;
      while (ch) { ch = false; for (const f of this.funcs.values()) if (!f.async) for (const c of f.calls) { const g = this.funcs.get(c); if (g && g.async) { f.async = true; ch = true; break; } } }
      if (this.opts.yieldLoops) for (const f of this.funcs.values()) f.async = true;
      // 3) código
      const out = ['const $={printf:$rt.printf,puts:$rt.puts,putchar:$rt.putchar,scanf:$rt.scanf,getchar:$rt.getchar,idiv:$rt.idiv,imod:$rt.imod,ix:$rt.ix,d2i:$rt.d2i,mk:$rt.mk,pad:$rt.pad,init:$rt.init,rand:$rt.rand,srand:$rt.srand,time:$rt.time,exit:$rt.exit,round:$rt.round,rint:$rt.rint,fmod:$rt.fmod,lop:$rt.lop,ldiv:$rt.ldiv,lmod:$rt.lmod,f2l:$rt.f2l,f2ul:$rt.f2ul,clock:$rt.clock,yield:$rt.yield,cstr:$rt.cstr,tostr:$rt.tostr,strlen:$rt.strlen,strcpy:$rt.strcpy,strncpy:$rt.strncpy,strcat:$rt.strcat,strncat:$rt.strncat,strcmp:$rt.strcmp,strncmp:$rt.strncmp,atoi:$rt.atoi,atol:$rt.atol,atof:$rt.atof,sprintf:$rt.sprintf,snprintf:$rt.snprintf,fgets:$rt.fgets,gets:$rt.gets};', 'let $t;let $y=0;'];
      for (const it of this.items) if (it.k === 'decl') out.push(this.declCode(it, true));
      const fcs = [];
      for (const it of this.items) if (it.k === 'func') fcs.push(this.funcCode(it));
      for (const h of this.hoisted) out.push(h);
      for (const f of fcs) out.push(f);
      if (!this.errors.length) reglasKB(this, this.items);
      out.push('return f_main;');
      return out.join('\n');
    }
    // recorre el AST buscando llamadas
    scan(node, f) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { for (const n of node) this.scan(n, f); return; }
      if (node.k === 'call') {
        if (node.name === 'scanf' || node.name === 'getchar' || node.name === 'getch' || node.name === 'getche' || node.name === 'fgets' || node.name === 'gets') f.async = true;
        f.calls.add(node.name);
      }
      for (const key in node) if (key !== 'line' && typeof node[key] === 'object') this.scan(node[key], f);
    }

    funcCode(f) {
      const info = this.funcs.get(f.name);
      this.cur = info; this.ntemp = 0; this.fnHoist = [];
      this.push();
      const ps = [];
      for (const p of f.params) { this.declare(p.name, p.array ? { type: p.type, js: 'v_' + p.name, assigned: true, array: true, ndims: p.dims, param: true } : { type: p.type, js: 'v_' + p.name, assigned: true, scalar: true, param: true }, p.line); ps.push('v_' + p.name); }
      const body = this.stmtList(f.body.body);
      this.pop();
      if (info.ret !== 'void' && f.name !== 'main' && !this.alwaysReturns(f.body)) { let hayRet = false; each(f.body, (x) => { if (x.k === 'return') hayRet = true; }); this.warn("la función '" + f.name + "' puede terminar sin ejecutar 'return' en algún caso: en C devuelve un valor basura. Agregá un return al final", f.body.end || f.line, hayRet ? 'FUN-012' : 'FUN-011'); }
      this.cur = null;
      const tail = f.name === 'main' ? '\nreturn 0;' : '';
      if (f.name === 'main') ps.forEach((q, i) => { ps[i] = i === 0 ? q + '=1' : i === 1 ? q + '=[$.cstr("./a.out")]' : q; });
      let temps = ''; for (let i = 1; i <= this.ntemp; i++) temps += 'let $a' + i + ',$i' + i + ';';
      return (info.async ? 'async ' : '') + 'function f_' + f.name + '(' + ps.join(',') + '){let $t;' + temps + this.fnHoist.join('') + '\n' + body + tail + '\n}';
    }
    stmtList(arr) { return arr.map((s) => this.stmt(s)).join('\n'); }
    stmt(s) {
      if (s.line) this.curLine = s.line;
      switch (s.k) {
        case 'block': { this.push(); const b = this.stmtList(s.body); this.pop(); return '{\n' + b + '\n}'; }
        case 'empty': return ';';
        case 'decl': return this.declCode(s, false);
        case 'expr': {
          const ek = s.e.k;
          if (ek === 'id' && this.funcs.has(s.e.name) && !this.lookup(s.e.name)) { this.warn("'" + s.e.name + "' es una función: sin paréntesis no se llama y la sentencia no hace nada. ¿Faltan los '()'?", s.line, 'FUN-037'); return ';'; }
          if ((ek === 'bin' || ek === 'un' || ek === 'id' || ek === 'num' || ek === 'cond' || ek === 'idx') && !this.hasSideEffect(s.e)) {
            if (ek === 'bin' && s.e.op === '==') this.warn("esta sentencia compara pero no guarda el resultado: no hace nada. ¿Querías asignar con '='?", s.line, 'CTL-043');
            else this.warn('esta sentencia no hace nada: el resultado de la cuenta no se guarda en ninguna variable', s.line, 'OPE-020', this.loopStack.length ? 'CTL-050' : undefined);
          }
          return this.expr(s.e, true).c + ';';
        }
        case 'if': {
          this.checkCondAssign(s.c);
          if (s.c.k === 'call' && (s.c.name === 'strcmp' || s.c.name === 'strncmp')) { const ss = []; each(s.a, (x) => { if (x.k === 'str') ss.push(x.v); }); if (ss.some((t) => /igual|coincid|mismo/i.test(t))) this.warn('strcmp devuelve 0 cuando los textos son iguales: usado solo, la condición se cumple cuando son DISTINTOS. Compará con 0', s.line, 'ARR-037'); }
          const c = this.cond(s.c);
          const sa = this.assignLog.length;
          this.push(); const a = this.stmt(s.a); this.pop();
          const logA = this.assignLog.slice(sa); const sb = this.assignLog.length;
          const hechasA = logA.filter((i) => i.assigned);
          if (s.a.k === 'empty') this.warn("el if termina en ';' y su cuerpo queda vacío: lo que sigue se ejecuta siempre. ¿Sobra ese ';'?", s.line, 'CTL-001');
          if (s.b && s.b.k === 'empty') this.warn("el else termina en ';' y su cuerpo queda vacío", s.line);
          let r = 'if (' + c + ') ' + this.wrap(a);
          for (const inf of logA) { inf.assigned = false; if (hechasA.indexOf(inf) >= 0) inf.quiet = true; }
          if (s.b) { this.push(); r += ' else ' + this.wrap(this.stmt(s.b)); this.pop(); }
          const logB = this.assignLog.slice(sb);
          const hechasB = logB.filter((i) => i.assigned);
          for (const inf of logA) inf.quiet = false;
          const tA = this.terminaStmt(s.a), tB = !!s.b && this.terminaStmt(s.b);
          for (const inf of new Set(logA.concat(logB))) {
            const enA = hechasA.indexOf(inf) >= 0, enB = hechasB.indexOf(inf) >= 0;
            if (tA && tB) inf.assigned = true;
            else if (tA) inf.assigned = enB;
            else if (tB) inf.assigned = enA;
            else inf.assigned = !!s.b && enA && enB;
            if (!inf.assigned) inf.condAsig = true;
          }
          return r;
        }
        case 'while': {
          this.checkCondAssign(s.c);
          const c = this.cond(s.c);
          const sw = this.assignLog.length;
          this.loopStack.push(s); this.push(); const b = this.bodyStmt(s.body); this.pop(); this.loopStack.pop();
          this.asignarLog(sw);
          this.checkEmptyBody(s, 'while'); this.checkLoop(s, 'while');
          return 'while (' + c + ') ' + this.loopWrap(b);
        }
        case 'do': { const sd = this.assignLog.length; this.loopStack.push(s); this.push(); const b = this.bodyStmt(s.body); this.pop(); this.loopStack.pop(); this.asignarLog(sd); this.checkCondAssign(s.c); this.checkLoop(s, 'do-while'); return 'do ' + this.loopWrap(b) + ' while (' + this.cond(s.c) + ');'; }
        case 'for': {
          this.push();
          let init = '';
          if (s.init) { this.inForInit = true; init = s.init.k === 'decl' ? this.declCode(s.init, false, true) : this.expr(s.init.e, true).c; this.inForInit = false; }
          if (s.c) this.checkCondAssign(s.c);
          const c = s.c ? this.cond(s.c) : '';
          const sf = this.assignLog.length;
          this.loopStack.push(s);
          const b = this.bodyStmt(s.body);
          const st = s.step ? this.expr(s.step, true).c : '';
          this.loopStack.pop();
          this.asignarLog(sf);
          this.pop();
          this.checkEmptyBody(s, 'for'); this.checkLoop(s, 'for');
          return 'for (' + init + ';' + c + ';' + st + ') ' + this.loopWrap(b);
        }
        case 'return': {
          const rt = this.cur.ret;
          if (!s.e) { if (rt !== 'void') this.warn("'return' sin valor en una función que devuelve " + TNAME[rt], s.line, 'FUN-015'); return 'return' + (this.cur.name === 'main' ? ' 0' : '') + ';'; }
          if (rt === 'void') { this.err('una función void no puede devolver un valor', s.line, 'FUN-014'); this.expr(s.e); return 'return;'; }
          if (s.e.k === 'comma' && !this.hasSideEffect(s.e.l)) this.warn("'return A, B' devuelve solo B: la coma descarta el primer valor (una función devuelve un único valor)", s.line, 'FUN-040');
          const r = this.expr(s.e);
          this.checkIntDiv(r, rt, s.line);
          return 'return ' + this.conv(r, rt) + ';';
        }
        case 'break': if (!this.loopDepth && !this.switchDepth) this.err("'break' solo se puede usar dentro de un for, while, do-while o switch", s.line, 'CTL-024'); return 'break;';
        case 'continue': if (!this.loopDepth) this.err("'continue' solo se puede usar dentro de un for, while o do-while", s.line, 'CTL-025'); return 'continue;';
        case 'switch': {
          const e = this.expr(s.e);
          if (!INTLIKE.has(e.t)) this.err('el switch necesita un valor entero', s.line, 'CTL-010');
          if (s.items.length && s.items[0].k !== 'case' && s.items[0].k !== 'default') this.err("dentro de un switch las instrucciones tienen que ir después de un 'case' o 'default'", s.items[0].line || s.line);
          this.push(); this.switchDepth++;
          let out = 'switch (' + (BIG.has(e.t) ? 'Number(' + this.val(e) + ')' : this.val(e)) + ') {\n';
          const seen = new Set(); let hasDefault = false; let lastStmt = null;
          const termina = (st) => !!st && (st.k === 'break' || st.k === 'return' || st.k === 'continue' || (st.k === 'expr' && st.e.k === 'call' && st.e.name === 'exit') || (st.k === 'block' && termina(st.body[st.body.length - 1])) || (st.k === 'if' && st.b && termina(st.a) && termina(st.b)));
          const cierraGrupo = () => { if (lastStmt && !termina(lastStmt)) this.warn("este grupo del switch sigue con el siguiente porque le falta un 'break;' (en C no se corta solo)", lastStmt.line, 'CTL-007'); lastStmt = null; };
          for (const it of s.items) {
            if (it.k === 'case') {
              cierraGrupo();
              if (!this.isConstExpr(it.e)) { this.err("después de 'case' tiene que ir un número o un carácter fijo (por ejemplo case 3: o case 'a':), no una variable ni una cuenta", it.line, it.e.k === 'str' ? 'CTL-012' : 'CTL-011'); continue; }
              const ce = this.expr(it.e);
              if (!INTLIKE.has(ce.t)) { this.err("'case' necesita un valor entero: un decimal o un texto no sirve", it.line); continue; }
              const cv = BIG.has(ce.t) ? 'Number(' + this.val(ce) + ')' : this.val(ce);
              let key = null; try { key = Function('return ' + cv)(); } catch (x) { key = null; }
              if (key !== null) { if (seen.has(key)) this.err("el valor 'case " + key + "' está repetido en este switch", it.line, 'CTL-008'); seen.add(key); }
              out += 'case ' + cv + ':\n';
            } else if (it.k === 'default') {
              cierraGrupo();
              if (hasDefault) this.err("ya hay un 'default' en este switch (solo puede haber uno)", it.line);
              hasDefault = true; out += 'default:\n';
            } else { out += this.stmt(it) + '\n'; lastStmt = it; }
          }
          this.switchDepth--; this.pop();
          return out + '}';
        }
      }
      throw new Error('stmt ' + s.k);
    }
    terminaStmt(st) {
      if (!st) return false;
      switch (st.k) {
        case 'break': case 'return': case 'continue': return true;
        case 'expr': return st.e.k === 'call' && st.e.name === 'exit';
        case 'block': return st.body.some((x) => this.terminaStmt(x));
        case 'if': return !!st.b && this.terminaStmt(st.a) && this.terminaStmt(st.b);
        default: return false;
      }
    }
    alwaysReturns(st) {
      if (!st) return false;
      switch (st.k) {
        case 'return': return true;
        case 'block': return st.body.some((x) => this.alwaysReturns(x));
        case 'if': return !!st.b && this.alwaysReturns(st.a) && this.alwaysReturns(st.b);
        case 'while': return this.esVerdadero(st.c) && !this.breakPropio(st.body);
        case 'do': return this.alwaysReturns(st.body) || (this.esVerdadero(st.c) && !this.breakPropio(st.body));
        case 'expr': return st.e.k === 'call' && st.e.name === 'exit';
        case 'for': return (!st.c || this.esVerdadero(st.c)) && !this.breakPropio(st.body);
        case 'switch': return st.items.some((x) => x.k === 'default') && st.items.some((x) => this.alwaysReturns(x)) && !st.items.some((x) => this.hasBreak(x));
        default: return false;
      }
    }
    hasBreak(n) {
      if (!n || typeof n !== 'object') return false;
      if (Array.isArray(n)) return n.some((x) => this.hasBreak(x));
      if (n.k === 'break') return true;
      for (const k in n) if (k !== 'line' && typeof n[k] === 'object' && this.hasBreak(n[k])) return true;
      return false;
    }
    esVerdadero(c) { return !!c && ((c.k === 'num' && c.v !== 0) || (c.k === 'id' && c.name === 'true' && !this.lookup('true'))); }
    breakPropio(n) {
      if (!n || typeof n !== 'object') return false;
      if (Array.isArray(n)) return n.some((x) => this.breakPropio(x));
      if (n.k === 'break') return true;
      if (n.k === 'while' || n.k === 'do' || n.k === 'for' || n.k === 'switch') return false;
      for (const k in n) if (k !== 'line' && typeof n[k] === 'object' && this.breakPropio(n[k])) return true;
      return false;
    }
    walk(n, fn) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach((x) => this.walk(x, fn)); return; }
      if (n.k) fn(n);
      for (const k in n) if (k !== 'line' && typeof n[k] === 'object') this.walk(n[k], fn);
    }
    rootId(n) { while (n && n.k === 'idx') n = n.base; return n && n.k === 'id' ? n.name : null; }
    checkLoop(s, kind) {
      const body = s.body, cond = s.c;
      let salida = false; const mod = new Set(); const calls = [];
      const scan = (n) => this.walk(n, (x) => {
        if (x.k === 'break' || x.k === 'return') salida = true;
        if (x.k === 'call') { if (['exit', 'scanf', 'getchar', 'getch', 'getche', 'fgets', 'gets'].indexOf(x.name) >= 0) salida = true; else if (this.funcs.has(x.name)) { salida = true; } }
        if (x.k === 'assign') { const r = this.rootId(x.l); if (r) mod.add(r); }
        if (x.k === 'incdec') { const r = this.rootId(x.e); if (r) mod.add(r); }
        if (x.k === 'addr') { const r = this.rootId(x.e); if (r) mod.add(r); }
      });
      scan(body); if (s.step) scan(s.step); scan(cond);
      if (salida) return;
      const siempre = !cond || this.esVerdadero(cond);
      if (siempre) { this.warn(kind + ' sin condición de corte y sin \'break\' ni \'return\' adentro: el bucle no termina nunca', s.line); return; }
      const ids = []; let conCall = false;
      this.walk(cond, (x) => { if (x.k === 'id') ids.push(x.name); if (x.k === 'call') conCall = true; });
      if (conCall || !ids.length) return;
      if (ids.every((nm) => !mod.has(nm))) {
        let kb = 'CTL-021';
        const sv = this.cur && this.scanVars.get(this.cur.name);
        let inutil = false; this.walk(body, (x) => { if (x.k === 'expr' && ['bin', 'un', 'id', 'num'].indexOf(x.e.k) >= 0 && !this.hasSideEffect(x.e) && ids.some((nm) => mentions(x.e, nm))) inutil = true; });
        if (inutil) kb = 'CTL-050';
        else if (sv && ids.some((nm) => sv.has(nm))) kb = 'CTL-027';
        this.warn('en este ' + kind + ' ninguna variable de la condición (' + Array.from(new Set(ids)).join(', ') + ') cambia dentro del bucle: es probable que nunca termine', s.line, kb);
      }
    }
    bodyStmt(b) { this.loopDepth++; const r = this.stmt(b); this.loopDepth--; return r; }
    isConstExpr(n) {
      if (n.k === 'num') return true;
      if (n.k === 'un') return this.isConstExpr(n.e);
      if (n.k === 'bin') return this.isConstExpr(n.l) && this.isConstExpr(n.r);
      if (n.k === 'cast') return this.isConstExpr(n.e);
      if (n.k === 'sizeof') return true;
      if (n.k === 'cond') return this.isConstExpr(n.c) && this.isConstExpr(n.a) && this.isConstExpr(n.b);
      if (n.k === 'id') return own(CONSTS, n.name) && !this.lookup(n.name);
      return false;
    }
    wrap(c) { return c.startsWith('{') ? c : '{\n' + c + '\n}'; }
    loopWrap(c) {
      const w = this.wrap(c);
      if (!this.opts.yieldLoops) return w;
      return '{if(++$y>100000){$y=0;await $.yield();}' + w.slice(1);
    }
    checkCondAssign(c) {
      if (c.k === 'assign' && c.op === '=') this.warn(c.bang ? "'=!' no es 'distinto': C lo lee como asignar el contrario. Para \"distinto\" se escribe '!='" : "hay una asignación '=' dentro de la condición: ¿querías comparar con '=='?", c.line, c.bang ? 'CTL-040' : 'CTL-029');
    }
    checkEmptyBody(s, kind) {
      if (s.body.k === 'empty' && !(kind === 'while' && this.hasSideEffect(s.c))) this.warn("el " + kind + " termina en ';' y su cuerpo queda vacío: ¿sobra ese ';'?", s.line, kind === 'for' ? 'CTL-016' : 'CTL-022');
    }

    // comparación de decimales con ==: ¿suma de decimales?, ¿acumulador de un lazo?, ¿variable contra un literal?
    kbFloatCmp(ln, rn) {
      const [v, o] = ln.k === 'bin' ? [ln, rn] : rn.k === 'bin' ? [rn, ln] : [ln.k === 'id' ? ln : rn, ln.k === 'id' ? rn : ln];
      if (v.k === 'bin') return 'TIP-017';
      if (v.k === 'id') {
        const lazos = []; if (this.cur && this.cur.node) this.walk(this.cur.node.body, (x) => { if (x.k === 'for' || x.k === 'while' || x.k === 'do') lazos.push(x); });
        for (const lp of lazos) { let acum = false; this.walk(lp.body, (x) => { if (x.k === 'assign' && x.l.k === 'id' && x.l.name === v.name && (x.op !== '=' || mentions(x.r, v.name))) acum = true; }); if (acum) return 'TIP-029'; }
        return 'TIP-016';
      }
      return undefined;
    }
    zero(t) { return '0'; }
    checkIntDiv(r, to, line) {
      if (r.intdiv && FLOATLIKE.has(to)) this.warn('la división es entre dos enteros y se trunca (7/2 da 3, no 3.5): guardarla en ' + to + ' no recupera los decimales; usá 7/2.0 o (float)7/2', line, 'TIP-001');
    }

    declCode(d, global, inFor) {
      const parts = [];
      const hoist = d.static && !global && !inFor;
      for (const v of d.vars) {
        const js = hoist ? 'v_' + v.name + '$s' + (++this.sid) : ((!global && this.lookup(v.name)) ? 'v_' + v.name + '$o' + (++this.sid) : 'v_' + v.name);
        if (v.ptr && !v.dims.length) {
          const alias = v.init && v.init.k === 'id' ? this.lookup(v.init.name) : null;
          let cod = null;
          if (v.init && v.init.k === 'str') cod = '$.cstr(' + JSON.stringify(v.init.v) + ')';
          else if (alias && alias.array && alias.type === 'char' && alias.ndims === 1) cod = alias.js;
          if (cod === null) { this.err('los punteros todavía no están soportados: char * solo se puede usar con un texto entre comillas (char *nombre = "texto";) o con un arreglo de char', v.line); this.declare(v.name, { type: 'char', js, array: true, ndims: 1, assigned: true }, v.line); parts.push('let ' + js + '=[0];'); continue; }
          this.declare(v.name, { type: 'char', js, array: true, ndims: 1, assigned: true, ptrStr: true }, v.line);
          parts.push('let ' + js + '=' + cod + ';');
          continue;
        }
        if (v.ptr && v.dims.length === 1) {
          const it = v.init && v.init.k === 'list' ? v.init.items : null;
          if (!it || !it.every((x) => x.k === 'str')) { this.err('un arreglo de char * se inicializa con textos entre comillas: char *nombres[] = {"ana", "luis"};', v.line); this.declare(v.name, { type: 'char', js, array: true, ndims: 2, assigned: true, rowsVar: true }, v.line); parts.push('let ' + js + '=[[0]];'); continue; }
          let n0 = it.length;
          if (v.dims[0]) { const r0 = this.expr(v.dims[0]); try { n0 = Function('return ' + this.val(r0))(); } catch (x) { n0 = it.length; } }
          const filas = it.map((x) => '$.cstr(' + JSON.stringify(x.v) + ')'); for (let q = it.length; q < n0; q++) filas.push('[0]');
          this.declare(v.name, { type: 'char', js, array: true, ndims: 2, assigned: true, rowsVar: true, ptrStr: true }, v.line);
          parts.push('let ' + js + '=[' + filas.join(',') + '];');
          continue;
        }
        if (v.dims.length) {
          const dimsCode = [], sizes = [];
          let ok = true;
          if (v.init && v.init.k === 'list' && v.dims[0] === null) {
            dimsCode.push(String(v.init.items.length));
          }
          if (v.init && v.init.k === 'str' && v.dims.length === 1 && v.dims[0] === null && (d.type === 'char' || d.type === 'uchar')) dimsCode.push(String(new TextEncoder().encode(v.init.v).length + 1));
          for (let i = 0; i < v.dims.length; i++) {
            if (v.dims[i] === null) { if (!(i === 0 && dimsCode.length)) { this.err('al arreglo le falta el tamaño', v.line, i > 0 ? 'ARR-019' : 'ARR-010'); ok = false; } continue; }
            const r = this.expr(v.dims[i]);
            if (!INTLIKE.has(r.t)) { this.err('el tamaño de un arreglo debe ser un entero', v.line, 'ARR-028'); ok = false; }
            else if (this.isConstExpr(v.dims[i])) { let nv = null; try { nv = Function('return ' + this.val(r))(); } catch (x) { nv = null; } if (nv !== null && nv <= 0) { this.err('el tamaño del arreglo tiene que ser mayor que 0 (usaste ' + nv + ')', v.line, nv < 0 ? 'ARR-007' : 'ARR-006'); ok = false; } }
            dimsCode.push(this.val(r));
            sizes.push(this.isConstExpr(v.dims[i]) ? Number(r.c) : null);
          }
          if (v.init && v.init.k === 'list' && v.dims.some((x, i) => x !== null && sizes[i] === null && !this.isConstExpr(x))) { this.err('un arreglo cuyo tamaño no es un número fijo no se puede inicializar con llaves (una constante const no alcanza en C): usá un número o un #define', v.line, 'ARR-009'); ok = false; }
          if (ok && v.init && v.init.k === 'list' && v.dims.length === 1 && sizes[0] !== null && Number.isFinite(sizes[0]) && v.init.items.length > sizes[0]) this.warn('el arreglo tiene ' + sizes[0] + ' lugares pero le diste ' + v.init.items.length + ' valores: los que sobran no entran', v.line, 'ARR-011');
          if (ok && v.init && v.init.k === 'str' && v.dims.length === 1 && sizes[0] !== null && Number.isFinite(sizes[0]) && new TextEncoder().encode(v.init.v).length > sizes[0]) this.warn('el texto tiene más letras (' + new TextEncoder().encode(v.init.v).length + ') que lugares el arreglo (' + sizes[0] + '): no entra', v.line, 'ARR-030');
          this.declare(v.name, { type: d.type, js, array: true, ndims: v.dims.length, assigned: true, isConst: !!d.const }, v.line);
          if ((d.type === 'char' || d.type === 'uchar') && v.dims.length === 1 && v.init && v.init.k === 'list' && v.init.items.some((x) => x.k === 'str')) this.warn("para guardar varios textos hacen falta dos dimensiones: char " + v.name + "[cantidad][largo]. Con una sola, cada elemento guarda una letra", v.line, 'ARR-055');
          if (!ok) { parts.push('let ' + js + '=[];'); continue; }
          let init;
          if (v.init) {
            if (v.init.k === 'str' && v.dims.length === 1 && (d.type === 'char' || d.type === 'uchar')) init = '$.cstr(' + JSON.stringify(v.init.v) + ',' + dimsCode[0] + ')';
            else if (v.init.k !== 'list') { this.err('un arreglo se inicializa con llaves { ... }', v.line, 'ARR-023'); init = '$.mk([1],0)'; }
            else init = '$.init(' + this.listCode(v.init, d.type, v.dims.length, dimsCode[dimsCode.length - 1]) + ',[' + dimsCode.join(',') + '],' + (BIG.has(d.type) ? '0n' : '0') + ',' + v.line + ')';
          } else init = '$.mk([' + dimsCode.join(',') + '],' + (BIG.has(d.type) ? '0n' : '0') + ',' + v.line + ')';
          parts.push('let ' + js + '=' + init + ';');
          continue;
        }
        const z0 = BIG.has(d.type) ? '0n' : '0';
        let init = z0;
        let assigned = global || hoist;
        if (v.init) {
          if (v.init.k === 'list') { this.err("'" + v.name + "' no es un arreglo, no se inicializa con llaves", v.line); }
          else {
            if (global && !this.isConstExpr(v.init)) this.err('el valor inicial de una variable global tiene que ser una constante (un número), no otra variable ni una llamada a función', v.line);
            const pi = this.inDeclInit, pc = this.copiaNode; this.inDeclInit = v.init; if (v.init.k === 'id') this.copiaNode = v.init;
            const r = this.expr(v.init); this.inDeclInit = pi; this.copiaNode = pc;
            if (r.t === 'str' && (d.type === 'char' || d.type === 'uchar')) { this.warn("a un char le asignás un texto entre comillas dobles: ¿es lo que querías guardar ahí? Pensá qué guarda cada tipo", v.line, 'ARR-047', 'SIN-053'); init = '0'; }
            else if (r.t === 'str' && INTLIKE.has(d.type)) { this.err('un ' + TNAME[d.type] + ' guarda un número, no un texto', v.line, 'ARR-045'); init = '0'; }
            else { this.checkIntDiv(r, d.type, v.line); init = this.conv(r, d.type); }
            assigned = true;
          }
        }
        if (!global && !hoist && !inFor && !v.init && this.cur) {
          const hj = 'v_' + v.name + '$h' + (++this.sid);
          this.fnHoist.push('let ' + hj + '=' + z0 + ';');
          this.declare(v.name, { type: d.type, js: hj, assigned, scalar: true, global, isConst: !!d.const, listaSinValor: d.vars.some((w, wi) => wi > d.vars.indexOf(v) && w.init) }, v.line);
          continue;
        }
        this.declare(v.name, { type: d.type, js, assigned, scalar: true, global, isConst: !!d.const }, v.line);
        parts.push((inFor ? '' : 'let ') + js + '=' + init + (inFor ? '' : ';'));
      }
      if (inFor) return 'let ' + parts.join(',');
      if (hoist) { this.hoisted.push(parts.join('\n')); return ''; }
      return parts.join('\n');
    }
    listCode(l, type, depth, rowLen) {
      return '[' + l.items.map((it) => {
        if (it.k === 'str' && (type === 'char' || type === 'uchar') && rowLen !== undefined) return '$.cstr(' + JSON.stringify(it.v) + ',' + rowLen + ')';
        if (it.k === 'list') return this.listCode(it, type, depth - 1, rowLen);
        const r = this.expr(it); return this.conv(r, type);
      }).join(',') + ']';
    }

    /* ----- conversiones ----- */
    val(r) { return r.b ? '(' + r.c + '?1:0)' : r.c; }
    cond(node) {
      const r = this.expr(node);
      if (r.t === 'void') { this.err('esa función no devuelve ningún valor', node.line, 'FUN-013'); return 'false'; }
      return r.b ? r.c : '(' + r.c + (BIG.has(r.t) ? '!==0n)' : '!==0)');
    }
    conv(r, to) {
      if (r.t === 'void') { this.err('esa función no devuelve ningún valor', 0, 'FUN-013'); return '0'; }
      if (r.t === 'str') { this.err('no se puede usar un texto entre comillas como número', 0, to === 'char' || to === 'uchar' ? 'ARR-047' : undefined); return '0'; }
      const v = this.val(r);
      const f = r.t;
      if (f === to) return v;
      if (BIG.has(f)) {
        switch (to) {
          case 'bool': return '(' + v + '!==0n?1:0)';
          case 'double': return 'Number(' + v + ')';
          case 'float': return 'Math.fround(Number(' + v + '))';
          case 'long': return 'BigInt.asIntN(64,' + v + ')';
          case 'ulong': return 'BigInt.asUintN(64,' + v + ')';
          case 'int': return 'Number(BigInt.asIntN(32,' + v + '))';
          case 'uint': return 'Number(BigInt.asUintN(32,' + v + '))';
          case 'char': return 'Number(BigInt.asIntN(8,' + v + '))';
          case 'uchar': return 'Number(BigInt.asUintN(8,' + v + '))';
          case 'short': return 'Number(BigInt.asIntN(16,' + v + '))';
          case 'ushort': return 'Number(BigInt.asUintN(16,' + v + '))';
        }
        return v;
      }
      if (BIG.has(to)) {
        if (FLOATLIKE.has(f)) return (to === 'long' ? '$.f2l(' : '$.f2ul(') + v + ')';
        if (to === 'long' || f === 'uint' || f === 'uchar' || f === 'ushort') return 'BigInt(' + v + ')';
        return 'BigInt.asUintN(64,BigInt(' + v + '))';
      }
      switch (to) {
        case 'bool': return '(' + v + '!==0?1:0)';
        case 'double': return v;
        case 'float': return 'Math.fround(' + v + ')';
        case 'int': return FLOATLIKE.has(f) ? '$.d2i(' + v + ')' : (f === 'char' || f === 'uchar' || f === 'short' || f === 'ushort' || f === 'bool' ? v : '(' + v + '|0)');
        case 'uint': return FLOATLIKE.has(f) ? 'Number(BigInt.asUintN(32,$.f2l(' + v + ')))' : '(' + v + '>>>0)';
        case 'char': return FLOATLIKE.has(f) ? '($.d2i(' + v + ')<<24>>24)' : '(' + v + '<<24>>24)';
        case 'uchar': return FLOATLIKE.has(f) ? '($.d2i(' + v + ')&255)' : '(' + v + '&255)';
        case 'short': return FLOATLIKE.has(f) ? '($.d2i(' + v + ')<<16>>16)' : '(' + v + '<<16>>16)';
        case 'ushort': return FLOATLIKE.has(f) ? '($.d2i(' + v + ')&65535)' : '(' + v + '&65535)';
      }
      return v;
    }
    wrapInt(t, c) {
      switch (t) {
        case 'int': return '((' + c + ')|0)';
        case 'uint': return '((' + c + ')>>>0)';
        case 'float': return 'Math.fround(' + c + ')';
        case 'long': return 'BigInt.asIntN(64,' + c + ')';
        case 'ulong': return 'BigInt.asUintN(64,' + c + ')';
        default: return '(' + c + ')';
      }
    }

    /* ----- expresiones ----- */
    expr(n, asStmt) {
      if (n.line) this.curLine = n.line;
      switch (n.k) {
        case 'raw': return { c: n.c, t: n.t };
        case 'num': return { c: (n.kind === 'long' || n.kind === 'ulong') ? n.big + 'n' : (n.v < 0 ? '(' + n.v + ')' : String(n.v)), t: n.kind };
        case 'str': return { c: JSON.stringify(n.v), t: 'str' };
        case 'id': return this.idRead(n);
        case 'comma': { const a = this.expr(n.l, true); const b = this.expr(n.r, asStmt); return { c: '(' + a.c + ',' + b.c + ')', t: b.t, b: b.b }; }
        case 'un': return this.unaryOp(n);
        case 'bin': return this.binOp(n.op, n.l, n.r, n.line);
        case 'assign': return this.assignOp(n);
        case 'cond': {
          const c = this.cond(n.c);
          const a = this.expr(n.a), b = this.expr(n.b);
          if (a.t === 'str' && b.t === 'str') { const sc = (x, nd) => (x.dyn ? x.c : JSON.stringify(nd.v)); return { c: '(' + c + '?' + sc(a, n.a) + ':' + sc(b, n.b) + ')', t: 'str', dyn: true }; }
          if (a.t === 'str' || b.t === 'str' || a.t === 'void' || b.t === 'void') { this.err('los dos lados del ?: deben ser números', n.line); return { c: '0', t: 'int' }; }
          const t = arith(a.t, b.t);
          return { c: '(' + c + '?' + this.conv(a, t) + ':' + this.conv(b, t) + ')', t };
        }
        case 'cast': {
          const r = this.expr(n.e);
          if (n.type === 'void') return { c: '(' + r.c + ',0)', t: 'int' };
          return { c: this.conv(r, n.type), t: n.type };
        }
        case 'sizeof': {
          const sz = { int: 4, uint: 4, long: 8, char: 1, uchar: 1, bool: 1, short: 2, ushort: 2, ulong: 8, float: 4, double: 8, void: 1 };
          if (n.type) return { c: String(sz[n.type]), t: 'int' };
          if (n.e.k === 'id') { const info = this.lookup(n.e.name); if (info && info.scalar) return { c: String(sz[info.type]), t: 'int' }; if (info && info.array) { if (info.param || info.ptrStr) return { c: '8', t: 'int' }; let mul = info.js + '.length'; if (info.ndims === 2) mul += '*' + info.js + '[0].length'; return { c: '(' + mul + '*' + sz[info.type] + ')', t: 'uint' }; } }
          if (n.e.k === 'idx') { let b = n.e, k = 0; while (b.k === 'idx') { k++; b = b.base; } const info = b.k === 'id' ? this.lookup(b.name) : null; if (info && info.array && k <= info.ndims) { if (k === info.ndims) return { c: String(sz[info.type]), t: 'uint' }; return { c: '(' + info.js + '[0].length*' + sz[info.type] + ')', t: 'uint' }; } }
          this.err('sizeof solo se soporta con un tipo (sizeof(int)) o una variable simple', n.line);
          return { c: '0', t: 'int' };
        }
        case 'incdec': return this.incdec(n, asStmt);
        case 'idx': { const lv = this.lvalue(n, false); return { c: lv.c, t: lv.t }; }
        case 'addr': this.err(this.printfArgNode === n ? "con & no se muestra el valor sino la dirección de memoria: el & es para scanf, en printf va la variable sola" : "el operador '&' solo se usa dentro de scanf", n.line, this.printfArgNode === n ? 'PRF-024' : undefined); return { c: '0', t: 'int' };
        case 'call': return this.call(n);
        case 'list': this.err('las llaves { } solo se usan para inicializar arreglos', n.line); return { c: '0', t: 'int' };
      }
      throw new Error('expr ' + n.k);
    }
    idRead(n) {
      if (own(CONSTS, n.name) && !this.lookup(n.name)) { this.needIncludeConst(n.name, n.line); const c = CONSTS[n.name]; return { c: typeof c[0] === 'bigint' ? '(' + c[0] + 'n)' : String(c[0]), t: c[1] }; }
      const info = this.lookup(n.name);
      if (!info) {
        if (this.funcs.has(n.name)) { this.err("'" + n.name + "' es una función: faltan los paréntesis para llamarla", n.line); return { c: '0', t: 'int' }; }
        this.undeclErr(n.name, n.line, this.printfArgNode === n && this.printfArgConv === 'c' ? 'letra' : 'read');
        return { c: '0', t: 'int' };
      }
      if (info.array) { this.err("'" + n.name + "' es un arreglo: usá " + n.name + '[i] para acceder a una posición', n.line, this.printfArgNode === n ? 'ARR-015' : this.cmpArr ? (this.cmpArr === 'str' ? 'ARR-036' : 'ARR-021') : 'ARR-014'); return { c: '0', t: 'int' }; }
      if (!info.assigned && !info.warned && !this.inSC && !info.quiet) { info.warned = true; this.warnUninit(n.name, info, n, 'leer', n.line); }
      return { c: info.js, t: info.type };
    }
    // aviso de variable sin valor: el contexto decide qué caso de la base lo explica
    warnUninit(name, info, n, how, line) {
      let kb;
      const msg = "'" + name + "' se usa antes de darle un valor (en C su valor inicial es basura): asignale un valor inicial, por ejemplo " + name + ' = 0;';
      const sv = this.cur && this.scanVars.get(this.cur.name);
      const cuenta = how === 'incdec' || (how === 'compuesta' && n.r.k === 'num' && n.r.v === 1) || (how === 'leer' && this.autoAcum === name && this.autoAcumUno);
      if (info.isConst) kb = 'DEC-026';
      else if (cuenta) kb = 'DEC-006';
      else if (info.condAsig) kb = 'DEC-034';
      else if (how === 'leer' && this.printfArgNode === n) kb = 'PRF-037';
      else if (how === 'leer' && this.copiaNode === n && sv && sv.has(name)) kb = 'DEC-033';
      else if (info.listaSinValor) kb = 'DEC-014';
      else if (how === 'compuesta' || (how === 'leer' && this.autoAcum === name)) kb = 'DEC-005';
      this.warn(msg, line, kb, kb === 'DEC-006' && info.listaSinValor ? 'DEC-014' : undefined);
    }
    // gcc (x86-64) evalúa los argumentos de una llamada de derecha a izquierda: se imita cuando hay efectos
    hoistArgs(argNodes, codes) {
      if (argNodes.length < 2 || !argNodes.some((a) => this.hasSideEffect(a))) return { pre: '', codes };
      const pre = [], out = codes.slice();
      for (let k = codes.length - 1; k >= 0; k--) {
        if (/^("(?:[^"\\]|\\.)*"|[\d.]+n?|\(-[\d.]+n?\))$/.test(codes[k])) continue;
        const id = ++this.ntemp; pre.push('$a' + id + '=' + codes[k]); out[k] = '$a' + id;
      }
      return { pre: pre.length ? pre.join(',') + ',' : '', codes: out };
    }
    // arreglo de char (o fila de un arreglo de textos) usado como texto: devuelve el código JS del arreglo
    charArr(a) {
      if (!a) return null;
      if (a.k === 'id') { const inf = this.lookup(a.name); return inf && inf.array && (inf.type === 'char' || inf.type === 'uchar') && inf.ndims === 1 ? { c: inf.js } : null; }
      if (a.k !== 'idx') return null;
      const idxs = []; let b = a;
      while (b.k === 'idx') { idxs.unshift(b.i); b = b.base; }
      if (b.k !== 'id') return null;
      const inf = this.lookup(b.name);
      if (!inf || !inf.array || (inf.type !== 'char' && inf.type !== 'uchar') || idxs.length !== inf.ndims - 1) return null;
      let code = inf.js, lenBase = inf.js;
      idxs.forEach((ix, k) => {
        const r = this.expr(ix);
        if (!INTLIKE.has(r.t)) this.err('el índice de un arreglo debe ser un entero', ix.line || a.line, 'ARR-027');
        code += '[$.ix(' + this.val(r) + ',' + (inf.rowsVar && k > 0 ? code : lenBase) + '.length,' + a.line + ')]';
        lenBase += '[0]';
      });
      return { c: code };
    }
    hasSideEffect(n) { let r = false; this.walk(n, (x) => { if (x.k === 'call' || x.k === 'assign' || x.k === 'incdec') r = true; }); return r; }
    lvalue(n, forWrite, useTemps) {
      if (n.k === 'id') {
        const info = this.lookup(n.name);
        if (!info) { this.undeclErr(n.name, n.line, this.inDeclInit ? 'decl' : this.inForInit ? 'for' : 'write'); return { c: 'v_' + n.name, t: 'int', bad: true }; }
        if (info.array) { this.err("'" + n.name + "' es un arreglo: usá " + n.name + '[i] para acceder a una posición', n.line, this.enScanf ? 'ARR-016' : 'ARR-014'); return { c: info.js, t: info.type, bad: true }; }
        return { c: info.js, t: info.type, info };
      }
      if (n.k === 'idx') {
        const idxs = []; let b = n;
        while (b.k === 'idx') { idxs.unshift(b.i); b = b.base; }
        if (b.k !== 'id') { this.err('solo se pueden indexar arreglos por su nombre', n.line); return { c: '0', t: 'int', bad: true }; }
        const info = this.lookup(b.name);
        if (!info) { this.err("'" + b.name + "' no está declarada", b.line); return { c: '0', t: 'int', bad: true }; }
        if (!info.array) { this.err("'" + b.name + "' no es un arreglo", b.line); return { c: '0', t: 'int', bad: true }; }
        if (idxs.length !== info.ndims) { const coma = idxs.length === 1 && idxs[0].k === 'comma'; this.err(coma ? "una matriz se indexa con un corchete por dimensión: M[I][J], no M[I, J]" : "'" + b.name + "' tiene " + info.ndims + ' dimensión(es) y se usó con ' + idxs.length, b.line, coma ? 'ARR-017' : undefined); return { c: '0', t: 'int', bad: true }; }
        let code = info.js;
        let lenBase = info.js;
        if (useTemps && idxs.some((ix) => this.hasSideEffect(ix))) {
          const id = ++this.ntemp; let cont = info.js, lb = info.js;
          idxs.forEach((ix, k) => {
            const r = this.expr(ix);
            if (!INTLIKE.has(r.t)) this.err('el índice de un arreglo debe ser un entero', ix.line || n.line, 'ARR-027');
            if (k < idxs.length - 1) { cont += '[$.ix(' + this.val(r) + ',' + lb + '.length,' + n.line + ')]'; lb += '[0]'; }
            else code = '$i' + id + '=$.ix(' + this.val(r) + ',$a' + id + '.length,' + n.line + ')';
          });
          return { c: '$a' + id + '[$i' + id + ']', pre: '$a' + id + '=' + cont + ',' + code, t: info.type, info, arrayElem: true };
        }
        idxs.forEach((ix, k) => {
          const r = this.expr(ix);
          if (!INTLIKE.has(r.t)) this.err('el índice de un arreglo debe ser un entero', ix.line || n.line, 'ARR-027');
          code += '[$.ix(' + this.val(r) + ',' + (info.rowsVar && k > 0 ? code : lenBase) + '.length,' + n.line + ')]';
          lenBase += '[0]';
        });
        return { c: code, t: info.type, info, arrayElem: true };
      }
      if (n.k === 'num' && n.mac) this.err(this.enScanf ? "'" + n.mac + "' es una constante #define, no una variable: no hay dónde guardar el dato. Declará una variable" : "'" + n.mac + "' es un valor que se copia (#define), no una variable: no se le puede asignar otro valor", n.line, this.enScanf ? 'PRE-029' : 'PRE-028');
      else if (n.k === 'bin') this.err("a la izquierda del '=' tiene que haber una variable, y esto es una cuenta. Para comparar se usa '=='", n.line, 'CTL-048');
      else if (n.k === 'num') this.err("a la izquierda del '=' tiene que haber una variable, no un número", n.line, 'OPE-036');
      else this.err('a la izquierda del = tiene que haber una variable', n.line);
      return { c: '$t', t: 'int', bad: true };
    }
    markAssigned(lv) { const inf = lv.info; if (inf && !inf.assigned) { inf.assigned = true; this.assignLog.push(inf); } }
    asignarLog(desde) { for (const inf of this.assignLog.slice(desde)) inf.assigned = true; }
    desasignar(desde) { for (const inf of this.assignLog.slice(desde)) inf.assigned = false; }
    rootName(n) { while (n && n.k === 'idx') n = n.base; return n && n.name; }
    checkConst(lv, name, line) {
      if (lv.info && lv.info.isConst) this.err("'" + name + "' es const (constante): no se le puede asignar otro valor", line, 'DEC-010');
    }

    unaryOp(n) {
      const r = this.expr(n.e);
      if (r.t === 'str' || r.t === 'void') { this.err('operación inválida sobre ' + (r.t === 'str' ? 'un texto' : 'void'), n.line); return { c: '0', t: 'int' }; }
      if (n.op === '!') return { c: r.b ? '!(' + r.c + ')' : '((' + r.c + ')===' + (BIG.has(r.t) ? '0n' : '0') + ')', t: 'int', b: true };
      if (n.op === '+') return { c: this.val(r), t: (r.t === 'char' || r.t === 'uchar' || r.t === 'short' || r.t === 'ushort' || r.t === 'bool') ? 'int' : r.t };
      const t = r.t === 'char' || r.t === 'uchar' || r.t === 'short' || r.t === 'ushort' || r.t === 'bool' || r.b ? 'int' : r.t;
      if (n.op === '-') {
        const v = this.val(r);
        return { c: this.wrapInt(t, '-' + (/^[\d.]+$/.test(v) ? v : '(' + v + ')')), t };
      }
      if (n.op === '~') { if (!INTLIKE.has(t)) this.err("'~' necesita un entero", n.line); return { c: this.wrapInt(t, '~' + '(' + this.val(r) + ')'), t }; }
      throw new Error('un');
    }
    binOp(op, ln, rn, line) {
      if (op === '&&' || op === '||') {
        if (op === '||' && rn.k === 'num' && rn.v !== 0 && ln.k === 'bin') this.warn("después de '||' hay solo el número " + rn.v + ", que siempre es verdadero: la condición siempre se cumple. Para comparar con dos valores escribí x == 1 || x == 2", line, 'CTL-035');
        const a = this.cond(ln); this.inSC++; const b = this.cond(rn); this.inSC--;
        return { c: '(' + a + (op === '&&' ? '&&' : '||') + b + ')', t: 'int', b: true };
      }
      const REL = ['<', '>', '<=', '>=', '==', '!='];
      const esRel = (x) => x && x.k === 'bin' && REL.indexOf(x.op) >= 0;
      if ((op === '&' || op === '|') && (esRel(ln) || esRel(rn))) this.warn("usaste '" + op + "' (operación de bits); para " + (op === '&' ? '"y"' : '"o"') + " lógico se escribe '" + op + op + "'", line, 'OPE-005');
      if (REL.indexOf(op) >= 0 && esRel(ln) && op !== '==' && op !== '!=') this.warn("a < b < c no comprueba un rango: C evalúa primero la comparación de la izquierda (da 0 o 1). Escribilo con &&, por ejemplo: 0 < a && a < 3", line, 'CTL-034');
      if (op === '^') this.warn("en C, '^' no es potencia (es XOR de bits): 2 ^ 3 da 1. Para potencias usá pow(2, 3) de <math.h>", line, 'OPE-031');
      if ((op === '==' || op === '!=') && ((ln.k === 'call' && (ln.name === 'strcmp' || ln.name === 'strncmp') && (numVal(rn) === 1 || numVal(rn) === -1)) || (rn.k === 'call' && (rn.name === 'strcmp' || rn.name === 'strncmp') && (numVal(ln) === 1 || numVal(ln) === -1)))) this.warn('strcmp no devuelve 1 ni -1: devuelve cualquier número positivo o negativo según las letras. Se compara con 0, o con > 0 y < 0', line, 'ARR-038');
      const esArr = (x) => { const i = x.k === 'id' ? this.lookup(x.name) : null; return !!(i && i.array); };
      if ((op === '==' || op === '!=') && ((esArr(ln) && (esArr(rn) || rn.k === 'str')) || (esArr(rn) && ln.k === 'str'))) this.cmpArr = (rn.k === 'str' || ln.k === 'str') ? 'str' : 'arr';
      const a = this.expr(ln), b = this.expr(rn);
      this.cmpArr = null;
      if (a.t === 'str' || b.t === 'str' || a.t === 'void' || b.t === 'void') {
        this.err(a.t === 'void' || b.t === 'void' ? 'esa función no devuelve ningún valor' : 'no se puede operar con un texto entre comillas: una letra va con comillas simples (\'A\') y para comparar textos se usa strcmp', line, a.t === 'void' || b.t === 'void' ? 'FUN-013' : 'ARR-056');
        return { c: '0', t: 'int' };
      }
      if ((op === '/' || op === '%') && rn.k === 'num' && rn.v === 0 && rn.kind !== 'double' && rn.kind !== 'float' && !FLOATLIKE.has(a.t) && !FLOATLIKE.has(b.t)) this.warn('división por cero: el programa se cierra al llegar acá', line, 'OPE-022');
      const esShift = op === '<<' || op === '>>';
      const ctype = esShift ? arith(a.t, 'int') : arith(a.t, b.t);
      const av = this.conv(a, ctype), bv = esShift ? (BIG.has(ctype) ? this.conv(b, ctype) : this.conv(b, 'int')) : this.conv(b, ctype);
      if (op === '<' || op === '>' || op === '<=' || op === '>=' || op === '==' || op === '!=') {
        if (op === '==' || op === '!=') {
          const entero = (x) => x.k === 'num' && Number.isInteger(x.v);
          const hayFloat = (FLOATLIKE.has(a.t) && !entero(rn)) || (FLOATLIKE.has(b.t) && !entero(ln));
          if (hayFloat) this.warn("comparar un decimal con '" + op + "' puede fallar por redondeo (por ejemplo 0.1 no se guarda exacto): conviene comparar con '<' o '>'", line, this.kbFloatCmp(ln, rn));
        }
        const ct = arith(a.t, b.t);
        const ua = av, ub = bv;
        return { c: '(' + ua + ' ' + (op === '==' ? '===' : op === '!=' ? '!==' : op) + ' ' + ub + ')', t: 'int', b: true };
      }
      const t = ctype;
      switch (op) {
        case '+': case '-': return { c: this.wrapInt(t, av + ' ' + op + ' ' + bv), t };
        case '*':
          if (t === 'int') return { c: 'Math.imul(' + av + ',' + bv + ')', t };
          if (t === 'uint') return { c: '(Math.imul(' + av + ',' + bv + ')>>>0)', t };
          return { c: this.wrapInt(t, av + ' * ' + bv), t };
        case '/':
          if (BIG.has(t)) return { c: this.wrapInt(t, '$.ldiv(' + av + ',' + bv + ',' + line + ')'), t, intdiv: true };
          if (FLOATLIKE.has(t)) return { c: this.wrapInt(t, av + ' / ' + bv), t };
          if (t === 'uint') return { c: this.wrapInt(t, '$.idiv(' + av + '>>>0,' + bv + '>>>0,' + line + ')'), t, intdiv: true };
          return { c: this.wrapInt(t, '$.idiv(' + av + ',' + bv + ',' + line + ')'), t, intdiv: true };
        case '%':
          if (FLOATLIKE.has(t)) { this.err("'%' solo funciona con enteros (para decimales usá fmod)", line, 'OPE-021'); return { c: '0', t: 'int' }; }
          if (BIG.has(t)) return { c: this.wrapInt(t, '$.lmod(' + av + ',' + bv + ',' + line + ')'), t };
          if (t === 'uint') return { c: this.wrapInt(t, '$.imod(' + av + '>>>0,' + bv + '>>>0,' + line + ')'), t };
          return { c: this.wrapInt(t, '$.imod(' + av + ',' + bv + ',' + line + ')'), t };
        case '&': case '|': case '^': case '<<': case '>>':
          if (FLOATLIKE.has(t)) { this.err("'" + op + "' solo funciona con enteros", line); return { c: '0', t: 'int' }; }
          if (t === 'uint' && op === '>>') return { c: '((' + av + '>>>0) >>> ' + bv + ')', t };
          return { c: this.wrapInt(t, av + ' ' + op + ' ' + bv), t };
      }
      throw new Error('bin ' + op);
    }
    assignOp(n) {
      if (n.op === '=' && n.l.k === 'id') { const inf = this.lookup(n.l.name); if (inf && inf.array) { this.err(inf.type === 'char' ? "a un arreglo de char no se le asigna un texto con '=': para copiar usá strcpy(" + n.l.name + ', "texto");' : "a un arreglo no se le asigna con '=': hay que asignar posición por posición, " + n.l.name + '[i] = valor;', n.line, inf.type === 'char' ? 'ARR-039' : 'ARR-022'); if (!(n.r.k === 'id' && this.lookup(n.r.name) && this.lookup(n.r.name).array)) this.expr(n.r); return { c: '0', t: 'int' }; } }
      const lv = this.lvalue(n.l, true, true);
      this.checkConst(lv, this.rootName(n.l), n.line);
      let valueCode;
      if (n.op === '=') {
        const pa = this.autoAcum, pu = this.autoAcumUno, pc = this.copiaNode;
        if (n.l.k === 'id' && n.r.k === 'bin' && (n.r.op === '+' || n.r.op === '-' || n.r.op === '*') && (mentions(n.r, n.l.name))) { this.autoAcum = n.l.name; this.autoAcumUno = n.r.op === '+' && ((n.r.l.k === 'id' && n.r.l.name === n.l.name && n.r.r.k === 'num' && n.r.r.v === 1) || (n.r.r.k === 'id' && n.r.r.name === n.l.name && n.r.l.k === 'num' && n.r.l.v === 1)); }
        if (n.r.k === 'id') this.copiaNode = n.r;
        const r = this.expr(n.r);
        this.autoAcum = pa; this.autoAcumUno = pu; this.copiaNode = pc;
        if (r.t === 'str' && lv.arrayElem && (lv.t === 'char' || lv.t === 'uchar')) { this.err("un elemento de un arreglo de char guarda una sola letra: se escribe con comillas simples ('A'), no con comillas dobles", n.line, 'ARR-058'); return { c: '0', t: 'int' }; }
        if (r.t === 'str' && (lv.t === 'char' || lv.t === 'uchar' || INTLIKE.has(lv.t)) && !lv.arrayElem) { (lv.t === 'char' || lv.t === 'uchar' ? this.warn : this.err).call(this, lv.t === 'char' || lv.t === 'uchar' ? "a un char le asignás un texto entre comillas dobles: ¿es lo que querías guardar ahí? Pensá qué guarda cada tipo" : 'un ' + TNAME[lv.t] + ' guarda un número, no un texto', n.line, lv.t === 'char' || lv.t === 'uchar' ? 'ARR-047' : 'ARR-045'); return { c: '0', t: 'int' }; }
        if (r.t === 'str') { this.err('los textos (char arrays) todavía no están soportados: solo se usan dentro de printf', n.line); return { c: '0', t: 'int' }; }
        if (r.t === 'void') { this.err('esa función no devuelve ningún valor', n.line, 'FUN-013'); return { c: '0', t: 'int' }; }
        this.checkIntDiv(r, lv.t, n.line);
        valueCode = this.conv(r, lv.t);
      } else {
        if (lv.info && !lv.arrayElem) { if (!lv.info.assigned && !lv.info.warned) { lv.info.warned = true; this.warnUninit(n.l.name, lv.info, n, 'compuesta', n.line); } }
        const ln = lv.pre ? { k: 'raw', c: lv.c, t: lv.t, line: n.line } : n.l;
        const r = this.binOp(n.op.slice(0, -1), ln, n.r, n.line);
        valueCode = this.conv(r, lv.t);
      }
      if (!lv.bad) this.markAssigned(lv);
      return { c: '(' + (lv.pre ? lv.pre + ',' : '') + lv.c + '=' + valueCode + ')', t: lv.t };
    }
    incdec(n, asStmt) {
      if (n.e.k !== 'id' && n.e.k !== 'idx') { this.err("'" + n.op + "' solo se puede aplicar a una variable, no a una cuenta", n.line, 'OPE-035'); return { c: '0', t: 'int' }; }
      const lv = this.lvalue(n.e, true, true);
      if (lv.bad) return { c: '0', t: 'int' };
      this.checkConst(lv, this.rootName(n.e), n.line);
      if (lv.info && !lv.arrayElem && !lv.info.assigned && !lv.info.warned) { lv.info.warned = true; this.warnUninit(n.e.name, lv.info, n, 'incdec', n.line); }
      this.markAssigned(lv);
      const sign = n.op === '++' ? '+' : '-';
      const t = lv.t;
      const calc = (src) => this.conv({ c: this.wrapInt(arith(t, 'int'), src + ' ' + sign + (BIG.has(t) ? ' 1n' : ' 1')), t: arith(t, 'int') }, t);
      const pre = lv.pre ? lv.pre + ',' : '';
      if (n.prefix || asStmt) return { c: '(' + pre + lv.c + '=' + calc(lv.c) + ')', t };
      return { c: '(' + pre + '$t=' + lv.c + ',' + lv.c + '=' + calc('$t') + ',$t)', t };
    }

    /* ----- llamadas ----- */
    needInclude(name, line) {
      const H = { 'stdio.h': ['printf', 'scanf', 'getchar', 'putchar', 'puts', 'fprintf', 'fputs', 'putc', 'fputc', 'sprintf', 'snprintf', 'fgets', 'gets'], 'string.h': ['strlen', 'strcpy', 'strncpy', 'strcat', 'strncat', 'strcmp', 'strncmp'], 'math.h': ['sqrt', 'pow', 'fabs', 'floor', 'ceil', 'round', 'trunc', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'exp', 'log', 'log10', 'log2', 'cbrt', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'exp2', 'expm1', 'log1p', 'isnan', 'isinf', 'isfinite', 'signbit', 'rint', 'nearbyint', 'lround', 'llround', 'copysign', 'fdim', 'fmod', 'fmax', 'fmin', 'hypot'], 'stdlib.h': ['rand', 'srand', 'abs', 'labs', 'exit', 'system', 'atoi', 'atol', 'atof'], 'ctype.h': ['isdigit', 'isalpha', 'isalnum', 'isspace', 'isupper', 'islower', 'ispunct', 'isprint', 'isgraph', 'iscntrl', 'isxdigit', 'isblank', 'toupper', 'tolower'], 'time.h': ['time', 'clock'], 'conio.h': ['getch', 'getche'] };
      for (const h in H) if (H[h].indexOf(name) >= 0 && !this.incl.has(h)) {
        const k = 'inc|' + h; if (this.undeclared.has(k)) return; this.undeclared.add(k);
        this.warn('usás ' + name + ' pero falta #include <' + h + '> al principio del programa', line, INC_KB[name]);
      }
    }
    needIncludeConst(nm, line) {
      const h = /^M_/.test(nm) || nm === 'INFINITY' || nm === 'NAN' || nm === 'HUGE_VAL' ? 'math.h' : /^(RAND_MAX|EXIT_SUCCESS|EXIT_FAILURE)$/.test(nm) ? 'stdlib.h' : /^(INT_|UINT_|LONG_|ULONG_|LLONG_|ULLONG_|SHRT_|USHRT_|CHAR_|UCHAR_)/.test(nm) ? 'limits.h' : /^(DBL_|FLT_)/.test(nm) ? 'float.h' : nm === 'CLOCKS_PER_SEC' ? 'time.h' : null;
      if (!h || this.incl.has(h)) return;
      const k = 'inc|' + h; if (this.undeclared.has(k)) return; this.undeclared.add(k);
      this.warn('usás ' + nm + ' pero falta #include <' + h + '> al principio del programa', line, INC_KB[nm]);
    }
    call(n) {
      const name = n.name;
      const args = n.args;
      const usr = this.funcs.get(name);
      const vv = this.lookup(name);
      if (vv && !vv.array && vv.scalar && usr) { this.err("'" + name + "' es una variable en este lugar y tapa a la función del mismo nombre: no se la puede llamar. Cambiá el nombre de la variable", n.line, 'FUN-027'); args.forEach((a) => { if (a.k !== 'str') this.expr(a); }); return { c: '0', t: usr.ret === 'void' ? 'void' : usr.ret }; }
      if (usr && usr.node) return this.callUser(n, name, args);
      this.needInclude(name, n.line);
      const MATH1 = { sqrt: 'Math.sqrt', fabs: 'Math.abs', floor: 'Math.floor', ceil: 'Math.ceil', round: '$.round', trunc: 'Math.trunc', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', asin: 'Math.asin', acos: 'Math.acos', atan: 'Math.atan', exp: 'Math.exp', log: 'Math.log', log10: 'Math.log10', log2: 'Math.log2', cbrt: 'Math.cbrt', sinh: 'Math.sinh', cosh: 'Math.cosh', tanh: 'Math.tanh', asinh: 'Math.asinh', acosh: 'Math.acosh', atanh: 'Math.atanh', exp2: '((x)=>Math.pow(2,x))', expm1: 'Math.expm1', log1p: 'Math.log1p' };
      const mf = /^(sqrt|pow|fabs|sin|cos|tan|asin|acos|atan|atan2|floor|ceil|exp|log|log10|log2|fmod|round|trunc|cbrt|hypot|fmax|fmin)f$/.exec(name);
      if (mf) { const r = this.call({ k: 'call', name: mf[1], args, line: n.line }); return { c: 'Math.fround(' + r.c + ')', t: 'float' }; }
      if (name === 'fprintf' || name === 'fputs' || name === 'putc' || name === 'fputc') {
        const dest = name === 'fprintf' || name === 'fputs' ? (name === 'fprintf' ? args[0] : args[1]) : args[1];
        if (!dest || dest.k !== 'id' || (dest.name !== 'stdout' && dest.name !== 'stderr')) { this.err('los archivos todavía no están soportados: solo se puede escribir en stdout o stderr (la pantalla)', n.line, 'NOS-010'); return { c: '0', t: 'int' }; }
        if (name === 'fprintf') return this.printfCall({ k: 'call', name: 'printf', args: args.slice(1), line: n.line });
        if (name === 'fputs') { const caf = args[0] ? this.charArr(args[0]) : null; if (caf) return { c: '$.printf("%s",[$.tostr(' + caf.c + ')],' + n.line + ')', t: 'int' }; const r = this.expr(args[0]); if (r.t !== 'str') { this.err('fputs solo se soporta con un texto entre comillas', n.line); return { c: '0', t: 'int' }; } return { c: '$.printf("%s",[' + (r.dyn ? r.c : JSON.stringify(args[0].v)) + '],' + n.line + ')', t: 'int' }; }
        const r = this.expr(args[0]); return { c: '$.putchar(' + this.conv(r, 'int') + ')', t: 'int' };
      }
      if (name === 'rint' || name === 'nearbyint') { const r = this.expr(args[0]); return { c: '$.rint(' + this.conv(r, 'double') + ')', t: 'double' }; }
      if (name === 'lround' || name === 'llround') { const r = this.expr(args[0]); return { c: '$.f2l($.round(' + this.conv(r, 'double') + '))', t: 'long' }; }
      if (name === 'signbit') { const r = this.expr(args[0]); return { c: '(($x=>($x<0||Object.is($x,-0))?1:0)(' + this.conv(r, 'double') + '))', t: 'int' }; }
      if (name === 'isfinite') { const r = this.expr(args[0]); return { c: '(Number.isFinite(' + this.conv(r, 'double') + ')?1:0)', t: 'int' }; }
      if (name === 'copysign') { const a0 = this.expr(args[0]), a1 = this.expr(args[1]); return { c: '(($m,$s)=>(($s<0||Object.is($s,-0))?-Math.abs($m):Math.abs($m)))(' + this.conv(a0, 'double') + ',' + this.conv(a1, 'double') + ')', t: 'double' }; }
      if (name === 'fdim') { const a0 = this.expr(args[0]), a1 = this.expr(args[1]); return { c: 'Math.max(' + this.conv(a0, 'double') + '-' + this.conv(a1, 'double') + ',0)', t: 'double' }; }
      if (name === 'printf') return this.printfCall(n);
      if (name === 'scanf') return this.scanfCall(n);
      if (own(MATH1, name) || ['pow', 'fmod', 'atan2', 'fmax', 'fmin', 'hypot'].indexOf(name) >= 0) {
        const want = ['pow', 'fmod', 'atan2', 'fmax', 'fmin', 'hypot'].indexOf(name) >= 0 ? 2 : 1;
        if (args.length !== want) { this.err("'" + name + "' recibe " + want + ' argumento(s)', n.line, 'PRE-046'); return { c: '0', t: 'double' }; }
        const a = args.map((x) => { const r = this.expr(x); return this.conv(r, 'double'); });
        const m = { pow: 'Math.pow', fmod: '$.fmod', atan2: 'Math.atan2', fmax: 'Math.max', fmin: 'Math.min', hypot: 'Math.hypot' };
        const fn = own(MATH1, name) ? MATH1[name] : m[name];
        return { c: fn + '(' + a.join(',') + ')', t: 'double' };
      }
      if (name === 'abs' || name === 'labs') {
        if (args.length !== 1) { this.err("'abs' recibe 1 argumento", n.line); return { c: '0', t: 'int' }; }
        const r = this.expr(args[0]);
        if (name === 'labs') return { c: 'BigInt.asIntN(64,((x)=>x<0n?-x:x)(' + this.conv(r, 'long') + '))', t: 'long' };
        return { c: '(Math.abs(' + this.conv(r, 'int') + ')|0)', t: 'int' };
      }
      if (name === 'isnan' || name === 'isinf') { const r = this.expr(args[0]); const v = this.conv(r, 'double'); return { c: '(' + (name === 'isnan' ? 'Number.isNaN(' + v + ')' : '(Math.abs(' + v + ')===Infinity)') + '?1:0)', t: 'int' }; }
      if (name === 'rand') return { c: '$.rand()', t: 'int' };
      if (name === 'srand') { const r = args[0] ? this.expr(args[0]) : { c: '0', t: 'int' }; return { c: '$.srand(' + this.conv(r, 'uint') + ')', t: 'void' }; }
      if (name === 'clock') return { c: '$.clock()', t: 'long' };
      if (name === 'time') { if (args[0]) this.expr(args[0]); return { c: '$.time()', t: 'long' }; }
      if (name === 'exit') { const r = args[0] ? this.expr(args[0]) : { c: '0', t: 'int' }; return { c: '$.exit(' + this.conv(r, 'int') + ')', t: 'void' }; }
      if (name === 'getchar' || name === 'getch' || name === 'getche') { return { c: '(await $.getchar())', t: 'int' }; }
      if (name === 'putchar' && !args[0]) { this.err('putchar necesita un carácter entre paréntesis, por ejemplo putchar(65)', n.line); return { c: '0', t: 'int' }; }
      if (name === 'putchar') { const r = this.expr(args[0]); return { c: '$.putchar(' + this.conv(r, 'int') + ')', t: 'int' }; }
      const TEXTO = { strlen: 1, strcpy: 2, strncpy: 3, strcat: 2, strncat: 3, strcmp: 2, strncmp: 3, atoi: 1, atol: 1, atof: 1 };
      if (own(TEXTO, name)) {
        if (args.length !== TEXTO[name]) { this.err("'" + name + "' recibe " + TEXTO[name] + ' argumento(s)', n.line); return { c: '0', t: 'int' }; }
        const SA = (a) => { if (a.k === 'str') return JSON.stringify(a.v); const ca = this.charArr(a); if (ca) return ca.c; this.err("el argumento de '" + name + "' tiene que ser un texto: un arreglo de char o un texto entre comillas", n.line, a.k === 'id' && this.lookup(a.name) && this.lookup(a.name).array && name === 'strlen' ? 'ARR-057' : undefined); return '""'; };
        const DA = (a) => { const ca = this.charArr(a); if (ca) return ca.c; this.err("el primer argumento de '" + name + "' tiene que ser un arreglo de char, por ejemplo char texto[50];", n.line, a.k === 'str' && (name === 'strcpy' || name === 'strcat') ? 'ARR-054' : undefined); return '[]'; };
        const num3 = args[2] ? this.val(this.expr(args[2])) : '0';
        switch (name) {
          case 'strlen': return { c: '$.strlen(' + SA(args[0]) + ')', t: 'ulong' };
          case 'strcpy': case 'strcat': return { c: '$.' + name + '(' + DA(args[0]) + ',' + SA(args[1]) + ',' + n.line + ')', t: 'void' };
          case 'strncpy': case 'strncat': return { c: '$.' + name + '(' + DA(args[0]) + ',' + SA(args[1]) + ',' + num3 + ',' + n.line + ')', t: 'void' };
          case 'strcmp': return { c: '$.strcmp(' + SA(args[0]) + ',' + SA(args[1]) + ')', t: 'int' };
          case 'strncmp': return { c: '$.strncmp(' + SA(args[0]) + ',' + SA(args[1]) + ',' + num3 + ')', t: 'int' };
          case 'atoi': return { c: '$.atoi(' + SA(args[0]) + ')', t: 'int' };
          case 'atol': return { c: '$.atol(' + SA(args[0]) + ')', t: 'long' };
          default: return { c: '$.atof(' + SA(args[0]) + ')', t: 'double' };
        }
      }
      if (name === 'sprintf' || name === 'snprintf') {
        const ds = this.charArr(args[0]);
        if (!ds) { this.err("el primer argumento de '" + name + "' tiene que ser un arreglo de char", n.line); return { c: '0', t: 'int' }; }
        if (name === 'snprintf') { const sz = this.val(this.expr(args[1])); return this.printfCall({ k: 'call', name: 'printf', args: args.slice(2), line: n.line, prefix: '$.snprintf(' + ds.c + ',' + sz + ',' }); }
        return this.printfCall({ k: 'call', name: 'printf', args: args.slice(1), line: n.line, prefix: '$.sprintf(' + ds.c + ',' });
      }
      if (name === 'gets' || name === 'fgets') {
        const ds = this.charArr(args[0]);
        if (!ds) { this.err("el primer argumento de '" + name + "' tiene que ser un arreglo de char", n.line); return { c: '0', t: 'int' }; }
        if (name === 'gets') { this.warn('gets fue eliminada de C11 porque no controla el tamaño y puede escribir fuera del arreglo. Se usa fgets(texto, tamaño, stdin)', n.line, 'ARR-040', 'POR-016'); return { c: '(await $.gets(' + ds.c + ',' + n.line + '))', t: 'int' }; }
        const sz = args[1] ? this.val(this.expr(args[1])) : '0';
        return { c: '(await $.fgets(' + ds.c + ',' + sz + ',' + n.line + '))', t: 'int' };
      }
      if (['strchr', 'strrchr', 'strstr', 'strtok', 'strdup', 'memcpy', 'memset', 'memmove', 'strpbrk', 'strspn', 'strcspn'].indexOf(name) >= 0) { this.err("'" + name + "' todavía no está soportada en este editor (trabaja con punteros)", n.line, { strchr: 'NOS-011', strstr: 'NOS-012', strtok: 'NOS-013' }[name]); return { c: '0', t: 'int' }; }
      if (name === 'puts') {
        const ca = args[0] ? this.charArr(args[0]) : null;
        if (ca) return { c: '$.puts(' + ca.c + ')', t: 'int' };
        const pr = args[0] ? this.expr(args[0]) : null;
        if (!pr || pr.t !== 'str') { this.err('puts necesita un texto entre comillas o un arreglo de char', n.line); return { c: '0', t: 'int' }; }
        return { c: '$.puts(' + (pr.dyn ? pr.c : JSON.stringify(args[0].v)) + ')', t: 'int' };
      }
      if (name === 'system' && args[0] && args[0].k === 'str') {
        const cm = args[0].v.trim().toLowerCase();
        if (cm === 'pause') this.warn('system("pause") es un comando de Windows: en Linux, Programiz y OnlineGDB no existe y muestra un error. Para esperar una tecla se usa getchar()', n.line, 'POR-001', 'PRE-039');
        else if (cm === 'cls') this.warn('system("cls") es un comando de Windows: en Linux, Programiz y OnlineGDB no existe', n.line, 'POR-002', 'PRE-040');
      }
      if (name === 'fflush' && args[0] && args[0].k === 'id' && args[0].name === 'stdin') this.warn('fflush(stdin) no está definido en C estándar: en Linux (gcc, Programiz, OnlineGDB) no limpia el teclado', n.line, 'POR-007', 'PRE-049');
      if (name === 'system' || name === 'fflush' || name === 'setbuf' || name === 'setvbuf') { args.forEach((a) => { if (a.k !== 'str') this.expr(a); }); return { c: '0', t: 'int' }; }
      const CT = { isdigit: ['c>=48&&c<=57', 2048], isalpha: ['(c>=65&&c<=90)||(c>=97&&c<=122)', 1024], isupper: ['c>=65&&c<=90', 256], islower: ['c>=97&&c<=122', 512], isspace: ['c===32||(c>=9&&c<=13)', 8192], isalnum: ['(c>=48&&c<=57)||(c>=65&&c<=90)||(c>=97&&c<=122)', 8], ispunct: ['(c>=33&&c<=47)||(c>=58&&c<=64)||(c>=91&&c<=96)||(c>=123&&c<=126)', 4], isprint: ['c>=32&&c<=126', 16384], isgraph: ['c>=33&&c<=126', 32768], iscntrl: ['(c>=0&&c<=31)||c===127', 2], isxdigit: ['(c>=48&&c<=57)||(c>=65&&c<=70)||(c>=97&&c<=102)', 4096], isblank: ['c===32||c===9', 1] };
      if (own(CT, name)) { const r = this.expr(args[0]); return { c: '((c=>' + CT[name][0] + ')(' + this.conv(r, 'int') + ')?' + CT[name][1] + ':0)', t: 'int' }; }
      if (name === 'toupper') { const r = this.expr(args[0]); return { c: '((c=>c>=97&&c<=122?c-32:c)(' + this.conv(r, 'int') + '))', t: 'int' }; }
      if (name === 'tolower') { const r = this.expr(args[0]); return { c: '((c=>c>=65&&c<=90?c+32:c)(' + this.conv(r, 'int') + '))', t: 'int' }; }

      return this.callUser(n, name, args);
    }
    callUser(n, name, args) {
      const f = this.funcs.get(name);
      if (!f) {
        const sg = this.suggest(name), v = this.lookup(name);
        let kb, msg;
        if (own(FUNC_KB, name)) { kb = FUNC_KB[name][0]; msg = FUNC_KB[name][1]; }
        else if (v && v.scalar) { kb = 'OPE-041'; msg = "'" + name + "' es una variable, no una función: si querías multiplicar, la multiplicación siempre lleva el operador *"; }
        else if (sg && sg.toLowerCase() === name.toLowerCase() && this.funcs.has(sg)) { kb = 'FUN-045'; msg = "la función '" + name + "' no está declarada: C distingue mayúsculas de minúsculas, la función se llama '" + sg + "'"; }
        this.err(msg || "la función '" + name + "' no está declarada" + (sg ? ". ¿Quisiste decir '" + sg + "'? (en C todo va en minúscula y se escribe igual)" : ''), n.line, kb);
        if (!own(FUNC_KB, name)) args.forEach((a) => { if (a.k !== 'str') this.expr(a); }); return { c: '0', t: 'int' };
      }
      if (f.node && !f.hasProto && f.node.line > n.line) this.warn("'" + name + "' se usa antes de estar definida: falta el prototipo arriba de main (por ejemplo: " + TNAME[f.ret] + ' ' + name + '(' + (f.params.map((p) => TNAME[p.type]).join(', ') || 'void') + ');)', n.line, 'FUN-001');
      if (args.length !== f.params.length && !(f.unspec && !f.node)) {
        if (!this.protoMal.has(name)) this.err("la función '" + name + "' recibe " + f.params.length + ' argumento(s) y se la llamó con ' + args.length, n.line, args.length > f.params.length ? 'FUN-007' : 'FUN-008');
        return { c: '0', t: f.ret === 'void' ? 'void' : f.ret };
      }
      const a = args.map((x, i) => {
        const p = f.params[i];
        if (p.array && (p.type === 'char' || p.type === 'uchar') && p.dims === 1) {
          if (x.k === 'str') return '$.cstr(' + JSON.stringify(x.v) + ')';
          const cx = this.charArr(x);
          if (cx) return cx.c;
        }
        if (p.array) {
          const inf = x.k === 'id' ? this.lookup(x.name) : null;
          if (!inf || !inf.array) { this.err("el argumento " + (i + 1) + " de '" + name + "' tiene que ser un arreglo (la función lo pide con [ ])", n.line, x.k === 'idx' ? 'FUN-029' : undefined); return '[]'; }
          if (inf.ndims !== p.dims) this.err("el arreglo '" + x.name + "' tiene " + inf.ndims + ' dimensión(es) pero la función ' + name + ' espera ' + p.dims, n.line);
          return inf.js;
        }
        const rx = this.expr(x);
        if (rx.t === 'str' && INTLIKE.has(p.type)) { this.err("'" + (x.v !== undefined ? x.v : '') + "' es un texto, no un número: sin comillas se escribe el valor (" + name + ' necesita un ' + TNAME[p.type] + ')', n.line, 'FUN-028'); return '0'; }
        return this.conv(rx, p.type);
      });
      const hc = this.hoistArgs(args, a);
      const call = 'f_' + name + '(' + hc.codes.join(',') + ')';
      const cc = f.async ? '(await ' + call + ')' : call;
      return { c: hc.pre ? '(' + hc.pre + cc + ')' : cc, t: f.ret };
    }

    parseFmt(fmt) {
      const specs = [];
      const re = /%([-+ #0]*)(\*|\d+)?(?:\.(\*|\d*))?(hh|h|ll|l|L|z|j|t)?([diouxXfFeEgGcsp%]|\[\^?\]?[^\]]*\])/g;
      let m;
      while ((m = re.exec(fmt))) if (m[5] !== '%') specs.push({ w: m[2], p: m[3], len: m[4] || '', conv: m[5] });
      return specs;
    }
    describe(node, k) { return node.k === 'id' ? "'" + node.name + "'" : 'el argumento ' + (k + 1); }

    printfCall(n) {
      const args = n.args;
      if (args.length && args[0].k === 'cond' && args[0].a.k === 'str' && args[0].b.k === 'str') {
        const c = this.cond(args[0].c);
        const vals = args.slice(1).map((a) => { const r = this.expr(a); return r.t === 'str' ? JSON.stringify(a.v) : this.val(r); });
        return { c: '$.printf(' + c + '?' + JSON.stringify(args[0].a.v) + ':' + JSON.stringify(args[0].b.v) + ',[' + vals.join(',') + '])', t: 'int' };
      }
      if (!args.length || args[0].k !== 'str') {
        const mas = args.length && args[0].k === 'bin' && args[0].op === '+' && args[0].l.k === 'str';
        this.err(mas ? "en C no se pueden unir un texto y un valor con '+': el valor se muestra con un % dentro del texto y se pasa como otro argumento, separado por coma" : 'printf necesita un texto entre comillas como primer argumento', n.line, mas ? 'PRF-035' : args.length && args[0].k !== 'str' ? 'PRF-018' : undefined);
        return { c: '0', t: 'int' };
      }
      const fmt = args[0].v;
      const specs = this.parseFmt(fmt);
      const vals = [];
      let si = 0;
      const rest = args.slice(1);
      let needed = specs.reduce((s, sp) => s + 1 + (sp.w === '*' ? 1 : 0) + (sp.p === '*' ? 1 : 0), 0);
      if (rest.length < needed) this.warn('printf pide ' + needed + ' valor(es) por los % del texto, pero recibe ' + rest.length, n.line, rest.length === 0 ? 'PRF-010' : 'PRF-008');
      else if (rest.length > needed) this.warn('printf recibe más valores (' + rest.length + ') de los que usan los % del texto (' + needed + ')', n.line, needed > 0 ? 'PRF-009' : /%I64/.test(fmt) ? 'POR-015' : /%%/.test(fmt) ? 'PRF-017' : 'PRF-011');
      const slots = [];
      for (const sp of specs) { if (sp.w === '*') slots.push({ conv: 'w' }); if (sp.p === '*') slots.push({ conv: 'w' }); slots.push(sp); }
      const pend = [];
      rest.forEach((a, k) => {
        const cat = this.charArr(a);
        if (cat) { vals.push('$.tostr(' + cat.c + ')'); return; }
        this.printfArgNode = a; this.printfArgConv = slots[k] ? slots[k].conv : null;
        const r = this.expr(a);
        this.printfArgNode = null; this.printfArgConv = null;
        if (r.t === 'void') { this.err('esa función no devuelve ningún valor', n.line, 'FUN-013'); vals.push('0'); return; }
        const target = slots[k] || null;
        if (target && target.conv !== 'w') {
          const c = target.conv, t = r.t, d = this.describe(a, k);
          const isInt = INTLIKE.has(t), isFl = FLOATLIKE.has(t);
          const usr = a.k === 'call' ? this.funcs.get(a.name) : null;
          if ('diuxXoc'.indexOf(c) >= 0 && isFl) pend.push({ dir: 'f', msg: "printf: '%" + target.len + c + "' espera un entero, pero " + d + ' es ' + t + ": usá '%f' (o '%.2f' para 2 decimales)", kb: usr && usr.node ? 'FUN-038' : a.k === 'call' ? 'PRE-045' : a.k === 'id' ? 'TIP-023' : 'PRF-003' });
          else if ('fFeEgG'.indexOf(c) >= 0 && (isInt || t === 'str')) pend.push({ dir: 'i', msg: "printf: '%" + c + "' espera un número decimal, pero " + d + ' es ' + (t === 'str' ? 'un texto' : t === 'char' ? 'char' : 'entero (' + t + ')') + ": usá '%d'", kb: t === 'str' ? 'PRF-038' : a.k === 'call' && a.name === 'abs' ? 'TIP-034' : a.k === 'bin' && a.op === '/' ? 'PRF-036' : 'PRF-002' });
          else if (c === 's' && t !== 'str') this.warn("printf: '%s' es para textos (un arreglo de char) y " + d + ' es un número (' + t + "): usá '%d' o '%f'", n.line, a.k === 'id' && t === 'char' ? 'PRF-006' : undefined);
          else if (c === 'c' && isFl) this.warn("printf: '%c' espera un carácter, pero " + d + ' es ' + t, n.line);
          else if ((c === 'd' || c === 'i') && t === 'long' && target.len !== 'l' && target.len !== 'll') this.warn("printf: para un long usá '%ld'", n.line, 'TIP-027');
          else if (c === 'd' && t === 'str') this.warn("printf: '%d' espera un entero pero recibe un texto", n.line, 'PRF-038');
          else if (c === 'c' && t === 'str') this.warn("printf: '%c' espera un carácter (entre comillas simples 'a'), no un texto", n.line, 'PRF-007');
        }
        vals.push(r.t === 'str' ? (r.dyn ? r.c : JSON.stringify(a.v)) : this.val(r));
      });
      const cruzados = pend.some((x) => x.dir === 'f') && pend.some((x) => x.dir === 'i');
      for (const x of pend) this.warn(x.msg, n.line, cruzados ? 'PRF-040' : x.kb);
      const hp = this.hoistArgs(rest, vals);
      const pc = (n.prefix || '$.printf(') + JSON.stringify(fmt) + ',[' + hp.codes.join(',') + '],' + n.line + ')';
      return { c: hp.pre ? '(' + hp.pre + pc + ')' : pc, t: 'int' };
    }
    scanfCall(n) {
      const args = n.args;
      if (!args.length || args[0].k !== 'str') { this.err('scanf necesita un texto entre comillas como primer argumento' + (args.length && args[0].k === 'bin' && args[0].l.k === 'str' ? ': falta la coma entre el formato y la variable' : ''), n.line, args.length && args[0].k === 'bin' && args[0].op === '&' && args[0].l.k === 'str' ? 'SCN-026' : undefined); return { c: '0', t: 'int' }; }
      const fmt = args[0].v;
      const specs = this.parseFmt(fmt).filter((s) => !/\*/.test(s.w || ''));
      const refs = [], types = [], pres = [];
      const rest = args.slice(1);
      const sobra = fmt.replace(/%[-+ #0]*(\*|\d+)?(\.\d+)?(hh|h|ll|l|L|z|j|t)?([diouxXfFeEgGcsp%]|\[\^?\]?[^\]]*\])/g, '');
      if (/[A-Za-z]/.test(sobra)) this.warn('el texto del scanf tiene letras que no son de lectura (' + JSON.stringify(sobra.trim()).slice(1, -1) + '): scanf solo lleva los % del dato; el mensaje para el usuario va en un printf aparte', n.line, 'SCN-014');
      else if (/\n\s*$/.test(fmt)) this.warn("no pongas '\\n' al final del scanf: hace que el programa espere un Enter de más", n.line, 'SCN-013');
      if (rest.length < specs.length) this.err('scanf pide leer ' + specs.length + ' valor(es) (hay ' + specs.length + " '%') pero solo tiene " + rest.length + " variable(s): falta una variable con '&' (por ejemplo scanf(\"%d %d\", &a, &b);)", n.line, rest.length === 0 ? 'SCN-033' : 'SCN-015');
      else if (rest.length !== specs.length) this.warn('scanf lee ' + specs.length + ' valor(es) por los % del texto, pero recibe ' + rest.length + ' variable(s)', n.line, 'SCN-016');
      rest.forEach((a, k) => {
        if (specs[k] && (specs[k].conv === 's' || specs[k].conv[0] === '[')) {
          const ca = this.charArr(a.k === 'addr' ? a.e : a);
          if (ca && a.k === 'addr' && specs[k].conv === 's') this.warn("scanf(\"%s\", &" + (a.e.k === 'id' ? a.e.name : 'texto') + "): el nombre de un arreglo ya es su dirección, va sin &", n.line, 'ARR-034');
          if (!ca) { this.err("a '%" + (specs[k].conv === 's' ? 's' : specs[k].conv) + "' le corresponde un arreglo de char (por ejemplo char nombre[30]; scanf(\"%s\", nombre);)", n.line, 'ARR-035'); return; }
          refs.push('[()=>' + ca.c + ']'); types.push('"str"'); return;
        }
        if (a.k !== 'addr') {
          if (a.k === 'id' && this.lookup(a.name) && this.lookup(a.name).scalar) this.err("a scanf le falta el '&' delante de '" + a.name + "' (scanf necesita &" + a.name + ')', n.line, k > 0 ? 'SCN-002' : FLOATLIKE.has(this.lookup(a.name).type) ? 'SCN-003' : 'SCN-001');
          else this.err("scanf necesita '&' delante de cada variable", n.line);
          return;
        }
        this.enScanf = true; const lv = this.lvalue(a.e, true, true); this.enScanf = false;
        if (lv.bad) return;
        if (lv.pre) pres.push(lv.pre);
        this.checkConst(lv, this.rootName(a.e), n.line);
        this.markAssigned(lv);
        const sp = specs[k];
        if (sp) {
          const t = lv.t, nm = a.e.k === 'id' ? "'" + a.e.name + "'" : 'la variable';
          const c = sp.conv;
          if ((c === 'd' || c === 'i' || c === 'u') && sp.len === '' && !(t === 'int' || t === 'uint')) {
            if (FLOATLIKE.has(t)) this.warn("scanf: '%" + c + "' lee un entero pero " + nm + ' es ' + t + ": usá '%" + (t === 'float' ? 'f' : 'lf') + "'", n.line, 'SCN-004');
            else this.warn("scanf: '%" + c + "' no corresponde al tipo " + t + ' de ' + nm, n.line, t === 'long' ? 'SCN-031' : t === 'char' ? 'SCN-008' : undefined);
          } else if ((c === 'd' || c === 'i') && (sp.len === 'l' || sp.len === 'll') && t !== 'long') this.warn("scanf: '%" + sp.len + c + "' es para long y " + nm + ' es ' + t, n.line, 'SCN-030');
          else if ('feEgG'.indexOf(c) >= 0) {
            if (sp.len === '' && t === 'double') this.warn("scanf: '%" + c + "' lee un float pero " + nm + " es double: usá '%lf'", n.line, 'SCN-006');
            else if (sp.len === 'l' && t === 'float') this.warn("scanf: '%l" + c + "' es para double pero " + nm + " es float: usá '%f'", n.line, 'SCN-007');
            else if (INTLIKE.has(t)) this.warn("scanf: '%" + c + "' lee un decimal pero " + nm + ' es ' + t + ": usá '%d'", n.line, 'SCN-005');
          } else if (c === 'c' && !(t === 'char' || t === 'int')) this.warn("scanf: '%c' no corresponde al tipo " + t + ' de ' + nm, n.line);
        }
        refs.push('[()=>' + lv.c + ',(v)=>{' + lv.c + '=v}]');
        types.push(JSON.stringify(lv.t));
      });
      const sc = '(await $.scanf(' + JSON.stringify(fmt) + ',[' + refs.join(',') + '],[' + types.join(',') + '],' + n.line + '))';
      return { c: pres.length ? '(' + pres.reverse().join(',') + ',' + sc + ')' : sc, t: 'int' };
    }
  }

  /* ================= REGLAS DEL ENTRENADOR (kb/errores) =================
     Reconocen, sobre el árbol del programa, los errores de la base de conocimiento que gcc no marca
     (lógica del algoritmo, tipos, operadores). Cada aviso lleva el id del caso en `kb`; el texto largo
     (explicación, pistas) lo muestra la interfaz desde la base. REGLA DE ORO: ningún falso positivo:
     ante la duda, la regla no avisa (ver kb/PENDIENTES-REGLAS.md). Una falla acá nunca rompe la compilación. */
  const KB_CODIGO = {
    'LOG-001': 'orden-lectura', 'LOG-002': 'promedio-sin-parentesis', 'LOG-004': 'intercambio-sin-auxiliar', 'LOG-005': 'mostrar-antes-de-calcular', 'LOG-006': 'calcular-antes-de-leer',
    'LOG-007': 'condicion-invertida', 'LOG-008': 'rama-verdadera-vacia', 'LOG-009': 'ifs-sueltos', 'LOG-010': 'else-colgante', 'LOG-011': 'rama-inalcanzable',
    'LOG-013': 'condicion-imposible', 'LOG-014': 'resto-con-division', 'LOG-015': 'resto-sin-comparar', 'LOG-018': 'condicion-imposible', 'LOG-019': 'cuenta-sin-mas-uno', 'LOG-020': 'cuenta-con-mas-uno',
    'LOG-022': 'for-una-vuelta-menos', 'LOG-023': 'for-una-vuelta-mas', 'LOG-049': 'for-una-vuelta-mas', 'LOG-024': 'acumulador-reiniciado', 'LOG-025': 'contador-en-uno',
    'LOG-028': 'promedio-con-total', 'LOG-029': 'minimo-en-cero', 'LOG-032': 'if-sin-llaves', 'LOG-034': 'for-sin-llaves', 'LOG-035': 'contador-como-dato', 'LOG-036': 'contador-suma-dato',
    'LOG-037': 'acumulador-suma-uno', 'LOG-040': 'lazo-no-entra', 'LOG-041': 'centinela-procesado', 'LOG-042': 'lectura-adelantada', 'LOG-045': 'resto-igual-divisor', 'LOG-047': 'dividendo-pisado',
    'LOG-050': 'mayor-de-tres', 'LOG-053': 'for-variable-modificada',
    'TIP-003': 'cast-despues-de-dividir', 'TIP-004': 'division-entera-formula', 'TIP-005': 'division-entera-formula', 'TIP-006': 'division-entera-formula', 'TIP-007': 'division-entera-formula',
    'TIP-010': 'char-fuera-de-rango', 'TIP-012': 'char-con-d', 'TIP-018': 'truncamiento', 'TIP-019': 'truncamiento-centavos', 'TIP-021': 'unsigned-siempre-verdadero', 'TIP-022': 'unsigned-nunca-negativo',
    'TIP-030': 'digito-como-numero', 'TIP-036': 'constante-desborda', 'TIP-039': 'char-comparacion-fuera', 'TIP-041': 'int-con-unsigned',
    'OPE-004': 'and-de-bits', 'OPE-009': 'comparacion-encadenada', 'OPE-011': 'siempre-verdadera', 'OPE-014': 'negacion-sin-parentesis', 'OPE-015': 'negacion-con-resto', 'OPE-016': 'asignacion-invertida',
    'OPE-017': 'doble-modificacion', 'OPE-024': 'division-decimal-cero', 'OPE-025': 'coma-decimal', 'OPE-026': 'coma-en-condicion', 'OPE-027': 'asignacion-encadenada',
    'OPE-037': 'resto-con-division', 'OPE-042': 'comparacion-guardada', 'OPE-043': 'precedencia-and-or', 'OPE-046': 'decremento-en-condicion', 'OPE-047': 'condicion-a-medias', 'OPE-048': 'incremento-sin-efecto'
  };
  // código (etiqueta del panel) de los casos que el compilador ya reconocía: el mensaje de gcc no alcanza para elegirlo
  const grupo = (cod, ids) => { for (const k of ids.split(' ')) KB_CODIGO[k] = cod; };
  grupo('sintaxis', 'DEC-015 DEC-017 CTL-013 CTL-014 CTL-038 CTL-039 CTL-041 CTL-042 SIN-006 SIN-007 SIN-010 SIN-011 SIN-012 SIN-013 SIN-014 SIN-015 SIN-026 SIN-028 SIN-029 SIN-030 SIN-031 SIN-034 SIN-037 SIN-042 SIN-049 SIN-050 SIN-054 SIN-057 SIN-058 SIN-060 ARR-012 ARR-020 ARR-046 ARR-059 PRF-019 PRF-020 PRF-021 PRF-034 SCN-025 SCN-037 FUN-034 FUN-035 FUN-033 OPE-012 OPE-040 PRE-025 DEC-016 DEC-019 DEC-027 FUN-020');
  grupo('falta-punto-coma', 'CTL-019 CTL-020 CTL-023 SIN-001 SIN-002 SIN-003 SIN-032 PRF-022 FUN-032 NOS-017');
  grupo('no-soportado', 'NOS-001 NOS-002 NOS-003 NOS-004 NOS-005 NOS-006 NOS-007 NOS-008 NOS-009 NOS-010 NOS-011 NOS-012 NOS-013 NOS-014 NOS-015 NOS-016 NOS-017 NOS-019 NOS-020');
  grupo('no-declarada', 'DEC-011 DEC-032 FUN-018 FUN-019 FUN-045 OPE-041 PRE-047 PRE-048 POR-004 POR-017 POR-019 POR-023 SIN-020 SIN-021 PRF-023 SCN-027');
  grupo('preprocesador', 'PRE-015 PRE-019 PRE-020 PRE-021 PRE-026 PRE-028 PRE-029 PRE-031 PRE-032 PRE-033');
  grupo('comillas-dobles', 'ARR-045 ARR-047 ARR-056 ARR-058 FUN-028 CTL-049 TIP-015 TIP-031');
  grupo('arreglo', 'ARR-017 ARR-055 ARR-035 FUN-029');
  grupo('funcion', 'FUN-040 FUN-027');
  grupo('asignacion-en-condicion', 'CTL-040');
  grupo('portabilidad', 'POR-001 POR-002 POR-005 POR-007 FUN-025 ARR-040 ARR-034 SIN-043 PRE-041 PRE-042');
  grupo('arreglo', 'ARR-009 ARR-011 ARR-030 ARR-037 ARR-038');
  grupo('palabra-reservada', 'DEC-018 DEC-038');
  // casos de la base que son el mismo error con otro nombre (otra categoría u otro enunciado): comparten el aviso
  const KB_GEMELOS = { 'LOG-002': ['OPE-013'], 'LOG-018': ['OPE-034', 'CTL-033'], 'LOG-010': ['CTL-006'], 'OPE-043': ['CTL-036'], 'OPE-011': ['CTL-037'], 'LOG-024': ['CTL-044', 'DEC-020'], 'LOG-053': ['CTL-046'],
    'TIP-021': ['EJE-020'], 'TIP-012': ['PRF-005'], 'LOG-005': ['PRF-026'], 'LOG-006': ['SCN-028'], 'TIP-005': ['LOG-052'] };
  const REL_OPS = ['<', '>', '<=', '>=', '==', '!='];
  const SIN_SIGNO = new Set(['uint', 'ulong', 'uchar', 'ushort']);
  const MATH_DOUBLE = new Set(['sqrt', 'pow', 'sin', 'cos', 'tan', 'fabs', 'floor', 'ceil', 'exp', 'log', 'log10', 'fmod', 'atan', 'atan2', 'asin', 'acos', 'round', 'trunc', 'cbrt', 'hypot', 'sinh', 'cosh', 'tanh']);
  const SMALL_T = new Set(['char', 'uchar', 'short', 'ushort', 'bool']);
  const prom = (t) => (SMALL_T.has(t) ? 'int' : t);
  // recorre todos los nodos con `k`; si fn devuelve false no baja a los hijos
  function each(n, fn, parent) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const x of n) each(x, fn, parent); return; }
    if (n.k && fn(n, parent) === false) return;
    for (const key in n) { if (key === 'line' || key === 'end') continue; const v = n[key]; if (v && typeof v === 'object') each(v, fn, n.k ? n : parent); }
  }
  const mentions = (n, name) => { let r = false; each(n, (x) => { if (x.k === 'id' && x.name === name) r = true; return !r; }); return r; };
  const rootName = (n) => { while (n && n.k === 'idx') n = n.base; return n && n.k === 'id' ? n.name : null; };
  const mentionsAnyId = (n) => { let r = false; each(n, (x) => { if (x.k === 'id') r = true; return !r; }); return r; };
  const stmtsOf = (b) => (!b ? [] : b.k === 'block' ? b.body : [b]);
  const numVal = (x) => (x && x.k === 'num' ? x.v : x && x.k === 'un' && x.op === '-' && x.e.k === 'num' ? -x.e.v : null);
  const esLit = (x) => numVal(x) !== null;
  function txt(e) {
    if (!e) return '';
    const p = (x) => (x.par && (x.k === 'bin' || x.k === 'cond' || x.k === 'assign' || x.k === 'comma') ? '(' + txt(x) + ')' : txt(x));
    switch (e.k) {
      case 'id': return e.name;
      case 'num': return e.ch ? "'" + String.fromCharCode(e.v) + "'" : (e.kind === 'double' && Number.isInteger(e.v) ? e.v + '.0' : String(e.v));
      case 'str': return JSON.stringify(e.v);
      case 'bin': return p(e.l) + ' ' + e.op + ' ' + p(e.r);
      case 'un': return e.op + p(e.e);
      case 'idx': return txt(e.base) + '[' + txt(e.i) + ']';
      case 'call': return e.name + '(' + e.args.map(txt).join(', ') + ')';
      case 'cast': return '(' + e.type + ')' + p(e.e);
      case 'incdec': return e.prefix ? e.op + txt(e.e) : txt(e.e) + e.op;
      case 'assign': return txt(e.l) + ' ' + e.op + ' ' + txt(e.r);
      case 'cond': return p(e.c) + ' ? ' + txt(e.a) + ' : ' + txt(e.b);
      case 'comma': return txt(e.l) + ', ' + txt(e.r);
      default: return '...';
    }
  }
  // intervalos de una comparación "X op K" (K constante); en variables enteras se normalizan los extremos
  function intervalo(op, k, entero) {
    let lo = -Infinity, hi = Infinity, loI = false, hiI = false;
    if (op === '<') hi = k; else if (op === '<=') { hi = k; hiI = true; } else if (op === '>') lo = k; else if (op === '>=') { lo = k; loI = true; } else if (op === '==') { lo = hi = k; loI = hiI = true; } else return null;
    if (entero) {
      if (hi !== Infinity) { hi = hiI ? Math.floor(hi) : Math.ceil(hi) - 1; hiI = true; }
      if (lo !== -Infinity) { lo = loI ? Math.ceil(lo) : Math.floor(lo) + 1; loI = true; }
    }
    return { lo, hi, loI, hiI };
  }
  const ivVacio = (a) => a.lo > a.hi || (a.lo === a.hi && !(a.loI && a.hiI));
  const ivInter = (a, b) => {
    const r = { lo: a.lo, loI: a.loI, hi: a.hi, hiI: a.hiI };
    if (b.lo > r.lo || (b.lo === r.lo && !b.loI)) { r.lo = b.lo; r.loI = b.loI; }
    if (b.hi < r.hi || (b.hi === r.hi && !b.hiI)) { r.hi = b.hi; r.hiI = b.hiI; }
    return r;
  };
  const ivEn = (a, b) => (a.lo > b.lo || (a.lo === b.lo && (b.loI || !a.loI))) && (a.hi < b.hi || (a.hi === b.hi && (b.hiI || !a.hiI)));
  const FLIP = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '==': '==', '!=': '!=' };
  const S0 = { loops: [], ifs: [], cond: false };
  const CONT_NOMBRE = /^(C\d?|CP|CN|CC|CI|CPOS|CNEG|CCERO|CONT\w*)$/i;
  const PROM_NOMBRE = /^(PROM\w*|MEDIA\w*)$/i;
  const MULT_TEXTO = /m[úu]ltiplo|divisible|\bpar(es)?\b|\bimpar(es)?\b/i;

  class Reglas {
    constructor(g, items) { this.g = g; this.items = items; this.globals = new Map(); this.fi = null; this.cadenas = new Set(); }
    w(kb, msg, line, alt) { const a = [].concat(KB_GEMELOS[kb] || [], alt || []).filter((x, i, arr) => arr.indexOf(x) === i); this.g.warn(msg, line, kb, a.length ? a : undefined); }
    run() {
      for (const it of this.items) if (it.k === 'decl') for (const v of it.vars) this.globals.set(v.name, { type: it.type, array: v.dims.length > 0 || v.ptr, init: v.init, global: true, line: v.line });
      for (const it of this.items) if (it.k === 'func') {
        try { this.func(it); } catch (e) { if (typeof process !== 'undefined' && process.env && process.env.EDITOR_C_DEBUG) throw e; }
      }
    }
    addVar(name, info) {
      const prev = this.fi.vars.get(name);
      if (prev) { prev.dup = true; return; }
      this.fi.vars.set(name, info);
    }
    func(f) {
      const fi = this.fi = { f, vars: new Map(), writes: new Map(), reads: new Map(), pure: new Set(), condNames: new Set(), rem: new Map(), quo: new Map(), sq: new Map(), nseq: 0, seqNow: 0 };
      for (const [k, v] of this.globals) fi.vars.set(k, Object.assign({}, v));
      for (const p of f.params) this.addVar(p.name, { type: p.type, array: p.array, param: true });
      each(f.body, (n) => { if (n.k === 'decl') for (const v of n.vars) this.addVar(v.name, { type: n.type, array: v.dims.length > 0 || v.ptr, init: v.init, line: v.line, decl: n }); });
      this.walk(f.body, S0, null, (n, st, par) => this.recolectar(n, st, par));
      for (const [nm, ws] of fi.writes) {
        if (ws.length !== 1) continue;
        const w = ws[0]; const r = w.kind === 'assign' && w.node.op === '=' ? w.node.r : w.kind === 'decl' ? w.node : null;
        if (r && r.k === 'bin' && (r.op === '%' || r.op === '/') && numVal(r.r) > 0 && r.l.k !== 'num') (r.op === '%' ? fi.rem : fi.quo).set(nm, { e: r, m: numVal(r.r), key: txt(r.l) });
      }
      this.walk(f.body, S0, null, (n, st, par) => this.regla(n, st, par));
    }
    // recorre el árbol con el contexto { loops, ifs, cond }
    walk(n, st, par, fn) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { for (const x of n) this.walk(x, st, par, fn); return; }
      if (!n.k) { for (const key in n) { const v = n[key]; if (key !== 'line' && v && typeof v === 'object') this.walk(v, st, par, fn); } return; }
      fn(n, st, par);
      const W = (c, s2) => this.walk(c, s2, n, fn);
      const cs = Object.assign({}, st, { cond: true });
      switch (n.k) {
        case 'if': { const si = Object.assign({}, st, { ifs: st.ifs.concat({ n, nl: st.loops.length }) }); W(n.c, cs); W(n.a, si); W(n.b, si); return; }
        case 'while': case 'do': { const sl = Object.assign({}, st, { loops: st.loops.concat(n) }); W(n.c, Object.assign({}, sl, { cond: true })); W(n.body, sl); return; }
        case 'for': { const sl = Object.assign({}, st, { loops: st.loops.concat(n) }); W(n.init, sl); W(n.c, Object.assign({}, sl, { cond: true })); W(n.step, sl); W(n.body, sl); return; }
        case 'cond': W(n.c, cs); W(n.a, st); W(n.b, st); return;
        default: for (const key in n) { const v = n[key]; if (key !== 'line' && key !== 'end' && v && typeof v === 'object') W(v, st); }
      }
    }
    addW(name, kind, node, st, line) {
      if (!name) return;
      if (!this.fi.writes.has(name)) this.fi.writes.set(name, []);
      this.fi.writes.get(name).push({ kind, node, st, line: line || node.line, seq: this.fi.seqNow });
    }
    recolectar(n, st) {
      const fi = this.fi;
      fi.sq.set(n, fi.seqNow = ++fi.nseq);
      if (n.k === 'decl') for (const v of n.vars) if (v.init) this.addW(v.name, 'decl', v.init, st, v.line);
      if (n.k === 'assign') { const r = rootName(n.l); this.addW(r, 'assign', n, st); if (n.op === '=' && n.l.k === 'id') fi.pure.add(n.l); }
      if (n.k === 'incdec') this.addW(rootName(n.e), 'inc', n, st);
      if (n.k === 'call' && n.name === 'scanf') for (const a of n.args.slice(1)) {
        if (a.k === 'addr') { this.addW(rootName(a.e), 'scanf', n, st); if (a.e.k === 'id') fi.pure.add(a.e); } else if (a.k === 'id') this.addW(a.name, 'scanf', n, st);
      }
      if (n.k === 'id') {
        if (!fi.pure.has(n)) { if (!fi.reads.has(n.name)) fi.reads.set(n.name, []); fi.reads.get(n.name).push(fi.seqNow); }
        if (st.cond) fi.condNames.add(n.name);
      }
    }
    // ---------- utilidades ----------
    info(name) { const v = this.fi.vars.get(name); return v && !v.dup ? v : null; }
    esEscalar(name) { const v = this.info(name); return !!v && !v.array && !v.param && !v.global; }
    tipoDe(name) { const v = this.info(name); return v && !v.array ? v.type : null; }
    tipo(e) {
      if (!e) return null;
      switch (e.k) {
        case 'num': return e.kind;
        case 'id': return this.tipoDe(e.name);
        case 'idx': { const nm = rootName(e); const v = nm && this.info(nm); return v ? v.type : null; }
        case 'call': {
          if (MATH_DOUBLE.has(e.name) || e.name === 'atof') return 'double';
          if (e.name === 'strlen') return 'ulong';
          if (['abs', 'atoi', 'rand', 'toupper', 'tolower', 'getchar'].indexOf(e.name) >= 0) return 'int';
          const f = this.g.funcs.get(e.name); return f ? f.ret : null;
        }
        case 'cast': return e.type;
        case 'un': { if (e.op === '!') return 'int'; const t = this.tipo(e.e); return t === null ? null : prom(t); }
        case 'bin': {
          if (REL_OPS.indexOf(e.op) >= 0 || e.op === '&&' || e.op === '||') return 'int';
          const a = this.tipo(e.l), b = this.tipo(e.r);
          if (a === null || b === null) return null;
          return e.op === '<<' || e.op === '>>' ? prom(a) : arith(a, b);
        }
        case 'assign': return this.tipo(e.l);
        case 'incdec': return this.tipo(e.e);
        case 'comma': return this.tipo(e.r);
        case 'cond': { const a = this.tipo(e.a), b = this.tipo(e.b); return a === null || b === null ? null : arith(a, b); }
        default: return null;
      }
    }
    entero(t) { return t !== null && INTLIKE.has(t); }
    decimal(t) { return t !== null && FLOATLIKE.has(t); }
    leidas(name, despuesDeSeq) { return (this.fi.reads.get(name) || []).filter((q) => despuesDeSeq === undefined || q > despuesDeSeq).length; }
    seqIni(n) { return this.fi.sq.get(n) || 0; }
    seqFin(n) { let m = this.seqIni(n); each(n, (x) => { const q = this.fi.sq.get(x); if (q > m) m = q; }); return m; }
    escrituras(name, tipos) { return (this.fi.writes.get(name) || []).filter((w) => !tipos || tipos.indexOf(w.kind) >= 0); }
    // comparación simple "X op K" con X variable escalar y K constante
    cmp(e) {
      if (!e || e.k !== 'bin' || REL_OPS.indexOf(e.op) < 0) return null;
      let a = e.l, b = e.r, op = e.op;
      if (a.k !== 'id' && esLit(a) && b.k === 'id') { const t = a; a = b; b = t; op = FLIP[op]; }
      if (a.k !== 'id' || !esLit(b)) return null;
      const t = this.tipoDe(a.name);
      return { v: a.name, op, k: numVal(b), t, ent: this.entero(t) };
    }
    // condición como intervalo de una sola variable ("X >= 4" o "X >= 4 && X < 7")
    condIv(e) {
      const cj = this.conj(e); let v = null, iv = null;
      for (const t of cj) {
        const c = this.cmp(t); if (!c || c.op === '!=' || (v !== null && c.v !== v)) return null;
        v = c.v; const x = intervalo(c.op, c.k, c.ent); iv = iv ? ivInter(iv, x) : x;
      }
      return iv ? { v, iv } : null;
    }
    conj(e) { return e.k === 'bin' && e.op === '&&' ? this.conj(e.l).concat(this.conj(e.r)) : [e]; }
    disj(e) { return e.k === 'bin' && e.op === '||' ? this.disj(e.l).concat(this.disj(e.r)) : [e]; }
    sinEfectos(e) { return !this.g.hasSideEffect(e); }
    cadenasDe(n) { const r = []; each(n, (x) => { if (x.k === 'str') r.push(x.v); }); return r; }
    esExprCall(s, nombre) { return s && s.k === 'expr' && s.e.k === 'call' && s.e.name === nombre; }
    scanfDe(s, v) { return this.esExprCall(s, 'scanf') && s.e.args.some((a) => a.k === 'addr' && a.e.k === 'id' && a.e.name === v); }
    scanVars(call) { return call.args.slice(1).filter((a) => a.k === 'addr' && a.e.k === 'id').map((a) => a.e.name); }
    asigSimple(s) { return s && s.k === 'expr' && s.e.k === 'assign' && s.e.op === '=' && s.e.l.k === 'id' ? s.e : null; }
    // X = X + e  /  X += e  -> { v, e }  (suma sobre sí misma)
    acum(s) {
      const a = s && s.k === 'expr' && s.e.k === 'assign' ? s.e : null;
      if (!a || a.l.k !== 'id') return null;
      if (a.op === '+=') return { v: a.l.name, e: a.r, node: a };
      if (a.op === '=' && a.r.k === 'bin' && a.r.op === '+' && a.r.l.k === 'id' && a.r.l.name === a.l.name && !mentions(a.r.r, a.l.name)) return { v: a.l.name, e: a.r.r, node: a };
      return null;
    }
    esInc(s) { // C++  /  C += 1  /  C = C + 1
      if (!s || s.k !== 'expr') return null;
      const e = s.e;
      if (e.k === 'incdec' && e.op === '++' && e.e.k === 'id') return e.e.name;
      const a = this.acum(s); if (a && numVal(a.e) === 1) return a.v;
      return null;
    }

    // ---------- reglas por nodo ----------
    regla(n, st, par) {
      switch (n.k) {
        case 'block': this.lista(n.body, st, n); break;
        case 'if': this.reglaIf(n, st, par); break;
        case 'for': case 'while': case 'do': this.reglaLazo(n); break;
        case 'bin': this.reglaBin(n, st, par); break;
        case 'assign': this.reglaAsig(n, st, par); break;
        case 'decl': for (const v of n.vars) if (v.init && v.init.k !== 'list') this.reglaInit(v.name, v.init, v.line, n.type, v.dims.length > 0 || v.ptr); break;
        case 'call': this.reglaCall(n, st); break;
        case 'cast': this.reglaCast(n); break;
        case 'comma': if (st.cond && par && (par.k === 'if' || par.k === 'while' || par.k === 'do') && par.c === n && this.sinEfectos(n.l)) this.w('OPE-026', 'la coma descarta la primera condición y el ' + (par.k === 'if' ? 'if' : par.k) + ' solo mira la segunda (' + txt(n.r) + '). Para pedir las dos usá &&.', n.line); else this.reglaComa(n, par); break;
        default:
      }
      if (n.k === 'while' && n.c.k === 'incdec' && n.c.op === '--' && n.c.e.k === 'id') this.w('OPE-046', txt(n.c) + ' resta 1 antes de entrar al cuerpo del while, así que adentro ' + n.c.e.name + ' ya vale uno menos (con ' + n.c.e.name + ' = 3 el cuerpo ve 2, 1, 0 y no 3, 2, 1).', n.line);
      if (n.k === 'for' && n.step && ['bin', 'id', 'num'].indexOf(n.step.k) >= 0 && this.sinEfectos(n.step)) this.w('OPE-048', 'el tercer campo del for (' + txt(n.step) + ') calcula un valor pero no lo guarda, así que la variable nunca cambia. Usá ' + (n.step.k === 'bin' && n.step.l.k === 'id' ? n.step.l.name + '++' : 'i++') + ' o ' + (n.step.k === 'bin' && n.step.l.k === 'id' ? n.step.l.name + ' = ' + txt(n.step) : 'i = i + 1') + '.', n.line);
    }
    reglaComa(n, par) { // X = 3,5;  (coma en lugar de punto decimal)
      if (n.l.k === 'assign' && n.l.op === '=' && n.l.r.k === 'num' && n.r.k === 'num' && !n.r.ch && !n.l.r.ch && par && par.k === 'expr') {
        this.w('OPE-025', 'en C los decimales se escriben con punto (' + n.l.r.v + '.' + n.r.v + '). La coma separa instrucciones, así que ' + txt(n.l.l) + ' recibe solo el ' + n.l.r.v + '.', n.line);
      }
    }
    reglaCast(n) {
      if (FLOATLIKE.has(n.type) && n.e.k === 'bin' && n.e.op === '/' && this.entero(this.tipo(n.e.l)) && this.entero(this.tipo(n.e.r)) && !(esLit(n.e.l) && esLit(n.e.r) && numVal(n.e.l) % numVal(n.e.r) === 0)) {
        this.w('TIP-003', 'el (' + n.type + ') se aplica al resultado de ' + txt(n.e) + ', que ya se truncó porque son dos enteros. El cast tiene que ir sobre un operando, antes de dividir.', n.line);
      }
    }
    reglaCall(n, st) {
      if (n.name === 'printf') this.reglaPrintf(n, st);
    }
    pares(call) { // [{ sp, a }]: cada argumento de printf con su especificación
      if (!call.args.length || call.args[0].k !== 'str') return [];
      const slots = []; for (const sp of this.g.parseFmt(call.args[0].v)) { if (sp.w === '*') slots.push(null); if (sp.p === '*') slots.push(null); slots.push(sp); }
      return call.args.slice(1).map((a, i) => ({ sp: slots[i] || null, a }));
    }
    reglaPrintf(n) {
      const fmt = n.args[0] && n.args[0].k === 'str' ? n.args[0].v : null; if (fmt === null) return;
      for (const { sp, a } of this.pares(n)) {
        if (!sp || a.k !== 'id' || !this.esEscalar(a.name)) continue;
        // TIP-012: char (una letra) mostrado con %d
        if ((sp.conv === 'd' || sp.conv === 'i') && this.tipoDe(a.name) === 'char' && !/ascii|c[oó]digo|n[uú]mero|valor/i.test(fmt)) {
          const ws = this.escrituras(a.name);
          const letra = ws.length > 0 && ws.every((w) => (w.kind === 'decl' && w.node.k === 'num' && w.node.ch) || (w.kind === 'assign' && w.node.op === '=' && w.node.r.k === 'num' && w.node.r.ch) );
          let conC = false; each(this.fi.f.body, (x) => { if (x.k === 'call' && x.name === 'printf') for (const q of this.pares(x)) if (q.sp && q.sp.conv === 'c' && q.a.k === 'id' && q.a.name === a.name) conC = true; });
          if (letra && !conC) { const w0 = ws[0]; const cod = w0.kind === 'decl' ? w0.node.v : w0.kind === 'assign' ? w0.node.r.v : null; this.w('TIP-012', '%d muestra el número del carácter' + (cod !== null ? ' (' + cod + ')' : '') + ', no la letra. Para ver la letra se usa %c.', n.line); }
        }
        // LOG-019 / LOG-020: cantidad de enteros entre dos valores según lo que dice el texto
        if ((sp.conv === 'd' || sp.conv === 'i') && this.entero(this.tipoDe(a.name))) {
          const ws = this.escrituras(a.name);
          if (ws.length === 1 && ws[0].kind === 'assign' && ws[0].node.op === '=') {
            const r = ws[0].node.r;
            const resta = (x) => x.k === 'bin' && x.op === '-' && x.l.k === 'id' && x.r.k === 'id' && !x.par ? x : null;
            if (resta(r) && /incluid/i.test(fmt) && !/excluid|sin incluir|sin contar/i.test(fmt)) this.w('LOG-019', 'de ' + txt(r.r) + ' a ' + txt(r.l) + ' con los dos extremos incluidos hay ' + txt(r) + ' + 1 números, y ' + a.name + ' = ' + txt(r) + ' deja uno menos. Falta sumar 1.', ws[0].line);
            else if (r.k === 'bin' && r.op === '+' && numVal(r.r) === 1 && resta(r.l) && /excluid|sin contar|sin incluir/i.test(fmt)) this.w('LOG-020', 'entre ' + txt(r.l.r) + ' y ' + txt(r.l.l) + ', sin contar los extremos, hay ' + txt(r.l) + ' - 1 números, y ' + a.name + ' = ' + txt(r.l) + ' + 1 cuenta de más. Hay que restar 1 en lugar de sumarlo.', ws[0].line);
          }
        }
      }
    }
    reglaInit(nombre, rhs, line, tipoDest, esArr) { // declaración con valor inicial
      if (esArr) return;
      this.reglaDestino(nombre, rhs, line, '=', tipoDest, true);
      if (PROM_NOMBRE.test(nombre)) this.promSinParen(nombre, rhs, line);
    }
    reglaAsig(n, st, par) {
      const l = n.l;
      if (l.k === 'id') {
        this.reglaDestino(l.name, n.r, n.line, n.op, this.tipoDe(l.name), false);
        if (n.op === '=' && PROM_NOMBRE.test(l.name)) this.promSinParen(l.name, n.r, n.line);
        // OPE-017: A = A++
        if (n.op === '=') { let m = false; each(n.r, (x) => { if (x.k === 'incdec' && x.e.k === 'id' && x.e.name === l.name) m = true; }); if (m) this.w('OPE-017', txt(n) + ' modifica ' + l.name + ' dos veces en la misma instrucción y el resultado no está definido. Alcanza con ' + l.name + (/--/.test(txt(n.r)) ? '--' : '++') + ';.', n.line); }
        // OPE-042: MAX = A > B;
        if (n.op === '=' && n.r.k === 'bin' && REL_OPS.indexOf(n.r.op) >= 0 && /^(MAX|MAYOR|MIN|MENOR|MAXIMO|MINIMO)$/i.test(l.name)) this.w('OPE-042', txt(n.r) + ' no da el ' + (/^(MAX|MAYOR|MAXIMO)$/i.test(l.name) ? 'mayor' : 'menor') + ': da 1 si es verdadero y 0 si es falso. Para quedarte con el ' + (/^(MAX|MAYOR|MAXIMO)$/i.test(l.name) ? 'mayor' : 'menor') + ' hay que usar un if.', n.line);
        // OPE-027: A = B = 2.5 con tipos distintos
        if (n.op === '=' && n.r.k === 'assign' && n.r.op === '=' && n.r.l.k === 'id' && this.entero(this.tipoDe(l.name)) && this.decimal(this.tipoDe(n.r.l.name))) this.w('OPE-027', 'en ' + txt(n) + ' la variable ' + l.name + ' es ' + TNAME[this.tipoDe(l.name)] + ' y se queda sin los decimales de ' + n.r.l.name + '. Las dos variables de la cadena deberían ser del mismo tipo.', n.line);
      }
      void st; void par;
    }
    // destino escalar: división entera dentro de una fórmula decimal, truncamientos
    reglaDestino(nombre, rhs, line, op, tipoDest, esInit) {
      if (!tipoDest) return;
      if (this.decimal(tipoDest)) {
        const d = this.buscarDiv(rhs, true);
        if (d && (d !== rhs || op !== '=') && !(esInit && d === rhs)) this.avisoDiv(d, line);
      } else if (this.entero(tipoDest) && tipoDest !== 'bool') {
        if (op !== '=') return;
        if (rhs.k === 'id' && this.decimal(this.tipoDe(rhs.name)) && this.esEscalar(rhs.name) && this.escrituras(rhs.name, ['scanf']).length) this.w('TIP-018', 'al guardar el decimal ' + rhs.name + ' en el entero ' + nombre + ' se pierden los decimales sin redondear: 3.99 se guarda como 3. Si lo querés así, escribí el cast (int) para que se note.', line);
        else if (rhs.k === 'bin' && rhs.op === '*' && ((rhs.l.k === 'id' && this.decimal(this.tipo(rhs.l)) && numVal(rhs.r) !== null && [10, 100, 1000].indexOf(numVal(rhs.r)) >= 0) || (rhs.r.k === 'id' && this.decimal(this.tipo(rhs.r)) && numVal(rhs.l) !== null && [10, 100, 1000].indexOf(numVal(rhs.l)) >= 0))) this.w('TIP-019', txt(rhs) + ' puede dar un número como 28.999999 y al guardarlo en un entero se corta a 28. Sumá 0.5 antes de guardarlo para redondear.', line);
        // TIP-010 va aparte (char)
      }
      if (tipoDest === 'char' && op === '=') {
        const v = numVal(rhs);
        if (v !== null && !(rhs.k === 'num' && rhs.ch) && Number.isInteger(v) && (v > 127 || v < -128)) this.w('TIP-010', v + ' no entra en un char con signo, que llega hasta 127. Se guarda como ' + (((v % 256) + 256 + 128) % 256 - 128) + '.', line);
      }
      // TIP-030: dígito en un char guardado en un int que después se usa en cuentas
      if (op === '=' && this.entero(tipoDest) && tipoDest !== 'char' && rhs.k === 'id' && this.tipoDe(rhs.name) === 'char' && this.esEscalar(rhs.name)) {
        const ws = this.escrituras(rhs.name);
        if (ws.length > 0 && ws.every((w) => w.kind === 'decl' && w.node.k === 'num' && w.node.ch && w.node.v >= 48 && w.node.v <= 57)) {
          let aritm = false; each(this.fi.f.body, (x) => { if (x.k === 'bin' && '+-*/%'.indexOf(x.op) >= 0 && ((x.l.k === 'id' && x.l.name === nombre && !(x.r.k === 'num' && x.r.ch)) || (x.r.k === 'id' && x.r.name === nombre && !(x.l.k === 'num' && x.l.ch)))) aritm = true; });
          if (aritm) this.w('TIP-030', "'" + String.fromCharCode(ws[0].node.v) + "' es el carácter cuyo código es " + ws[0].node.v + ', no el número ' + String.fromCharCode(ws[0].node.v) + ". Las cuentas con " + nombre + ' usan ese código.', line);
        }
      }
    }
    // busca una división entre dos enteros que entra a una cuenta decimal
    buscarDiv(e) {
      if (!e) return null;
      switch (e.k) {
        case 'bin':
          if (e.op === '/') {
            if (this.entero(this.tipo(e.l)) && this.entero(this.tipo(e.r))) return esLit(e.l) && esLit(e.r) && numVal(e.l) % numVal(e.r) === 0 ? null : e;
            return this.buscarDiv(e.l) || this.buscarDiv(e.r);
          }
          if (e.op === '+' || e.op === '-' || e.op === '*') return this.buscarDiv(e.l) || this.buscarDiv(e.r);
          return null;
        case 'un': return e.op === '-' || e.op === '+' ? this.buscarDiv(e.e) : null;
        default: return null;
      }
    }
    avisoDiv(d, line) {
      const a = d.l, b = d.r; const ent = txt(d);
      let kb, msg;
      if (esLit(a) && esLit(b)) { kb = numVal(a) === 1 ? 'TIP-006' : 'TIP-004'; msg = ent + ' son dos enteros y da ' + Math.trunc(numVal(a) / numVal(b)) + ', no ' + numVal(a) / numVal(b) + '. La división se trunca antes de seguir con la cuenta.'; }
      else if (numVal(a) === 1) { kb = 'TIP-007'; msg = ent + ' es una división entera: da 1 solo cuando ' + txt(b) + ' vale 1 y 0 con los demás.'; }
      else { kb = 'TIP-005'; msg = ent + ' divide dos enteros y la división se trunca antes de seguir con la cuenta (por ejemplo 3 / 4 da 0).'; }
      this.w(kb, msg, line, kb === 'TIP-005' ? 'LOG-052' : undefined);
    }
    promSinParen(nombre, rhs, line) { // PROM = A + B / 2
      if (rhs.k !== 'bin' || rhs.op !== '+' || rhs.par) return;
      const dv = rhs.r;
      if (dv.k !== 'bin' || dv.op !== '/' || dv.par || dv.l.k !== 'id' || !(dv.r.k === 'num' || dv.r.k === 'id')) return;
      let ids = 0; each(rhs.l, (x) => { if (x.k === 'id') ids++; });
      if (ids < 1) return;
      this.w('LOG-002', 'en ' + txt(rhs) + ' la división se hace antes que la suma, así que solo ' + txt(dv.l) + ' se divide por ' + txt(dv.r) + '. Falta un paréntesis alrededor de la suma.', line, 'OPE-013');
    }
    reglaBin(n, st, par) {
      const { op, l, r } = n;
      const lt = this.tipo(l), rt = this.tipo(r);
      // cadenas && / ||
      if ((op === '&&' || op === '||') && !(par && par.k === 'bin' && par.op === op)) {
        if (op === '&&') this.cadenaY(n); else this.cadenaO(n);
      }
      // OPE-043: && dentro de || sin paréntesis
      if (op === '||' || op === '&&') {
        if (op === '||' && mentionsAnyId(n)) for (const c of [l, r]) if (c.k === 'bin' && c.op === '&&' && !c.par) { this.w('OPE-043', '&& se calcula antes que ||, así que la condición se agrupa distinto a como la leés (' + txt(n) + '). Usá paréntesis para dejarlo claro.', n.line); break; }
        // OPE-047: variable sola junto a una comparación
        for (const [a, b] of [[l, r], [r, l]]) {
          if (a.k === 'id' && b.k === 'bin' && REL_OPS.indexOf(b.op) >= 0 && !b.par && this.esEscalar(a.name) && !this.esBandera(a.name)) {
            const ta = this.tipoDe(a.name);
            if (ta === null || !(this.entero(ta) || this.decimal(ta))) continue;
            const otra = b.l.k === 'id' ? b.l : (b.r.k === 'id' ? b.r : null);
            if (otra && otra.name !== a.name && esLit(b.l.k === 'id' ? b.r : b.l)) { this.w('OPE-047', txt(n) + ' solo pregunta si ' + a.name + ' es distinto de 0, no si cumple la comparación de ' + otra.name + '. Repetí la comparación con cada variable.', n.line); break; }
          }
        }
      }
      // OPE-004: & o | entre variables en una condición
      if ((op === '&' || op === '|') && st.cond && l.k === 'id' && r.k === 'id') this.w('OPE-004', "usaste '" + op + "' (operación de bits); para " + (op === '&' ? '"y"' : '"o"') + " lógico se escribe '" + op + op + "'.", n.line);
      // OPE-009: a == b == c
      if ((op === '==' || op === '!=') && l.k === 'bin' && (l.op === '==' || l.op === '!=') && !l.par && (r.k === 'id' || (r.k === 'num' && numVal(r) !== 0 && numVal(r) !== 1))) this.w('OPE-009', txt(n) + ' no compara los tres: primero ' + txt(l) + ' da 1 o 0 y después se compara ese resultado con ' + txt(r) + '. Unilos con &&.', n.line);
      // OPE-014 / OPE-015: negación sin paréntesis
      if (REL_OPS.indexOf(op) >= 0) {
        const neg = (x) => x.k === 'un' && x.op === '!' && !x.par && (x.e.k === 'id');
        if ((neg(l) && !(r.k === 'un' && r.op === '!') && r.k !== 'num') || (neg(r) && !(l.k === 'un' && l.op === '!') && l.k !== 'num')) this.w('OPE-014', 'la negación se aplica solo a ' + (neg(l) ? l.e.name : r.e.name) + ', no a la comparación completa (' + txt(n) + '). Poné la comparación entre paréntesis o usá !=.', n.line);
      }
      if (op === '%' && l.k === 'un' && l.op === '!' && !l.par && l.e.k === 'id') this.w('OPE-015', txt(n) + ' se calcula como (' + txt(l) + ') % ' + txt(r) + ', no como !(' + txt(l.e) + ' % ' + txt(r) + ').', n.line);
      // OPE-024: dividir un decimal por cero
      if (op === '/' && esLit(r) && numVal(r) === 0 && (r.kind === 'double' || r.kind === 'float' || this.decimal(lt))) this.w('OPE-024', 'división por cero: con decimales no se cierra, pero el resultado es ' + (numVal(l) === 0 ? 'nan (no es un número)' : 'inf (infinito)') + '.', n.line);
      // TIP-021 / TIP-022: sin signo contra cero
      if (REL_OPS.indexOf(op) >= 0) {
        for (const [a, b, o] of [[l, r, op], [r, l, FLIP[op]]]) {
          if (esLit(b) && numVal(b) === 0 && !(b.k === 'un')) {
            const ta = a.k === 'id' ? this.tipoDe(a.name) : this.tipo(a);
            if (ta !== null && SIN_SIGNO.has(ta) && (a.k === 'id' || (a.k === 'bin' && '+-*/%'.indexOf(a.op) >= 0 && (ta === 'uint' || ta === 'ulong')))) {
              if (o === '>=') { this.w('TIP-021', txt(a) + ' es unsigned y nunca es negativo, así que ' + txt(a) + ' >= 0 siempre es verdadero. Si es la condición de un bucle, no termina nunca: usá un int.', n.line); break; }
              if (o === '<') { this.w('TIP-022', txt(a) + ' es unsigned y nunca es negativo, así que la condición ' + txt(a) + ' < 0 no se cumple jamás. Compará los valores directamente (por ejemplo A < B).', n.line); break; }
            }
          }
        }
        // TIP-039: char contra una constante fuera de rango
        for (const [a, b, o] of [[l, r, op], [r, l, FLIP[op]]]) {
          if (a.k === 'id' && this.tipoDe(a.name) === 'char' && this.esEscalar(a.name) && esLit(b) && !(b.k === 'num' && b.ch) && o !== '==' && o !== '!=') {
            const k = numVal(b); const sempre = (o === '<' && k > 127) || (o === '<=' && k >= 127) || (o === '>' && k < -128) || (o === '>=' && k <= -128);
            const nunca = (o === '>' && k >= 127) || (o === '>=' && k > 127) || (o === '<' && k <= -128) || (o === '<=' && k < -128);
            if (sempre || nunca) { this.w('TIP-039', a.name + ' es char y solo va de -128 a 127: ' + a.name + ' ' + o + ' ' + k + ' es ' + (sempre ? 'siempre verdadera' : 'siempre falsa') + '. Usá un int para este contador.', n.line); break; }
          }
        }
        // TIP-041: int contra unsigned
        if (lt === 'int' && rt === 'uint' && l.k === 'id' && r.k === 'id') this.w('TIP-041', 'se comparan un int (' + txt(l) + ') y un unsigned (' + txt(r) + '): un valor negativo se convierte en un número enorme y la comparación da otro resultado.', n.line);
        else if (lt === 'uint' && rt === 'int' && l.k === 'id' && r.k === 'id') this.w('TIP-041', 'se comparan un unsigned (' + txt(l) + ') y un int (' + txt(r) + '): un valor negativo se convierte en un número enorme y la comparación da otro resultado.', n.line);
      }
      // TIP-036: constantes que se pasan del rango de int
      if ((op === '+' || op === '-' || op === '*')) {
        const a = this.plegar(l), b = this.plegar(r);
        if (a !== null && b !== null) {
          const v = op === '+' ? a + b : op === '-' ? a - b : a * b;
          if (v > 2147483647n || v < -2147483648n) this.w('TIP-036', txt(n) + ' no entra en un int (llega hasta 2147483647): el resultado se pasa del máximo y da un valor equivocado. Usá long o decimales.', n.line);
        }
      }
      // división con / en vez de % para la paridad / múltiplos: N / 2 == 0
      if ((op === '==' || op === '!=') && ((l.k === 'bin' && l.op === '/' && numVal(r) === 0) || (r.k === 'bin' && r.op === '/' && numVal(l) === 0))) {
        const d = l.k === 'bin' ? l : r;
        if (d.l.k === 'id' && numVal(d.r) >= 2 && this.entero(this.tipo(d.l)) && par && par.k === 'if' && par.c === n && op === '==') {
          const ss = this.cadenasDe([par.a, par.b]).join(' ');
          if (MULT_TEXTO.test(ss)) this.w('OPE-037', txt(d) + ' es el cociente, no el resto. Para saber si ' + txt(d.l) + ' es múltiplo de ' + txt(d.r) + ' hace falta ' + txt(d.l) + ' % ' + txt(d.r) + '.', n.line);
        }
      }
    }
    esBandera(nombre) { // variable que solo toma 0/1 o resultados de condiciones
      const ws = this.escrituras(nombre);
      if (this.info(nombre) && this.info(nombre).param) return true;
      if (!ws.length) return true;
      const okR = (r) => r && ((r.k === 'num' && (r.v === 0 || r.v === 1)) || (r.k === 'bin' && (REL_OPS.indexOf(r.op) >= 0 || r.op === '&&' || r.op === '||')) || (r.k === 'un' && r.op === '!') || r.k === 'call');
      return ws.every((w) => (w.kind === 'decl' && okR(w.node)) || (w.kind === 'assign' && w.node.op === '=' && okR(w.node.r)));
    }
    plegar(e) { // valor de una constante entera (BigInt) o null
      if (e.k === 'num') return (e.kind === 'int' && Number.isInteger(e.v)) ? BigInt(e.v) : null;
      if (e.k === 'un' && e.op === '-') { const v = this.plegar(e.e); return v === null ? null : -v; }
      if (e.k === 'bin' && '+-*'.indexOf(e.op) >= 0) {
        const a = this.plegar(e.l), b = this.plegar(e.r); if (a === null || b === null) return null;
        const v = e.op === '+' ? a + b : e.op === '-' ? a - b : a * b;
        return v > 2147483647n || v < -2147483648n ? null : v; // si ya se pasó, se avisa en ese nodo
      }
      return null;
    }
    // términos de una cadena de && : contradicciones
    cadenaY(n) {
      const cj = this.conj(n); if (cj.length < 2) return;
      const porVar = new Map();
      for (const t of cj) {
        const c = this.cmp(t); if (!c || c.op === '!=') continue;
        const iv = intervalo(c.op, c.k, c.ent);
        porVar.set(c.v, porVar.has(c.v) ? { iv: ivInter(porVar.get(c.v).iv, iv), n: porVar.get(c.v).n + 1, t: porVar.get(c.v).t.concat(t) } : { iv, n: 1, t: [t] });
      }
      for (const [v, o] of porVar) if (o.n >= 2 && ivVacio(o.iv)) {
        this.w('LOG-018', 'la condición ' + o.t.map(txt).join(' && ') + ' nunca se cumple: ningún valor de ' + v + ' puede cumplir las dos cosas a la vez. Si querías "o" (por ejemplo fuera de un rango), se usa ||.', n.line, 'OPE-034');
        return;
      }
      // restos: E % m != 0 y E % n == 0 con m divisor de n
      const terms = [];
      for (const t of cj) {
        const x = this.restoTermino(t); if (x) terms.push(x);
      }
      for (const a of terms) for (const b of terms) if (a.nz && !b.nz && a.key === b.key && b.m % a.m === 0) {
        this.w('LOG-013', 'unidas por && las condiciones ' + txt(a.t) + ' y ' + txt(b.t) + ' no pueden cumplirse a la vez: un múltiplo de ' + b.m + ' siempre es múltiplo de ' + a.m + '. Revisá qué condiciones van con && y cuáles con ||.', n.line);
        return;
      }
    }
    restoTermino(t) { // E % m != 0 | E % m == 0 | !(E % m) | (E % m) | R != 0 | R == 0 | !R | R  -> { key, m, nz }
      const rem = (x) => { if (x.k === 'bin' && x.op === '%' && numVal(x.r) > 0 && x.l.k !== 'num') return { key: txt(x.l), m: numVal(x.r) }; if (x.k === 'id' && this.fi.rem.has(x.name)) { const r = this.fi.rem.get(x.name); return { key: r.key, m: r.m }; } return null; };
      let a = null, nz;
      if (t.k === 'bin' && (t.op === '==' || t.op === '!=') && numVal(t.r) === 0) { a = rem(t.l); nz = t.op === '!='; }
      else if (t.k === 'un' && t.op === '!') { a = rem(t.e); nz = false; }
      else { a = rem(t); nz = true; }
      return a ? { key: a.key, m: a.m, nz, t } : null;
    }
    cadenaO(n) {
      const dj = this.disj(n); if (dj.length < 2) return;
      const dist = new Map();
      for (const t of dj) { const c = this.cmp(t); if (c && c.op === '!=') { if (!dist.has(c.v)) dist.set(c.v, new Set()); dist.get(c.v).add(c.k); } }
      for (const [v, ks] of dist) if (ks.size >= 2) { const arr = Array.from(ks); this.w('OPE-011', v + ' != ' + arr[0] + ' || ' + v + ' != ' + arr[1] + ' es siempre verdadera: cualquier número es distinto de ' + arr[0] + ' o distinto de ' + arr[1] + '. Para "ni ' + arr[0] + ' ni ' + arr[1] + '" usá &&.', n.line); return; }
    }
    // ---------- if ----------
    reglaIf(s, st, par) {
      const esElseIf = par && par.k === 'if' && par.b === s;
      // LOG-008: lado verdadero vacío
      if (s.a.k === 'block' && s.a.body.length === 0 && s.b && s.b.k !== 'empty' && !(s.b.k === 'block' && s.b.body.length === 0)) this.w('LOG-008', 'el lado verdadero del if está vacío, así que cuando se cumple (' + txt(s.c) + ') no pasa nada. Falta decir qué hace el programa en ese caso.', s.line);
      // LOG-010: else colgante
      if (s.a.k === 'if' && !s.b && s.a.b) this.w('LOG-010', 'el else se pega al if más cercano (el de ' + txt(s.a.c) + '), no al de ' + txt(s.c) + ', aunque lo hayas escrito alineado con el primero. Usá llaves para decir a cuál pertenece.', s.line);
      // LOG-011: rangos en orden incorrecto (cabeza de la cadena)
      if (!esElseIf && s.b && s.b.k === 'if') this.cadenaRangos(s);
      // LOG-007: condición invertida en mayor/menor
      const cc = s.c;
      if (cc.k === 'bin' && ['<', '<=', '>', '>='].indexOf(cc.op) >= 0 && cc.l.k === 'id' && cc.r.k === 'id') {
        const menor = cc.op[0] === '<' ? cc.l.name : cc.r.name, mayor = cc.op[0] === '<' ? cc.r.name : cc.l.name;
        const as = stmtsOf(s.a).length === 1 ? this.asigSimple(stmtsOf(s.a)[0]) : null;
        if (as && as.r.k === 'id') {
          if (/^(MAYOR|MAX|MAXIMO)$/i.test(as.l.name) && as.r.name === menor) this.w('LOG-007', 'la condición ' + txt(cc) + ' es verdadera cuando ' + menor + ' es el menor, pero en ese caso guardás ' + menor + ' en ' + as.l.name + '. Los lados V y F están cruzados.', s.line);
          else if (/^(MENOR|MIN|MINIMO)$/i.test(as.l.name) && as.r.name === mayor) this.w('LOG-007', 'la condición ' + txt(cc) + ' es verdadera cuando ' + mayor + ' es el mayor, pero en ese caso guardás ' + mayor + ' en ' + as.l.name + '. Los lados V y F están cruzados.', s.line);
        }
      }
      // LOG-050: mayor de tres sin comparar los dos últimos
      if (cc.k === 'bin' && cc.op === '&&' && s.b && s.b.k !== 'if') {
        const p = cc.l, q = cc.r;
        if (p.k === 'bin' && q.k === 'bin' && p.op === q.op && ['>', '>=', '<', '<='].indexOf(p.op) >= 0 && p.l.k === 'id' && q.l.k === 'id' && p.r.k === 'id' && q.r.k === 'id' && p.l.name === q.l.name && p.r.name !== q.r.name && p.l.name !== p.r.name && p.l.name !== q.r.name) {
          const Y = p.r.name, Z = q.r.name; let compara = false;
          each(s.b, (x) => { if ((x.k === 'bin' && REL_OPS.indexOf(x.op) >= 0 && (mentions(x, Y) || mentions(x, Z))) || x.k === 'cond' || x.k === 'if' || x.k === 'switch') compara = true; });
          if (!compara && this.esEscalar(Y) && this.esEscalar(Z)) this.w('LOG-050', 'si ' + p.l.name + ' no cumple ' + txt(cc) + ', queda por decidir entre ' + Y + ' y ' + Z + ', pero el else asume uno de los dos sin compararlos.', s.line);
        }
      }
      // LOG-014 / LOG-015: resto / cociente mal usado como pregunta de múltiplo
      const sT = this.cadenasDe([s.a]).join(' '), sF = this.cadenasDe([s.b]).join(' ');
      let R = null, igual0 = false;
      if (cc.k === 'bin' && cc.op === '==' && cc.l.k === 'id' && numVal(cc.r) === 0) { R = cc.l.name; igual0 = true; }
      if (R && this.fi.quo.has(R) && MULT_TEXTO.test(sT + ' ' + sF) && this.esEscalar(R)) {
        const q = this.fi.quo.get(R); if (numVal(q.e.r) >= 2 && this.entero(this.tipo(q.e.l))) this.w('LOG-014', txt(q.e) + ' da el cociente y no el resto, por eso ' + R + ' == 0 no dice si es múltiplo. Para saber si divide justo hace falta el resto: ' + txt(q.e.l) + ' % ' + txt(q.e.r) + '.', q.e.line || s.line);
      }
      void igual0;
      const rem = cc.k === 'id' && this.fi.rem.has(cc.name) ? this.fi.rem.get(cc.name) : (cc.k === 'bin' && cc.op === '%' && numVal(cc.r) >= 2 && cc.l.k !== 'num' && cc.l.k !== 'un' ? { e: cc, m: numVal(cc.r), key: txt(cc.l) } : null);
      if (rem && sT && MULT_TEXTO.test(sT) && !/\bno\b|impar/i.test(sT) && /\bno\b|impar/i.test(sF + ' ')) this.w('LOG-015', 'if (' + txt(cc) + ') es verdadero cuando el resto es distinto de 0, es decir, cuando NO es múltiplo. Comparalo con 0 para que se lea como lo pensaste.', s.line);
      // LOG-009 va en lista(); LOG-011 en cadenaRangos
    }
    cadenaRangos(head) {
      const ramas = []; let x = head;
      while (x && x.k === 'if') { ramas.push(x); x = x.b; }
      const ivs = ramas.map((r) => (this.sinEfectos(r.c) ? this.condIv(r.c) : null));
      for (let k = 1; k < ramas.length; k++) {
        if (!ivs[k] || ivVacio(ivs[k].iv)) continue;
        for (let j = 0; j < k; j++) if (ivs[j] && ivs[j].v === ivs[k].v && ivEn(ivs[k].iv, ivs[j].iv)) {
          this.w('LOG-011', 'nunca se llega a ' + txt(ramas[k].c) + ', porque todo lo que cumple eso ya entró en ' + txt(ramas[j].c) + ' más arriba. Probá primero la condición más exigente.', ramas[k].line);
          break;
        }
      }
    }
    // ---------- listas de instrucciones ----------
    lista(L, st, blk) {
      const fi = this.fi;
      if (L.length > 300) return;
      for (let i = 0; i < L.length; i++) {
        const s = L[i], nx = L[i + 1];
        // LOG-004: A = B; B = A;
        const a1 = this.asigSimple(s), a2 = this.asigSimple(nx);
        if (a1 && a2 && a1.r.k === 'id' && a2.r.k === 'id' && a1.l.name !== a1.r.name && a2.l.name === a1.r.name && a2.r.name === a1.l.name) this.w('LOG-004', 'después de ' + txt(a1) + ' ya perdiste el valor original de ' + a1.l.name + ', y la línea siguiente (' + txt(a2) + ') le devuelve el mismo valor. Hace falta una variable auxiliar para intercambiar.', s.line);
        // LOG-032: if sin llaves y otra instrucción en la misma línea
        if (s.k === 'if' && nx && !(blk && blk.line === s.line) && !(i > 0 && L[i - 1].line === s.line)) {
          let last = s.b || s.a; while (last && last.k === 'if') last = last.b || last.a;
          if (last && last.k === 'expr' && last.line === nx.line && last.line > 0) this.w('LOG-032', 'sin llaves, el if solo controla la primera instrucción, y lo que sigue en la misma línea (' + (nx.k === 'expr' ? txt(nx.e) : nx.k) + ') se ejecuta siempre. Poné llaves para agrupar lo que depende de la condición.', s.line);
        }
        // LOG-009: ifs sueltos donde va else
        if (s.k === 'if' && !s.b && nx && nx.k === 'if' && nx.b) {
          const c1 = this.condIv(s.c), c2 = this.condIv(nx.c);
          if (c1 && c2 && c1.v === c2.v && !ivVacio(c1.iv) && !ivVacio(c2.iv) && ivVacio(ivInter(c1.iv, c2.iv)) && !this.escribeVar(s.a, c1.v)) this.w('LOG-009', 'el else es del segundo if (' + txt(nx.c) + '), así que cuando se cumple ' + txt(s.c) + ' aparece también lo del else. Los casos tienen que ir encadenados con else if.', nx.line);
        }
        // LOG-034: for sin llaves seguido de una instrucción que usa el dato leído
        if (s.k === 'for' && s.body.k === 'expr' && nx) {
          const call = s.body.e.k === 'call' && s.body.e.name === 'scanf' ? s.body.e : null;
          if (call) for (const V of this.scanVars(call)) if (this.esEscalar(V)) {
            const usa = (nx.k === 'if' && mentions(nx.c, V)) || (nx.k === 'expr' && nx.e.k === 'assign' && mentions(nx.e.r, V));
            if (usa) { this.w('LOG-034', 'sin llaves, el for repite solo el scanf, y lo que sigue (' + (nx.k === 'if' ? 'if (' + txt(nx.c) + ')' : txt(nx.e)) + ') se hace una sola vez con el último dato. Encerrá todo el cuerpo del lazo entre llaves.', s.line); break; }
          }
        }
        // LOG-040: valor inicial que impide entrar al lazo
        if (s.k === 'while') {
          const c = this.cmp(s.c);
          if (c && c.t !== null) {
            for (let m = i - 1; m >= 0; m--) {
              if (!mentions(L[m], c.v)) continue;
              const as = this.asigSimple(L[m]);
              let val = null;
              if (as && as.l.name === c.v && as.r.k === 'num' && !as.r.ch) val = as.r.v;
              else if (L[m].k === 'decl') { const dv = L[m].vars.find((v) => v.name === c.v); if (dv && dv.init && dv.init.k === 'num') val = dv.init.v; }
              if (val !== null) {
                const cumple = { '<': val < c.k, '<=': val <= c.k, '>': val > c.k, '>=': val >= c.k, '==': val === c.k, '!=': val !== c.k }[c.op];
                if (cumple === false && this.sinEfectos(s.c)) this.w('LOG-040', c.v + ' vale ' + val + ' al llegar al while y la condición ' + txt(s.c) + ' ya es falsa, así que el lazo no se ejecuta ni una vez. El valor inicial forzado tiene que hacer verdadera la condición.', s.line);
              }
              break;
            }
          }
        }
        // LOG-042: lectura adelantada que salta el primer dato
        if (s.k === 'while') {
          const cuerpo = stmtsOf(s.body);
          for (const V of cuerpo.length && this.esExprCall(cuerpo[0], 'scanf') ? this.scanVars(cuerpo[0].e) : []) {
            if (!mentions(s.c, V) || !this.esEscalar(V)) continue;
            let prev = null; for (let m = i - 1; m >= 0; m--) if (mentions(L[m], V)) { prev = L[m]; break; }
            if (prev && this.scanfDe(prev, V)) { this.w('LOG-042', 'leés el siguiente dato con scanf antes de procesar el actual, así que el primero que leíste antes del while (línea ' + prev.line + ') se pierde. Primero se procesa el dato leído y después se lee el siguiente.', cuerpo[0].line); break; }
          }
        }
        // LOG-041: centinela procesado como si fuera un dato
        if (s.k === 'while' && s.body.k === 'block') {
          const c = this.cmp(s.c);
          const b = s.body.body;
          let prevL = null; if (c) for (let m = i - 1; m >= 0; m--) if (mentions(L[m], c.v)) { prevL = L[m]; break; }
          if (c && c.op === '!=' && b.length >= 2 && this.esExprCall(b[0], 'scanf') && this.scanVars(b[0].e).indexOf(c.v) >= 0 && !(prevL && this.scanfDe(prevL, c.v))) {
            for (let q = 1; q < b.length; q++) {
              if (['if', 'break', 'continue', 'return', 'switch', 'while', 'for', 'do'].indexOf(b[q].k) >= 0) break;
              const ac = this.acum(b[q]);
              if (ac && mentions(ac.e, c.v) && ac.v !== c.v) { this.w('LOG-041', 'cuando se lee el ' + c.k + ' de corte, igual se suma y se cuenta como un dato más (' + txt(b[q].e) + '). El valor de corte no es un dato y no debería procesarse.', b[q].line); break; }
            }
          }
        }
        // LOG-045: división por restas con > en vez de >=
        if (s.k === 'while' && s.c.k === 'bin' && s.c.op === '>' && s.c.l.k === 'id' && s.c.r.k === 'id') {
          const R = s.c.l.name, D = s.c.r.name; let resta = false, cuenta = false;
          for (const t of stmtsOf(s.body)) {
            const a = t.k === 'expr' && t.e.k === 'assign' ? t.e : null;
            if (a && a.l.k === 'id' && a.l.name === R && ((a.op === '-=' && a.r.k === 'id' && a.r.name === D) || (a.op === '=' && a.r.k === 'bin' && a.r.op === '-' && a.r.l.k === 'id' && a.r.l.name === R && a.r.r.k === 'id' && a.r.r.name === D))) resta = true;
            if (this.esInc(t)) cuenta = true;
          }
          if (resta && cuenta) this.w('LOG-045', 'con ' + txt(s.c) + ', cuando ' + R + ' vale justo ' + D + ' ya no resta y el resto queda igual al divisor (10 / 5 da cociente 1 y resto 5). El resto nunca puede ser igual al divisor: probá con >=.', s.line);
        }
        // LOG-047: se pisa el dividendo y se muestra como si fuera el original
        if (s.k === 'while' && s.c.k === 'bin' && (s.c.op === '>=' || s.c.op === '>') && s.c.l.k === 'id' && s.c.r.k === 'id') {
          const R = s.c.l.name, D = s.c.r.name;
          const pisa = stmtsOf(s.body).some((t) => { const a = t.k === 'expr' && t.e.k === 'assign' ? t.e : null; return a && a.l.k === 'id' && a.l.name === R && ((a.op === '-=' && a.r.k === 'id' && a.r.name === D) || (a.op === '=' && a.r.k === 'bin' && a.r.op === '-' && a.r.l.k === 'id' && a.r.l.name === R && a.r.r.k === 'id' && a.r.r.name === D)); });
          if (pisa && this.escrituras(R, ['scanf']).length && this.escrituras(R, ['scanf'])[0].seq < this.seqIni(s)) {
            for (let m = i + 1; m < L.length; m++) {
              if (this.esExprCall(L[m], 'printf') && L[m].e.args[0].k === 'str' && L[m].e.args[1] && L[m].e.args[1].k === 'id' && L[m].e.args[1].name === R && L[m].e.args[2] && L[m].e.args[2].k === 'id' && L[m].e.args[2].name === D && /%\w*\s*\/\s*%/.test(L[m].e.args[0].v)) { this.w('LOG-047', R + ' terminó valiendo el resto, no el dividendo original, y el mensaje lo muestra como si fuera el dividendo. Restá sobre una copia de ' + R + '.', L[m].line); break; }
            }
          }
        }
        // LOG-005 / LOG-006 solo fuera de los lazos
        if (!esLoopCtx(st)) this.mostrarCalcular(L, i);
        // LOG-001: orden de lectura distinto del pedido
        if (this.esExprCall(s, 'printf') && s.e.args[0] && s.e.args[0].k === 'str' && nx && this.esExprCall(nx, 'scanf')) {
          const nom = []; const re = /\(([A-Za-z_]\w*)\)/g; let m; while ((m = re.exec(s.e.args[0].v))) nom.push(m[1]);
          const lei = nx.e.args.slice(1).map((a) => (a.k === 'addr' && a.e.k === 'id' ? a.e.name : null));
          if (nom.length >= 2 && lei.length === nom.length && lei.every((x) => x) && nom.every((x) => this.esEscalar(x)) && new Set(nom).size === nom.length && [...nom].sort().join() === [...lei].sort().join() && nom.join() !== lei.join()) {
            this.w('LOG-001', 'el mensaje pide primero ' + nom[0] + ' y después ' + nom[1] + ', pero el scanf los lee en otro orden (' + lei.join(', ') + '). El primer número que escribe el usuario va a parar a ' + lei[0] + '.', nx.line);
          }
        }
      }
      void fi;
    }
    escribeVar(n, v) { let r = false; each(n, (x) => { if ((x.k === 'assign' && rootName(x.l) === v) || (x.k === 'incdec' && rootName(x.e) === v) || (x.k === 'call' && x.name === 'scanf' && x.args.some((a) => a.k === 'addr' && rootName(a.e) === v))) r = true; }); return r; }
    mostrarCalcular(L, i) {
      const s = L[i];
      // LOG-005: printf de S y recién después S = cuenta
      if (this.esExprCall(s, 'printf')) {
        const vistos = new Set();
        for (const a of s.e.args.slice(1)) if (a.k === 'id' && this.esEscalar(a.name) && !vistos.has(a.name)) {
          vistos.add(a.name); const V = a.name;
          for (let j = i + 1; j < L.length; j++) {
            if (!mentions(L[j], V)) continue;
            const as = this.asigSimple(L[j]);
            if (as && as.l.name === V && !mentions(as.r, V) && as.r.k === 'bin' && this.sinEfectos(as.r) && this.leidas(V, this.seqFin(L[j])) === 0 && this.escrituras(V).every((w) => w.seq <= this.seqFin(L[j]))) this.w('LOG-005', 'mostrás ' + V + ' antes de calcularla en la línea ' + L[j].line + ' (' + txt(as) + '), por eso aparece el valor viejo. Primero se calcula y después se muestra.', s.line);
            break;
          }
        }
      }
      // LOG-006: S = cuenta con datos que recién después se leen con scanf
      const as = this.asigSimple(s);
      if (as && as.r.k === 'bin' && this.sinEfectos(as.r) && this.esEscalar(as.l.name) && !mentions(as.r, as.l.name)) {
        const S = as.l.name; const deps = new Set(); each(as.r, (x) => { if (x.k === 'id') deps.add(x.name); });
        if (![...deps].every((d) => this.esEscalar(d))) return;
        for (let j = i + 1; j < L.length; j++) {
          if (mentions(L[j], S)) break;
          if (!this.esExprCall(L[j], 'scanf')) continue;
          const leidos = this.scanVars(L[j].e).filter((v) => deps.has(v));
          if (!leidos.length) continue;
          const antes = leidos.some((v) => this.escrituras(v, ['scanf']).some((w) => w.seq < this.seqIni(s)));
          const reasig = this.escrituras(S).some((w) => w.seq > this.seqFin(s));
          if (!antes && !reasig && this.leidas(S, this.seqFin(L[j])) > 0) this.w('LOG-006', 'calculás ' + txt(as) + ' antes de leer ' + leidos.join(' y ') + ' con scanf (línea ' + L[j].line + '), por eso la cuenta usa los valores viejos. Leé los datos primero y calculá después.', s.line);
          break;
        }
      }
    }
    // ---------- lazos ----------
    forInfo(s) { // for (i = a; i op b; i++)
      if (s.k !== 'for' || !s.c || !s.step) return null;
      let v = null, ini = null;
      if (s.init && s.init.k === 'expr' && s.init.e.k === 'assign' && s.init.e.op === '=' && s.init.e.l.k === 'id') { v = s.init.e.l.name; ini = s.init.e.r; }
      else if (s.init && s.init.k === 'decl' && s.init.vars.length === 1 && s.init.vars[0].init) { v = s.init.vars[0].name; ini = s.init.vars[0].init; }
      if (!v || numVal(ini) === null) return null;
      const c = s.c;
      if (c.k !== 'bin' || c.l.k !== 'id' || c.l.name !== v) return null;
      const st = s.step;
      const sube = (st.k === 'incdec' && st.op === '++' && st.e.k === 'id' && st.e.name === v);
      return { v, ini: numVal(ini), op: c.op, bound: c.r, sube };
    }
    reglaLazo(s) {
      const cuerpo = s.body;
      const fl = this.forInfo(s);
      const scans = []; each(cuerpo, (x) => { if (x.k === 'call' && x.name === 'scanf') scans.push(x); });
      const leidoEnLazo = []; for (const c of scans) for (const v of this.scanVars(c)) if (this.esEscalar(v)) leidoEnLazo.push(v);
      if (fl && fl.sube && !mentions(cuerpo, fl.v)) {
        // LOG-022: arranca en 1 con i < N y lee datos que no se leyeron antes
        if (fl.ini === 1 && fl.op === '<' && this.soloLeeLimite(s) && leidoEnLazo.some((v) => !this.escrituras(v, ['scanf', 'assign']).some((w) => w.seq < this.seqIni(s)))) {
          this.w('LOG-022', 'el for arranca en 1 y corta en ' + txt(s.c) + ': da ' + (fl.bound.k === 'num' ? fl.bound.v - 1 : txt(fl.bound) + ' - 1') + ' vueltas, un dato menos de los que pediste.', s.line);
        }
        // LOG-023 / LOG-049: i <= N desde 0
        if (fl.ini === 0 && fl.op === '<=' && fl.bound.k === 'id' && this.esEscalar(fl.bound.name) && this.escrituras(fl.bound.name, ['scanf']).length && !this.escribeVar(cuerpo, fl.bound.name) && stmtsOf(cuerpo).length) {
          const kb = scans.length ? 'LOG-023' : 'LOG-049';
          this.w(kb, 'el for arranca en 0 y usa ' + txt(s.c) + ': da ' + txt(fl.bound) + ' + 1 vueltas, una de más' + (scans.length ? ', y la última lectura falla y vuelve a sumar el último valor' : '') + '.', s.line);
        }
      }
      // LOG-035: se suma i en lugar del dato leído
      if (fl && fl.sube && leidoEnLazo.length && leidoEnLazo.every((v) => this.leidas(v) === 0)) {
        for (const t of stmtsOf(cuerpo)) { const ac = this.acum(t); if (ac && ac.e.k === 'id' && ac.e.name === fl.v) { this.w('LOG-035', 'sumás ' + fl.v + ' (el número de vuelta) en lugar del dato leído ' + leidoEnLazo[0] + ': ' + leidoEnLazo[0] + ' se lee pero no se usa.', t.line); break; } }
      }
      // LOG-037: se suma una constante en lugar del dato leído (cualquier lazo)
      if (leidoEnLazo.length && leidoEnLazo.every((v) => this.leidas(v) === 0)) {
        for (const t of stmtsOf(cuerpo)) {
          const ac = this.acum(t);
          if (ac && ac.node.op && numVal(ac.e) !== null && ac.e.k === 'num' && !CONT_NOMBRE.test(ac.v) && this.leidas(ac.v, this.seqFin(s)) > 0) { this.w('LOG-037', ac.v + ' suma ' + numVal(ac.e) + ' en cada vuelta, así que cuenta datos en lugar de sumarlos. El dato ' + leidoEnLazo[0] + ' se lee y no se usa.', t.line); break; }
        }
      }
      // LOG-036: contador que suma el dato en vez de 1
      each(cuerpo, (t) => {
        if (t.k !== 'expr') return;
        const ac = this.acum(t);
        if (ac && CONT_NOMBRE.test(ac.v) && ac.e.k === 'id' && ac.e.name !== ac.v && this.escrituras(ac.e.name, ['scanf']).length) this.w('LOG-036', ac.v + ' suma el valor de ' + ac.e.name + ' en lugar de sumar 1, así que ya no cuenta sino que acumula. Un contador crece de a uno.', t.line);
      });
      // LOG-053: se modifica la variable del for dentro del lazo
      if (fl && fl.sube) {
        let l53 = null;
        each(stmtsOf(cuerpo).filter((t) => t.k === 'expr').map((t) => t.e), (x) => {
          if (l53) return false;
          if (x.k === 'incdec' && x.e.k === 'id' && x.e.name === fl.v) l53 = x;
          else if (x.k === 'assign' && x.l.k === 'id' && x.l.name === fl.v && (x.op === '+=' || x.op === '-=' || (x.op === '=' && x.r.k === 'bin' && (x.r.op === '+' || x.r.op === '-') && x.r.l.k === 'id' && x.r.l.name === fl.v))) l53 = x;
          return !l53;
        });
        if (l53) this.w('LOG-053', txt(l53) + ' dentro del cuerpo se suma al cambio que ya hace el for (' + txt(s.step) + '), y el lazo da menos vueltas de las que esperás. Dejá que el for cuente solo.', l53.line);
      }
      // LOG-024: acumulador que se reinicia en cada vuelta
      if (cuerpo.k === 'block') {
        const b = cuerpo.body;
        for (let p = 0; p < b.length; p++) {
          const as = this.asigSimple(b[p]); if (!as || as.r.k !== 'num' || as.r.v !== 0 || as.r.ch) continue;
          const A = as.l.name; if (!this.esEscalar(A)) continue;
          const usos = b.filter((t, ix) => ix !== p && mentions(t, A));
          if (usos.length === 1 && b.indexOf(usos[0]) > p && (this.acum(usos[0]) || (this.esInc(usos[0]) === A)) && this.leidas(A, this.seqFin(s)) > 0) { this.w('LOG-024', txt(as) + ' dentro del lazo borra el total en cada vuelta, y al final solo queda el último dato. La inicialización va antes del lazo.', b[p].line); break; }
        }
      }
      // LOG-025: contador inicializado en un valor distinto de 0
      this.contadorEnUno(s, cuerpo, leidoEnLazo);
      // LOG-029: mínimo inicializado en 0
      this.minimoEnCero(s, cuerpo, leidoEnLazo);
      // LOG-026 y LOG-028 van sobre divisiones
      this.promedios(s, cuerpo);
    }
    soloLeeLimite(s) { // antes del lazo solo se leyeron datos que forman parte de la condición del lazo (el límite)
      const enCond = new Set(); each(s.c, (x) => { if (x.k === 'id') enCond.add(x.name); });
      for (const [nm, ws] of this.fi.writes) if (ws.some((w) => w.kind === 'scanf' && w.seq < this.seqIni(s)) && !enCond.has(nm)) return false;
      return true;
    }
    contadorEnUno(s, cuerpo, leidoEnLazo) {
      const cands = new Set();
      this.walk(cuerpo, { loops: [s], ifs: [], cond: false }, null, (x, st) => {
        if (x.k === 'incdec' && x.op === '++' && x.e.k === 'id' && st.ifs.length) cands.add(x.e.name);
      });
      for (const C of cands) {
        if (!this.esEscalar(C)) continue;
        const ws = this.escrituras(C);
        const iniciales = ws.filter((w) => w.seq < this.seqIni(s));
        const dentro = ws.filter((w) => w.seq >= this.seqIni(s));
        if (iniciales.length !== 1) continue;
        const w0 = iniciales[0]; const val = w0.kind === 'decl' ? numVal(w0.node) : w0.kind === 'assign' && w0.node.op === '=' ? numVal(w0.node.r) : null;
        if (val === null || val === 0 || w0.st.loops.length || w0.st.ifs.length) continue;
        if (!dentro.every((w) => w.kind === 'inc' && w.node.op === '++' && w.st.ifs.length)) continue;
        // el if que cuenta debe depender de un dato que se lee en el lazo y no antes
        let ok = false;
        this.walk(cuerpo, { loops: [s], ifs: [], cond: false }, null, (x) => {
          if (x.k === 'if') { let cuenta = false; each([x.a, x.b], (y) => { if (y.k === 'incdec' && y.e.k === 'id' && y.e.name === C) cuenta = true; }); if (cuenta) for (const V of leidoEnLazo) if (mentions(x.c, V) && !this.escrituras(V, ['scanf', 'assign']).some((w) => w.seq < this.seqIni(s))) ok = true; }
        });
        if (ok && this.leidas(C, this.seqFin(s)) > 0) this.w('LOG-025', C + ' arranca en ' + val + ', así que cuenta ' + val + ' más de los que hay. Un contador empieza en 0.', w0.line);
      }
    }
    minimoEnCero(s, cuerpo, leidoEnLazo) {
      this.walk(cuerpo, { loops: [s], ifs: [], cond: false }, null, (x) => {
        if (x.k !== 'if' || x.b) return;
        const c = x.c; if (c.k !== 'bin' || (c.op !== '<' && c.op !== '>') || c.l.k !== 'id' || c.r.k !== 'id') return;
        const pequeno = c.op === '<' ? c.l.name : c.r.name, grande = c.op === '<' ? c.r.name : c.l.name; // V < M  => V es el dato, M el mínimo
        const as = stmtsOf(x.a).length === 1 ? this.asigSimple(stmtsOf(x.a)[0]) : null;
        if (!as || as.r.k !== 'id' || as.r.name !== pequeno || as.l.name !== grande) return;
        const M = grande, V = pequeno;
        if (!this.esEscalar(M) || leidoEnLazo.indexOf(V) < 0) return;
        const ws = this.escrituras(M); const ini = ws.filter((w) => w.seq < this.seqIni(s));
        if (ini.length !== 1) return;
        const w0 = ini[0]; const val = w0.kind === 'decl' ? w0.node : w0.kind === 'assign' && w0.node.op === '=' ? w0.node.r : null;
        if (!val || val.k !== 'num' || val.v !== 0 || val.ch) return;
        if (ws.filter((w) => w.seq >= this.seqIni(s)).some((w) => !(w.kind === 'assign' && w.node === as))) return;
        this.w('LOG-029', M + ' arranca en 0, que no es uno de los datos, y ningún dato positivo es menor que 0. El resultado queda siempre en 0.', w0.line);
      });
    }
    promedios(s, cuerpo) {
      // acumulador y contador que cambian dentro del mismo if
      const pares = [];
      this.walk(cuerpo, { loops: [s], ifs: [], cond: false }, null, (x) => {
        if (x.k !== 'if') return;
        const ls = stmtsOf(x.a); let acc = null, cnt = null;
        for (const t of ls) { const a = this.acum(t); if (a && numVal(a.e) !== 1) acc = acc || a.v; const c = this.esInc(t); if (c) cnt = cnt || c; }
        if (acc && cnt && acc !== cnt) pares.push({ acc, cnt });
      });
      for (const { acc, cnt } of pares) {
        each(this.fi.f.body, (x) => {
          if (x.k === 'bin' && x.op === '/' && x.l.k === 'id' && x.l.name === acc && x.r.k === 'id' && x.r.name !== cnt && this.fi.sq.get(x) > this.seqFin(s) && mentions(s.c, x.r.name) && this.esEscalar(x.r.name)) this.w('LOG-028', 'dividís ' + acc + ' (la suma de los que cumplen) por ' + x.r.name + ' (todos los datos) en vez de por ' + cnt + ' (los que se sumaron). El promedio da menos de lo que corresponde.', x.line);
        });
      }
    }
  }
  const esLoopCtx = (st) => !!(st && st.loops && st.loops.length);
  // llamada desde Gen.run
  function reglasKB(g, items) { new Reglas(g, items).run(); }

  const CODIGOS = [
    [/comparar un decimal|a < b < c|XOR|operación de bits/, 'comparacion'], [/sin condición de corte|nunca termina|no termina nunca|probable que nunca/, 'bucle-infinito'],
    [/falta un ';'/, 'falta-punto-coma'], [/falta cerrar la llave/, 'llave-sin-cerrar'],
    [/a scanf le falta el '&'|scanf necesita '&'/, 'scanf-sin-amp'], [/scanf pide leer/, 'scanf-faltan-variables'], [/scanf lee|scanf:|texto del scanf|al final del scanf/, 'scanf-formato'], [/printf:|printf pide|printf recibe/, 'printf-formato'],
    [/no está declarada/, 'no-declarada'], [/ya fue declarada/, 'redeclarada'], [/antes de darle un valor/, 'sin-inicializar'],
    [/es const/, 'const-modificada'], [/asignación '='/, 'asignacion-en-condicion'], [/división es entre dos enteros/, 'division-entera'], [/división por cero/, 'division-cero'],
    [/falta #include|biblioteca <|conio\.h|#include|#define|directiva|#error|macro/, 'preprocesador'], [/char arrays|textos/, 'texto-no-soportado'], [/todavía no está soportado|todavía no están soportados/, 'no-soportado'], [/sin ejecutar 'return'/, 'sin-return'], [/prototipo/, 'prototipo'], [/antes de estar definida/, 'sin-prototipo'],
    [/termina en ';'/, 'cuerpo-vacio'], [/esta sentencia/, 'sin-efecto'], [/'break'|'continue'/, 'break-fuera'], [/switch|'case'|'default'/, 'switch'],
    [/siempre es verdadero/, 'condicion-constante'], [/arreglo|índice/, 'arreglo'], [/función|argumento/, 'funcion'],
    [/se esperaba|falta una expresión|carácter no válido|carácter invisible|no es un tipo|no existe en C|no se escribe|no se entiende|símbolo|número .* no es válido|literal/, 'sintaxis']
  ];
  function conCodigo(arr, pref) { return arr.map((d) => { let code = pref + 'otro'; if (d.kb && own(KB_CODIGO, d.kb)) code = pref + KB_CODIGO[d.kb]; else for (const [re, c] of CODIGOS) if (re.test(d.msg)) { code = pref + c; break; } return Object.assign({ code }, d); }); }
  // los errores de «punteros no soportados» son todos iguales: el resto del programa dice cuál de los casos de la base es
  function refinaNOS(d, toks) {
    if (!toks || d.kb || !/punteros? |punteros\)|puntero a/.test(d.msg) || !/todavía no/.test(d.msg)) return;
    const ids = new Set(toks.filter((t) => t.t === 'id').map((t) => t.v)), strs = toks.filter((t) => t.t === 'str').map((t) => t.v);
    let kb;
    if (ids.has('malloc') || ids.has('calloc') || ids.has('realloc') || ids.has('free')) kb = 'NOS-005';
    else if (ids.has('strtok')) kb = 'NOS-013';
    else if (ids.has('strchr')) kb = 'NOS-011';
    else if (ids.has('strstr')) kb = 'NOS-012';
    else if (strs.some((x) => /%p/.test(x))) kb = 'NOS-020';
    else {
      const linea = toks.filter((t) => t.line === d.line);
      const ix = linea.findIndex((t) => t.t === 'op' && t.v === '*');
      const nm = ix >= 0 && linea[ix + 1] && linea[ix + 1].t === 'id' ? linea[ix + 1].v : null;
      if (!nm) return;
      const abre = linea.findIndex((t) => t.t === 'op' && t.v === '(');
      const esParam = abre >= 0 && abre < ix;
      const sig = (i) => toks.filter((t) => t.t === 'id' && t.v === nm).map((t) => toks.indexOf(t));
      if (esParam) {
        let deref = false, indexa = false;
        toks.forEach((t, i) => { if (t.t === 'op' && t.v === '*' && toks[i + 1] && toks[i + 1].t === 'id' && toks[i + 1].v === nm && i > 0 && !(toks[i - 1].t === 'id' && TYPE_KW.has(toks[i - 1].v))) deref = true; if (t.t === 'id' && t.v === nm && toks[i + 1] && toks[i + 1].v === '[') indexa = true; });
        kb = deref ? 'NOS-002' : indexa ? 'NOS-004' : undefined;
      } else {
        let arit = false;
        toks.forEach((t, i) => { if (t.t === 'id' && t.v === nm && toks[i + 1] && (toks[i + 1].v === '++' || toks[i + 1].v === '--' || toks[i + 1].v === '+')) arit = true; });
        kb = arit ? 'NOS-003' : 'NOS-001';
      }
    }
    if (kb) { d.kb = kb; const a = gem(kb); if (a) d.kbAlt = a; }
  }
  function compile(src, opts) {
    const includes = [], defines = new Map();
    includes.avisos = [];
    let toks, toksRef = null;
    try {
      toks = tokenize(src, 1, true, includes, defines);
      toks = expandDefines(toks, defines);
      const items = new Parser(toks).program();
      toksRef = toks;
      const g = new Gen(items, Object.assign({}, opts, { includes, defines }));
      const js = g.run();
      g.errors.sort((a, b) => a.line - b.line);
      g.warnings.sort((a, b) => a.line - b.line);
      for (const e of g.errors) refinaNOS(e, toksRef);
      if (g.errors.length) { const el = new Set(g.errors.map((e) => e.line)); g.warnings = g.warnings.filter((w) => !el.has(w.line)); return { js: null, errors: conCodigo(g.errors, 'E-'), warnings: conCodigo(g.warnings, 'W-') }; }
      return { js, errors: [], warnings: conCodigo(g.warnings, 'W-') };
    } catch (e) {
      if (e instanceof CErr) { const d = { line: e.cline, msg: e.message }; if (e.kb) { d.kb = e.kb; const a = gem(e.kb, e.kbAlt); if (a) d.kbAlt = a; } refinaNOS(d, toks); return { js: null, errors: conCodigo([d], 'E-'), warnings: [] }; }
      throw e;
    }
  }

  const api = { compile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CCompiler = api;
})(typeof self !== 'undefined' ? self : this);

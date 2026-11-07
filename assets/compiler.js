/* Compilador del Editor C: subconjunto de C de la materia -> JavaScript.
   Entrada: texto C. Salida: { js, errors:[{line,msg}], warnings:[{line,msg}] } */
(function (root) {
  'use strict';

  class CErr extends Error { constructor(msg, line) { super(msg); this.cline = line; } }

  const TYPE_KW = new Set(['int', 'float', 'double', 'char', 'void', 'long', 'short', 'unsigned', 'signed', 'const', 'static', 'bool', 'time_t', 'clock_t', 'size_t', 'register', 'volatile', 'auto']);
  const BIG = new Set(['long', 'ulong']);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const UNSUPPORTED_KW = { struct: 'struct', union: 'union', enum: 'enum', typedef: 'typedef', goto: 'goto' };
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
      if (c === '\u00a0' || c === '\u200b' || c === '\ufeff') throw new CErr('hay un carácter invisible (' + (c === '\u00a0' ? 'espacio no separable' : c === '\u200b' ? 'espacio de ancho cero' : 'marca BOM') + ') en esta línea, seguramente por copiar y pegar: borrá el espacio y volvé a escribirlo', line);
      if (c === '–' || c === '—' || c === '−') throw new CErr("el símbolo '" + c + "' no es el signo menos de C: escribí '-'", line);
      if (c === '×' || c === '÷' || c === '≠' || c === '≤' || c === '≥') throw new CErr("el símbolo '" + c + "' no existe en C: " + ({ '×': "multiplicar es '*'", '÷': "dividir es '/'", '≠': "distinto es '!='", '≤': "menor o igual es '<='", '≥': "mayor o igual es '>='" })[c], line);
      if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') { i++; continue; }
      if (c === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue; }
      if (c === '/' && text[i + 1] === '*') {
        const e = text.indexOf('*/', i + 2);
        if (e < 0) throw new CErr('comentario /* sin cerrar', line);
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
          else if (dir === 'include') { if (/^(<[^>\s]+>|"[^"]+")$/.test(arg)) includes.push(arg); else includes.avisos.push({ line, msg: 'el #include está mal escrito: tiene que ser #include <stdio.h> (con < y >) o #include "archivo.h"' }); }
          else if (dir === 'pragma' || dir === 'line' || dir === 'warning') { /* se ignora */ }
          else if (dir === 'error') throw new CErr('#error: ' + arg, line);
          else if (dir === 'define') {
            const m2 = /^(\w+)([\s\S]*)$/.exec(m[2]);
            if (!m2) throw new CErr('#define mal escrito', line);
            if (m2[2][0] === '(') {
              const mp = /^\(([^)]*)\)\s*([\s\S]*)$/.exec(m2[2]);
              if (!mp) throw new CErr('#define mal escrito: falta cerrar el paréntesis de los parámetros', line);
              const params = mp[1].split(',').map((x) => x.trim()).filter((x) => x.length);
              defines.set(m2[1], { params, body: tokenize(mp[2], line, false, includes, defines) });
            } else {
              if (/;\s*$/.test(m2[2])) includes.avisos.push({ line, msg: "el #define de " + m2[1] + " termina en ';': ese ';' se copia en cada uso y suele causar errores raros. Sacalo" });
              defines.set(m2[1], tokenize(m2[2], line, false, includes, defines));
            }
          } else includes.avisos.push({ line, msg: "'#" + dir + "' no es una directiva de C" + (/^(inlcude|incldue|inculde|includ|includes|iclude)$/.test(dir) ? ': ¿quisiste escribir #include?' : (/^(defin|deifne|defne|dfine)$/.test(dir) ? ': ¿quisiste escribir #define?' : ' (los comentarios en C empiezan con // o /* */)')) });
        }
        i = j; line += extra; continue;
      }
      if (!active()) { while (i < n && text[i] !== '\n') i++; continue; }
      atStart = false;
      if (/[A-Za-z_]/.test(c)) {
        let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(text[j])) j++;
        out.push({ t: 'id', v: text.slice(i, j), line }); i = j; continue;
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
            if (!/^[0-7]+$/.test(bd)) throw new CErr("el número '" + bd + "' no es válido: los números que empiezan con 0 son octales (solo dígitos del 0 al 7)", line);
            radix = 8; digits = bd.slice(1);
          }
          if (!(radix === 16 ? /^[0-9a-fA-F]+$/ : radix === 2 ? /^[01]+$/ : /^[0-9]+$/).test(digits)) throw new CErr("el número '" + s + "' no es válido: un entero no lleva letras (para un decimal escribí 5.0f o 5.0)", line);
          big = BigInt((radix === 16 ? '0x' : radix === 8 ? '0o' : radix === 2 ? '0b' : '') + digits);
          const u = suf.indexOf('u') >= 0, l = suf.indexOf('l') >= 0;
          const I = 0x7fffffffn, U = 0xffffffffn, L = 0x7fffffffffffffffn;
          if (!u && !l) kind = big <= I ? 'int' : (radix !== 10 && big <= U) ? 'uint' : big <= L ? 'long' : 'ulong';
          else if (u && !l) kind = big <= U ? 'uint' : 'ulong';
          else if (!u && l) kind = big <= L ? 'long' : 'ulong';
          else kind = 'ulong';
          v = Number(big);
        }
        out.push({ t: 'num', v, kind, big, line }); continue;
      }
      if (c === '"') {
        let j = i + 1, s = '';
        while (j < n && text[j] !== '"') {
          if (text[j] === '\\' && text[j + 1] === '\n') { j += 2; line++; continue; }
          if (text[j] === '\n') throw new CErr('cadena sin cerrar (falta la comilla ")', line);
          if (text[j] === '\\') { const r = esc(text, j); s += r[0]; j = r[1]; } else s += text[j++];
        }
        if (j >= n) throw new CErr('cadena sin cerrar (falta la comilla ")', line);
        out.push({ t: 'str', v: s, line }); i = j + 1; continue;
      }
      if (c === "'") {
        let j = i + 1, s;
        if (text[j] === '\\') { const r = esc(text, j); s = r[0]; j = r[1]; } else { s = text[j++]; }
        if (text[j] !== "'") throw new CErr("carácter con comillas simples mal escrito (usá 'a' con un solo carácter)", line);
        out.push({ t: 'num', v: s.charCodeAt(0), kind: 'int', line }); i = j + 1; continue;
      }
      let op = null;
      for (const o of OPS) if (text.startsWith(o, i)) { op = o; break; }
      if (!op && '+-*/%=<>!&|^~?:;,.(){}[]'.indexOf(c) >= 0) op = c;
      if (c === '\\') throw new CErr("carácter no válido '\\': si querías escribir un texto, ponelo entre comillas, por ejemplo printf(\"Hola\\n\");", line);
      if (c === '“' || c === '”' || c === '‘' || c === '’') throw new CErr("las comillas tipográficas " + c + " no sirven en C: usá las comillas rectas " + (c === '“' || c === '”' ? '"' : "'"), line);
      if (!op) throw new CErr("carácter no válido '" + c + "'", line);
      out.push({ t: 'op', v: op, line }); i += op.length;
    }
    if (cs.length) throw new CErr('falta el #endif de un #if / #ifdef', line);
    return out;
  }
  function esc(text, j) { // text[j] === '\\'
    const c = text[j + 1];
    if (c >= '0' && c <= '7') { const mo = /^[0-7]{1,3}/.exec(text.slice(j + 1)); return [String.fromCharCode(parseInt(mo[0], 8) & 255), j + 1 + mo[0].length]; }
    if (c === 'e' || c === 'E') return ['\x1b', j + 2];
    const map = { n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', f: '\f', v: '\v', '\\': '\\', '"': '"', "'": "'", '?': '?' };
    if (c === 'x') { const m = /^[0-9a-fA-F]{1,2}/.exec(text.slice(j + 2)); if (m) return [String.fromCharCode(parseInt(m[0], 16)), j + 2 + m[0].length]; }
    if (c in map) return [map[c], j + 2];
    return [c, j + 2];
  }
  const t0line = (arr) => (arr && arr[0] && arr[0].line) || 1;
  function expandDefines(toks, defines) {
    if (!defines.size) return toks;
    const out = []; let trabajo = 0;
    const go = (arr, depth, line) => {
      for (let i = 0; i < arr.length; i++) {
        if (++trabajo > 1500000) throw new CErr('las macros se expanden demasiado (más de un millón de elementos): ¿una macro se llama a sí misma?', line || t0line(arr));
        const t = arr[i];
        const d = t.t === 'id' && depth < 12 ? defines.get(t.v) : undefined;
        if (d && Array.isArray(d)) { go(d, depth + 1, t.line); continue; }
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
          for (const b of d.body) { const k = b.t === 'id' ? d.params.indexOf(b.v) : -1; if (k >= 0) for (const x of eargs[k]) sub.push(Object.assign({}, x, { line: t.line })); else sub.push(Object.assign({}, b, { line: t.line })); }
          go(sub, depth + 1, t.line); i = j; continue;
        }
        out.push(depth ? Object.assign({}, t, { line: line }) : t);
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
    expect(v) {
      if (this.isOp(v)) return this.next();
      const t = this.peek();
      const line = (v === ';' || v === ')' || v === ']') && t.line > this.prevLine() ? this.prevLine() : t.line;
      const found = t.t === 'eof' ? 'el final del archivo' : "'" + t.v + "'";
      if (t.t === 'id' && (t.v === 'and' || t.v === 'or' || t.v === 'not')) throw new CErr("en C la \"y\" lógica es '&&', la \"o\" es '||' y el \"no\" es '!' (no se escribe '" + t.v + "')", t.line);
      if (v === ';' && t.t === 'id' && (t.v === 'then' || t.v === 'endif' || t.v === 'end')) throw new CErr("'" + t.v + "' no existe en C: el cuerpo del if va entre llaves { }", t.line);
      if (v === ';') throw new CErr("falta un ';' al final de esta línea (antes de " + found + ')', line);
      throw new CErr("se esperaba '" + v + "' pero se encontró " + found, line);
    }
    ident() {
      const t = this.peek();
      if (t.t !== 'id') throw new CErr('se esperaba un nombre pero se encontró ' + (t.t === 'eof' ? 'el final del archivo' : "'" + t.v + "'"), t.line);
      if (TYPE_KW.has(t.v) || RESERVED.has(t.v)) throw new CErr("'" + t.v + "' es una palabra reservada, no puede usarse como nombre", t.line);
      return this.next();
    }
    isTypeStart(k) { const t = this.peek(k); return t.t === 'id' && TYPE_KW.has(t.v); }
    checkUnsupported() {
      const t = this.peek();
      if (t.t === 'id' && own(UNSUPPORTED_KW, t.v)) throw new CErr("'" + t.v + "' todavía no está soportado en este editor", t.line);
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
      if (base === 'double' && longs > 0) throw new CErr('long double todavía no está soportado en este editor: usá double', this.peek().line);
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
            throw new CErr("no se entiende '" + t.v + "' fuera de una función", t.line);
          }
        }
        const cn = this.sawConst;
        let ptrTok = false;
        if (this.isOp('*')) {
          if (type === 'char' || type === 'uchar') { this.next(); ptrTok = true; }
          else throw new CErr('los punteros todavía no están soportados en este editor (solo char * para textos)', this.peek().line);
        }
        const nameTok = this.ident();
        if (this.isOp('{')) throw new CErr("a '" + nameTok.v + "' le faltan los paréntesis: " + nameTok.v + '() { ... }', nameTok.line);
        if (this.isOp('(')) { if (ptrTok) throw new CErr('las funciones que devuelven char * (un puntero) todavía no están soportadas en este editor', nameTok.line); items.push(this.funcRest(type, nameTok, line)); }
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
          if (!pt || pt === 'void') throw new CErr('parámetro mal escrito: se esperaba un tipo (int, float, ...)', this.peek().line);
          let pdims = 0;
          if (this.isOp('*')) {
            if (pt === 'char' || pt === 'uchar') { this.next(); pdims = 1; if (this.isOp('*')) { this.next(); pdims = 2; if (this.isOp('*')) throw new CErr('tres niveles de punteros no están soportados en este editor', this.peek().line); } }
            else throw new CErr('los punteros todavía no están soportados en este editor (solo char * para textos)', this.peek().line);
          }
          const pn = (this.isOp(',') || this.isOp(')') || this.isOp('[')) ? { v: null, line: this.peek().line } : this.ident();
          while (this.accept('[')) { if (!this.isOp(']')) this.assign(); this.expect(']'); pdims++; }
          params.push({ name: pn.v, type: pt, line: pn.line, array: pdims > 0, dims: pdims });
          if (!this.accept(',')) break;
        }
      }
      this.expect(')');
      const sinParams = params.length === 0 && !vacioVoid;
      if (this.accept(';')) return { k: 'proto', name: nameTok.v, ret, params, line, unspec: sinParams };
      const sinNombre = params.find((p) => p.name === null);
      if (sinNombre) throw new CErr('al definir la función falta el nombre de un parámetro', sinNombre.line);
      const body = this.block();
      return { k: 'func', name: nameTok.v, ret, params, body, line, unspec: sinParams };
    }
    declRest(type, line) {
      if (type === 'void') throw new CErr('una variable no puede ser de tipo void', line);
      const vars = [];
      for (;;) {
        let ptr = false;
        if (this.isOp('*')) {
          if (type === 'char' || type === 'uchar') { this.next(); ptr = true; if (this.isOp('*')) throw new CErr('los punteros a punteros todavía no están soportados en este editor', this.peek().line); }
          else throw new CErr('los punteros todavía no están soportados en este editor (solo char * con un texto entre comillas)', this.peek().line);
        }
        const nt = this.ident();
        const dims = [];
        while (this.accept('[')) {
          if (this.isOp(']')) dims.push(null); else dims.push(this.assign());
          this.expect(']');
        }
        let init = null;
        if (this.accept('=')) init = this.isOp('{') ? this.initList() : this.assign();
        vars.push({ name: nt.v, dims, init, ptr, line: nt.line });
        if (!this.accept(',')) break;
      }
      this.expect(';');
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
        if (this.peek().t === 'eof') throw new CErr("falta cerrar la llave '{' abierta en la línea " + line, this.prevLine());
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
      if (t.t === 'id' && (t.v === 'elseif' || t.v === 'elif') && this.isOp('(', 1)) throw new CErr("'" + t.v + "' no existe en C: se escribe 'else if (condición)'", line);
      if (t.t === 'id' && !RESERVED.has(t.v) && !TYPE_KW.has(t.v) && this.peek(1).t === 'id' && !RESERVED.has(this.peek(1).v) && !TYPE_KW.has(this.peek(1).v)) {
        const tipos = ['int', 'float', 'double', 'char', 'void', 'long', 'short', 'unsigned'];
        const lev = (a, b) => { const d = []; for (let i = 0; i <= a.length; i++) d[i] = [i]; for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
        let best = null, bd = 99; for (const ty of tipos) { const dd = lev(t.v.toLowerCase(), ty); if (dd < bd) { bd = dd; best = ty; } }
        if (t.v === 'string') throw new CErr("en C no existe 'string': para un carácter usá char (los textos completos todavía no están soportados en este editor)", line);
        if (bd <= 2) throw new CErr("'" + t.v + "' no es un tipo de C: ¿quisiste escribir '" + best + "'? (C distingue mayúsculas y minúsculas)", line);
        throw new CErr("no se entiende '" + t.v + ' ' + this.peek(1).v + "': ¿falta un operador, un ';' o es un tipo mal escrito?", line);
      }
      if (t.t === 'id') {
        switch (t.v) {
          case 'if': {
            this.next(); this.expect('('); const c = this.expr(); this.expect(')');
            const a = this.stmt(); let b = null;
            if (this.isId('else')) { this.next(); if (this.isOp('(')) throw new CErr("después de 'else' no va una condición: si querías otra condición escribí 'else if (…)'", this.peek().line); b = this.stmt(); }
            return { k: 'if', c, a, b, line };
          }
          case 'while': {
            this.next(); this.expect('('); const c = this.expr(); this.expect(')');
            return { k: 'while', c, body: this.stmt(), line };
          }
          case 'do': {
            this.next(); const body = this.stmt();
            if (!this.isId('while')) throw new CErr("falta 'while' después del cuerpo del do", this.peek().line);
            this.next(); this.expect('('); const c = this.expr(); this.expect(')'); this.expect(';');
            return { k: 'do', c, body, line };
          }
          case 'for': {
            this.next(); this.expect('(');
            let init = null;
            if (this.isOp(';')) this.next();
            else if (this.isTypeStart()) { const type = this.typeSpec(); init = this.declRest(type, line); }
            else { init = { k: 'expr', e: this.expr(), line }; this.expect(';'); }
            let c = null; if (!this.isOp(';')) c = this.expr(); this.expect(';');
            let step = null; if (!this.isOp(')')) step = this.expr(); this.expect(')');
            return { k: 'for', init, c, step, body: this.stmt(), line };
          }
          case 'return': {
            this.next(); let e = null;
            if (!this.isOp(';')) e = this.expr();
            this.expect(';');
            return { k: 'return', e, line };
          }
          case 'break': this.next(); this.expect(';'); return { k: 'break', line };
          case 'continue': this.next(); this.expect(';'); return { k: 'continue', line };
          case 'switch': {
            this.next(); this.expect('('); const e = this.expr(); this.expect(')');
            this.expect('{');
            const items = [];
            while (!this.isOp('}')) {
              if (this.peek().t === 'eof') throw new CErr('falta cerrar la llave del switch', this.prevLine());
              if (this.isId('case')) { const l = this.next().line; const ce = this.ternary(); this.expect(':'); items.push({ k: 'case', e: ce, line: l }); }
              else if (this.isId('default')) { const l = this.next().line; this.expect(':'); items.push({ k: 'default', line: l }); }
              else items.push(this.stmt());
            }
            this.expect('}');
            return { k: 'switch', e, items, line };
          }
          case 'else': throw new CErr("'else' sin su 'if' (revisá las llaves y los ';')", line);
          case 'case': case 'default': throw new CErr("'" + t.v + "' fuera de un switch", line);
        }
      }
      const e = this.expr();
      this.expect(';');
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
        const r = this.assign();
        return { k: 'assign', op: t.v, l, r, line: t.line };
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
        if (t.v === '*') { const pv = this.t[this.p - 1]; if (pv && pv.t === 'op' && pv.v === '*') throw new CErr("en C no existe '**' (potencia): usá pow(base, exponente) de <math.h>", t.line); throw new CErr('los punteros todavía no están soportados en este editor', t.line); }
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
        if (t.v === '[') { this.next(); const i = this.expr(); this.expect(']'); e = { k: 'idx', base: e, i, line: t.line }; }
        else if (t.v === '(') {
          if (e.k !== 'id') throw new CErr('solo se pueden llamar funciones por su nombre', t.line);
          this.next(); const args = [];
          if (!this.isOp(')')) { for (;;) { args.push(this.assign()); if (!this.accept(',')) break; } }
          this.expect(')');
          e = { k: 'call', name: e.name, args, line: t.line };
        } else if (t.v === '++' || t.v === '--') { this.next(); e = { k: 'incdec', op: t.v, prefix: false, e, line: t.line }; }
        else if (t.v === '.' || t.v === '->') throw new CErr('struct / punteros todavía no están soportados en este editor', t.line);
        else break;
      }
      return e;
    }
    primary() {
      const t = this.next();
      if (t.t === 'num') return { k: 'num', v: t.v, kind: t.kind, big: t.big, line: t.line };
      if (t.t === 'str') {
        let s = t.v;
        while (this.peek().t === 'str') s += this.next().v;
        return { k: 'str', v: s, line: t.line };
      }
      if (t.t === 'id') {
        if (TYPE_KW.has(t.v)) throw new CErr("no se esperaba el tipo '" + t.v + "' acá (¿falta un ';' antes?)", t.line);
        if (RESERVED.has(t.v)) throw new CErr("no se esperaba '" + t.v + "' acá", t.line);
        return { k: 'id', name: t.v, line: t.line };
      }
      if (t.t === 'op' && t.v === '(') { const e = this.expr(); this.expect(')'); return e; }
      const found = t.t === 'eof' ? 'el final del archivo' : "'" + t.v + "'";
      const line = t.t === 'eof' ? this.prevLine() : t.line;
      const ant = this.t[this.p - 2];
      if (t.t === 'op' && t.v === '>' && ant && ant.t === 'op' && ant.v === '<') throw new CErr("en C \"distinto\" se escribe '!=' (no '<>')", line);
      if (t.t === 'op' && t.v === '>' && ant && ant.t === 'op' && ant.v === '=') throw new CErr("\"mayor o igual\" se escribe '>=' (no '=>')", line);
      if (t.t === 'op' && t.v === '=' && ant && ant.t === 'op' && ant.v === '<') throw new CErr("\"menor o igual\" se escribe '<=' (no '=<')", line);
      throw new CErr('falta una expresión antes de ' + found, line);
    }
  }
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

  class Gen {
    constructor(items, opts) {
      this.items = items;
      this.opts = opts || {};
      this.errors = []; this.warnings = [];
      this.funcs = new Map();
      this.scopes = [new Map()];
      this.cur = null;
      this.seenW = new Set();
      this.hoisted = []; this.sid = 0;
      this.ntemp = 0; this.fnHoist = []; this.assignLog = []; this.curLine = 1; this.loopDepth = 0; this.switchDepth = 0; this.undeclared = new Set(); this.inSC = 0;
      this.incl = new Set((this.opts.includes || []).map((h) => h.replace(/^[<"]|[>"]$/g, '')));
    }
    err(msg, line) { this.errors.push({ line: line || this.curLine, msg }); }
    warn(msg, line) { line = line || this.curLine; const k = line + '|' + msg; if (this.seenW.has(k)) return; this.seenW.add(k); this.warnings.push({ line, msg }); }
    push() { this.scopes.push(new Map()); }
    pop() { this.scopes.pop(); }
    declare(name, info, line) {
      const sc = this.scopes[this.scopes.length - 1];
      if (sc.has(name)) { this.err("'" + name + "' ya fue declarada antes en este bloque", line); }
      sc.set(name, info);
    }
    undeclErr(name, line) {
      if (this.undeclared.has(name)) return; this.undeclared.add(name);
      const sug = this.suggest(name);
      this.err("'" + name + "' no está declarada" + (sug ? ". ¿Quisiste decir '" + sug + "'? (C distingue mayúsculas y minúsculas)" : ' (¿falta declararla o está mal escrita?)'), line);
    }
    suggest(name) {
      if (name.length > 40) return null;
      const cand = new Set();
      for (const sc of this.scopes) for (const k of sc.keys()) cand.add(k);
      for (const k of this.funcs.keys()) cand.add(k);
      for (const k of ['printf', 'scanf', 'sqrt', 'pow', 'fabs', 'floor', 'ceil', 'abs', 'rand', 'srand', 'getchar', 'putchar', 'puts', 'toupper', 'tolower', 'strlen', 'strcpy', 'strcmp', 'strcat', 'sprintf', 'fgets']) cand.add(k);
      const lev = (a, b) => { const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; } for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
      let best = null, bd = 99;
      let nc = 0;
      for (const c of cand) { if (c === name || Math.abs(c.length - name.length) > 3) continue; if (++nc > 400) break; const dist = c.toLowerCase() === name.toLowerCase() ? 0 : lev(name.toLowerCase(), c.toLowerCase()); const lim = name.length <= 5 ? 1 : 2; if (dist <= lim && dist < bd) { bd = dist; best = c; } }
      return best;
    }
    lookup(name) {
      for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) return this.scopes[i].get(name);
      return null;
    }

    checkIncludes() {
      for (const a of ((this.opts.includes && this.opts.includes.avisos) || [])) this.warn(a.msg, a.line);
      const ok = ['stdio.h', 'math.h', 'stdlib.h', 'string.h', 'ctype.h', 'time.h', 'limits.h', 'stdbool.h', 'conio.h', 'float.h', 'stdint.h', 'stddef.h', 'assert.h', 'errno.h', 'locale.h', 'stdarg.h', 'inttypes.h', 'signal.h'];
      for (const h of (this.opts.includes || [])) {
        const nm = h.replace(/^[<"]|[>"]$/g, '');
        if (nm === 'conio.h') this.warn("<conio.h> solo existe en Windows (Code::Blocks): en Programiz y OnlineGDB no compila. Para esperar una tecla usá getchar() o scanf", 1);
        else if (ok.indexOf(nm) < 0) {
          const sg = nm === 'studio.h' || nm === 'stdoi.h' || nm === 'stido.h' || nm === 'stdio' ? 'stdio.h' : (nm === 'maths.h' || nm === 'math' ? 'math.h' : null);
          this.warn('no se conoce la biblioteca <' + nm + '>' + (sg ? ': ¿quisiste escribir <' + sg + '>?' : ''), 1);
        }
      }
    }
    run() {
      this.checkIncludes();
      // 1) firmas de funciones
      for (const it of this.items) {
        if (it.k === 'func' || it.k === 'proto') {
          const prev = this.funcs.get(it.name);
          if (prev && prev.node && it.k === 'func') { this.err("la función '" + it.name + "' está definida dos veces", it.line); continue; }
          if (prev) {
            const dif = [];
            if (prev.ret !== it.ret) dif.push('devuelve ' + TNAME[prev.ret] + ' en una y ' + TNAME[it.ret] + ' en la otra');
            if (!prev.unspec && !it.unspec && prev.params.length !== it.params.length) dif.push('una tiene ' + prev.params.length + ' parámetro(s) y la otra ' + it.params.length);
            else if (!prev.unspec && !it.unspec && prev.params.some((p, i) => p.type !== it.params[i].type || !!p.array !== !!it.params[i].array)) dif.push('los tipos de los parámetros no coinciden');
            if (dif.length) this.err("el prototipo y la definición de '" + it.name + "' no coinciden: " + dif.join('; '), it.line);
          }
          if (!prev || it.k === 'func') this.funcs.set(it.name, { name: it.name, ret: it.ret, params: it.params, node: it.k === 'func' ? it : (prev && prev.node), hasProto: it.k === 'proto' || !!(prev && prev.hasProto), unspec: !!it.unspec || !!(prev && prev.unspec), line: it.line, async: false, calls: new Set(), reads: false });
        }
      }
      if (!this.funcs.has('main')) this.err("no hay función main(): el programa empieza en 'main() { ... }'", 1);
      // 2) async: funciones que llegan a scanf/getchar
      for (const f of this.funcs.values()) if (f.node) this.scan(f.node.body, f);
      const llamadas = new Set();
      for (const f of this.funcs.values()) if (f.node) for (const c of f.calls) llamadas.add(c);
      for (const f of this.funcs.values()) if (!f.node && llamadas.has(f.name)) this.err("la función '" + f.name + "' se declara y se usa pero nunca se define", f.line);
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
      for (const p of f.params) { this.declare(p.name, p.array ? { type: p.type, js: 'v_' + p.name, assigned: true, array: true, ndims: p.dims, param: true } : { type: p.type, js: 'v_' + p.name, assigned: true, scalar: true }, p.line); ps.push('v_' + p.name); }
      const body = this.stmtList(f.body.body);
      this.pop();
      if (info.ret !== 'void' && f.name !== 'main' && !this.alwaysReturns(f.body)) this.warn("la función '" + f.name + "' puede terminar sin ejecutar 'return' en algún caso: en C devuelve un valor basura. Agregá un return al final", f.body.end || f.line);
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
          if ((ek === 'bin' || ek === 'un' || ek === 'id' || ek === 'num' || ek === 'cond' || ek === 'idx') && !this.hasSideEffect(s.e)) {
            if (ek === 'bin' && s.e.op === '==') this.warn("esta sentencia compara pero no guarda el resultado: no hace nada. ¿Querías asignar con '='?", s.line);
            else this.warn('esta sentencia no hace nada: el resultado de la cuenta no se guarda en ninguna variable', s.line);
          }
          return this.expr(s.e, true).c + ';';
        }
        case 'if': {
          this.checkCondAssign(s.c);
          const c = this.cond(s.c);
          const sa = this.assignLog.length;
          this.push(); const a = this.stmt(s.a); this.pop();
          const logA = this.assignLog.slice(sa); const sb = this.assignLog.length;
          const hechasA = logA.filter((i) => i.assigned);
          if (s.a.k === 'empty') this.warn("el if termina en ';' y su cuerpo queda vacío: lo que sigue se ejecuta siempre. ¿Sobra ese ';'?", s.line);
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
          }
          return r;
        }
        case 'while': {
          this.checkCondAssign(s.c);
          const c = this.cond(s.c);
          const sw = this.assignLog.length;
          this.push(); const b = this.bodyStmt(s.body); this.pop();
          this.asignarLog(sw);
          this.checkEmptyBody(s, 'while'); this.checkLoop(s, 'while');
          return 'while (' + c + ') ' + this.loopWrap(b);
        }
        case 'do': { const sd = this.assignLog.length; this.push(); const b = this.bodyStmt(s.body); this.pop(); this.asignarLog(sd); this.checkCondAssign(s.c); this.checkLoop(s, 'do-while'); return 'do ' + this.loopWrap(b) + ' while (' + this.cond(s.c) + ');'; }
        case 'for': {
          this.push();
          let init = '';
          if (s.init) init = s.init.k === 'decl' ? this.declCode(s.init, false, true) : this.expr(s.init.e, true).c;
          if (s.c) this.checkCondAssign(s.c);
          const c = s.c ? this.cond(s.c) : '';
          const sf = this.assignLog.length;
          const b = this.bodyStmt(s.body);
          const st = s.step ? this.expr(s.step, true).c : '';
          this.asignarLog(sf);
          this.pop();
          this.checkEmptyBody(s, 'for'); this.checkLoop(s, 'for');
          return 'for (' + init + ';' + c + ';' + st + ') ' + this.loopWrap(b);
        }
        case 'return': {
          const rt = this.cur.ret;
          if (!s.e) { if (rt !== 'void') this.warn("'return' sin valor en una función que devuelve " + TNAME[rt], s.line); return 'return' + (this.cur.name === 'main' ? ' 0' : '') + ';'; }
          if (rt === 'void') { this.err('una función void no puede devolver un valor', s.line); this.expr(s.e); return 'return;'; }
          const r = this.expr(s.e);
          this.checkIntDiv(r, rt, s.line);
          return 'return ' + this.conv(r, rt) + ';';
        }
        case 'break': if (!this.loopDepth && !this.switchDepth) this.err("'break' solo se puede usar dentro de un for, while, do-while o switch", s.line); return 'break;';
        case 'continue': if (!this.loopDepth) this.err("'continue' solo se puede usar dentro de un for, while o do-while", s.line); return 'continue;';
        case 'switch': {
          const e = this.expr(s.e);
          if (!INTLIKE.has(e.t)) this.err('el switch necesita un valor entero', s.line);
          if (s.items.length && s.items[0].k !== 'case' && s.items[0].k !== 'default') this.err("dentro de un switch las instrucciones tienen que ir después de un 'case' o 'default'", s.items[0].line || s.line);
          this.push(); this.switchDepth++;
          let out = 'switch (' + (BIG.has(e.t) ? 'Number(' + this.val(e) + ')' : this.val(e)) + ') {\n';
          const seen = new Set(); let hasDefault = false; let lastStmt = null;
          const termina = (st) => !!st && (st.k === 'break' || st.k === 'return' || st.k === 'continue' || (st.k === 'expr' && st.e.k === 'call' && st.e.name === 'exit') || (st.k === 'block' && termina(st.body[st.body.length - 1])) || (st.k === 'if' && st.b && termina(st.a) && termina(st.b)));
          const cierraGrupo = () => { if (lastStmt && !termina(lastStmt)) this.warn("este grupo del switch sigue con el siguiente porque le falta un 'break;' (en C no se corta solo)", lastStmt.line); lastStmt = null; };
          for (const it of s.items) {
            if (it.k === 'case') {
              cierraGrupo();
              if (!this.isConstExpr(it.e)) { this.err("después de 'case' tiene que ir un número o un carácter fijo (por ejemplo case 3: o case 'a':), no una variable ni una cuenta", it.line); continue; }
              const ce = this.expr(it.e);
              if (!INTLIKE.has(ce.t)) { this.err("'case' necesita un valor entero: un decimal o un texto no sirve", it.line); continue; }
              const cv = BIG.has(ce.t) ? 'Number(' + this.val(ce) + ')' : this.val(ce);
              let key = null; try { key = Function('return ' + cv)(); } catch (x) { key = null; }
              if (key !== null) { if (seen.has(key)) this.err("el valor 'case " + key + "' está repetido en este switch", it.line); seen.add(key); }
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
      if (ids.every((nm) => !mod.has(nm))) this.warn('en este ' + kind + ' ninguna variable de la condición (' + Array.from(new Set(ids)).join(', ') + ') cambia dentro del bucle: es probable que nunca termine', s.line);
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
      if (c.k === 'assign' && c.op === '=') this.warn("hay una asignación '=' dentro de la condición: ¿querías comparar con '=='?", c.line);
    }
    checkEmptyBody(s, kind) {
      if (s.body.k === 'empty' && !(kind === 'while' && this.hasSideEffect(s.c))) this.warn("el " + kind + " termina en ';' y su cuerpo queda vacío: ¿sobra ese ';'?", s.line);
    }

    zero(t) { return '0'; }
    checkIntDiv(r, to, line) {
      if (r.intdiv && FLOATLIKE.has(to)) this.warn('la división es entre dos enteros y se trunca (7/2 da 3, no 3.5): guardarla en ' + to + ' no recupera los decimales; usá 7/2.0 o (float)7/2', line);
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
          const dimsCode = [];
          let ok = true;
          if (v.init && v.init.k === 'list' && v.dims[0] === null) {
            dimsCode.push(String(v.init.items.length));
          }
          if (v.init && v.init.k === 'str' && v.dims.length === 1 && v.dims[0] === null && (d.type === 'char' || d.type === 'uchar')) dimsCode.push(String(new TextEncoder().encode(v.init.v).length + 1));
          for (let i = 0; i < v.dims.length; i++) {
            if (v.dims[i] === null) { if (!(i === 0 && dimsCode.length)) { this.err('al arreglo le falta el tamaño', v.line); ok = false; } continue; }
            const r = this.expr(v.dims[i]);
            if (!INTLIKE.has(r.t)) { this.err('el tamaño de un arreglo debe ser un entero', v.line); ok = false; }
            else if (this.isConstExpr(v.dims[i])) { let nv = null; try { nv = Function('return ' + this.val(r))(); } catch (x) { nv = null; } if (nv !== null && nv <= 0) { this.err('el tamaño del arreglo tiene que ser mayor que 0 (usaste ' + nv + ')', v.line); ok = false; } }
            dimsCode.push(this.val(r));
          }
          this.declare(v.name, { type: d.type, js, array: true, ndims: v.dims.length, assigned: true, isConst: !!d.const }, v.line);
          if (!ok) { parts.push('let ' + js + '=[];'); continue; }
          let init;
          if (v.init) {
            if (v.init.k === 'str' && v.dims.length === 1 && (d.type === 'char' || d.type === 'uchar')) init = '$.cstr(' + JSON.stringify(v.init.v) + ',' + dimsCode[0] + ')';
            else if (v.init.k !== 'list') { this.err('un arreglo se inicializa con llaves { ... }', v.line); init = '$.mk([1],0)'; }
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
          else { if (global && !this.isConstExpr(v.init)) this.err('el valor inicial de una variable global tiene que ser una constante (un número), no otra variable ni una llamada a función', v.line); const r = this.expr(v.init); this.checkIntDiv(r, d.type, v.line); init = this.conv(r, d.type); assigned = true; }
        }
        if (!global && !hoist && !inFor && !v.init && this.cur) {
          const hj = 'v_' + v.name + '$h' + (++this.sid);
          this.fnHoist.push('let ' + hj + '=' + z0 + ';');
          this.declare(v.name, { type: d.type, js: hj, assigned, scalar: true, global, isConst: !!d.const }, v.line);
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
      if (r.t === 'void') { this.err('esa función no devuelve ningún valor', node.line); return 'false'; }
      return r.b ? r.c : '(' + r.c + (BIG.has(r.t) ? '!==0n)' : '!==0)');
    }
    conv(r, to) {
      if (r.t === 'void') { this.err('esa función no devuelve ningún valor', 0); return '0'; }
      if (r.t === 'str') { this.err('no se puede usar un texto entre comillas como número', 0); return '0'; }
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
        case 'addr': this.err("el operador '&' solo se usa dentro de scanf", n.line); return { c: '0', t: 'int' };
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
        this.undeclErr(n.name, n.line);
        return { c: '0', t: 'int' };
      }
      if (info.array) { this.err("'" + n.name + "' es un arreglo: usá " + n.name + '[i] para acceder a una posición', n.line); return { c: '0', t: 'int' }; }
      if (!info.assigned && !info.warned && !this.inSC && !info.quiet) { info.warned = true; this.warn("'" + n.name + "' se usa antes de darle un valor (en C su valor inicial es basura): asignale un valor inicial, por ejemplo " + n.name + ' = 0;', n.line); }
      return { c: info.js, t: info.type };
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
        if (!INTLIKE.has(r.t)) this.err('el índice de un arreglo debe ser un entero', ix.line || a.line);
        code += '[$.ix(' + this.val(r) + ',' + (inf.rowsVar && k > 0 ? code : lenBase) + '.length,' + a.line + ')]';
        lenBase += '[0]';
      });
      return { c: code };
    }
    hasSideEffect(n) { let r = false; this.walk(n, (x) => { if (x.k === 'call' || x.k === 'assign' || x.k === 'incdec') r = true; }); return r; }
    lvalue(n, forWrite, useTemps) {
      if (n.k === 'id') {
        const info = this.lookup(n.name);
        if (!info) { this.undeclErr(n.name, n.line); return { c: 'v_' + n.name, t: 'int', bad: true }; }
        if (info.array) { this.err("'" + n.name + "' es un arreglo: usá " + n.name + '[i] para acceder a una posición', n.line); return { c: info.js, t: info.type, bad: true }; }
        return { c: info.js, t: info.type, info };
      }
      if (n.k === 'idx') {
        const idxs = []; let b = n;
        while (b.k === 'idx') { idxs.unshift(b.i); b = b.base; }
        if (b.k !== 'id') { this.err('solo se pueden indexar arreglos por su nombre', n.line); return { c: '0', t: 'int', bad: true }; }
        const info = this.lookup(b.name);
        if (!info) { this.err("'" + b.name + "' no está declarada", b.line); return { c: '0', t: 'int', bad: true }; }
        if (!info.array) { this.err("'" + b.name + "' no es un arreglo", b.line); return { c: '0', t: 'int', bad: true }; }
        if (idxs.length !== info.ndims) { this.err("'" + b.name + "' tiene " + info.ndims + ' dimensión(es) y se usó con ' + idxs.length, b.line); return { c: '0', t: 'int', bad: true }; }
        let code = info.js;
        let lenBase = info.js;
        if (useTemps && idxs.some((ix) => this.hasSideEffect(ix))) {
          const id = ++this.ntemp; let cont = info.js, lb = info.js;
          idxs.forEach((ix, k) => {
            const r = this.expr(ix);
            if (!INTLIKE.has(r.t)) this.err('el índice de un arreglo debe ser un entero', ix.line || n.line);
            if (k < idxs.length - 1) { cont += '[$.ix(' + this.val(r) + ',' + lb + '.length,' + n.line + ')]'; lb += '[0]'; }
            else code = '$i' + id + '=$.ix(' + this.val(r) + ',$a' + id + '.length,' + n.line + ')';
          });
          return { c: '$a' + id + '[$i' + id + ']', pre: '$a' + id + '=' + cont + ',' + code, t: info.type, info, arrayElem: true };
        }
        idxs.forEach((ix, k) => {
          const r = this.expr(ix);
          if (!INTLIKE.has(r.t)) this.err('el índice de un arreglo debe ser un entero', ix.line || n.line);
          code += '[$.ix(' + this.val(r) + ',' + (info.rowsVar && k > 0 ? code : lenBase) + '.length,' + n.line + ')]';
          lenBase += '[0]';
        });
        return { c: code, t: info.type, info, arrayElem: true };
      }
      this.err('a la izquierda del = tiene que haber una variable', n.line);
      return { c: '$t', t: 'int', bad: true };
    }
    markAssigned(lv) { const inf = lv.info; if (inf && !inf.assigned) { inf.assigned = true; this.assignLog.push(inf); } }
    asignarLog(desde) { for (const inf of this.assignLog.slice(desde)) inf.assigned = true; }
    desasignar(desde) { for (const inf of this.assignLog.slice(desde)) inf.assigned = false; }
    rootName(n) { while (n && n.k === 'idx') n = n.base; return n && n.name; }
    checkConst(lv, name, line) {
      if (lv.info && lv.info.isConst) this.err("'" + name + "' es const (constante): no se le puede asignar otro valor", line);
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
        if (op === '||' && rn.k === 'num' && rn.v !== 0 && ln.k === 'bin') this.warn("después de '||' hay solo el número " + rn.v + ", que siempre es verdadero: la condición siempre se cumple. Para comparar con dos valores escribí x == 1 || x == 2", line);
        const a = this.cond(ln); this.inSC++; const b = this.cond(rn); this.inSC--;
        return { c: '(' + a + (op === '&&' ? '&&' : '||') + b + ')', t: 'int', b: true };
      }
      const REL = ['<', '>', '<=', '>=', '==', '!='];
      const esRel = (x) => x && x.k === 'bin' && REL.indexOf(x.op) >= 0;
      if ((op === '&' || op === '|') && (esRel(ln) || esRel(rn))) this.warn("usaste '" + op + "' (operación de bits); para " + (op === '&' ? '"y"' : '"o"') + " lógico se escribe '" + op + op + "'", line);
      if (REL.indexOf(op) >= 0 && esRel(ln) && op !== '==' && op !== '!=') this.warn("a < b < c no comprueba un rango: C evalúa primero la comparación de la izquierda (da 0 o 1). Escribilo con &&, por ejemplo: 0 < a && a < 3", line);
      if (op === '^') this.warn("en C, '^' no es potencia (es XOR de bits): 2 ^ 3 da 1. Para potencias usá pow(2, 3) de <math.h>", line);
      const a = this.expr(ln), b = this.expr(rn);
      if (a.t === 'str' || b.t === 'str' || a.t === 'void' || b.t === 'void') {
        this.err(a.t === 'void' || b.t === 'void' ? 'esa función no devuelve ningún valor' : 'no se puede operar con un texto entre comillas', line);
        return { c: '0', t: 'int' };
      }
      if ((op === '/' || op === '%') && rn.k === 'num' && rn.v === 0 && rn.kind !== 'double' && rn.kind !== 'float' && !FLOATLIKE.has(a.t) && !FLOATLIKE.has(b.t)) this.warn('división por cero: el programa se cierra al llegar acá', line);
      const esShift = op === '<<' || op === '>>';
      const ctype = esShift ? arith(a.t, 'int') : arith(a.t, b.t);
      const av = this.conv(a, ctype), bv = esShift ? (BIG.has(ctype) ? this.conv(b, ctype) : this.conv(b, 'int')) : this.conv(b, ctype);
      if (op === '<' || op === '>' || op === '<=' || op === '>=' || op === '==' || op === '!=') {
        if (op === '==' || op === '!=') {
          const entero = (x) => x.k === 'num' && Number.isInteger(x.v);
          const hayFloat = (FLOATLIKE.has(a.t) && !entero(rn)) || (FLOATLIKE.has(b.t) && !entero(ln));
          if (hayFloat) this.warn("comparar un decimal con '" + op + "' puede fallar por redondeo (por ejemplo 0.1 no se guarda exacto): conviene comparar con '<' o '>'", line);
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
          if (FLOATLIKE.has(t)) { this.err("'%' solo funciona con enteros (para decimales usá fmod)", line); return { c: '0', t: 'int' }; }
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
      if (n.op === '=' && n.l.k === 'id') { const inf = this.lookup(n.l.name); if (inf && inf.array) { this.err(inf.type === 'char' ? "a un arreglo de char no se le asigna un texto con '=': para copiar usá strcpy(" + n.l.name + ', "texto");' : "a un arreglo no se le asigna con '=': hay que asignar posición por posición, " + n.l.name + '[i] = valor;', n.line); this.expr(n.r); return { c: '0', t: 'int' }; } }
      const lv = this.lvalue(n.l, true, true);
      this.checkConst(lv, this.rootName(n.l), n.line);
      let valueCode;
      if (n.op === '=') {
        const r = this.expr(n.r);
        if (r.t === 'str') { this.err('los textos (char arrays) todavía no están soportados: solo se usan dentro de printf', n.line); return { c: '0', t: 'int' }; }
        if (r.t === 'void') { this.err('esa función no devuelve ningún valor', n.line); return { c: '0', t: 'int' }; }
        this.checkIntDiv(r, lv.t, n.line);
        valueCode = this.conv(r, lv.t);
      } else {
        if (lv.info && !lv.arrayElem) { if (!lv.info.assigned && !lv.info.warned) { lv.info.warned = true; this.warn("'" + n.l.name + "' se usa antes de darle un valor (en C su valor inicial es basura): asignale un valor inicial, por ejemplo " + n.l.name + ' = 0;', n.line); } }
        const ln = lv.pre ? { k: 'raw', c: lv.c, t: lv.t, line: n.line } : n.l;
        const r = this.binOp(n.op.slice(0, -1), ln, n.r, n.line);
        valueCode = this.conv(r, lv.t);
      }
      if (!lv.bad) this.markAssigned(lv);
      return { c: '(' + (lv.pre ? lv.pre + ',' : '') + lv.c + '=' + valueCode + ')', t: lv.t };
    }
    incdec(n, asStmt) {
      if (n.e.k !== 'id' && n.e.k !== 'idx') { this.err("'" + n.op + "' solo se puede aplicar a una variable", n.line); return { c: '0', t: 'int' }; }
      const lv = this.lvalue(n.e, true, true);
      if (lv.bad) return { c: '0', t: 'int' };
      this.checkConst(lv, this.rootName(n.e), n.line);
      if (lv.info && !lv.arrayElem && !lv.info.assigned && !lv.info.warned) { lv.info.warned = true; this.warn("'" + n.e.name + "' se usa antes de darle un valor (en C su valor inicial es basura): asignale un valor inicial, por ejemplo " + n.e.name + ' = 0;', n.line); }
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
        this.warn('usás ' + name + ' pero falta #include <' + h + '> al principio del programa', line);
      }
    }
    needIncludeConst(nm, line) {
      const h = /^M_/.test(nm) || nm === 'INFINITY' || nm === 'NAN' || nm === 'HUGE_VAL' ? 'math.h' : /^(RAND_MAX|EXIT_SUCCESS|EXIT_FAILURE)$/.test(nm) ? 'stdlib.h' : /^(INT_|UINT_|LONG_|ULONG_|LLONG_|ULLONG_|SHRT_|USHRT_|CHAR_|UCHAR_)/.test(nm) ? 'limits.h' : /^(DBL_|FLT_)/.test(nm) ? 'float.h' : nm === 'CLOCKS_PER_SEC' ? 'time.h' : null;
      if (!h || this.incl.has(h)) return;
      const k = 'inc|' + h; if (this.undeclared.has(k)) return; this.undeclared.add(k);
      this.warn('usás ' + nm + ' pero falta #include <' + h + '> al principio del programa', line);
    }
    call(n) {
      const name = n.name;
      const args = n.args;
      const usr = this.funcs.get(name);
      if (usr && usr.node) return this.callUser(n, name, args);
      this.needInclude(name, n.line);
      const MATH1 = { sqrt: 'Math.sqrt', fabs: 'Math.abs', floor: 'Math.floor', ceil: 'Math.ceil', round: '$.round', trunc: 'Math.trunc', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', asin: 'Math.asin', acos: 'Math.acos', atan: 'Math.atan', exp: 'Math.exp', log: 'Math.log', log10: 'Math.log10', log2: 'Math.log2', cbrt: 'Math.cbrt', sinh: 'Math.sinh', cosh: 'Math.cosh', tanh: 'Math.tanh', asinh: 'Math.asinh', acosh: 'Math.acosh', atanh: 'Math.atanh', exp2: '((x)=>Math.pow(2,x))', expm1: 'Math.expm1', log1p: 'Math.log1p' };
      const mf = /^(sqrt|pow|fabs|sin|cos|tan|asin|acos|atan|atan2|floor|ceil|exp|log|log10|log2|fmod|round|trunc|cbrt|hypot|fmax|fmin)f$/.exec(name);
      if (mf) { const r = this.call({ k: 'call', name: mf[1], args, line: n.line }); return { c: 'Math.fround(' + r.c + ')', t: 'float' }; }
      if (name === 'fprintf' || name === 'fputs' || name === 'putc' || name === 'fputc') {
        const dest = name === 'fprintf' || name === 'fputs' ? (name === 'fprintf' ? args[0] : args[1]) : args[1];
        if (!dest || dest.k !== 'id' || (dest.name !== 'stdout' && dest.name !== 'stderr')) { this.err('los archivos todavía no están soportados: solo se puede escribir en stdout o stderr (la pantalla)', n.line); return { c: '0', t: 'int' }; }
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
        if (args.length !== want) { this.err("'" + name + "' recibe " + want + ' argumento(s)', n.line); return { c: '0', t: 'double' }; }
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
        const SA = (a) => { if (a.k === 'str') return JSON.stringify(a.v); const ca = this.charArr(a); if (ca) return ca.c; this.err("el argumento de '" + name + "' tiene que ser un texto: un arreglo de char o un texto entre comillas", n.line); return '""'; };
        const DA = (a) => { const ca = this.charArr(a); if (ca) return ca.c; this.err("el primer argumento de '" + name + "' tiene que ser un arreglo de char, por ejemplo char texto[50];", n.line); return '[]'; };
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
        if (name === 'gets') return { c: '(await $.gets(' + ds.c + ',' + n.line + '))', t: 'int' };
        const sz = args[1] ? this.val(this.expr(args[1])) : '0';
        return { c: '(await $.fgets(' + ds.c + ',' + sz + ',' + n.line + '))', t: 'int' };
      }
      if (['strchr', 'strrchr', 'strstr', 'strtok', 'strdup', 'memcpy', 'memset', 'memmove', 'strpbrk', 'strspn', 'strcspn'].indexOf(name) >= 0) { this.err("'" + name + "' todavía no está soportada en este editor (trabaja con punteros)", n.line); return { c: '0', t: 'int' }; }
      if (name === 'puts') {
        const ca = args[0] ? this.charArr(args[0]) : null;
        if (ca) return { c: '$.puts(' + ca.c + ')', t: 'int' };
        const pr = args[0] ? this.expr(args[0]) : null;
        if (!pr || pr.t !== 'str') { this.err('puts necesita un texto entre comillas o un arreglo de char', n.line); return { c: '0', t: 'int' }; }
        return { c: '$.puts(' + (pr.dyn ? pr.c : JSON.stringify(args[0].v)) + ')', t: 'int' };
      }
      if (name === 'system' || name === 'fflush' || name === 'setbuf' || name === 'setvbuf') { args.forEach((a) => { if (a.k !== 'str') this.expr(a); }); return { c: '0', t: 'int' }; }
      const CT = { isdigit: ['c>=48&&c<=57', 2048], isalpha: ['(c>=65&&c<=90)||(c>=97&&c<=122)', 1024], isupper: ['c>=65&&c<=90', 256], islower: ['c>=97&&c<=122', 512], isspace: ['c===32||(c>=9&&c<=13)', 8192], isalnum: ['(c>=48&&c<=57)||(c>=65&&c<=90)||(c>=97&&c<=122)', 8], ispunct: ['(c>=33&&c<=47)||(c>=58&&c<=64)||(c>=91&&c<=96)||(c>=123&&c<=126)', 4], isprint: ['c>=32&&c<=126', 16384], isgraph: ['c>=33&&c<=126', 32768], iscntrl: ['(c>=0&&c<=31)||c===127', 2], isxdigit: ['(c>=48&&c<=57)||(c>=65&&c<=70)||(c>=97&&c<=102)', 4096], isblank: ['c===32||c===9', 1] };
      if (own(CT, name)) { const r = this.expr(args[0]); return { c: '((c=>' + CT[name][0] + ')(' + this.conv(r, 'int') + ')?' + CT[name][1] + ':0)', t: 'int' }; }
      if (name === 'toupper') { const r = this.expr(args[0]); return { c: '((c=>c>=97&&c<=122?c-32:c)(' + this.conv(r, 'int') + '))', t: 'int' }; }
      if (name === 'tolower') { const r = this.expr(args[0]); return { c: '((c=>c>=65&&c<=90?c+32:c)(' + this.conv(r, 'int') + '))', t: 'int' }; }

      return this.callUser(n, name, args);
    }
    callUser(n, name, args) {
      const f = this.funcs.get(name);
      if (!f) { const sg = this.suggest(name); this.err("la función '" + name + "' no está declarada" + (sg ? ". ¿Quisiste decir '" + sg + "'? (en C todo va en minúscula y se escribe igual)" : ''), n.line); args.forEach((a) => { if (a.k !== 'str') this.expr(a); }); return { c: '0', t: 'int' }; }
      if (f.node && !f.hasProto && f.node.line > n.line) this.warn("'" + name + "' se usa antes de estar definida: falta el prototipo arriba de main (por ejemplo: " + TNAME[f.ret] + ' ' + name + '(' + (f.params.map((p) => TNAME[p.type]).join(', ') || 'void') + ');)', n.line);
      if (args.length !== f.params.length && !(f.unspec && !f.node)) {
        this.err("la función '" + name + "' recibe " + f.params.length + ' argumento(s) y se la llamó con ' + args.length, n.line);
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
          if (!inf || !inf.array) { this.err("el argumento " + (i + 1) + " de '" + name + "' tiene que ser un arreglo (la función lo pide con [ ])", n.line); return '[]'; }
          if (inf.ndims !== p.dims) this.err("el arreglo '" + x.name + "' tiene " + inf.ndims + ' dimensión(es) pero la función ' + name + ' espera ' + p.dims, n.line);
          return inf.js;
        }
        return this.conv(this.expr(x), p.type);
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
      if (!args.length || args[0].k !== 'str') { this.err('printf necesita un texto entre comillas como primer argumento', n.line); return { c: '0', t: 'int' }; }
      const fmt = args[0].v;
      const specs = this.parseFmt(fmt);
      const vals = [];
      let si = 0;
      const rest = args.slice(1);
      let needed = specs.reduce((s, sp) => s + 1 + (sp.w === '*' ? 1 : 0) + (sp.p === '*' ? 1 : 0), 0);
      if (rest.length < needed) this.warn('printf pide ' + needed + ' valor(es) por los % del texto, pero recibe ' + rest.length, n.line);
      else if (rest.length > needed) this.warn('printf recibe más valores (' + rest.length + ') de los que usan los % del texto (' + needed + ')', n.line);
      const slots = [];
      for (const sp of specs) { if (sp.w === '*') slots.push({ conv: 'w' }); if (sp.p === '*') slots.push({ conv: 'w' }); slots.push(sp); }
      rest.forEach((a, k) => {
        const cat = this.charArr(a);
        if (cat) { vals.push('$.tostr(' + cat.c + ')'); return; }
        const r = this.expr(a);
        if (r.t === 'void') { this.err('esa función no devuelve ningún valor', n.line); vals.push('0'); return; }
        const target = slots[k] || null;
        if (target && target.conv !== 'w') {
          const c = target.conv, t = r.t, d = this.describe(a, k);
          const isInt = INTLIKE.has(t), isFl = FLOATLIKE.has(t);
          if ('diuxXoc'.indexOf(c) >= 0 && isFl) this.warn("printf: '%" + target.len + c + "' espera un entero, pero " + d + ' es ' + t + ": usá '%f' (o '%.2f' para 2 decimales)", n.line);
          else if ('fFeEgG'.indexOf(c) >= 0 && (isInt || t === 'str')) this.warn("printf: '%" + c + "' espera un número decimal, pero " + d + ' es ' + (t === 'str' ? 'un texto' : t === 'char' ? 'char' : 'entero (' + t + ')') + ": usá '%d'", n.line);
          else if (c === 's' && t !== 'str') this.warn("printf: '%s' es para textos (un arreglo de char) y " + d + ' es un número (' + t + "): usá '%d' o '%f'", n.line);
          else if (c === 'c' && isFl) this.warn("printf: '%c' espera un carácter, pero " + d + ' es ' + t, n.line);
          else if ((c === 'd' || c === 'i') && t === 'long' && target.len !== 'l' && target.len !== 'll') this.warn("printf: para un long usá '%ld'", n.line);
          else if (c === 'd' && t === 'str') this.warn("printf: '%d' espera un entero pero recibe un texto", n.line);
          else if (c === 'c' && t === 'str') this.warn("printf: '%c' espera un carácter (entre comillas simples 'a'), no un texto", n.line);
        }
        vals.push(r.t === 'str' ? (r.dyn ? r.c : JSON.stringify(a.v)) : this.val(r));
      });
      const hp = this.hoistArgs(rest, vals);
      const pc = (n.prefix || '$.printf(') + JSON.stringify(fmt) + ',[' + hp.codes.join(',') + '],' + n.line + ')';
      return { c: hp.pre ? '(' + hp.pre + pc + ')' : pc, t: 'int' };
    }
    scanfCall(n) {
      const args = n.args;
      if (!args.length || args[0].k !== 'str') { this.err('scanf necesita un texto entre comillas como primer argumento', n.line); return { c: '0', t: 'int' }; }
      const fmt = args[0].v;
      const specs = this.parseFmt(fmt).filter((s) => !/\*/.test(s.w || ''));
      const refs = [], types = [], pres = [];
      const rest = args.slice(1);
      const sobra = fmt.replace(/%[-+ #0]*(\*|\d+)?(\.\d+)?(hh|h|ll|l|L|z|j|t)?([diouxXfFeEgGcsp%]|\[\^?\]?[^\]]*\])/g, '');
      if (/[A-Za-z]/.test(sobra)) this.warn('el texto del scanf tiene letras que no son de lectura (' + JSON.stringify(sobra.trim()).slice(1, -1) + '): scanf solo lleva los % del dato; el mensaje para el usuario va en un printf aparte', n.line);
      else if (/\n\s*$/.test(fmt)) this.warn("no pongas '\\n' al final del scanf: hace que el programa espere un Enter de más", n.line);
      if (rest.length < specs.length) this.err('scanf pide leer ' + specs.length + ' valor(es) (hay ' + specs.length + " '%') pero solo tiene " + rest.length + " variable(s): falta una variable con '&' (por ejemplo scanf(\"%d %d\", &a, &b);)", n.line);
      else if (rest.length !== specs.length) this.warn('scanf lee ' + specs.length + ' valor(es) por los % del texto, pero recibe ' + rest.length + ' variable(s)', n.line);
      rest.forEach((a, k) => {
        if (specs[k] && (specs[k].conv === 's' || specs[k].conv[0] === '[')) {
          const ca = this.charArr(a.k === 'addr' ? a.e : a);
          if (!ca) { this.err("a '%" + (specs[k].conv === 's' ? 's' : specs[k].conv) + "' le corresponde un arreglo de char (por ejemplo char nombre[30]; scanf(\"%s\", nombre);)", n.line); return; }
          refs.push('[()=>' + ca.c + ']'); types.push('"str"'); return;
        }
        if (a.k !== 'addr') {
          if (a.k === 'id' && this.lookup(a.name) && this.lookup(a.name).scalar) this.err("a scanf le falta el '&' delante de '" + a.name + "' (scanf necesita &" + a.name + ')', n.line);
          else this.err("scanf necesita '&' delante de cada variable", n.line);
          return;
        }
        const lv = this.lvalue(a.e, true, true);
        if (lv.bad) return;
        if (lv.pre) pres.push(lv.pre);
        this.checkConst(lv, this.rootName(a.e), n.line);
        this.markAssigned(lv);
        const sp = specs[k];
        if (sp) {
          const t = lv.t, nm = a.e.k === 'id' ? "'" + a.e.name + "'" : 'la variable';
          const c = sp.conv;
          if ((c === 'd' || c === 'i' || c === 'u') && sp.len === '' && !(t === 'int' || t === 'uint')) {
            if (FLOATLIKE.has(t)) this.warn("scanf: '%" + c + "' lee un entero pero " + nm + ' es ' + t + ": usá '%" + (t === 'float' ? 'f' : 'lf') + "'", n.line);
            else this.warn("scanf: '%" + c + "' no corresponde al tipo " + t + ' de ' + nm, n.line);
          } else if ((c === 'd' || c === 'i') && (sp.len === 'l' || sp.len === 'll') && t !== 'long') this.warn("scanf: '%" + sp.len + c + "' es para long y " + nm + ' es ' + t, n.line);
          else if ('feEgG'.indexOf(c) >= 0) {
            if (sp.len === '' && t === 'double') this.warn("scanf: '%" + c + "' lee un float pero " + nm + " es double: usá '%lf'", n.line);
            else if (sp.len === 'l' && t === 'float') this.warn("scanf: '%l" + c + "' es para double pero " + nm + " es float: usá '%f'", n.line);
            else if (INTLIKE.has(t)) this.warn("scanf: '%" + c + "' lee un decimal pero " + nm + ' es ' + t + ": usá '%d'", n.line);
          } else if (c === 'c' && !(t === 'char' || t === 'int')) this.warn("scanf: '%c' no corresponde al tipo " + t + ' de ' + nm, n.line);
        }
        refs.push('[()=>' + lv.c + ',(v)=>{' + lv.c + '=v}]');
        types.push(JSON.stringify(lv.t));
      });
      const sc = '(await $.scanf(' + JSON.stringify(fmt) + ',[' + refs.join(',') + '],[' + types.join(',') + '],' + n.line + '))';
      return { c: pres.length ? '(' + pres.reverse().join(',') + ',' + sc + ')' : sc, t: 'int' };
    }
  }

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
  function conCodigo(arr, pref) { return arr.map((d) => { let code = pref + 'otro'; for (const [re, c] of CODIGOS) if (re.test(d.msg)) { code = pref + c; break; } return Object.assign({ code }, d); }); }
  function compile(src, opts) {
    const includes = [], defines = new Map();
    includes.avisos = [];
    let toks;
    try {
      toks = tokenize(src, 1, true, includes, defines);
      toks = expandDefines(toks, defines);
      const items = new Parser(toks).program();
      const g = new Gen(items, Object.assign({}, opts, { includes }));
      const js = g.run();
      g.errors.sort((a, b) => a.line - b.line);
      g.warnings.sort((a, b) => a.line - b.line);
      if (g.errors.length) { const el = new Set(g.errors.map((e) => e.line)); g.warnings = g.warnings.filter((w) => !el.has(w.line)); return { js: null, errors: conCodigo(g.errors, 'E-'), warnings: conCodigo(g.warnings, 'W-') }; }
      return { js, errors: [], warnings: conCodigo(g.warnings, 'W-') };
    } catch (e) {
      if (e instanceof CErr) return { js: null, errors: conCodigo([{ line: e.cline, msg: e.message }], 'E-'), warnings: [] };
      throw e;
    }
  }

  const api = { compile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CCompiler = api;
})(typeof self !== 'undefined' ? self : this);

var CC_SRC = "/* Compilador del Editor C: subconjunto de C de la materia -> JavaScript.\n   Entrada: texto C. Salida: { js, errors:[{line,msg}], warnings:[{line,msg}] } */\n(function (root) {\n  'use strict';\n\n  class CErr extends Error { constructor(msg, line) { super(msg); this.cline = line; } }\n\n  const TYPE_KW = new Set(['int', 'float', 'double', 'char', 'void', 'long', 'short', 'unsigned', 'signed', 'const', 'static', 'bool', 'time_t', 'clock_t', 'size_t', 'register', 'volatile', 'auto']);\n  const BIG = new Set(['long', 'ulong']);\n  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);\n  const UNSUPPORTED_KW = { struct: 'struct', union: 'union', enum: 'enum', typedef: 'typedef', goto: 'goto' };\n  const CONSTS = {\n    EOF: [-1, 'int'], NULL: [0, 'int'], RAND_MAX: [2147483647, 'int'], INT_MAX: [2147483647, 'int'],\n    INT_MIN: [-2147483648, 'int'], M_PI: [Math.PI, 'double'], M_E: [Math.E, 'double'], true: [1, 'int'], false: [0, 'int'],\n    stdout: [0, 'int'], stdin: [0, 'int'], stderr: [0, 'int'], CHAR_BIT: [8, 'int'], UINT_MAX: [4294967295, 'uint'],\n    LONG_MAX: [9223372036854775807n, 'long'], LONG_MIN: [-9223372036854775808n, 'long'], ULONG_MAX: [18446744073709551615n, 'ulong'], LLONG_MAX: [9223372036854775807n, 'long'], LLONG_MIN: [-9223372036854775808n, 'long'], ULLONG_MAX: [18446744073709551615n, 'ulong'], CLOCKS_PER_SEC: [1000000n, 'long'],\n    SHRT_MAX: [32767, 'int'], SHRT_MIN: [-32768, 'int'], USHRT_MAX: [65535, 'int'], CHAR_MAX: [127, 'int'], CHAR_MIN: [-128, 'int'], UCHAR_MAX: [255, 'int'],\n    EXIT_SUCCESS: [0, 'int'], EXIT_FAILURE: [1, 'int'], INFINITY: [Infinity, 'float'], NAN: [NaN, 'float'], HUGE_VAL: [Infinity, 'double'],\n    DBL_MAX: [1.7976931348623157e308, 'double'], DBL_MIN: [2.2250738585072014e-308, 'double'], DBL_EPSILON: [2.220446049250313e-16, 'double'],\n    FLT_MAX: [3.4028234663852886e38, 'float'], FLT_MIN: [1.1754943508222875e-38, 'float'], FLT_EPSILON: [1.1920928955078125e-7, 'float'],\n    M_LOG2E: [Math.LOG2E, 'double'], M_LOG10E: [Math.LOG10E, 'double'], M_1_PI: [1 / Math.PI, 'double'], M_2_PI: [2 / Math.PI, 'double'], M_2_SQRTPI: [2 / Math.sqrt(Math.PI), 'double'], M_SQRT1_2: [Math.SQRT1_2, 'double'],\n    FLT_DIG: [6, 'int'], DBL_DIG: [15, 'int'], FLT_MANT_DIG: [24, 'int'], DBL_MANT_DIG: [53, 'int'],\n    M_SQRT2: [Math.SQRT2, 'double'], M_LN2: [Math.LN2, 'double'], M_LN10: [Math.LN10, 'double'], M_PI_2: [Math.PI / 2, 'double'], M_PI_4: [Math.PI / 4, 'double']\n  };\n\n  /* ================= LEXER ================= */\n  function tokenize(text, line0, top, includes, defines) {\n    const out = [];\n    let i = 0, line = line0;\n    const n = text.length;\n    let atStart = true;\n    const cs = []; // pila de #if/#ifdef: { on, taken, par }\n    const active = () => cs.every((x) => x.on);\n    const ppVal = (txt, ln) => {\n      let e = txt.replace(/defined\\s*\\(\\s*(\\w+)\\s*\\)|defined\\s+(\\w+)/g, (_, a, b) => (defines.has(a || b) ? '1' : '0'));\n      e = e.replace(/[A-Za-z_]\\w*/g, (id) => { const b = defines.get(id); return Array.isArray(b) && b.length === 1 && b[0].t === 'num' ? String(b[0].v) : '0'; });\n      e = e.replace(/(\\d)[uUlL]+/g, '$1');\n      if (!/^[\\d\\s+\\-*\\/%()\u003c>=!&|^~?:]*$/.test(e)) throw new CErr('la condición del #if no se entiende', ln);\n      try { return !!Number(Function('return (' + (e.trim() || '0') + ')')()); } catch (x) { throw new CErr('la condición del #if no se entiende', ln); }\n    };\n    const OPS = ['\u003c\u003c=', '>>=', '...', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '==', '!=', '\u003c=', '>=', '&&', '||', '\u003c\u003c', '>>', '->'];\n    while (i \u003c n) {\n      const c = text[i];\n      if (c === '\\n') { line++; i++; atStart = true; continue; }\n      if (c === '\\ufeff' && i === 0) { i++; continue; }\n      if (c === '\\u00a0' || c === '\\u200b' || c === '\\ufeff') throw new CErr('hay un carácter invisible (' + (c === '\\u00a0' ? 'espacio no separable' : c === '\\u200b' ? 'espacio de ancho cero' : 'marca BOM') + ') en esta línea, seguramente por copiar y pegar: borrá el espacio y volvé a escribirlo', line);\n      if (c === '–' || c === '—' || c === '−') throw new CErr(\"el símbolo '\" + c + \"' no es el signo menos de C: escribí '-'\", line);\n      if (c === '×' || c === '÷' || c === '≠' || c === '≤' || c === '≥') throw new CErr(\"el símbolo '\" + c + \"' no existe en C: \" + ({ '×': \"multiplicar es '*'\", '÷': \"dividir es '/'\", '≠': \"distinto es '!='\", '≤': \"menor o igual es '\u003c='\", '≥': \"mayor o igual es '>='\" })[c], line);\n      if (c === ' ' || c === '\\t' || c === '\\r' || c === '\\f' || c === '\\v') { i++; continue; }\n      if (c === '/' && text[i + 1] === '/') { while (i \u003c n && text[i] !== '\\n') i++; continue; }\n      if (c === '/' && text[i + 1] === '*') {\n        const e = text.indexOf('*/', i + 2);\n        if (e \u003c 0) throw new CErr('comentario /* sin cerrar', line);\n        for (let k = i; k \u003c e; k++) if (text[k] === '\\n') line++;\n        i = e + 2; continue;\n      }\n      if (c === '#' && top && atStart) {\n        let j = i, extra = 0;\n        while (j \u003c n && text[j] !== '\\n') { if (text[j] === '\\\\' && text[j + 1] === '\\n') { j += 2; extra++; continue; } j++; }\n        const d = text.slice(i + 1, j).replace(/\\\\\\n/g, ' ');\n        const m = /^\\s*(\\w+)\\s*([\\s\\S]*)$/.exec(d);\n        if (m) {\n          const dir = m[1], arg = m[2].replace(/\\/\\/.*$|\\/\\*.*?\\*\\//g, '').trim();\n          if (dir === 'ifdef' || dir === 'ifndef') {\n            const par = active(); const on = (dir === 'ifdef') === defines.has(arg.split(/\\s/)[0]);\n            cs.push({ on: par && on, taken: on, par });\n          } else if (dir === 'if') {\n            const par = active(); const on = par ? ppVal(arg, line) : false;\n            cs.push({ on, taken: on, par });\n          } else if (dir === 'elif') {\n            const t = cs[cs.length - 1]; if (!t) throw new CErr('#elif sin #if', line);\n            if (t.taken || !t.par) t.on = false; else { const v = ppVal(arg, line); t.on = v; t.taken = v; }\n          } else if (dir === 'else') {\n            const t = cs[cs.length - 1]; if (!t) throw new CErr('#else sin #if', line);\n            t.on = t.par && !t.taken; t.taken = true;\n          } else if (dir === 'endif') {\n            if (!cs.length) throw new CErr('#endif sin #if', line); cs.pop();\n          } else if (!active()) { /* zona descartada */ }\n          else if (dir === 'undef') defines.delete(arg);\n          else if (dir === 'include') { if (/^(\u003c[^>\\s]+>|\"[^\"]+\")$/.test(arg)) includes.push(arg); else includes.avisos.push({ line, msg: 'el #include está mal escrito: tiene que ser #include \u003cstdio.h> (con \u003c y >) o #include \"archivo.h\"' }); }\n          else if (dir === 'pragma' || dir === 'line' || dir === 'warning') { /* se ignora */ }\n          else if (dir === 'error') throw new CErr('#error: ' + arg, line);\n          else if (dir === 'define') {\n            const m2 = /^(\\w+)([\\s\\S]*)$/.exec(m[2]);\n            if (!m2) throw new CErr('#define mal escrito', line);\n            if (m2[2][0] === '(') {\n              const mp = /^\\(([^)]*)\\)\\s*([\\s\\S]*)$/.exec(m2[2]);\n              if (!mp) throw new CErr('#define mal escrito: falta cerrar el paréntesis de los parámetros', line);\n              const params = mp[1].split(',').map((x) => x.trim()).filter((x) => x.length);\n              defines.set(m2[1], { params, body: tokenize(mp[2], line, false, includes, defines) });\n            } else {\n              if (/;\\s*$/.test(m2[2])) includes.avisos.push({ line, msg: \"el #define de \" + m2[1] + \" termina en ';': ese ';' se copia en cada uso y suele causar errores raros. Sacalo\" });\n              defines.set(m2[1], tokenize(m2[2], line, false, includes, defines));\n            }\n          } else includes.avisos.push({ line, msg: \"'#\" + dir + \"' no es una directiva de C\" + (/^(inlcude|incldue|inculde|includ|includes|iclude)$/.test(dir) ? ': ¿quisiste escribir #include?' : (/^(defin|deifne|defne|dfine)$/.test(dir) ? ': ¿quisiste escribir #define?' : ' (los comentarios en C empiezan con // o /* */)')) });\n        }\n        i = j; line += extra; continue;\n      }\n      if (!active()) { while (i \u003c n && text[i] !== '\\n') i++; continue; }\n      atStart = false;\n      if (/[A-Za-z_]/.test(c)) {\n        let j = i + 1; while (j \u003c n && /[A-Za-z0-9_]/.test(text[j])) j++;\n        out.push({ t: 'id', v: text.slice(i, j), line }); i = j; continue;\n      }\n      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(text[i + 1] || ''))) {\n        const m = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?)[fFlLuU]*/.exec(text.slice(i, i + 64));\n        let s = m[0]; i += s.length;\n        let v, kind, big;\n        const esHex = /^0[xX]/.test(s), esBin = /^0[bB]/.test(s);\n        const body0 = s.replace(/[fFlLuU]+$/, '');\n        if (!esHex && !esBin && /[.eE]/.test(body0)) {\n          const isF = /[fF]$/.test(s);\n          v = parseFloat(body0); kind = isF ? 'float' : 'double'; if (isF) v = Math.fround(v);\n        } else {\n          const suf = (/[uUlL]*$/.exec(s)[0]).toLowerCase();\n          const bd = s.slice(0, s.length - suf.length);\n          let digits = bd, radix = 10;\n          if (esHex) { radix = 16; digits = bd.slice(2); }\n          else if (esBin) { radix = 2; digits = bd.slice(2); }\n          else if (bd.length > 1 && bd[0] === '0') {\n            if (!/^[0-7]+$/.test(bd)) throw new CErr(\"el número '\" + bd + \"' no es válido: los números que empiezan con 0 son octales (solo dígitos del 0 al 7)\", line);\n            radix = 8; digits = bd.slice(1);\n          }\n          if (!(radix === 16 ? /^[0-9a-fA-F]+$/ : radix === 2 ? /^[01]+$/ : /^[0-9]+$/).test(digits)) throw new CErr(\"el número '\" + s + \"' no es válido: un entero no lleva letras (para un decimal escribí 5.0f o 5.0)\", line);\n          big = BigInt((radix === 16 ? '0x' : radix === 8 ? '0o' : radix === 2 ? '0b' : '') + digits);\n          const u = suf.indexOf('u') >= 0, l = suf.indexOf('l') >= 0;\n          const I = 0x7fffffffn, U = 0xffffffffn, L = 0x7fffffffffffffffn;\n          if (!u && !l) kind = big \u003c= I ? 'int' : (radix !== 10 && big \u003c= U) ? 'uint' : big \u003c= L ? 'long' : 'ulong';\n          else if (u && !l) kind = big \u003c= U ? 'uint' : 'ulong';\n          else if (!u && l) kind = big \u003c= L ? 'long' : 'ulong';\n          else kind = 'ulong';\n          v = Number(big);\n        }\n        out.push({ t: 'num', v, kind, big, line }); continue;\n      }\n      if (c === '\"') {\n        let j = i + 1, s = '';\n        while (j \u003c n && text[j] !== '\"') {\n          if (text[j] === '\\\\' && text[j + 1] === '\\n') { j += 2; line++; continue; }\n          if (text[j] === '\\n') throw new CErr('cadena sin cerrar (falta la comilla \")', line);\n          if (text[j] === '\\\\') { const r = esc(text, j); s += r[0]; j = r[1]; } else s += text[j++];\n        }\n        if (j >= n) throw new CErr('cadena sin cerrar (falta la comilla \")', line);\n        out.push({ t: 'str', v: s, line }); i = j + 1; continue;\n      }\n      if (c === \"'\") {\n        let j = i + 1, s;\n        if (text[j] === '\\\\') { const r = esc(text, j); s = r[0]; j = r[1]; } else { s = text[j++]; }\n        if (text[j] !== \"'\") throw new CErr(\"carácter con comillas simples mal escrito (usá 'a' con un solo carácter)\", line);\n        out.push({ t: 'num', v: s.charCodeAt(0), kind: 'int', line }); i = j + 1; continue;\n      }\n      let op = null;\n      for (const o of OPS) if (text.startsWith(o, i)) { op = o; break; }\n      if (!op && '+-*/%=\u003c>!&|^~?:;,.(){}[]'.indexOf(c) >= 0) op = c;\n      if (c === '\\\\') throw new CErr(\"carácter no válido '\\\\': si querías escribir un texto, ponelo entre comillas, por ejemplo printf(\\\"Hola\\\\n\\\");\", line);\n      if (c === '“' || c === '”' || c === '‘' || c === '’') throw new CErr(\"las comillas tipográficas \" + c + \" no sirven en C: usá las comillas rectas \" + (c === '“' || c === '”' ? '\"' : \"'\"), line);\n      if (!op) throw new CErr(\"carácter no válido '\" + c + \"'\", line);\n      out.push({ t: 'op', v: op, line }); i += op.length;\n    }\n    if (cs.length) throw new CErr('falta el #endif de un #if / #ifdef', line);\n    return out;\n  }\n  function esc(text, j) { // text[j] === '\\\\'\n    const c = text[j + 1];\n    if (c >= '0' && c \u003c= '7') { const mo = /^[0-7]{1,3}/.exec(text.slice(j + 1)); return [String.fromCharCode(parseInt(mo[0], 8) & 255), j + 1 + mo[0].length]; }\n    if (c === 'e' || c === 'E') return ['\\x1b', j + 2];\n    const map = { n: '\\n', t: '\\t', r: '\\r', a: '\\x07', b: '\\b', f: '\\f', v: '\\v', '\\\\': '\\\\', '\"': '\"', \"'\": \"'\", '?': '?' };\n    if (c === 'x') { const m = /^[0-9a-fA-F]{1,2}/.exec(text.slice(j + 2)); if (m) return [String.fromCharCode(parseInt(m[0], 16)), j + 2 + m[0].length]; }\n    if (c in map) return [map[c], j + 2];\n    return [c, j + 2];\n  }\n  const t0line = (arr) => (arr && arr[0] && arr[0].line) || 1;\n  function expandDefines(toks, defines) {\n    if (!defines.size) return toks;\n    const out = []; let trabajo = 0;\n    const go = (arr, depth, line) => {\n      for (let i = 0; i \u003c arr.length; i++) {\n        if (++trabajo > 1500000) throw new CErr('las macros se expanden demasiado (más de un millón de elementos): ¿una macro se llama a sí misma?', line || t0line(arr));\n        const t = arr[i];\n        const d = t.t === 'id' && depth \u003c 12 ? defines.get(t.v) : undefined;\n        if (d && Array.isArray(d)) { go(d, depth + 1, t.line); continue; }\n        if (d && arr[i + 1] && arr[i + 1].t === 'op' && arr[i + 1].v === '(') {\n          const args = []; let cur = [], lvl = 0, j = i + 2;\n          for (; j \u003c arr.length; j++) {\n            const x = arr[j];\n            if (x.t === 'op' && x.v === '(') lvl++;\n            if (x.t === 'op' && x.v === ')') { if (lvl === 0) break; lvl--; }\n            if (x.t === 'op' && x.v === ',' && lvl === 0) { args.push(cur); cur = []; continue; }\n            cur.push(x);\n          }\n          if (j >= arr.length) throw new CErr(\"a la macro '\" + t.v + \"' le falta cerrar el paréntesis\", t.line);\n          if (cur.length || args.length) args.push(cur);\n          if (args.length !== d.params.length) throw new CErr(\"la macro '\" + t.v + \"' recibe \" + d.params.length + ' argumento(s) y se la usó con ' + args.length, t.line);\n          const eargs = args.map((a) => expandDefines(a, defines));\n          const sub = [];\n          for (const b of d.body) { const k = b.t === 'id' ? d.params.indexOf(b.v) : -1; if (k >= 0) for (const x of eargs[k]) sub.push(Object.assign({}, x, { line: t.line })); else sub.push(Object.assign({}, b, { line: t.line })); }\n          go(sub, depth + 1, t.line); i = j; continue;\n        }\n        out.push(depth ? Object.assign({}, t, { line: line }) : t);\n      }\n    };\n    go(toks, 0, 0);\n    return out;\n  }\n\n  /* ================= PARSER ================= */\n  class Parser {\n    constructor(toks) { this.t = toks; this.p = 0; this.lastLine = toks.length ? toks[toks.length - 1].line : 1; }\n    peek(k) { return this.t[this.p + (k || 0)] || { t: 'eof', v: '\u003cfin del archivo>', line: this.lastLine }; }\n    next() { const t = this.peek(); this.p++; return t; }\n    prevLine() { return this.p > 0 ? this.t[this.p - 1].line : 1; }\n    isOp(v, k) { const t = this.peek(k); return t.t === 'op' && t.v === v; }\n    isId(v, k) { const t = this.peek(k); return t.t === 'id' && t.v === v; }\n    accept(v) { if (this.isOp(v)) { this.p++; return true; } return false; }\n    expect(v) {\n      if (this.isOp(v)) return this.next();\n      const t = this.peek();\n      const line = (v === ';' || v === ')' || v === ']') && t.line > this.prevLine() ? this.prevLine() : t.line;\n      const found = t.t === 'eof' ? 'el final del archivo' : \"'\" + t.v + \"'\";\n      if (t.t === 'id' && (t.v === 'and' || t.v === 'or' || t.v === 'not')) throw new CErr(\"en C la \\\"y\\\" lógica es '&&', la \\\"o\\\" es '||' y el \\\"no\\\" es '!' (no se escribe '\" + t.v + \"')\", t.line);\n      if (v === ';' && t.t === 'id' && (t.v === 'then' || t.v === 'endif' || t.v === 'end')) throw new CErr(\"'\" + t.v + \"' no existe en C: el cuerpo del if va entre llaves { }\", t.line);\n      if (v === ';') throw new CErr(\"falta un ';' al final de esta línea (antes de \" + found + ')', line);\n      throw new CErr(\"se esperaba '\" + v + \"' pero se encontró \" + found, line);\n    }\n    ident() {\n      const t = this.peek();\n      if (t.t !== 'id') throw new CErr('se esperaba un nombre pero se encontró ' + (t.t === 'eof' ? 'el final del archivo' : \"'\" + t.v + \"'\"), t.line);\n      if (TYPE_KW.has(t.v) || RESERVED.has(t.v)) throw new CErr(\"'\" + t.v + \"' es una palabra reservada, no puede usarse como nombre\", t.line);\n      return this.next();\n    }\n    isTypeStart(k) { const t = this.peek(k); return t.t === 'id' && TYPE_KW.has(t.v); }\n    checkUnsupported() {\n      const t = this.peek();\n      if (t.t === 'id' && own(UNSUPPORTED_KW, t.v)) throw new CErr(\"'\" + t.v + \"' todavía no está soportado en este editor\", t.line);\n    }\n    typeSpec() {\n      let seen = false, base = null, uns = false, longs = 0, shorts = false;\n      this.sawStatic = false; this.sawConst = false;\n      while (this.peek().t === 'id' && TYPE_KW.has(this.peek().v)) {\n        const v = this.next().v; seen = true;\n        if (v === 'unsigned') uns = true;\n        else if (v === 'long') longs++;\n        else if (v === 'short') shorts = true;\n        else if (v === 'static') this.sawStatic = true;\n        else if (v === 'const') this.sawConst = true;\n        else if (v === 'register' || v === 'volatile' || v === 'auto') { /* se ignoran */ }\n        else if (v === 'signed') { /* ignorar */ }\n        else base = v;\n      }\n      if (!seen) return null;\n      if (base === 'time_t' || base === 'clock_t') return 'long';\n      if (base === 'size_t') return 'ulong';\n      if (base === 'double' && longs > 0) throw new CErr('long double todavía no está soportado en este editor: usá double', this.peek().line);\n      if (base === 'double') return 'double';\n      if (base === 'float') return 'float';\n      if (base === 'char') return uns ? 'uchar' : 'char';\n      if (base === 'void') return 'void';\n      if (base === 'bool') return 'bool';\n      if (shorts) return uns ? 'ushort' : 'short';\n      if (longs > 0) return uns ? 'ulong' : 'long';\n      if (uns) return 'uint';\n      return 'int';\n    }\n\n    program() {\n      const items = [];\n      while (this.peek().t !== 'eof') {\n        this.checkUnsupported();\n        const line = this.peek().line;\n        let type = this.typeSpec();\n        if (type === null) {\n          // función sin tipo (ej. main() ) = int implícito\n          if (this.peek().t === 'id' && this.isOp('(', 1)) { const a2 = this.peek(2); if (a2.t === 'str' || a2.t === 'num') throw new CErr('esta instrucción está fuera de una función: va adentro de main() { ... }', this.peek().line); type = 'int'; }\n          else {\n            const t = this.peek();\n            throw new CErr(\"no se entiende '\" + t.v + \"' fuera de una función\", t.line);\n          }\n        }\n        const cn = this.sawConst;\n        let ptrTok = false;\n        if (this.isOp('*')) {\n          if (type === 'char' || type === 'uchar') { this.next(); ptrTok = true; }\n          else throw new CErr('los punteros todavía no están soportados en este editor (solo char * para textos)', this.peek().line);\n        }\n        const nameTok = this.ident();\n        if (this.isOp('{')) throw new CErr(\"a '\" + nameTok.v + \"' le faltan los paréntesis: \" + nameTok.v + '() { ... }', nameTok.line);\n        if (this.isOp('(')) { if (ptrTok) throw new CErr('las funciones que devuelven char * (un puntero) todavía no están soportadas en este editor', nameTok.line); items.push(this.funcRest(type, nameTok, line)); }\n        else { this.p--; if (ptrTok) this.p--; const d = this.declRest(type, line); d.const = cn; items.push(d); }\n      }\n      return items;\n    }\n    funcRest(ret, nameTok, line) {\n      this.expect('(');\n      const params = []; let vacioVoid = false;\n      if (this.isId('void') && this.isOp(')', 1)) { this.next(); vacioVoid = true; }\n      else if (!this.isOp(')')) {\n        for (;;) {\n          const pt = this.typeSpec();\n          if (!pt || pt === 'void') throw new CErr('parámetro mal escrito: se esperaba un tipo (int, float, ...)', this.peek().line);\n          let pdims = 0;\n          if (this.isOp('*')) {\n            if (pt === 'char' || pt === 'uchar') { this.next(); pdims = 1; if (this.isOp('*')) { this.next(); pdims = 2; if (this.isOp('*')) throw new CErr('tres niveles de punteros no están soportados en este editor', this.peek().line); } }\n            else throw new CErr('los punteros todavía no están soportados en este editor (solo char * para textos)', this.peek().line);\n          }\n          const pn = (this.isOp(',') || this.isOp(')') || this.isOp('[')) ? { v: null, line: this.peek().line } : this.ident();\n          while (this.accept('[')) { if (!this.isOp(']')) this.assign(); this.expect(']'); pdims++; }\n          params.push({ name: pn.v, type: pt, line: pn.line, array: pdims > 0, dims: pdims });\n          if (!this.accept(',')) break;\n        }\n      }\n      this.expect(')');\n      const sinParams = params.length === 0 && !vacioVoid;\n      if (this.accept(';')) return { k: 'proto', name: nameTok.v, ret, params, line, unspec: sinParams };\n      const sinNombre = params.find((p) => p.name === null);\n      if (sinNombre) throw new CErr('al definir la función falta el nombre de un parámetro', sinNombre.line);\n      const body = this.block();\n      return { k: 'func', name: nameTok.v, ret, params, body, line, unspec: sinParams };\n    }\n    declRest(type, line) {\n      if (type === 'void') throw new CErr('una variable no puede ser de tipo void', line);\n      const vars = [];\n      for (;;) {\n        let ptr = false;\n        if (this.isOp('*')) {\n          if (type === 'char' || type === 'uchar') { this.next(); ptr = true; if (this.isOp('*')) throw new CErr('los punteros a punteros todavía no están soportados en este editor', this.peek().line); }\n          else throw new CErr('los punteros todavía no están soportados en este editor (solo char * con un texto entre comillas)', this.peek().line);\n        }\n        const nt = this.ident();\n        const dims = [];\n        while (this.accept('[')) {\n          if (this.isOp(']')) dims.push(null); else dims.push(this.assign());\n          this.expect(']');\n        }\n        let init = null;\n        if (this.accept('=')) init = this.isOp('{') ? this.initList() : this.assign();\n        vars.push({ name: nt.v, dims, init, ptr, line: nt.line });\n        if (!this.accept(',')) break;\n      }\n      this.expect(';');\n      return { k: 'decl', type, vars, line };\n    }\n    initList() {\n      const line = this.expect('{').line;\n      const items = [];\n      while (!this.isOp('}')) {\n        items.push(this.isOp('{') ? this.initList() : this.assign());\n        if (!this.accept(',')) break;\n      }\n      this.expect('}');\n      return { k: 'list', items, line };\n    }\n\n    block() {\n      const line = this.expect('{').line;\n      const body = [];\n      while (!this.isOp('}')) {\n        if (this.peek().t === 'eof') throw new CErr(\"falta cerrar la llave '{' abierta en la línea \" + line, this.prevLine());\n        body.push(this.stmt());\n      }\n      const close = this.expect('}');\n      return { k: 'block', body, line, end: close.line };\n    }\n    stmt() {\n      const t = this.peek();\n      const line = t.line;\n      this.checkUnsupported();\n      if (this.isOp('{')) return this.block();\n      if (this.isOp(';')) { this.next(); return { k: 'empty', line }; }\n      if (this.isTypeStart()) { const type = this.typeSpec(); const st = this.sawStatic, cn = this.sawConst; const d = this.declRest(type, line); d.static = st; d.const = cn; return d; }\n      if (t.t === 'id' && (t.v === 'elseif' || t.v === 'elif') && this.isOp('(', 1)) throw new CErr(\"'\" + t.v + \"' no existe en C: se escribe 'else if (condición)'\", line);\n      if (t.t === 'id' && !RESERVED.has(t.v) && !TYPE_KW.has(t.v) && this.peek(1).t === 'id' && !RESERVED.has(this.peek(1).v) && !TYPE_KW.has(this.peek(1).v)) {\n        const tipos = ['int', 'float', 'double', 'char', 'void', 'long', 'short', 'unsigned'];\n        const lev = (a, b) => { const d = []; for (let i = 0; i \u003c= a.length; i++) d[i] = [i]; for (let j = 1; j \u003c= b.length; j++) d[0][j] = j; for (let i = 1; i \u003c= a.length; i++) for (let j = 1; j \u003c= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };\n        let best = null, bd = 99; for (const ty of tipos) { const dd = lev(t.v.toLowerCase(), ty); if (dd \u003c bd) { bd = dd; best = ty; } }\n        if (t.v === 'string') throw new CErr(\"en C no existe 'string': para un carácter usá char (los textos completos todavía no están soportados en este editor)\", line);\n        if (bd \u003c= 2) throw new CErr(\"'\" + t.v + \"' no es un tipo de C: ¿quisiste escribir '\" + best + \"'? (C distingue mayúsculas y minúsculas)\", line);\n        throw new CErr(\"no se entiende '\" + t.v + ' ' + this.peek(1).v + \"': ¿falta un operador, un ';' o es un tipo mal escrito?\", line);\n      }\n      if (t.t === 'id') {\n        switch (t.v) {\n          case 'if': {\n            this.next(); this.expect('('); const c = this.expr(); this.expect(')');\n            const a = this.stmt(); let b = null;\n            if (this.isId('else')) { this.next(); if (this.isOp('(')) throw new CErr(\"después de 'else' no va una condición: si querías otra condición escribí 'else if (…)'\", this.peek().line); b = this.stmt(); }\n            return { k: 'if', c, a, b, line };\n          }\n          case 'while': {\n            this.next(); this.expect('('); const c = this.expr(); this.expect(')');\n            return { k: 'while', c, body: this.stmt(), line };\n          }\n          case 'do': {\n            this.next(); const body = this.stmt();\n            if (!this.isId('while')) throw new CErr(\"falta 'while' después del cuerpo del do\", this.peek().line);\n            this.next(); this.expect('('); const c = this.expr(); this.expect(')'); this.expect(';');\n            return { k: 'do', c, body, line };\n          }\n          case 'for': {\n            this.next(); this.expect('(');\n            let init = null;\n            if (this.isOp(';')) this.next();\n            else if (this.isTypeStart()) { const type = this.typeSpec(); init = this.declRest(type, line); }\n            else { init = { k: 'expr', e: this.expr(), line }; this.expect(';'); }\n            let c = null; if (!this.isOp(';')) c = this.expr(); this.expect(';');\n            let step = null; if (!this.isOp(')')) step = this.expr(); this.expect(')');\n            return { k: 'for', init, c, step, body: this.stmt(), line };\n          }\n          case 'return': {\n            this.next(); let e = null;\n            if (!this.isOp(';')) e = this.expr();\n            this.expect(';');\n            return { k: 'return', e, line };\n          }\n          case 'break': this.next(); this.expect(';'); return { k: 'break', line };\n          case 'continue': this.next(); this.expect(';'); return { k: 'continue', line };\n          case 'switch': {\n            this.next(); this.expect('('); const e = this.expr(); this.expect(')');\n            this.expect('{');\n            const items = [];\n            while (!this.isOp('}')) {\n              if (this.peek().t === 'eof') throw new CErr('falta cerrar la llave del switch', this.prevLine());\n              if (this.isId('case')) { const l = this.next().line; const ce = this.ternary(); this.expect(':'); items.push({ k: 'case', e: ce, line: l }); }\n              else if (this.isId('default')) { const l = this.next().line; this.expect(':'); items.push({ k: 'default', line: l }); }\n              else items.push(this.stmt());\n            }\n            this.expect('}');\n            return { k: 'switch', e, items, line };\n          }\n          case 'else': throw new CErr(\"'else' sin su 'if' (revisá las llaves y los ';')\", line);\n          case 'case': case 'default': throw new CErr(\"'\" + t.v + \"' fuera de un switch\", line);\n        }\n      }\n      const e = this.expr();\n      this.expect(';');\n      return { k: 'expr', e, line };\n    }\n\n    expr() {\n      let e = this.assign();\n      while (this.isOp(',')) { const line = this.next().line; e = { k: 'comma', l: e, r: this.assign(), line }; }\n      return e;\n    }\n    assign() {\n      const l = this.ternary();\n      const t = this.peek();\n      if (t.t === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '\u003c\u003c=', '>>='].indexOf(t.v) >= 0) {\n        this.next();\n        const r = this.assign();\n        return { k: 'assign', op: t.v, l, r, line: t.line };\n      }\n      return l;\n    }\n    ternary() {\n      const c = this.binary(0);\n      if (this.isOp('?')) {\n        const line = this.next().line;\n        const a = this.expr(); this.expect(':'); const b = this.ternary();\n        return { k: 'cond', c, a, b, line };\n      }\n      return c;\n    }\n    binary(minPrec) {\n      let l = this.unary();\n      for (;;) {\n        const t = this.peek();\n        if (t.t !== 'op') break;\n        const prec = PREC[t.v];\n        if (prec === undefined || prec \u003c minPrec) break;\n        this.next();\n        const r = this.binary(prec + 1);\n        l = { k: 'bin', op: t.v, l, r, line: t.line };\n      }\n      return l;\n    }\n    unary() {\n      const t = this.peek();\n      if (t.t === 'op') {\n        if (t.v === '++' || t.v === '--') { this.next(); return { k: 'incdec', op: t.v, prefix: true, e: this.unary(), line: t.line }; }\n        if (t.v === '-' || t.v === '+' || t.v === '!' || t.v === '~') { this.next(); return { k: 'un', op: t.v, e: this.unary(), line: t.line }; }\n        if (t.v === '&') { this.next(); return { k: 'addr', e: this.unary(), line: t.line }; }\n        if (t.v === '*') { const pv = this.t[this.p - 1]; if (pv && pv.t === 'op' && pv.v === '*') throw new CErr(\"en C no existe '**' (potencia): usá pow(base, exponente) de \u003cmath.h>\", t.line); throw new CErr('los punteros todavía no están soportados en este editor', t.line); }\n        if (t.v === '(' && this.isTypeStart(1)) {\n          this.next(); const type = this.typeSpec();\n          if (this.isOp('*')) throw new CErr('los punteros todavía no están soportados en este editor', this.peek().line);\n          this.expect(')');\n          return { k: 'cast', type, e: this.unary(), line: t.line };\n        }\n      }\n      if (t.t === 'id' && t.v === 'sizeof') {\n        this.next();\n        if (this.isOp('(') && this.isTypeStart(1)) { this.next(); const type = this.typeSpec(); this.expect(')'); return { k: 'sizeof', type, line: t.line }; }\n        return { k: 'sizeof', e: this.unary(), line: t.line };\n      }\n      return this.postfix();\n    }\n    postfix() {\n      let e = this.primary();\n      for (;;) {\n        const t = this.peek();\n        if (t.t !== 'op') break;\n        if (t.v === '[') { this.next(); const i = this.expr(); this.expect(']'); e = { k: 'idx', base: e, i, line: t.line }; }\n        else if (t.v === '(') {\n          if (e.k !== 'id') throw new CErr('solo se pueden llamar funciones por su nombre', t.line);\n          this.next(); const args = [];\n          if (!this.isOp(')')) { for (;;) { args.push(this.assign()); if (!this.accept(',')) break; } }\n          this.expect(')');\n          e = { k: 'call', name: e.name, args, line: t.line };\n        } else if (t.v === '++' || t.v === '--') { this.next(); e = { k: 'incdec', op: t.v, prefix: false, e, line: t.line }; }\n        else if (t.v === '.' || t.v === '->') throw new CErr('struct / punteros todavía no están soportados en este editor', t.line);\n        else break;\n      }\n      return e;\n    }\n    primary() {\n      const t = this.next();\n      if (t.t === 'num') return { k: 'num', v: t.v, kind: t.kind, big: t.big, line: t.line };\n      if (t.t === 'str') {\n        let s = t.v;\n        while (this.peek().t === 'str') s += this.next().v;\n        return { k: 'str', v: s, line: t.line };\n      }\n      if (t.t === 'id') {\n        if (TYPE_KW.has(t.v)) throw new CErr(\"no se esperaba el tipo '\" + t.v + \"' acá (¿falta un ';' antes?)\", t.line);\n        if (RESERVED.has(t.v)) throw new CErr(\"no se esperaba '\" + t.v + \"' acá\", t.line);\n        return { k: 'id', name: t.v, line: t.line };\n      }\n      if (t.t === 'op' && t.v === '(') { const e = this.expr(); this.expect(')'); return e; }\n      const found = t.t === 'eof' ? 'el final del archivo' : \"'\" + t.v + \"'\";\n      const line = t.t === 'eof' ? this.prevLine() : t.line;\n      const ant = this.t[this.p - 2];\n      if (t.t === 'op' && t.v === '>' && ant && ant.t === 'op' && ant.v === '\u003c') throw new CErr(\"en C \\\"distinto\\\" se escribe '!=' (no '\u003c>')\", line);\n      if (t.t === 'op' && t.v === '>' && ant && ant.t === 'op' && ant.v === '=') throw new CErr(\"\\\"mayor o igual\\\" se escribe '>=' (no '=>')\", line);\n      if (t.t === 'op' && t.v === '=' && ant && ant.t === 'op' && ant.v === '\u003c') throw new CErr(\"\\\"menor o igual\\\" se escribe '\u003c=' (no '=\u003c')\", line);\n      throw new CErr('falta una expresión antes de ' + found, line);\n    }\n  }\n  const RESERVED = new Set(['if', 'else', 'while', 'do', 'for', 'return', 'break', 'continue', 'switch', 'case', 'default', 'sizeof', 'struct', 'union', 'enum', 'typedef', 'goto']);\n  const PREC = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '\u003c': 7, '>': 7, '\u003c=': 7, '>=': 7, '\u003c\u003c': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };\n\n  /* ================= GENERADOR ================= */\n  const INTLIKE = new Set(['int', 'uint', 'long', 'ulong', 'char', 'uchar', 'short', 'ushort', 'bool']);\n  const FLOATLIKE = new Set(['float', 'double']);\n  function arith(a, b) {\n    if (a === 'short' || a === 'ushort' || a === 'uchar' || a === 'bool') a = 'int';\n    if (b === 'short' || b === 'ushort' || b === 'uchar' || b === 'bool') b = 'int';\n    if (a === 'double' || b === 'double') return 'double';\n    if (a === 'float' || b === 'float') return 'float';\n    if (a === 'ulong' || b === 'ulong') return 'ulong';\n    if (a === 'long' || b === 'long') return 'long';\n    if (a === 'uint' || b === 'uint') return 'uint';\n    return 'int';\n  }\n  const TNAME = { int: 'int', uint: 'unsigned', long: 'long', ulong: 'unsigned long', char: 'char', bool: 'bool', uchar: 'unsigned char', short: 'short', ushort: 'unsigned short', float: 'float', double: 'double' };\n\n  class Gen {\n    constructor(items, opts) {\n      this.items = items;\n      this.opts = opts || {};\n      this.errors = []; this.warnings = [];\n      this.funcs = new Map();\n      this.scopes = [new Map()];\n      this.cur = null;\n      this.seenW = new Set();\n      this.hoisted = []; this.sid = 0;\n      this.ntemp = 0; this.fnHoist = []; this.assignLog = []; this.curLine = 1; this.loopDepth = 0; this.switchDepth = 0; this.undeclared = new Set(); this.inSC = 0;\n      this.incl = new Set((this.opts.includes || []).map((h) => h.replace(/^[\u003c\"]|[>\"]$/g, '')));\n    }\n    err(msg, line) { this.errors.push({ line: line || this.curLine, msg }); }\n    warn(msg, line) { line = line || this.curLine; const k = line + '|' + msg; if (this.seenW.has(k)) return; this.seenW.add(k); this.warnings.push({ line, msg }); }\n    push() { this.scopes.push(new Map()); }\n    pop() { this.scopes.pop(); }\n    declare(name, info, line) {\n      const sc = this.scopes[this.scopes.length - 1];\n      if (sc.has(name)) { this.err(\"'\" + name + \"' ya fue declarada antes en este bloque\", line); }\n      sc.set(name, info);\n    }\n    undeclErr(name, line) {\n      if (this.undeclared.has(name)) return; this.undeclared.add(name);\n      const sug = this.suggest(name);\n      this.err(\"'\" + name + \"' no está declarada\" + (sug ? \". ¿Quisiste decir '\" + sug + \"'? (C distingue mayúsculas y minúsculas)\" : ' (¿falta declararla o está mal escrita?)'), line);\n    }\n    suggest(name) {\n      if (name.length > 40) return null;\n      const cand = new Set();\n      for (const sc of this.scopes) for (const k of sc.keys()) cand.add(k);\n      for (const k of this.funcs.keys()) cand.add(k);\n      for (const k of ['printf', 'scanf', 'sqrt', 'pow', 'fabs', 'floor', 'ceil', 'abs', 'rand', 'srand', 'getchar', 'putchar', 'puts', 'toupper', 'tolower', 'strlen', 'strcpy', 'strcmp', 'strcat', 'sprintf', 'fgets']) cand.add(k);\n      const lev = (a, b) => { const d = []; for (let i = 0; i \u003c= a.length; i++) { d[i] = [i]; } for (let j = 1; j \u003c= b.length; j++) d[0][j] = j; for (let i = 1; i \u003c= a.length; i++) for (let j = 1; j \u003c= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };\n      let best = null, bd = 99;\n      let nc = 0;\n      for (const c of cand) { if (c === name || Math.abs(c.length - name.length) > 3) continue; if (++nc > 400) break; const dist = c.toLowerCase() === name.toLowerCase() ? 0 : lev(name.toLowerCase(), c.toLowerCase()); const lim = name.length \u003c= 5 ? 1 : 2; if (dist \u003c= lim && dist \u003c bd) { bd = dist; best = c; } }\n      return best;\n    }\n    lookup(name) {\n      for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) return this.scopes[i].get(name);\n      return null;\n    }\n\n    checkIncludes() {\n      for (const a of ((this.opts.includes && this.opts.includes.avisos) || [])) this.warn(a.msg, a.line);\n      const ok = ['stdio.h', 'math.h', 'stdlib.h', 'string.h', 'ctype.h', 'time.h', 'limits.h', 'stdbool.h', 'conio.h', 'float.h', 'stdint.h', 'stddef.h', 'assert.h', 'errno.h', 'locale.h', 'stdarg.h', 'inttypes.h', 'signal.h'];\n      for (const h of (this.opts.includes || [])) {\n        const nm = h.replace(/^[\u003c\"]|[>\"]$/g, '');\n        if (nm === 'conio.h') this.warn(\"\u003cconio.h> solo existe en Windows (Code::Blocks): en Programiz y OnlineGDB no compila. Para esperar una tecla usá getchar() o scanf\", 1);\n        else if (ok.indexOf(nm) \u003c 0) {\n          const sg = nm === 'studio.h' || nm === 'stdoi.h' || nm === 'stido.h' || nm === 'stdio' ? 'stdio.h' : (nm === 'maths.h' || nm === 'math' ? 'math.h' : null);\n          this.warn('no se conoce la biblioteca \u003c' + nm + '>' + (sg ? ': ¿quisiste escribir \u003c' + sg + '>?' : ''), 1);\n        }\n      }\n    }\n    run() {\n      this.checkIncludes();\n      // 1) firmas de funciones\n      for (const it of this.items) {\n        if (it.k === 'func' || it.k === 'proto') {\n          const prev = this.funcs.get(it.name);\n          if (prev && prev.node && it.k === 'func') { this.err(\"la función '\" + it.name + \"' está definida dos veces\", it.line); continue; }\n          if (prev) {\n            const dif = [];\n            if (prev.ret !== it.ret) dif.push('devuelve ' + TNAME[prev.ret] + ' en una y ' + TNAME[it.ret] + ' en la otra');\n            if (!prev.unspec && !it.unspec && prev.params.length !== it.params.length) dif.push('una tiene ' + prev.params.length + ' parámetro(s) y la otra ' + it.params.length);\n            else if (!prev.unspec && !it.unspec && prev.params.some((p, i) => p.type !== it.params[i].type || !!p.array !== !!it.params[i].array)) dif.push('los tipos de los parámetros no coinciden');\n            if (dif.length) this.err(\"el prototipo y la definición de '\" + it.name + \"' no coinciden: \" + dif.join('; '), it.line);\n          }\n          if (!prev || it.k === 'func') this.funcs.set(it.name, { name: it.name, ret: it.ret, params: it.params, node: it.k === 'func' ? it : (prev && prev.node), hasProto: it.k === 'proto' || !!(prev && prev.hasProto), unspec: !!it.unspec || !!(prev && prev.unspec), line: it.line, async: false, calls: new Set(), reads: false });\n        }\n      }\n      if (!this.funcs.has('main')) this.err(\"no hay función main(): el programa empieza en 'main() { ... }'\", 1);\n      // 2) async: funciones que llegan a scanf/getchar\n      for (const f of this.funcs.values()) if (f.node) this.scan(f.node.body, f);\n      const llamadas = new Set();\n      for (const f of this.funcs.values()) if (f.node) for (const c of f.calls) llamadas.add(c);\n      for (const f of this.funcs.values()) if (!f.node && llamadas.has(f.name)) this.err(\"la función '\" + f.name + \"' se declara y se usa pero nunca se define\", f.line);\n      let ch = true;\n      while (ch) { ch = false; for (const f of this.funcs.values()) if (!f.async) for (const c of f.calls) { const g = this.funcs.get(c); if (g && g.async) { f.async = true; ch = true; break; } } }\n      if (this.opts.yieldLoops) for (const f of this.funcs.values()) f.async = true;\n      // 3) código\n      const out = ['const $={printf:$rt.printf,puts:$rt.puts,putchar:$rt.putchar,scanf:$rt.scanf,getchar:$rt.getchar,idiv:$rt.idiv,imod:$rt.imod,ix:$rt.ix,d2i:$rt.d2i,mk:$rt.mk,pad:$rt.pad,init:$rt.init,rand:$rt.rand,srand:$rt.srand,time:$rt.time,exit:$rt.exit,round:$rt.round,rint:$rt.rint,fmod:$rt.fmod,lop:$rt.lop,ldiv:$rt.ldiv,lmod:$rt.lmod,f2l:$rt.f2l,f2ul:$rt.f2ul,clock:$rt.clock,yield:$rt.yield,cstr:$rt.cstr,tostr:$rt.tostr,strlen:$rt.strlen,strcpy:$rt.strcpy,strncpy:$rt.strncpy,strcat:$rt.strcat,strncat:$rt.strncat,strcmp:$rt.strcmp,strncmp:$rt.strncmp,atoi:$rt.atoi,atol:$rt.atol,atof:$rt.atof,sprintf:$rt.sprintf,snprintf:$rt.snprintf,fgets:$rt.fgets,gets:$rt.gets};', 'let $t;let $y=0;'];\n      for (const it of this.items) if (it.k === 'decl') out.push(this.declCode(it, true));\n      const fcs = [];\n      for (const it of this.items) if (it.k === 'func') fcs.push(this.funcCode(it));\n      for (const h of this.hoisted) out.push(h);\n      for (const f of fcs) out.push(f);\n      out.push('return f_main;');\n      return out.join('\\n');\n    }\n    // recorre el AST buscando llamadas\n    scan(node, f) {\n      if (!node || typeof node !== 'object') return;\n      if (Array.isArray(node)) { for (const n of node) this.scan(n, f); return; }\n      if (node.k === 'call') {\n        if (node.name === 'scanf' || node.name === 'getchar' || node.name === 'getch' || node.name === 'getche' || node.name === 'fgets' || node.name === 'gets') f.async = true;\n        f.calls.add(node.name);\n      }\n      for (const key in node) if (key !== 'line' && typeof node[key] === 'object') this.scan(node[key], f);\n    }\n\n    funcCode(f) {\n      const info = this.funcs.get(f.name);\n      this.cur = info; this.ntemp = 0; this.fnHoist = [];\n      this.push();\n      const ps = [];\n      for (const p of f.params) { this.declare(p.name, p.array ? { type: p.type, js: 'v_' + p.name, assigned: true, array: true, ndims: p.dims, param: true } : { type: p.type, js: 'v_' + p.name, assigned: true, scalar: true }, p.line); ps.push('v_' + p.name); }\n      const body = this.stmtList(f.body.body);\n      this.pop();\n      if (info.ret !== 'void' && f.name !== 'main' && !this.alwaysReturns(f.body)) this.warn(\"la función '\" + f.name + \"' puede terminar sin ejecutar 'return' en algún caso: en C devuelve un valor basura. Agregá un return al final\", f.body.end || f.line);\n      this.cur = null;\n      const tail = f.name === 'main' ? '\\nreturn 0;' : '';\n      if (f.name === 'main') ps.forEach((q, i) => { ps[i] = i === 0 ? q + '=1' : i === 1 ? q + '=[$.cstr(\"./a.out\")]' : q; });\n      let temps = ''; for (let i = 1; i \u003c= this.ntemp; i++) temps += 'let $a' + i + ',$i' + i + ';';\n      return (info.async ? 'async ' : '') + 'function f_' + f.name + '(' + ps.join(',') + '){let $t;' + temps + this.fnHoist.join('') + '\\n' + body + tail + '\\n}';\n    }\n    stmtList(arr) { return arr.map((s) => this.stmt(s)).join('\\n'); }\n    stmt(s) {\n      if (s.line) this.curLine = s.line;\n      switch (s.k) {\n        case 'block': { this.push(); const b = this.stmtList(s.body); this.pop(); return '{\\n' + b + '\\n}'; }\n        case 'empty': return ';';\n        case 'decl': return this.declCode(s, false);\n        case 'expr': {\n          const ek = s.e.k;\n          if ((ek === 'bin' || ek === 'un' || ek === 'id' || ek === 'num' || ek === 'cond' || ek === 'idx') && !this.hasSideEffect(s.e)) {\n            if (ek === 'bin' && s.e.op === '==') this.warn(\"esta sentencia compara pero no guarda el resultado: no hace nada. ¿Querías asignar con '='?\", s.line);\n            else this.warn('esta sentencia no hace nada: el resultado de la cuenta no se guarda en ninguna variable', s.line);\n          }\n          return this.expr(s.e, true).c + ';';\n        }\n        case 'if': {\n          this.checkCondAssign(s.c);\n          const c = this.cond(s.c);\n          const sa = this.assignLog.length;\n          this.push(); const a = this.stmt(s.a); this.pop();\n          const logA = this.assignLog.slice(sa); const sb = this.assignLog.length;\n          const hechasA = logA.filter((i) => i.assigned);\n          if (s.a.k === 'empty') this.warn(\"el if termina en ';' y su cuerpo queda vacío: lo que sigue se ejecuta siempre. ¿Sobra ese ';'?\", s.line);\n          if (s.b && s.b.k === 'empty') this.warn(\"el else termina en ';' y su cuerpo queda vacío\", s.line);\n          let r = 'if (' + c + ') ' + this.wrap(a);\n          for (const inf of logA) { inf.assigned = false; if (hechasA.indexOf(inf) >= 0) inf.quiet = true; }\n          if (s.b) { this.push(); r += ' else ' + this.wrap(this.stmt(s.b)); this.pop(); }\n          const logB = this.assignLog.slice(sb);\n          const hechasB = logB.filter((i) => i.assigned);\n          for (const inf of logA) inf.quiet = false;\n          const tA = this.terminaStmt(s.a), tB = !!s.b && this.terminaStmt(s.b);\n          for (const inf of new Set(logA.concat(logB))) {\n            const enA = hechasA.indexOf(inf) >= 0, enB = hechasB.indexOf(inf) >= 0;\n            if (tA && tB) inf.assigned = true;\n            else if (tA) inf.assigned = enB;\n            else if (tB) inf.assigned = enA;\n            else inf.assigned = !!s.b && enA && enB;\n          }\n          return r;\n        }\n        case 'while': {\n          this.checkCondAssign(s.c);\n          const c = this.cond(s.c);\n          const sw = this.assignLog.length;\n          this.push(); const b = this.bodyStmt(s.body); this.pop();\n          this.asignarLog(sw);\n          this.checkEmptyBody(s, 'while'); this.checkLoop(s, 'while');\n          return 'while (' + c + ') ' + this.loopWrap(b);\n        }\n        case 'do': { const sd = this.assignLog.length; this.push(); const b = this.bodyStmt(s.body); this.pop(); this.asignarLog(sd); this.checkCondAssign(s.c); this.checkLoop(s, 'do-while'); return 'do ' + this.loopWrap(b) + ' while (' + this.cond(s.c) + ');'; }\n        case 'for': {\n          this.push();\n          let init = '';\n          if (s.init) init = s.init.k === 'decl' ? this.declCode(s.init, false, true) : this.expr(s.init.e, true).c;\n          if (s.c) this.checkCondAssign(s.c);\n          const c = s.c ? this.cond(s.c) : '';\n          const sf = this.assignLog.length;\n          const b = this.bodyStmt(s.body);\n          const st = s.step ? this.expr(s.step, true).c : '';\n          this.asignarLog(sf);\n          this.pop();\n          this.checkEmptyBody(s, 'for'); this.checkLoop(s, 'for');\n          return 'for (' + init + ';' + c + ';' + st + ') ' + this.loopWrap(b);\n        }\n        case 'return': {\n          const rt = this.cur.ret;\n          if (!s.e) { if (rt !== 'void') this.warn(\"'return' sin valor en una función que devuelve \" + TNAME[rt], s.line); return 'return' + (this.cur.name === 'main' ? ' 0' : '') + ';'; }\n          if (rt === 'void') { this.err('una función void no puede devolver un valor', s.line); this.expr(s.e); return 'return;'; }\n          const r = this.expr(s.e);\n          this.checkIntDiv(r, rt, s.line);\n          return 'return ' + this.conv(r, rt) + ';';\n        }\n        case 'break': if (!this.loopDepth && !this.switchDepth) this.err(\"'break' solo se puede usar dentro de un for, while, do-while o switch\", s.line); return 'break;';\n        case 'continue': if (!this.loopDepth) this.err(\"'continue' solo se puede usar dentro de un for, while o do-while\", s.line); return 'continue;';\n        case 'switch': {\n          const e = this.expr(s.e);\n          if (!INTLIKE.has(e.t)) this.err('el switch necesita un valor entero', s.line);\n          if (s.items.length && s.items[0].k !== 'case' && s.items[0].k !== 'default') this.err(\"dentro de un switch las instrucciones tienen que ir después de un 'case' o 'default'\", s.items[0].line || s.line);\n          this.push(); this.switchDepth++;\n          let out = 'switch (' + (BIG.has(e.t) ? 'Number(' + this.val(e) + ')' : this.val(e)) + ') {\\n';\n          const seen = new Set(); let hasDefault = false; let lastStmt = null;\n          const termina = (st) => !!st && (st.k === 'break' || st.k === 'return' || st.k === 'continue' || (st.k === 'expr' && st.e.k === 'call' && st.e.name === 'exit') || (st.k === 'block' && termina(st.body[st.body.length - 1])) || (st.k === 'if' && st.b && termina(st.a) && termina(st.b)));\n          const cierraGrupo = () => { if (lastStmt && !termina(lastStmt)) this.warn(\"este grupo del switch sigue con el siguiente porque le falta un 'break;' (en C no se corta solo)\", lastStmt.line); lastStmt = null; };\n          for (const it of s.items) {\n            if (it.k === 'case') {\n              cierraGrupo();\n              if (!this.isConstExpr(it.e)) { this.err(\"después de 'case' tiene que ir un número o un carácter fijo (por ejemplo case 3: o case 'a':), no una variable ni una cuenta\", it.line); continue; }\n              const ce = this.expr(it.e);\n              if (!INTLIKE.has(ce.t)) { this.err(\"'case' necesita un valor entero: un decimal o un texto no sirve\", it.line); continue; }\n              const cv = BIG.has(ce.t) ? 'Number(' + this.val(ce) + ')' : this.val(ce);\n              let key = null; try { key = Function('return ' + cv)(); } catch (x) { key = null; }\n              if (key !== null) { if (seen.has(key)) this.err(\"el valor 'case \" + key + \"' está repetido en este switch\", it.line); seen.add(key); }\n              out += 'case ' + cv + ':\\n';\n            } else if (it.k === 'default') {\n              cierraGrupo();\n              if (hasDefault) this.err(\"ya hay un 'default' en este switch (solo puede haber uno)\", it.line);\n              hasDefault = true; out += 'default:\\n';\n            } else { out += this.stmt(it) + '\\n'; lastStmt = it; }\n          }\n          this.switchDepth--; this.pop();\n          return out + '}';\n        }\n      }\n      throw new Error('stmt ' + s.k);\n    }\n    terminaStmt(st) {\n      if (!st) return false;\n      switch (st.k) {\n        case 'break': case 'return': case 'continue': return true;\n        case 'expr': return st.e.k === 'call' && st.e.name === 'exit';\n        case 'block': return st.body.some((x) => this.terminaStmt(x));\n        case 'if': return !!st.b && this.terminaStmt(st.a) && this.terminaStmt(st.b);\n        default: return false;\n      }\n    }\n    alwaysReturns(st) {\n      if (!st) return false;\n      switch (st.k) {\n        case 'return': return true;\n        case 'block': return st.body.some((x) => this.alwaysReturns(x));\n        case 'if': return !!st.b && this.alwaysReturns(st.a) && this.alwaysReturns(st.b);\n        case 'while': return this.esVerdadero(st.c) && !this.breakPropio(st.body);\n        case 'do': return this.alwaysReturns(st.body) || (this.esVerdadero(st.c) && !this.breakPropio(st.body));\n        case 'expr': return st.e.k === 'call' && st.e.name === 'exit';\n        case 'for': return (!st.c || this.esVerdadero(st.c)) && !this.breakPropio(st.body);\n        case 'switch': return st.items.some((x) => x.k === 'default') && st.items.some((x) => this.alwaysReturns(x)) && !st.items.some((x) => this.hasBreak(x));\n        default: return false;\n      }\n    }\n    hasBreak(n) {\n      if (!n || typeof n !== 'object') return false;\n      if (Array.isArray(n)) return n.some((x) => this.hasBreak(x));\n      if (n.k === 'break') return true;\n      for (const k in n) if (k !== 'line' && typeof n[k] === 'object' && this.hasBreak(n[k])) return true;\n      return false;\n    }\n    esVerdadero(c) { return !!c && ((c.k === 'num' && c.v !== 0) || (c.k === 'id' && c.name === 'true' && !this.lookup('true'))); }\n    breakPropio(n) {\n      if (!n || typeof n !== 'object') return false;\n      if (Array.isArray(n)) return n.some((x) => this.breakPropio(x));\n      if (n.k === 'break') return true;\n      if (n.k === 'while' || n.k === 'do' || n.k === 'for' || n.k === 'switch') return false;\n      for (const k in n) if (k !== 'line' && typeof n[k] === 'object' && this.breakPropio(n[k])) return true;\n      return false;\n    }\n    walk(n, fn) {\n      if (!n || typeof n !== 'object') return;\n      if (Array.isArray(n)) { n.forEach((x) => this.walk(x, fn)); return; }\n      if (n.k) fn(n);\n      for (const k in n) if (k !== 'line' && typeof n[k] === 'object') this.walk(n[k], fn);\n    }\n    rootId(n) { while (n && n.k === 'idx') n = n.base; return n && n.k === 'id' ? n.name : null; }\n    checkLoop(s, kind) {\n      const body = s.body, cond = s.c;\n      let salida = false; const mod = new Set(); const calls = [];\n      const scan = (n) => this.walk(n, (x) => {\n        if (x.k === 'break' || x.k === 'return') salida = true;\n        if (x.k === 'call') { if (['exit', 'scanf', 'getchar', 'getch', 'getche', 'fgets', 'gets'].indexOf(x.name) >= 0) salida = true; else if (this.funcs.has(x.name)) { salida = true; } }\n        if (x.k === 'assign') { const r = this.rootId(x.l); if (r) mod.add(r); }\n        if (x.k === 'incdec') { const r = this.rootId(x.e); if (r) mod.add(r); }\n        if (x.k === 'addr') { const r = this.rootId(x.e); if (r) mod.add(r); }\n      });\n      scan(body); if (s.step) scan(s.step); scan(cond);\n      if (salida) return;\n      const siempre = !cond || this.esVerdadero(cond);\n      if (siempre) { this.warn(kind + ' sin condición de corte y sin \\'break\\' ni \\'return\\' adentro: el bucle no termina nunca', s.line); return; }\n      const ids = []; let conCall = false;\n      this.walk(cond, (x) => { if (x.k === 'id') ids.push(x.name); if (x.k === 'call') conCall = true; });\n      if (conCall || !ids.length) return;\n      if (ids.every((nm) => !mod.has(nm))) this.warn('en este ' + kind + ' ninguna variable de la condición (' + Array.from(new Set(ids)).join(', ') + ') cambia dentro del bucle: es probable que nunca termine', s.line);\n    }\n    bodyStmt(b) { this.loopDepth++; const r = this.stmt(b); this.loopDepth--; return r; }\n    isConstExpr(n) {\n      if (n.k === 'num') return true;\n      if (n.k === 'un') return this.isConstExpr(n.e);\n      if (n.k === 'bin') return this.isConstExpr(n.l) && this.isConstExpr(n.r);\n      if (n.k === 'cast') return this.isConstExpr(n.e);\n      if (n.k === 'sizeof') return true;\n      if (n.k === 'cond') return this.isConstExpr(n.c) && this.isConstExpr(n.a) && this.isConstExpr(n.b);\n      if (n.k === 'id') return own(CONSTS, n.name) && !this.lookup(n.name);\n      return false;\n    }\n    wrap(c) { return c.startsWith('{') ? c : '{\\n' + c + '\\n}'; }\n    loopWrap(c) {\n      const w = this.wrap(c);\n      if (!this.opts.yieldLoops) return w;\n      return '{if(++$y>100000){$y=0;await $.yield();}' + w.slice(1);\n    }\n    checkCondAssign(c) {\n      if (c.k === 'assign' && c.op === '=') this.warn(\"hay una asignación '=' dentro de la condición: ¿querías comparar con '=='?\", c.line);\n    }\n    checkEmptyBody(s, kind) {\n      if (s.body.k === 'empty' && !(kind === 'while' && this.hasSideEffect(s.c))) this.warn(\"el \" + kind + \" termina en ';' y su cuerpo queda vacío: ¿sobra ese ';'?\", s.line);\n    }\n\n    zero(t) { return '0'; }\n    checkIntDiv(r, to, line) {\n      if (r.intdiv && FLOATLIKE.has(to)) this.warn('la división es entre dos enteros y se trunca (7/2 da 3, no 3.5): guardarla en ' + to + ' no recupera los decimales; usá 7/2.0 o (float)7/2', line);\n    }\n\n    declCode(d, global, inFor) {\n      const parts = [];\n      const hoist = d.static && !global && !inFor;\n      for (const v of d.vars) {\n        const js = hoist ? 'v_' + v.name + '$s' + (++this.sid) : ((!global && this.lookup(v.name)) ? 'v_' + v.name + '$o' + (++this.sid) : 'v_' + v.name);\n        if (v.ptr && !v.dims.length) {\n          const alias = v.init && v.init.k === 'id' ? this.lookup(v.init.name) : null;\n          let cod = null;\n          if (v.init && v.init.k === 'str') cod = '$.cstr(' + JSON.stringify(v.init.v) + ')';\n          else if (alias && alias.array && alias.type === 'char' && alias.ndims === 1) cod = alias.js;\n          if (cod === null) { this.err('los punteros todavía no están soportados: char * solo se puede usar con un texto entre comillas (char *nombre = \"texto\";) o con un arreglo de char', v.line); this.declare(v.name, { type: 'char', js, array: true, ndims: 1, assigned: true }, v.line); parts.push('let ' + js + '=[0];'); continue; }\n          this.declare(v.name, { type: 'char', js, array: true, ndims: 1, assigned: true, ptrStr: true }, v.line);\n          parts.push('let ' + js + '=' + cod + ';');\n          continue;\n        }\n        if (v.ptr && v.dims.length === 1) {\n          const it = v.init && v.init.k === 'list' ? v.init.items : null;\n          if (!it || !it.every((x) => x.k === 'str')) { this.err('un arreglo de char * se inicializa con textos entre comillas: char *nombres[] = {\"ana\", \"luis\"};', v.line); this.declare(v.name, { type: 'char', js, array: true, ndims: 2, assigned: true, rowsVar: true }, v.line); parts.push('let ' + js + '=[[0]];'); continue; }\n          let n0 = it.length;\n          if (v.dims[0]) { const r0 = this.expr(v.dims[0]); try { n0 = Function('return ' + this.val(r0))(); } catch (x) { n0 = it.length; } }\n          const filas = it.map((x) => '$.cstr(' + JSON.stringify(x.v) + ')'); for (let q = it.length; q \u003c n0; q++) filas.push('[0]');\n          this.declare(v.name, { type: 'char', js, array: true, ndims: 2, assigned: true, rowsVar: true, ptrStr: true }, v.line);\n          parts.push('let ' + js + '=[' + filas.join(',') + '];');\n          continue;\n        }\n        if (v.dims.length) {\n          const dimsCode = [];\n          let ok = true;\n          if (v.init && v.init.k === 'list' && v.dims[0] === null) {\n            dimsCode.push(String(v.init.items.length));\n          }\n          if (v.init && v.init.k === 'str' && v.dims.length === 1 && v.dims[0] === null && (d.type === 'char' || d.type === 'uchar')) dimsCode.push(String(new TextEncoder().encode(v.init.v).length + 1));\n          for (let i = 0; i \u003c v.dims.length; i++) {\n            if (v.dims[i] === null) { if (!(i === 0 && dimsCode.length)) { this.err('al arreglo le falta el tamaño', v.line); ok = false; } continue; }\n            const r = this.expr(v.dims[i]);\n            if (!INTLIKE.has(r.t)) { this.err('el tamaño de un arreglo debe ser un entero', v.line); ok = false; }\n            else if (this.isConstExpr(v.dims[i])) { let nv = null; try { nv = Function('return ' + this.val(r))(); } catch (x) { nv = null; } if (nv !== null && nv \u003c= 0) { this.err('el tamaño del arreglo tiene que ser mayor que 0 (usaste ' + nv + ')', v.line); ok = false; } }\n            dimsCode.push(this.val(r));\n          }\n          this.declare(v.name, { type: d.type, js, array: true, ndims: v.dims.length, assigned: true, isConst: !!d.const }, v.line);\n          if (!ok) { parts.push('let ' + js + '=[];'); continue; }\n          let init;\n          if (v.init) {\n            if (v.init.k === 'str' && v.dims.length === 1 && (d.type === 'char' || d.type === 'uchar')) init = '$.cstr(' + JSON.stringify(v.init.v) + ',' + dimsCode[0] + ')';\n            else if (v.init.k !== 'list') { this.err('un arreglo se inicializa con llaves { ... }', v.line); init = '$.mk([1],0)'; }\n            else init = '$.init(' + this.listCode(v.init, d.type, v.dims.length, dimsCode[dimsCode.length - 1]) + ',[' + dimsCode.join(',') + '],' + (BIG.has(d.type) ? '0n' : '0') + ',' + v.line + ')';\n          } else init = '$.mk([' + dimsCode.join(',') + '],' + (BIG.has(d.type) ? '0n' : '0') + ',' + v.line + ')';\n          parts.push('let ' + js + '=' + init + ';');\n          continue;\n        }\n        const z0 = BIG.has(d.type) ? '0n' : '0';\n        let init = z0;\n        let assigned = global || hoist;\n        if (v.init) {\n          if (v.init.k === 'list') { this.err(\"'\" + v.name + \"' no es un arreglo, no se inicializa con llaves\", v.line); }\n          else { if (global && !this.isConstExpr(v.init)) this.err('el valor inicial de una variable global tiene que ser una constante (un número), no otra variable ni una llamada a función', v.line); const r = this.expr(v.init); this.checkIntDiv(r, d.type, v.line); init = this.conv(r, d.type); assigned = true; }\n        }\n        if (!global && !hoist && !inFor && !v.init && this.cur) {\n          const hj = 'v_' + v.name + '$h' + (++this.sid);\n          this.fnHoist.push('let ' + hj + '=' + z0 + ';');\n          this.declare(v.name, { type: d.type, js: hj, assigned, scalar: true, global, isConst: !!d.const }, v.line);\n          continue;\n        }\n        this.declare(v.name, { type: d.type, js, assigned, scalar: true, global, isConst: !!d.const }, v.line);\n        parts.push((inFor ? '' : 'let ') + js + '=' + init + (inFor ? '' : ';'));\n      }\n      if (inFor) return 'let ' + parts.join(',');\n      if (hoist) { this.hoisted.push(parts.join('\\n')); return ''; }\n      return parts.join('\\n');\n    }\n    listCode(l, type, depth, rowLen) {\n      return '[' + l.items.map((it) => {\n        if (it.k === 'str' && (type === 'char' || type === 'uchar') && rowLen !== undefined) return '$.cstr(' + JSON.stringify(it.v) + ',' + rowLen + ')';\n        if (it.k === 'list') return this.listCode(it, type, depth - 1, rowLen);\n        const r = this.expr(it); return this.conv(r, type);\n      }).join(',') + ']';\n    }\n\n    /* ----- conversiones ----- */\n    val(r) { return r.b ? '(' + r.c + '?1:0)' : r.c; }\n    cond(node) {\n      const r = this.expr(node);\n      if (r.t === 'void') { this.err('esa función no devuelve ningún valor', node.line); return 'false'; }\n      return r.b ? r.c : '(' + r.c + (BIG.has(r.t) ? '!==0n)' : '!==0)');\n    }\n    conv(r, to) {\n      if (r.t === 'void') { this.err('esa función no devuelve ningún valor', 0); return '0'; }\n      if (r.t === 'str') { this.err('no se puede usar un texto entre comillas como número', 0); return '0'; }\n      const v = this.val(r);\n      const f = r.t;\n      if (f === to) return v;\n      if (BIG.has(f)) {\n        switch (to) {\n          case 'bool': return '(' + v + '!==0n?1:0)';\n          case 'double': return 'Number(' + v + ')';\n          case 'float': return 'Math.fround(Number(' + v + '))';\n          case 'long': return 'BigInt.asIntN(64,' + v + ')';\n          case 'ulong': return 'BigInt.asUintN(64,' + v + ')';\n          case 'int': return 'Number(BigInt.asIntN(32,' + v + '))';\n          case 'uint': return 'Number(BigInt.asUintN(32,' + v + '))';\n          case 'char': return 'Number(BigInt.asIntN(8,' + v + '))';\n          case 'uchar': return 'Number(BigInt.asUintN(8,' + v + '))';\n          case 'short': return 'Number(BigInt.asIntN(16,' + v + '))';\n          case 'ushort': return 'Number(BigInt.asUintN(16,' + v + '))';\n        }\n        return v;\n      }\n      if (BIG.has(to)) {\n        if (FLOATLIKE.has(f)) return (to === 'long' ? '$.f2l(' : '$.f2ul(') + v + ')';\n        if (to === 'long' || f === 'uint' || f === 'uchar' || f === 'ushort') return 'BigInt(' + v + ')';\n        return 'BigInt.asUintN(64,BigInt(' + v + '))';\n      }\n      switch (to) {\n        case 'bool': return '(' + v + '!==0?1:0)';\n        case 'double': return v;\n        case 'float': return 'Math.fround(' + v + ')';\n        case 'int': return FLOATLIKE.has(f) ? '$.d2i(' + v + ')' : (f === 'char' || f === 'uchar' || f === 'short' || f === 'ushort' || f === 'bool' ? v : '(' + v + '|0)');\n        case 'uint': return FLOATLIKE.has(f) ? 'Number(BigInt.asUintN(32,$.f2l(' + v + ')))' : '(' + v + '>>>0)';\n        case 'char': return FLOATLIKE.has(f) ? '($.d2i(' + v + ')\u003c\u003c24>>24)' : '(' + v + '\u003c\u003c24>>24)';\n        case 'uchar': return FLOATLIKE.has(f) ? '($.d2i(' + v + ')&255)' : '(' + v + '&255)';\n        case 'short': return FLOATLIKE.has(f) ? '($.d2i(' + v + ')\u003c\u003c16>>16)' : '(' + v + '\u003c\u003c16>>16)';\n        case 'ushort': return FLOATLIKE.has(f) ? '($.d2i(' + v + ')&65535)' : '(' + v + '&65535)';\n      }\n      return v;\n    }\n    wrapInt(t, c) {\n      switch (t) {\n        case 'int': return '((' + c + ')|0)';\n        case 'uint': return '((' + c + ')>>>0)';\n        case 'float': return 'Math.fround(' + c + ')';\n        case 'long': return 'BigInt.asIntN(64,' + c + ')';\n        case 'ulong': return 'BigInt.asUintN(64,' + c + ')';\n        default: return '(' + c + ')';\n      }\n    }\n\n    /* ----- expresiones ----- */\n    expr(n, asStmt) {\n      if (n.line) this.curLine = n.line;\n      switch (n.k) {\n        case 'raw': return { c: n.c, t: n.t };\n        case 'num': return { c: (n.kind === 'long' || n.kind === 'ulong') ? n.big + 'n' : (n.v \u003c 0 ? '(' + n.v + ')' : String(n.v)), t: n.kind };\n        case 'str': return { c: JSON.stringify(n.v), t: 'str' };\n        case 'id': return this.idRead(n);\n        case 'comma': { const a = this.expr(n.l, true); const b = this.expr(n.r, asStmt); return { c: '(' + a.c + ',' + b.c + ')', t: b.t, b: b.b }; }\n        case 'un': return this.unaryOp(n);\n        case 'bin': return this.binOp(n.op, n.l, n.r, n.line);\n        case 'assign': return this.assignOp(n);\n        case 'cond': {\n          const c = this.cond(n.c);\n          const a = this.expr(n.a), b = this.expr(n.b);\n          if (a.t === 'str' && b.t === 'str') { const sc = (x, nd) => (x.dyn ? x.c : JSON.stringify(nd.v)); return { c: '(' + c + '?' + sc(a, n.a) + ':' + sc(b, n.b) + ')', t: 'str', dyn: true }; }\n          if (a.t === 'str' || b.t === 'str' || a.t === 'void' || b.t === 'void') { this.err('los dos lados del ?: deben ser números', n.line); return { c: '0', t: 'int' }; }\n          const t = arith(a.t, b.t);\n          return { c: '(' + c + '?' + this.conv(a, t) + ':' + this.conv(b, t) + ')', t };\n        }\n        case 'cast': {\n          const r = this.expr(n.e);\n          if (n.type === 'void') return { c: '(' + r.c + ',0)', t: 'int' };\n          return { c: this.conv(r, n.type), t: n.type };\n        }\n        case 'sizeof': {\n          const sz = { int: 4, uint: 4, long: 8, char: 1, uchar: 1, bool: 1, short: 2, ushort: 2, ulong: 8, float: 4, double: 8, void: 1 };\n          if (n.type) return { c: String(sz[n.type]), t: 'int' };\n          if (n.e.k === 'id') { const info = this.lookup(n.e.name); if (info && info.scalar) return { c: String(sz[info.type]), t: 'int' }; if (info && info.array) { if (info.param || info.ptrStr) return { c: '8', t: 'int' }; let mul = info.js + '.length'; if (info.ndims === 2) mul += '*' + info.js + '[0].length'; return { c: '(' + mul + '*' + sz[info.type] + ')', t: 'uint' }; } }\n          if (n.e.k === 'idx') { let b = n.e, k = 0; while (b.k === 'idx') { k++; b = b.base; } const info = b.k === 'id' ? this.lookup(b.name) : null; if (info && info.array && k \u003c= info.ndims) { if (k === info.ndims) return { c: String(sz[info.type]), t: 'uint' }; return { c: '(' + info.js + '[0].length*' + sz[info.type] + ')', t: 'uint' }; } }\n          this.err('sizeof solo se soporta con un tipo (sizeof(int)) o una variable simple', n.line);\n          return { c: '0', t: 'int' };\n        }\n        case 'incdec': return this.incdec(n, asStmt);\n        case 'idx': { const lv = this.lvalue(n, false); return { c: lv.c, t: lv.t }; }\n        case 'addr': this.err(\"el operador '&' solo se usa dentro de scanf\", n.line); return { c: '0', t: 'int' };\n        case 'call': return this.call(n);\n        case 'list': this.err('las llaves { } solo se usan para inicializar arreglos', n.line); return { c: '0', t: 'int' };\n      }\n      throw new Error('expr ' + n.k);\n    }\n    idRead(n) {\n      if (own(CONSTS, n.name) && !this.lookup(n.name)) { this.needIncludeConst(n.name, n.line); const c = CONSTS[n.name]; return { c: typeof c[0] === 'bigint' ? '(' + c[0] + 'n)' : String(c[0]), t: c[1] }; }\n      const info = this.lookup(n.name);\n      if (!info) {\n        if (this.funcs.has(n.name)) { this.err(\"'\" + n.name + \"' es una función: faltan los paréntesis para llamarla\", n.line); return { c: '0', t: 'int' }; }\n        this.undeclErr(n.name, n.line);\n        return { c: '0', t: 'int' };\n      }\n      if (info.array) { this.err(\"'\" + n.name + \"' es un arreglo: usá \" + n.name + '[i] para acceder a una posición', n.line); return { c: '0', t: 'int' }; }\n      if (!info.assigned && !info.warned && !this.inSC && !info.quiet) { info.warned = true; this.warn(\"'\" + n.name + \"' se usa antes de darle un valor (en C su valor inicial es basura): asignale un valor inicial, por ejemplo \" + n.name + ' = 0;', n.line); }\n      return { c: info.js, t: info.type };\n    }\n    // gcc (x86-64) evalúa los argumentos de una llamada de derecha a izquierda: se imita cuando hay efectos\n    hoistArgs(argNodes, codes) {\n      if (argNodes.length \u003c 2 || !argNodes.some((a) => this.hasSideEffect(a))) return { pre: '', codes };\n      const pre = [], out = codes.slice();\n      for (let k = codes.length - 1; k >= 0; k--) {\n        if (/^(\"(?:[^\"\\\\]|\\\\.)*\"|[\\d.]+n?|\\(-[\\d.]+n?\\))$/.test(codes[k])) continue;\n        const id = ++this.ntemp; pre.push('$a' + id + '=' + codes[k]); out[k] = '$a' + id;\n      }\n      return { pre: pre.length ? pre.join(',') + ',' : '', codes: out };\n    }\n    // arreglo de char (o fila de un arreglo de textos) usado como texto: devuelve el código JS del arreglo\n    charArr(a) {\n      if (!a) return null;\n      if (a.k === 'id') { const inf = this.lookup(a.name); return inf && inf.array && (inf.type === 'char' || inf.type === 'uchar') && inf.ndims === 1 ? { c: inf.js } : null; }\n      if (a.k !== 'idx') return null;\n      const idxs = []; let b = a;\n      while (b.k === 'idx') { idxs.unshift(b.i); b = b.base; }\n      if (b.k !== 'id') return null;\n      const inf = this.lookup(b.name);\n      if (!inf || !inf.array || (inf.type !== 'char' && inf.type !== 'uchar') || idxs.length !== inf.ndims - 1) return null;\n      let code = inf.js, lenBase = inf.js;\n      idxs.forEach((ix, k) => {\n        const r = this.expr(ix);\n        if (!INTLIKE.has(r.t)) this.err('el índice de un arreglo debe ser un entero', ix.line || a.line);\n        code += '[$.ix(' + this.val(r) + ',' + (inf.rowsVar && k > 0 ? code : lenBase) + '.length,' + a.line + ')]';\n        lenBase += '[0]';\n      });\n      return { c: code };\n    }\n    hasSideEffect(n) { let r = false; this.walk(n, (x) => { if (x.k === 'call' || x.k === 'assign' || x.k === 'incdec') r = true; }); return r; }\n    lvalue(n, forWrite, useTemps) {\n      if (n.k === 'id') {\n        const info = this.lookup(n.name);\n        if (!info) { this.undeclErr(n.name, n.line); return { c: 'v_' + n.name, t: 'int', bad: true }; }\n        if (info.array) { this.err(\"'\" + n.name + \"' es un arreglo: usá \" + n.name + '[i] para acceder a una posición', n.line); return { c: info.js, t: info.type, bad: true }; }\n        return { c: info.js, t: info.type, info };\n      }\n      if (n.k === 'idx') {\n        const idxs = []; let b = n;\n        while (b.k === 'idx') { idxs.unshift(b.i); b = b.base; }\n        if (b.k !== 'id') { this.err('solo se pueden indexar arreglos por su nombre', n.line); return { c: '0', t: 'int', bad: true }; }\n        const info = this.lookup(b.name);\n        if (!info) { this.err(\"'\" + b.name + \"' no está declarada\", b.line); return { c: '0', t: 'int', bad: true }; }\n        if (!info.array) { this.err(\"'\" + b.name + \"' no es un arreglo\", b.line); return { c: '0', t: 'int', bad: true }; }\n        if (idxs.length !== info.ndims) { this.err(\"'\" + b.name + \"' tiene \" + info.ndims + ' dimensión(es) y se usó con ' + idxs.length, b.line); return { c: '0', t: 'int', bad: true }; }\n        let code = info.js;\n        let lenBase = info.js;\n        if (useTemps && idxs.some((ix) => this.hasSideEffect(ix))) {\n          const id = ++this.ntemp; let cont = info.js, lb = info.js;\n          idxs.forEach((ix, k) => {\n            const r = this.expr(ix);\n            if (!INTLIKE.has(r.t)) this.err('el índice de un arreglo debe ser un entero', ix.line || n.line);\n            if (k \u003c idxs.length - 1) { cont += '[$.ix(' + this.val(r) + ',' + lb + '.length,' + n.line + ')]'; lb += '[0]'; }\n            else code = '$i' + id + '=$.ix(' + this.val(r) + ',$a' + id + '.length,' + n.line + ')';\n          });\n          return { c: '$a' + id + '[$i' + id + ']', pre: '$a' + id + '=' + cont + ',' + code, t: info.type, info, arrayElem: true };\n        }\n        idxs.forEach((ix, k) => {\n          const r = this.expr(ix);\n          if (!INTLIKE.has(r.t)) this.err('el índice de un arreglo debe ser un entero', ix.line || n.line);\n          code += '[$.ix(' + this.val(r) + ',' + (info.rowsVar && k > 0 ? code : lenBase) + '.length,' + n.line + ')]';\n          lenBase += '[0]';\n        });\n        return { c: code, t: info.type, info, arrayElem: true };\n      }\n      this.err('a la izquierda del = tiene que haber una variable', n.line);\n      return { c: '$t', t: 'int', bad: true };\n    }\n    markAssigned(lv) { const inf = lv.info; if (inf && !inf.assigned) { inf.assigned = true; this.assignLog.push(inf); } }\n    asignarLog(desde) { for (const inf of this.assignLog.slice(desde)) inf.assigned = true; }\n    desasignar(desde) { for (const inf of this.assignLog.slice(desde)) inf.assigned = false; }\n    rootName(n) { while (n && n.k === 'idx') n = n.base; return n && n.name; }\n    checkConst(lv, name, line) {\n      if (lv.info && lv.info.isConst) this.err(\"'\" + name + \"' es const (constante): no se le puede asignar otro valor\", line);\n    }\n\n    unaryOp(n) {\n      const r = this.expr(n.e);\n      if (r.t === 'str' || r.t === 'void') { this.err('operación inválida sobre ' + (r.t === 'str' ? 'un texto' : 'void'), n.line); return { c: '0', t: 'int' }; }\n      if (n.op === '!') return { c: r.b ? '!(' + r.c + ')' : '((' + r.c + ')===' + (BIG.has(r.t) ? '0n' : '0') + ')', t: 'int', b: true };\n      if (n.op === '+') return { c: this.val(r), t: (r.t === 'char' || r.t === 'uchar' || r.t === 'short' || r.t === 'ushort' || r.t === 'bool') ? 'int' : r.t };\n      const t = r.t === 'char' || r.t === 'uchar' || r.t === 'short' || r.t === 'ushort' || r.t === 'bool' || r.b ? 'int' : r.t;\n      if (n.op === '-') {\n        const v = this.val(r);\n        return { c: this.wrapInt(t, '-' + (/^[\\d.]+$/.test(v) ? v : '(' + v + ')')), t };\n      }\n      if (n.op === '~') { if (!INTLIKE.has(t)) this.err(\"'~' necesita un entero\", n.line); return { c: this.wrapInt(t, '~' + '(' + this.val(r) + ')'), t }; }\n      throw new Error('un');\n    }\n    binOp(op, ln, rn, line) {\n      if (op === '&&' || op === '||') {\n        if (op === '||' && rn.k === 'num' && rn.v !== 0 && ln.k === 'bin') this.warn(\"después de '||' hay solo el número \" + rn.v + \", que siempre es verdadero: la condición siempre se cumple. Para comparar con dos valores escribí x == 1 || x == 2\", line);\n        const a = this.cond(ln); this.inSC++; const b = this.cond(rn); this.inSC--;\n        return { c: '(' + a + (op === '&&' ? '&&' : '||') + b + ')', t: 'int', b: true };\n      }\n      const REL = ['\u003c', '>', '\u003c=', '>=', '==', '!='];\n      const esRel = (x) => x && x.k === 'bin' && REL.indexOf(x.op) >= 0;\n      if ((op === '&' || op === '|') && (esRel(ln) || esRel(rn))) this.warn(\"usaste '\" + op + \"' (operación de bits); para \" + (op === '&' ? '\"y\"' : '\"o\"') + \" lógico se escribe '\" + op + op + \"'\", line);\n      if (REL.indexOf(op) >= 0 && esRel(ln) && op !== '==' && op !== '!=') this.warn(\"a \u003c b \u003c c no comprueba un rango: C evalúa primero la comparación de la izquierda (da 0 o 1). Escribilo con &&, por ejemplo: 0 \u003c a && a \u003c 3\", line);\n      if (op === '^') this.warn(\"en C, '^' no es potencia (es XOR de bits): 2 ^ 3 da 1. Para potencias usá pow(2, 3) de \u003cmath.h>\", line);\n      const a = this.expr(ln), b = this.expr(rn);\n      if (a.t === 'str' || b.t === 'str' || a.t === 'void' || b.t === 'void') {\n        this.err(a.t === 'void' || b.t === 'void' ? 'esa función no devuelve ningún valor' : 'no se puede operar con un texto entre comillas', line);\n        return { c: '0', t: 'int' };\n      }\n      if ((op === '/' || op === '%') && rn.k === 'num' && rn.v === 0 && rn.kind !== 'double' && rn.kind !== 'float' && !FLOATLIKE.has(a.t) && !FLOATLIKE.has(b.t)) this.warn('división por cero: el programa se cierra al llegar acá', line);\n      const esShift = op === '\u003c\u003c' || op === '>>';\n      const ctype = esShift ? arith(a.t, 'int') : arith(a.t, b.t);\n      const av = this.conv(a, ctype), bv = esShift ? (BIG.has(ctype) ? this.conv(b, ctype) : this.conv(b, 'int')) : this.conv(b, ctype);\n      if (op === '\u003c' || op === '>' || op === '\u003c=' || op === '>=' || op === '==' || op === '!=') {\n        if (op === '==' || op === '!=') {\n          const entero = (x) => x.k === 'num' && Number.isInteger(x.v);\n          const hayFloat = (FLOATLIKE.has(a.t) && !entero(rn)) || (FLOATLIKE.has(b.t) && !entero(ln));\n          if (hayFloat) this.warn(\"comparar un decimal con '\" + op + \"' puede fallar por redondeo (por ejemplo 0.1 no se guarda exacto): conviene comparar con '\u003c' o '>'\", line);\n        }\n        const ct = arith(a.t, b.t);\n        const ua = av, ub = bv;\n        return { c: '(' + ua + ' ' + (op === '==' ? '===' : op === '!=' ? '!==' : op) + ' ' + ub + ')', t: 'int', b: true };\n      }\n      const t = ctype;\n      switch (op) {\n        case '+': case '-': return { c: this.wrapInt(t, av + ' ' + op + ' ' + bv), t };\n        case '*':\n          if (t === 'int') return { c: 'Math.imul(' + av + ',' + bv + ')', t };\n          if (t === 'uint') return { c: '(Math.imul(' + av + ',' + bv + ')>>>0)', t };\n          return { c: this.wrapInt(t, av + ' * ' + bv), t };\n        case '/':\n          if (BIG.has(t)) return { c: this.wrapInt(t, '$.ldiv(' + av + ',' + bv + ',' + line + ')'), t, intdiv: true };\n          if (FLOATLIKE.has(t)) return { c: this.wrapInt(t, av + ' / ' + bv), t };\n          if (t === 'uint') return { c: this.wrapInt(t, '$.idiv(' + av + '>>>0,' + bv + '>>>0,' + line + ')'), t, intdiv: true };\n          return { c: this.wrapInt(t, '$.idiv(' + av + ',' + bv + ',' + line + ')'), t, intdiv: true };\n        case '%':\n          if (FLOATLIKE.has(t)) { this.err(\"'%' solo funciona con enteros (para decimales usá fmod)\", line); return { c: '0', t: 'int' }; }\n          if (BIG.has(t)) return { c: this.wrapInt(t, '$.lmod(' + av + ',' + bv + ',' + line + ')'), t };\n          if (t === 'uint') return { c: this.wrapInt(t, '$.imod(' + av + '>>>0,' + bv + '>>>0,' + line + ')'), t };\n          return { c: this.wrapInt(t, '$.imod(' + av + ',' + bv + ',' + line + ')'), t };\n        case '&': case '|': case '^': case '\u003c\u003c': case '>>':\n          if (FLOATLIKE.has(t)) { this.err(\"'\" + op + \"' solo funciona con enteros\", line); return { c: '0', t: 'int' }; }\n          if (t === 'uint' && op === '>>') return { c: '((' + av + '>>>0) >>> ' + bv + ')', t };\n          return { c: this.wrapInt(t, av + ' ' + op + ' ' + bv), t };\n      }\n      throw new Error('bin ' + op);\n    }\n    assignOp(n) {\n      if (n.op === '=' && n.l.k === 'id') { const inf = this.lookup(n.l.name); if (inf && inf.array) { this.err(inf.type === 'char' ? \"a un arreglo de char no se le asigna un texto con '=': para copiar usá strcpy(\" + n.l.name + ', \"texto\");' : \"a un arreglo no se le asigna con '=': hay que asignar posición por posición, \" + n.l.name + '[i] = valor;', n.line); this.expr(n.r); return { c: '0', t: 'int' }; } }\n      const lv = this.lvalue(n.l, true, true);\n      this.checkConst(lv, this.rootName(n.l), n.line);\n      let valueCode;\n      if (n.op === '=') {\n        const r = this.expr(n.r);\n        if (r.t === 'str') { this.err('los textos (char arrays) todavía no están soportados: solo se usan dentro de printf', n.line); return { c: '0', t: 'int' }; }\n        if (r.t === 'void') { this.err('esa función no devuelve ningún valor', n.line); return { c: '0', t: 'int' }; }\n        this.checkIntDiv(r, lv.t, n.line);\n        valueCode = this.conv(r, lv.t);\n      } else {\n        if (lv.info && !lv.arrayElem) { if (!lv.info.assigned && !lv.info.warned) { lv.info.warned = true; this.warn(\"'\" + n.l.name + \"' se usa antes de darle un valor (en C su valor inicial es basura): asignale un valor inicial, por ejemplo \" + n.l.name + ' = 0;', n.line); } }\n        const ln = lv.pre ? { k: 'raw', c: lv.c, t: lv.t, line: n.line } : n.l;\n        const r = this.binOp(n.op.slice(0, -1), ln, n.r, n.line);\n        valueCode = this.conv(r, lv.t);\n      }\n      if (!lv.bad) this.markAssigned(lv);\n      return { c: '(' + (lv.pre ? lv.pre + ',' : '') + lv.c + '=' + valueCode + ')', t: lv.t };\n    }\n    incdec(n, asStmt) {\n      if (n.e.k !== 'id' && n.e.k !== 'idx') { this.err(\"'\" + n.op + \"' solo se puede aplicar a una variable\", n.line); return { c: '0', t: 'int' }; }\n      const lv = this.lvalue(n.e, true, true);\n      if (lv.bad) return { c: '0', t: 'int' };\n      this.checkConst(lv, this.rootName(n.e), n.line);\n      if (lv.info && !lv.arrayElem && !lv.info.assigned && !lv.info.warned) { lv.info.warned = true; this.warn(\"'\" + n.e.name + \"' se usa antes de darle un valor (en C su valor inicial es basura): asignale un valor inicial, por ejemplo \" + n.e.name + ' = 0;', n.line); }\n      this.markAssigned(lv);\n      const sign = n.op === '++' ? '+' : '-';\n      const t = lv.t;\n      const calc = (src) => this.conv({ c: this.wrapInt(arith(t, 'int'), src + ' ' + sign + (BIG.has(t) ? ' 1n' : ' 1')), t: arith(t, 'int') }, t);\n      const pre = lv.pre ? lv.pre + ',' : '';\n      if (n.prefix || asStmt) return { c: '(' + pre + lv.c + '=' + calc(lv.c) + ')', t };\n      return { c: '(' + pre + '$t=' + lv.c + ',' + lv.c + '=' + calc('$t') + ',$t)', t };\n    }\n\n    /* ----- llamadas ----- */\n    needInclude(name, line) {\n      const H = { 'stdio.h': ['printf', 'scanf', 'getchar', 'putchar', 'puts', 'fprintf', 'fputs', 'putc', 'fputc', 'sprintf', 'snprintf', 'fgets', 'gets'], 'string.h': ['strlen', 'strcpy', 'strncpy', 'strcat', 'strncat', 'strcmp', 'strncmp'], 'math.h': ['sqrt', 'pow', 'fabs', 'floor', 'ceil', 'round', 'trunc', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'exp', 'log', 'log10', 'log2', 'cbrt', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'exp2', 'expm1', 'log1p', 'isnan', 'isinf', 'isfinite', 'signbit', 'rint', 'nearbyint', 'lround', 'llround', 'copysign', 'fdim', 'fmod', 'fmax', 'fmin', 'hypot'], 'stdlib.h': ['rand', 'srand', 'abs', 'labs', 'exit', 'system', 'atoi', 'atol', 'atof'], 'ctype.h': ['isdigit', 'isalpha', 'isalnum', 'isspace', 'isupper', 'islower', 'ispunct', 'isprint', 'isgraph', 'iscntrl', 'isxdigit', 'isblank', 'toupper', 'tolower'], 'time.h': ['time', 'clock'], 'conio.h': ['getch', 'getche'] };\n      for (const h in H) if (H[h].indexOf(name) >= 0 && !this.incl.has(h)) {\n        const k = 'inc|' + h; if (this.undeclared.has(k)) return; this.undeclared.add(k);\n        this.warn('usás ' + name + ' pero falta #include \u003c' + h + '> al principio del programa', line);\n      }\n    }\n    needIncludeConst(nm, line) {\n      const h = /^M_/.test(nm) || nm === 'INFINITY' || nm === 'NAN' || nm === 'HUGE_VAL' ? 'math.h' : /^(RAND_MAX|EXIT_SUCCESS|EXIT_FAILURE)$/.test(nm) ? 'stdlib.h' : /^(INT_|UINT_|LONG_|ULONG_|LLONG_|ULLONG_|SHRT_|USHRT_|CHAR_|UCHAR_)/.test(nm) ? 'limits.h' : /^(DBL_|FLT_)/.test(nm) ? 'float.h' : nm === 'CLOCKS_PER_SEC' ? 'time.h' : null;\n      if (!h || this.incl.has(h)) return;\n      const k = 'inc|' + h; if (this.undeclared.has(k)) return; this.undeclared.add(k);\n      this.warn('usás ' + nm + ' pero falta #include \u003c' + h + '> al principio del programa', line);\n    }\n    call(n) {\n      const name = n.name;\n      const args = n.args;\n      const usr = this.funcs.get(name);\n      if (usr && usr.node) return this.callUser(n, name, args);\n      this.needInclude(name, n.line);\n      const MATH1 = { sqrt: 'Math.sqrt', fabs: 'Math.abs', floor: 'Math.floor', ceil: 'Math.ceil', round: '$.round', trunc: 'Math.trunc', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', asin: 'Math.asin', acos: 'Math.acos', atan: 'Math.atan', exp: 'Math.exp', log: 'Math.log', log10: 'Math.log10', log2: 'Math.log2', cbrt: 'Math.cbrt', sinh: 'Math.sinh', cosh: 'Math.cosh', tanh: 'Math.tanh', asinh: 'Math.asinh', acosh: 'Math.acosh', atanh: 'Math.atanh', exp2: '((x)=>Math.pow(2,x))', expm1: 'Math.expm1', log1p: 'Math.log1p' };\n      const mf = /^(sqrt|pow|fabs|sin|cos|tan|asin|acos|atan|atan2|floor|ceil|exp|log|log10|log2|fmod|round|trunc|cbrt|hypot|fmax|fmin)f$/.exec(name);\n      if (mf) { const r = this.call({ k: 'call', name: mf[1], args, line: n.line }); return { c: 'Math.fround(' + r.c + ')', t: 'float' }; }\n      if (name === 'fprintf' || name === 'fputs' || name === 'putc' || name === 'fputc') {\n        const dest = name === 'fprintf' || name === 'fputs' ? (name === 'fprintf' ? args[0] : args[1]) : args[1];\n        if (!dest || dest.k !== 'id' || (dest.name !== 'stdout' && dest.name !== 'stderr')) { this.err('los archivos todavía no están soportados: solo se puede escribir en stdout o stderr (la pantalla)', n.line); return { c: '0', t: 'int' }; }\n        if (name === 'fprintf') return this.printfCall({ k: 'call', name: 'printf', args: args.slice(1), line: n.line });\n        if (name === 'fputs') { const caf = args[0] ? this.charArr(args[0]) : null; if (caf) return { c: '$.printf(\"%s\",[$.tostr(' + caf.c + ')],' + n.line + ')', t: 'int' }; const r = this.expr(args[0]); if (r.t !== 'str') { this.err('fputs solo se soporta con un texto entre comillas', n.line); return { c: '0', t: 'int' }; } return { c: '$.printf(\"%s\",[' + (r.dyn ? r.c : JSON.stringify(args[0].v)) + '],' + n.line + ')', t: 'int' }; }\n        const r = this.expr(args[0]); return { c: '$.putchar(' + this.conv(r, 'int') + ')', t: 'int' };\n      }\n      if (name === 'rint' || name === 'nearbyint') { const r = this.expr(args[0]); return { c: '$.rint(' + this.conv(r, 'double') + ')', t: 'double' }; }\n      if (name === 'lround' || name === 'llround') { const r = this.expr(args[0]); return { c: '$.f2l($.round(' + this.conv(r, 'double') + '))', t: 'long' }; }\n      if (name === 'signbit') { const r = this.expr(args[0]); return { c: '(($x=>($x\u003c0||Object.is($x,-0))?1:0)(' + this.conv(r, 'double') + '))', t: 'int' }; }\n      if (name === 'isfinite') { const r = this.expr(args[0]); return { c: '(Number.isFinite(' + this.conv(r, 'double') + ')?1:0)', t: 'int' }; }\n      if (name === 'copysign') { const a0 = this.expr(args[0]), a1 = this.expr(args[1]); return { c: '(($m,$s)=>(($s\u003c0||Object.is($s,-0))?-Math.abs($m):Math.abs($m)))(' + this.conv(a0, 'double') + ',' + this.conv(a1, 'double') + ')', t: 'double' }; }\n      if (name === 'fdim') { const a0 = this.expr(args[0]), a1 = this.expr(args[1]); return { c: 'Math.max(' + this.conv(a0, 'double') + '-' + this.conv(a1, 'double') + ',0)', t: 'double' }; }\n      if (name === 'printf') return this.printfCall(n);\n      if (name === 'scanf') return this.scanfCall(n);\n      if (own(MATH1, name) || ['pow', 'fmod', 'atan2', 'fmax', 'fmin', 'hypot'].indexOf(name) >= 0) {\n        const want = ['pow', 'fmod', 'atan2', 'fmax', 'fmin', 'hypot'].indexOf(name) >= 0 ? 2 : 1;\n        if (args.length !== want) { this.err(\"'\" + name + \"' recibe \" + want + ' argumento(s)', n.line); return { c: '0', t: 'double' }; }\n        const a = args.map((x) => { const r = this.expr(x); return this.conv(r, 'double'); });\n        const m = { pow: 'Math.pow', fmod: '$.fmod', atan2: 'Math.atan2', fmax: 'Math.max', fmin: 'Math.min', hypot: 'Math.hypot' };\n        const fn = own(MATH1, name) ? MATH1[name] : m[name];\n        return { c: fn + '(' + a.join(',') + ')', t: 'double' };\n      }\n      if (name === 'abs' || name === 'labs') {\n        if (args.length !== 1) { this.err(\"'abs' recibe 1 argumento\", n.line); return { c: '0', t: 'int' }; }\n        const r = this.expr(args[0]);\n        if (name === 'labs') return { c: 'BigInt.asIntN(64,((x)=>x\u003c0n?-x:x)(' + this.conv(r, 'long') + '))', t: 'long' };\n        return { c: '(Math.abs(' + this.conv(r, 'int') + ')|0)', t: 'int' };\n      }\n      if (name === 'isnan' || name === 'isinf') { const r = this.expr(args[0]); const v = this.conv(r, 'double'); return { c: '(' + (name === 'isnan' ? 'Number.isNaN(' + v + ')' : '(Math.abs(' + v + ')===Infinity)') + '?1:0)', t: 'int' }; }\n      if (name === 'rand') return { c: '$.rand()', t: 'int' };\n      if (name === 'srand') { const r = args[0] ? this.expr(args[0]) : { c: '0', t: 'int' }; return { c: '$.srand(' + this.conv(r, 'uint') + ')', t: 'void' }; }\n      if (name === 'clock') return { c: '$.clock()', t: 'long' };\n      if (name === 'time') { if (args[0]) this.expr(args[0]); return { c: '$.time()', t: 'long' }; }\n      if (name === 'exit') { const r = args[0] ? this.expr(args[0]) : { c: '0', t: 'int' }; return { c: '$.exit(' + this.conv(r, 'int') + ')', t: 'void' }; }\n      if (name === 'getchar' || name === 'getch' || name === 'getche') { return { c: '(await $.getchar())', t: 'int' }; }\n      if (name === 'putchar' && !args[0]) { this.err('putchar necesita un carácter entre paréntesis, por ejemplo putchar(65)', n.line); return { c: '0', t: 'int' }; }\n      if (name === 'putchar') { const r = this.expr(args[0]); return { c: '$.putchar(' + this.conv(r, 'int') + ')', t: 'int' }; }\n      const TEXTO = { strlen: 1, strcpy: 2, strncpy: 3, strcat: 2, strncat: 3, strcmp: 2, strncmp: 3, atoi: 1, atol: 1, atof: 1 };\n      if (own(TEXTO, name)) {\n        if (args.length !== TEXTO[name]) { this.err(\"'\" + name + \"' recibe \" + TEXTO[name] + ' argumento(s)', n.line); return { c: '0', t: 'int' }; }\n        const SA = (a) => { if (a.k === 'str') return JSON.stringify(a.v); const ca = this.charArr(a); if (ca) return ca.c; this.err(\"el argumento de '\" + name + \"' tiene que ser un texto: un arreglo de char o un texto entre comillas\", n.line); return '\"\"'; };\n        const DA = (a) => { const ca = this.charArr(a); if (ca) return ca.c; this.err(\"el primer argumento de '\" + name + \"' tiene que ser un arreglo de char, por ejemplo char texto[50];\", n.line); return '[]'; };\n        const num3 = args[2] ? this.val(this.expr(args[2])) : '0';\n        switch (name) {\n          case 'strlen': return { c: '$.strlen(' + SA(args[0]) + ')', t: 'ulong' };\n          case 'strcpy': case 'strcat': return { c: '$.' + name + '(' + DA(args[0]) + ',' + SA(args[1]) + ',' + n.line + ')', t: 'void' };\n          case 'strncpy': case 'strncat': return { c: '$.' + name + '(' + DA(args[0]) + ',' + SA(args[1]) + ',' + num3 + ',' + n.line + ')', t: 'void' };\n          case 'strcmp': return { c: '$.strcmp(' + SA(args[0]) + ',' + SA(args[1]) + ')', t: 'int' };\n          case 'strncmp': return { c: '$.strncmp(' + SA(args[0]) + ',' + SA(args[1]) + ',' + num3 + ')', t: 'int' };\n          case 'atoi': return { c: '$.atoi(' + SA(args[0]) + ')', t: 'int' };\n          case 'atol': return { c: '$.atol(' + SA(args[0]) + ')', t: 'long' };\n          default: return { c: '$.atof(' + SA(args[0]) + ')', t: 'double' };\n        }\n      }\n      if (name === 'sprintf' || name === 'snprintf') {\n        const ds = this.charArr(args[0]);\n        if (!ds) { this.err(\"el primer argumento de '\" + name + \"' tiene que ser un arreglo de char\", n.line); return { c: '0', t: 'int' }; }\n        if (name === 'snprintf') { const sz = this.val(this.expr(args[1])); return this.printfCall({ k: 'call', name: 'printf', args: args.slice(2), line: n.line, prefix: '$.snprintf(' + ds.c + ',' + sz + ',' }); }\n        return this.printfCall({ k: 'call', name: 'printf', args: args.slice(1), line: n.line, prefix: '$.sprintf(' + ds.c + ',' });\n      }\n      if (name === 'gets' || name === 'fgets') {\n        const ds = this.charArr(args[0]);\n        if (!ds) { this.err(\"el primer argumento de '\" + name + \"' tiene que ser un arreglo de char\", n.line); return { c: '0', t: 'int' }; }\n        if (name === 'gets') return { c: '(await $.gets(' + ds.c + ',' + n.line + '))', t: 'int' };\n        const sz = args[1] ? this.val(this.expr(args[1])) : '0';\n        return { c: '(await $.fgets(' + ds.c + ',' + sz + ',' + n.line + '))', t: 'int' };\n      }\n      if (['strchr', 'strrchr', 'strstr', 'strtok', 'strdup', 'memcpy', 'memset', 'memmove', 'strpbrk', 'strspn', 'strcspn'].indexOf(name) >= 0) { this.err(\"'\" + name + \"' todavía no está soportada en este editor (trabaja con punteros)\", n.line); return { c: '0', t: 'int' }; }\n      if (name === 'puts') {\n        const ca = args[0] ? this.charArr(args[0]) : null;\n        if (ca) return { c: '$.puts(' + ca.c + ')', t: 'int' };\n        const pr = args[0] ? this.expr(args[0]) : null;\n        if (!pr || pr.t !== 'str') { this.err('puts necesita un texto entre comillas o un arreglo de char', n.line); return { c: '0', t: 'int' }; }\n        return { c: '$.puts(' + (pr.dyn ? pr.c : JSON.stringify(args[0].v)) + ')', t: 'int' };\n      }\n      if (name === 'system' || name === 'fflush' || name === 'setbuf' || name === 'setvbuf') { args.forEach((a) => { if (a.k !== 'str') this.expr(a); }); return { c: '0', t: 'int' }; }\n      const CT = { isdigit: ['c>=48&&c\u003c=57', 2048], isalpha: ['(c>=65&&c\u003c=90)||(c>=97&&c\u003c=122)', 1024], isupper: ['c>=65&&c\u003c=90', 256], islower: ['c>=97&&c\u003c=122', 512], isspace: ['c===32||(c>=9&&c\u003c=13)', 8192], isalnum: ['(c>=48&&c\u003c=57)||(c>=65&&c\u003c=90)||(c>=97&&c\u003c=122)', 8], ispunct: ['(c>=33&&c\u003c=47)||(c>=58&&c\u003c=64)||(c>=91&&c\u003c=96)||(c>=123&&c\u003c=126)', 4], isprint: ['c>=32&&c\u003c=126', 16384], isgraph: ['c>=33&&c\u003c=126', 32768], iscntrl: ['(c>=0&&c\u003c=31)||c===127', 2], isxdigit: ['(c>=48&&c\u003c=57)||(c>=65&&c\u003c=70)||(c>=97&&c\u003c=102)', 4096], isblank: ['c===32||c===9', 1] };\n      if (own(CT, name)) { const r = this.expr(args[0]); return { c: '((c=>' + CT[name][0] + ')(' + this.conv(r, 'int') + ')?' + CT[name][1] + ':0)', t: 'int' }; }\n      if (name === 'toupper') { const r = this.expr(args[0]); return { c: '((c=>c>=97&&c\u003c=122?c-32:c)(' + this.conv(r, 'int') + '))', t: 'int' }; }\n      if (name === 'tolower') { const r = this.expr(args[0]); return { c: '((c=>c>=65&&c\u003c=90?c+32:c)(' + this.conv(r, 'int') + '))', t: 'int' }; }\n\n      return this.callUser(n, name, args);\n    }\n    callUser(n, name, args) {\n      const f = this.funcs.get(name);\n      if (!f) { const sg = this.suggest(name); this.err(\"la función '\" + name + \"' no está declarada\" + (sg ? \". ¿Quisiste decir '\" + sg + \"'? (en C todo va en minúscula y se escribe igual)\" : ''), n.line); args.forEach((a) => { if (a.k !== 'str') this.expr(a); }); return { c: '0', t: 'int' }; }\n      if (f.node && !f.hasProto && f.node.line > n.line) this.warn(\"'\" + name + \"' se usa antes de estar definida: falta el prototipo arriba de main (por ejemplo: \" + TNAME[f.ret] + ' ' + name + '(' + (f.params.map((p) => TNAME[p.type]).join(', ') || 'void') + ');)', n.line);\n      if (args.length !== f.params.length && !(f.unspec && !f.node)) {\n        this.err(\"la función '\" + name + \"' recibe \" + f.params.length + ' argumento(s) y se la llamó con ' + args.length, n.line);\n        return { c: '0', t: f.ret === 'void' ? 'void' : f.ret };\n      }\n      const a = args.map((x, i) => {\n        const p = f.params[i];\n        if (p.array && (p.type === 'char' || p.type === 'uchar') && p.dims === 1) {\n          if (x.k === 'str') return '$.cstr(' + JSON.stringify(x.v) + ')';\n          const cx = this.charArr(x);\n          if (cx) return cx.c;\n        }\n        if (p.array) {\n          const inf = x.k === 'id' ? this.lookup(x.name) : null;\n          if (!inf || !inf.array) { this.err(\"el argumento \" + (i + 1) + \" de '\" + name + \"' tiene que ser un arreglo (la función lo pide con [ ])\", n.line); return '[]'; }\n          if (inf.ndims !== p.dims) this.err(\"el arreglo '\" + x.name + \"' tiene \" + inf.ndims + ' dimensión(es) pero la función ' + name + ' espera ' + p.dims, n.line);\n          return inf.js;\n        }\n        return this.conv(this.expr(x), p.type);\n      });\n      const hc = this.hoistArgs(args, a);\n      const call = 'f_' + name + '(' + hc.codes.join(',') + ')';\n      const cc = f.async ? '(await ' + call + ')' : call;\n      return { c: hc.pre ? '(' + hc.pre + cc + ')' : cc, t: f.ret };\n    }\n\n    parseFmt(fmt) {\n      const specs = [];\n      const re = /%([-+ #0]*)(\\*|\\d+)?(?:\\.(\\*|\\d*))?(hh|h|ll|l|L|z|j|t)?([diouxXfFeEgGcsp%]|\\[\\^?\\]?[^\\]]*\\])/g;\n      let m;\n      while ((m = re.exec(fmt))) if (m[5] !== '%') specs.push({ w: m[2], p: m[3], len: m[4] || '', conv: m[5] });\n      return specs;\n    }\n    describe(node, k) { return node.k === 'id' ? \"'\" + node.name + \"'\" : 'el argumento ' + (k + 1); }\n\n    printfCall(n) {\n      const args = n.args;\n      if (args.length && args[0].k === 'cond' && args[0].a.k === 'str' && args[0].b.k === 'str') {\n        const c = this.cond(args[0].c);\n        const vals = args.slice(1).map((a) => { const r = this.expr(a); return r.t === 'str' ? JSON.stringify(a.v) : this.val(r); });\n        return { c: '$.printf(' + c + '?' + JSON.stringify(args[0].a.v) + ':' + JSON.stringify(args[0].b.v) + ',[' + vals.join(',') + '])', t: 'int' };\n      }\n      if (!args.length || args[0].k !== 'str') { this.err('printf necesita un texto entre comillas como primer argumento', n.line); return { c: '0', t: 'int' }; }\n      const fmt = args[0].v;\n      const specs = this.parseFmt(fmt);\n      const vals = [];\n      let si = 0;\n      const rest = args.slice(1);\n      let needed = specs.reduce((s, sp) => s + 1 + (sp.w === '*' ? 1 : 0) + (sp.p === '*' ? 1 : 0), 0);\n      if (rest.length \u003c needed) this.warn('printf pide ' + needed + ' valor(es) por los % del texto, pero recibe ' + rest.length, n.line);\n      else if (rest.length > needed) this.warn('printf recibe más valores (' + rest.length + ') de los que usan los % del texto (' + needed + ')', n.line);\n      const slots = [];\n      for (const sp of specs) { if (sp.w === '*') slots.push({ conv: 'w' }); if (sp.p === '*') slots.push({ conv: 'w' }); slots.push(sp); }\n      rest.forEach((a, k) => {\n        const cat = this.charArr(a);\n        if (cat) { vals.push('$.tostr(' + cat.c + ')'); return; }\n        const r = this.expr(a);\n        if (r.t === 'void') { this.err('esa función no devuelve ningún valor', n.line); vals.push('0'); return; }\n        const target = slots[k] || null;\n        if (target && target.conv !== 'w') {\n          const c = target.conv, t = r.t, d = this.describe(a, k);\n          const isInt = INTLIKE.has(t), isFl = FLOATLIKE.has(t);\n          if ('diuxXoc'.indexOf(c) >= 0 && isFl) this.warn(\"printf: '%\" + target.len + c + \"' espera un entero, pero \" + d + ' es ' + t + \": usá '%f' (o '%.2f' para 2 decimales)\", n.line);\n          else if ('fFeEgG'.indexOf(c) >= 0 && (isInt || t === 'str')) this.warn(\"printf: '%\" + c + \"' espera un número decimal, pero \" + d + ' es ' + (t === 'str' ? 'un texto' : t === 'char' ? 'char' : 'entero (' + t + ')') + \": usá '%d'\", n.line);\n          else if (c === 's' && t !== 'str') this.warn(\"printf: '%s' es para textos (un arreglo de char) y \" + d + ' es un número (' + t + \"): usá '%d' o '%f'\", n.line);\n          else if (c === 'c' && isFl) this.warn(\"printf: '%c' espera un carácter, pero \" + d + ' es ' + t, n.line);\n          else if ((c === 'd' || c === 'i') && t === 'long' && target.len !== 'l' && target.len !== 'll') this.warn(\"printf: para un long usá '%ld'\", n.line);\n          else if (c === 'd' && t === 'str') this.warn(\"printf: '%d' espera un entero pero recibe un texto\", n.line);\n          else if (c === 'c' && t === 'str') this.warn(\"printf: '%c' espera un carácter (entre comillas simples 'a'), no un texto\", n.line);\n        }\n        vals.push(r.t === 'str' ? (r.dyn ? r.c : JSON.stringify(a.v)) : this.val(r));\n      });\n      const hp = this.hoistArgs(rest, vals);\n      const pc = (n.prefix || '$.printf(') + JSON.stringify(fmt) + ',[' + hp.codes.join(',') + '],' + n.line + ')';\n      return { c: hp.pre ? '(' + hp.pre + pc + ')' : pc, t: 'int' };\n    }\n    scanfCall(n) {\n      const args = n.args;\n      if (!args.length || args[0].k !== 'str') { this.err('scanf necesita un texto entre comillas como primer argumento', n.line); return { c: '0', t: 'int' }; }\n      const fmt = args[0].v;\n      const specs = this.parseFmt(fmt).filter((s) => !/\\*/.test(s.w || ''));\n      const refs = [], types = [], pres = [];\n      const rest = args.slice(1);\n      const sobra = fmt.replace(/%[-+ #0]*(\\*|\\d+)?(\\.\\d+)?(hh|h|ll|l|L|z|j|t)?([diouxXfFeEgGcsp%]|\\[\\^?\\]?[^\\]]*\\])/g, '');\n      if (/[A-Za-z]/.test(sobra)) this.warn('el texto del scanf tiene letras que no son de lectura (' + JSON.stringify(sobra.trim()).slice(1, -1) + '): scanf solo lleva los % del dato; el mensaje para el usuario va en un printf aparte', n.line);\n      else if (/\\n\\s*$/.test(fmt)) this.warn(\"no pongas '\\\\n' al final del scanf: hace que el programa espere un Enter de más\", n.line);\n      if (rest.length \u003c specs.length) this.err('scanf pide leer ' + specs.length + ' valor(es) (hay ' + specs.length + \" '%') pero solo tiene \" + rest.length + \" variable(s): falta una variable con '&' (por ejemplo scanf(\\\"%d %d\\\", &a, &b);)\", n.line);\n      else if (rest.length !== specs.length) this.warn('scanf lee ' + specs.length + ' valor(es) por los % del texto, pero recibe ' + rest.length + ' variable(s)', n.line);\n      rest.forEach((a, k) => {\n        if (specs[k] && (specs[k].conv === 's' || specs[k].conv[0] === '[')) {\n          const ca = this.charArr(a.k === 'addr' ? a.e : a);\n          if (!ca) { this.err(\"a '%\" + (specs[k].conv === 's' ? 's' : specs[k].conv) + \"' le corresponde un arreglo de char (por ejemplo char nombre[30]; scanf(\\\"%s\\\", nombre);)\", n.line); return; }\n          refs.push('[()=>' + ca.c + ']'); types.push('\"str\"'); return;\n        }\n        if (a.k !== 'addr') {\n          if (a.k === 'id' && this.lookup(a.name) && this.lookup(a.name).scalar) this.err(\"a scanf le falta el '&' delante de '\" + a.name + \"' (scanf necesita &\" + a.name + ')', n.line);\n          else this.err(\"scanf necesita '&' delante de cada variable\", n.line);\n          return;\n        }\n        const lv = this.lvalue(a.e, true, true);\n        if (lv.bad) return;\n        if (lv.pre) pres.push(lv.pre);\n        this.checkConst(lv, this.rootName(a.e), n.line);\n        this.markAssigned(lv);\n        const sp = specs[k];\n        if (sp) {\n          const t = lv.t, nm = a.e.k === 'id' ? \"'\" + a.e.name + \"'\" : 'la variable';\n          const c = sp.conv;\n          if ((c === 'd' || c === 'i' || c === 'u') && sp.len === '' && !(t === 'int' || t === 'uint')) {\n            if (FLOATLIKE.has(t)) this.warn(\"scanf: '%\" + c + \"' lee un entero pero \" + nm + ' es ' + t + \": usá '%\" + (t === 'float' ? 'f' : 'lf') + \"'\", n.line);\n            else this.warn(\"scanf: '%\" + c + \"' no corresponde al tipo \" + t + ' de ' + nm, n.line);\n          } else if ((c === 'd' || c === 'i') && (sp.len === 'l' || sp.len === 'll') && t !== 'long') this.warn(\"scanf: '%\" + sp.len + c + \"' es para long y \" + nm + ' es ' + t, n.line);\n          else if ('feEgG'.indexOf(c) >= 0) {\n            if (sp.len === '' && t === 'double') this.warn(\"scanf: '%\" + c + \"' lee un float pero \" + nm + \" es double: usá '%lf'\", n.line);\n            else if (sp.len === 'l' && t === 'float') this.warn(\"scanf: '%l\" + c + \"' es para double pero \" + nm + \" es float: usá '%f'\", n.line);\n            else if (INTLIKE.has(t)) this.warn(\"scanf: '%\" + c + \"' lee un decimal pero \" + nm + ' es ' + t + \": usá '%d'\", n.line);\n          } else if (c === 'c' && !(t === 'char' || t === 'int')) this.warn(\"scanf: '%c' no corresponde al tipo \" + t + ' de ' + nm, n.line);\n        }\n        refs.push('[()=>' + lv.c + ',(v)=>{' + lv.c + '=v}]');\n        types.push(JSON.stringify(lv.t));\n      });\n      const sc = '(await $.scanf(' + JSON.stringify(fmt) + ',[' + refs.join(',') + '],[' + types.join(',') + '],' + n.line + '))';\n      return { c: pres.length ? '(' + pres.reverse().join(',') + ',' + sc + ')' : sc, t: 'int' };\n    }\n  }\n\n  const CODIGOS = [\n    [/comparar un decimal|a \u003c b \u003c c|XOR|operación de bits/, 'comparacion'], [/sin condición de corte|nunca termina|no termina nunca|probable que nunca/, 'bucle-infinito'],\n    [/falta un ';'/, 'falta-punto-coma'], [/falta cerrar la llave/, 'llave-sin-cerrar'],\n    [/a scanf le falta el '&'|scanf necesita '&'/, 'scanf-sin-amp'], [/scanf pide leer/, 'scanf-faltan-variables'], [/scanf lee|scanf:|texto del scanf|al final del scanf/, 'scanf-formato'], [/printf:|printf pide|printf recibe/, 'printf-formato'],\n    [/no está declarada/, 'no-declarada'], [/ya fue declarada/, 'redeclarada'], [/antes de darle un valor/, 'sin-inicializar'],\n    [/es const/, 'const-modificada'], [/asignación '='/, 'asignacion-en-condicion'], [/división es entre dos enteros/, 'division-entera'], [/división por cero/, 'division-cero'],\n    [/falta #include|biblioteca \u003c|conio\\.h|#include|#define|directiva|#error|macro/, 'preprocesador'], [/char arrays|textos/, 'texto-no-soportado'], [/todavía no está soportado|todavía no están soportados/, 'no-soportado'], [/sin ejecutar 'return'/, 'sin-return'], [/prototipo/, 'prototipo'], [/antes de estar definida/, 'sin-prototipo'],\n    [/termina en ';'/, 'cuerpo-vacio'], [/esta sentencia/, 'sin-efecto'], [/'break'|'continue'/, 'break-fuera'], [/switch|'case'|'default'/, 'switch'],\n    [/siempre es verdadero/, 'condicion-constante'], [/arreglo|índice/, 'arreglo'], [/función|argumento/, 'funcion'],\n    [/se esperaba|falta una expresión|carácter no válido|carácter invisible|no es un tipo|no existe en C|no se escribe|no se entiende|símbolo|número .* no es válido|literal/, 'sintaxis']\n  ];\n  function conCodigo(arr, pref) { return arr.map((d) => { let code = pref + 'otro'; for (const [re, c] of CODIGOS) if (re.test(d.msg)) { code = pref + c; break; } return Object.assign({ code }, d); }); }\n  function compile(src, opts) {\n    const includes = [], defines = new Map();\n    includes.avisos = [];\n    let toks;\n    try {\n      toks = tokenize(src, 1, true, includes, defines);\n      toks = expandDefines(toks, defines);\n      const items = new Parser(toks).program();\n      const g = new Gen(items, Object.assign({}, opts, { includes }));\n      const js = g.run();\n      g.errors.sort((a, b) => a.line - b.line);\n      g.warnings.sort((a, b) => a.line - b.line);\n      if (g.errors.length) { const el = new Set(g.errors.map((e) => e.line)); g.warnings = g.warnings.filter((w) => !el.has(w.line)); return { js: null, errors: conCodigo(g.errors, 'E-'), warnings: conCodigo(g.warnings, 'W-') }; }\n      return { js, errors: [], warnings: conCodigo(g.warnings, 'W-') };\n    } catch (e) {\n      if (e instanceof CErr) return { js: null, errors: conCodigo([{ line: e.cline, msg: e.message }], 'E-'), warnings: [] };\n      throw e;\n    }\n  }\n\n  const api = { compile };\n  if (typeof module !== 'undefined' && module.exports) module.exports = api;\n  else root.CCompiler = api;\n})(typeof self !== 'undefined' ? self : this);\n";

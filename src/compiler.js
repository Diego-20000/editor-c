/* Compilador del Editor C: subconjunto de C de la materia -> JavaScript.
   Entrada: texto C. Salida: { js, errors:[{line,msg}], warnings:[{line,msg}] } */
(function (root) {
  'use strict';

  class CErr extends Error { constructor(msg, line) { super(msg); this.cline = line; } }

  const TYPE_KW = new Set(['int', 'float', 'double', 'char', 'void', 'long', 'short', 'unsigned', 'signed', 'const', 'static', 'bool', 'time_t', 'clock_t', 'size_t']);
  const BIG = new Set(['long', 'ulong']);
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
          const dir = m[1], arg = m[2].trim();
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
          else if (dir === 'include') includes.push(arg);
          else if (dir === 'define') {
            const m2 = /^(\w+)([\s\S]*)$/.exec(m[2]);
            if (!m2) throw new CErr('#define mal escrito', line);
            if (m2[2][0] === '(') {
              const mp = /^\(([^)]*)\)\s*([\s\S]*)$/.exec(m2[2]);
              if (!mp) throw new CErr('#define mal escrito: falta cerrar el paréntesis de los parámetros', line);
              const params = mp[1].split(',').map((x) => x.trim()).filter((x) => x.length);
              defines.set(m2[1], { params, body: tokenize(mp[2], line, false, includes, defines) });
            } else defines.set(m2[1], tokenize(m2[2], line, false, includes, defines));
          }
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
        const m = /^(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)[fFlLuU]*/.exec(text.slice(i, i + 64));
        let s = m[0]; i += s.length;
        let v, kind, big;
        const esHex = /^0[xX]/.test(s);
        const body0 = s.replace(/[fFlLuU]+$/, '');
        if (!esHex && /[.eE]/.test(body0)) {
          const isF = /[fF]$/.test(s);
          v = parseFloat(body0); kind = isF ? 'float' : 'double'; if (isF) v = Math.fround(v);
        } else {
          const suf = (/[uUlL]*$/.exec(s)[0]).toLowerCase();
          const bd = s.slice(0, s.length - suf.length);
          let digits = bd, radix = 10;
          if (esHex) { radix = 16; digits = bd.slice(2); }
          else if (bd.length > 1 && bd[0] === '0') {
            if (!/^[0-7]+$/.test(bd)) throw new CErr("el número '" + bd + "' no es válido: los números que empiezan con 0 son octales (solo dígitos del 0 al 7)", line);
            radix = 8; digits = bd.slice(1);
          }
          big = BigInt((radix === 16 ? '0x' : radix === 8 ? '0o' : '') + digits);
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
    const map = { n: '\n', t: '\t', r: '\r', '0': '\0', a: '\x07', b: '\b', f: '\f', v: '\v', '\\': '\\', '"': '"', "'": "'", '?': '?' };
    if (c === 'x') { const m = /^[0-9a-fA-F]{1,2}/.exec(text.slice(j + 2)); if (m) return [String.fromCharCode(parseInt(m[0], 16)), j + 2 + m[0].length]; }
    if (c in map) return [map[c], j + 2];
    return [c, j + 2];
  }
  function expandDefines(toks, defines) {
    if (!defines.size) return toks;
    const out = [];
    const go = (arr, depth, line) => {
      for (let i = 0; i < arr.length; i++) {
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
      if (t.t === 'id' && UNSUPPORTED_KW[t.v]) throw new CErr("'" + t.v + "' todavía no está soportado en este editor", t.line);
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
        else if (v === 'signed') { /* ignorar */ }
        else base = v;
      }
      if (!seen) return null;
      if (base === 'time_t' || base === 'clock_t') return 'long';
      if (base === 'size_t') return 'ulong';
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
        if (this.isOp('*')) throw new CErr('los punteros todavía no están soportados en este editor', this.peek().line);
        const nameTok = this.ident();
        if (this.isOp('{')) throw new CErr("a '" + nameTok.v + "' le faltan los paréntesis: " + nameTok.v + '() { ... }', nameTok.line);
        if (this.isOp('(')) items.push(this.funcRest(type, nameTok, line));
        else { this.p--; const d = this.declRest(type, line); d.const = cn; items.push(d); }
      }
      return items;
    }
    funcRest(ret, nameTok, line) {
      this.expect('(');
      const params = [];
      if (this.isId('void') && this.isOp(')', 1)) this.next();
      else if (!this.isOp(')')) {
        for (;;) {
          const pt = this.typeSpec();
          if (!pt || pt === 'void') throw new CErr('parámetro mal escrito: se esperaba un tipo (int, float, ...)', this.peek().line);
          if (this.isOp('*')) throw new CErr('los punteros todavía no están soportados en este editor', this.peek().line);
          const pn = (this.isOp(',') || this.isOp(')') || this.isOp('[')) ? { v: null, line: this.peek().line } : this.ident();
          let pdims = 0;
          while (this.accept('[')) { if (!this.isOp(']')) this.assign(); this.expect(']'); pdims++; }
          params.push({ name: pn.v, type: pt, line: pn.line, array: pdims > 0, dims: pdims });
          if (!this.accept(',')) break;
        }
      }
      this.expect(')');
      if (this.accept(';')) return { k: 'proto', name: nameTok.v, ret, params, line };
      const sinNombre = params.find((p) => p.name === null);
      if (sinNombre) throw new CErr('al definir la función falta el nombre de un parámetro', sinNombre.line);
      const body = this.block();
      return { k: 'func', name: nameTok.v, ret, params, body, line };
    }
    declRest(type, line) {
      if (type === 'void') throw new CErr('una variable no puede ser de tipo void', line);
      const vars = [];
      for (;;) {
        if (this.isOp('*')) throw new CErr('los punteros todavía no están soportados en este editor', this.peek().line);
        const nt = this.ident();
        const dims = [];
        while (this.accept('[')) {
          if (this.isOp(']')) dims.push(null); else dims.push(this.assign());
          this.expect(']');
        }
        let init = null;
        if (this.accept('=')) init = this.isOp('{') ? this.initList() : this.assign();
        vars.push({ name: nt.v, dims, init, line: nt.line });
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
      this.ntemp = 0; this.fnHoist = []; this.curLine = 1; this.loopDepth = 0; this.switchDepth = 0; this.undeclared = new Set(); this.inSC = 0;
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
      const cand = new Set();
      for (const sc of this.scopes) for (const k of sc.keys()) cand.add(k);
      for (const k of this.funcs.keys()) cand.add(k);
      for (const k of ['printf', 'scanf', 'sqrt', 'pow', 'fabs', 'floor', 'ceil', 'abs', 'rand', 'srand', 'getchar', 'putchar', 'puts', 'toupper', 'tolower']) cand.add(k);
      const lev = (a, b) => { const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; } for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
      let best = null, bd = 99;
      for (const c of cand) { if (c === name) continue; const dist = c.toLowerCase() === name.toLowerCase() ? 0 : lev(name.toLowerCase(), c.toLowerCase()); const lim = name.length <= 3 ? 1 : 2; if (dist <= lim && dist < bd) { bd = dist; best = c; } }
      return best;
    }
    lookup(name) {
      for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) return this.scopes[i].get(name);
      return null;
    }

    checkIncludes() {
      const ok = ['stdio.h', 'math.h', 'stdlib.h', 'string.h', 'ctype.h', 'time.h', 'limits.h', 'stdbool.h', 'conio.h'];
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
            if (prev.params.length !== it.params.length) dif.push('una tiene ' + prev.params.length + ' parámetro(s) y la otra ' + it.params.length);
            else if (prev.params.some((p, i) => p.type !== it.params[i].type || !!p.array !== !!it.params[i].array)) dif.push('los tipos de los parámetros no coinciden');
            if (dif.length) this.err("el prototipo y la definición de '" + it.name + "' no coinciden: " + dif.join('; '), it.line);
          }
          if (!prev || it.k === 'func') this.funcs.set(it.name, { name: it.name, ret: it.ret, params: it.params, node: it.k === 'func' ? it : (prev && prev.node), hasProto: it.k === 'proto' || !!(prev && prev.hasProto), line: it.line, async: false, calls: new Set(), reads: false });
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
      const out = ['const $={printf:$rt.printf,puts:$rt.puts,putchar:$rt.putchar,scanf:$rt.scanf,getchar:$rt.getchar,idiv:$rt.idiv,imod:$rt.imod,ix:$rt.ix,d2i:$rt.d2i,mk:$rt.mk,pad:$rt.pad,init:$rt.init,rand:$rt.rand,srand:$rt.srand,time:$rt.time,exit:$rt.exit,round:$rt.round,fmod:$rt.fmod,lop:$rt.lop,ldiv:$rt.ldiv,lmod:$rt.lmod,f2l:$rt.f2l,f2ul:$rt.f2ul,clock:$rt.clock,yield:$rt.yield};', 'let $t;let $y=0;'];
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
        if (node.name === 'scanf' || node.name === 'getchar' || node.name === 'getch' || node.name === 'getche') f.async = true;
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
          if (ek === 'bin' || ek === 'un' || ek === 'id' || ek === 'num' || ek === 'cond' || ek === 'idx') {
            if (ek === 'bin' && s.e.op === '==') this.warn("esta sentencia compara pero no guarda el resultado: no hace nada. ¿Querías asignar con '='?", s.line);
            else this.warn('esta sentencia no hace nada: el resultado de la cuenta no se guarda en ninguna variable', s.line);
          }
          return this.expr(s.e, true).c + ';';
        }
        case 'if': {
          this.checkCondAssign(s.c);
          const c = this.cond(s.c);
          this.push(); const a = this.stmt(s.a); this.pop();
          if (s.a.k === 'empty') this.warn("el if termina en ';' y su cuerpo queda vacío: lo que sigue se ejecuta siempre. ¿Sobra ese ';'?", s.line);
          if (s.b && s.b.k === 'empty') this.warn("el else termina en ';' y su cuerpo queda vacío", s.line);
          let r = 'if (' + c + ') ' + this.wrap(a);
          if (s.b) { this.push(); r += ' else ' + this.wrap(this.stmt(s.b)); this.pop(); }
          return r;
        }
        case 'while': {
          this.checkCondAssign(s.c);
          const c = this.cond(s.c);
          this.push(); const b = this.bodyStmt(s.body); this.pop();
          this.checkEmptyBody(s, 'while'); this.checkLoop(s, 'while');
          return 'while (' + c + ') ' + this.loopWrap(b);
        }
        case 'do': { this.push(); const b = this.bodyStmt(s.body); this.pop(); this.checkCondAssign(s.c); this.checkLoop(s, 'do-while'); return 'do ' + this.loopWrap(b) + ' while (' + this.cond(s.c) + ');'; }
        case 'for': {
          this.push();
          let init = '';
          if (s.init) init = s.init.k === 'decl' ? this.declCode(s.init, false, true) : this.expr(s.init.e, true).c;
          if (s.c) this.checkCondAssign(s.c);
          const c = s.c ? this.cond(s.c) : '';
          const st = s.step ? this.expr(s.step, true).c : '';
          const b = this.bodyStmt(s.body);
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
    alwaysReturns(st) {
      if (!st) return false;
      switch (st.k) {
        case 'return': return true;
        case 'block': return st.body.some((x) => this.alwaysReturns(x));
        case 'if': return !!st.b && this.alwaysReturns(st.a) && this.alwaysReturns(st.b);
        case 'while': return st.c.k === 'num' && st.c.v !== 0 && !this.hasBreak(st.body);
        case 'do': return this.alwaysReturns(st.body);
        case 'for': return !st.c && !this.hasBreak(st.body);
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
      scan(body); if (s.step) scan(s.step);
      if (salida) return;
      const siempre = !cond || (cond.k === 'num' && cond.v !== 0);
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
      if (s.body.k === 'empty') this.warn("el " + kind + " termina en ';' y su cuerpo queda vacío: ¿sobra ese ';'?", s.line);
    }

    zero(t) { return '0'; }
    checkIntDiv(r, to, line) {
      if (r.intdiv && FLOATLIKE.has(to)) this.warn('la división es entre dos enteros y se trunca (7/2 da 3, no 3.5): guardarla en ' + to + ' no recupera los decimales; usá 7/2.0 o (float)7/2', line);
    }

    declCode(d, global, inFor) {
      const parts = [];
      const hoist = d.static && !global && !inFor;
      for (const v of d.vars) {
        const js = hoist ? 'v_' + v.name + '$s' + (++this.sid) : 'v_' + v.name;
        if (v.dims.length) {
          const dimsCode = [];
          let ok = true;
          if (v.init && v.init.k === 'list' && v.dims[0] === null) {
            dimsCode.push(String(v.init.items.length));
          }
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
            if (v.init.k !== 'list') { this.err('un arreglo se inicializa con llaves { ... }', v.line); init = '$.mk([1],0)'; }
            else init = '$.init(' + this.listCode(v.init, d.type, v.dims.length) + ',[' + dimsCode.join(',') + '],' + (BIG.has(d.type) ? '0n' : '0') + ')';
          } else init = '$.mk([' + dimsCode.join(',') + '],' + (BIG.has(d.type) ? '0n' : '0') + ')';
          parts.push('let ' + js + '=' + init + ';');
          continue;
        }
        const z0 = BIG.has(d.type) ? '0n' : '0';
        let init = z0;
        let assigned = global || hoist;
        if (v.init) {
          if (v.init.k === 'list') { this.err("'" + v.name + "' no es un arreglo, no se inicializa con llaves", v.line); }
          else { const r = this.expr(v.init); this.checkIntDiv(r, d.type, v.line); init = this.conv(r, d.type); assigned = true; }
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
    listCode(l, type, depth) {
      return '[' + l.items.map((it) => {
        if (it.k === 'list') return this.listCode(it, type, depth - 1);
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
        case 'uint': return FLOATLIKE.has(f) ? '($.d2i(' + v + ')>>>0)' : '(' + v + '>>>0)';
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
          if (n.e.k === 'id') { const info = this.lookup(n.e.name); if (info && info.scalar) return { c: String(sz[info.type]), t: 'int' }; if (info && info.array) { if (info.param) return { c: '8', t: 'int' }; let mul = info.js + '.length'; if (info.ndims === 2) mul += '*' + info.js + '[0].length'; return { c: '(' + mul + '*' + sz[info.type] + ')', t: 'uint' }; } }
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
      if (CONSTS[n.name] && !this.lookup(n.name)) { const c = CONSTS[n.name]; return { c: typeof c[0] === 'bigint' ? '(' + c[0] + 'n)' : String(c[0]), t: c[1] }; }
      const info = this.lookup(n.name);
      if (!info) {
        if (this.funcs.has(n.name)) { this.err("'" + n.name + "' es una función: faltan los paréntesis para llamarla", n.line); return { c: '0', t: 'int' }; }
        this.undeclErr(n.name, n.line);
        return { c: '0', t: 'int' };
      }
      if (info.array) { this.err("'" + n.name + "' es un arreglo: usá " + n.name + '[i] para acceder a una posición', n.line); return { c: '0', t: 'int' }; }
      if (!info.assigned && !info.warned && !this.inSC) { info.warned = true; this.warn("'" + n.name + "' se usa antes de darle un valor (en C su valor inicial es basura): asignale un valor inicial, por ejemplo " + n.name + ' = 0;', n.line); }
      return { c: info.js, t: info.type };
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
          code += '[$.ix(' + this.val(r) + ',' + lenBase + '.length,' + n.line + ')]';
          lenBase += '[0]';
        });
        return { c: code, t: info.type, info, arrayElem: true };
      }
      this.err('a la izquierda del = tiene que haber una variable', n.line);
      return { c: '$t', t: 'int', bad: true };
    }
    markAssigned(lv) { if (lv.info) lv.info.assigned = true; }
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
      const H = { 'stdio.h': ['printf', 'scanf', 'getchar', 'putchar', 'puts'], 'math.h': ['sqrt', 'pow', 'fabs', 'floor', 'ceil', 'round', 'trunc', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'exp', 'log', 'log10', 'log2', 'cbrt', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'exp2', 'expm1', 'log1p', 'isnan', 'isinf', 'fmod', 'fmax', 'fmin', 'hypot'], 'stdlib.h': ['rand', 'srand', 'abs', 'labs', 'exit', 'system'], 'ctype.h': ['isdigit', 'isalpha', 'isalnum', 'isspace', 'isupper', 'islower', 'ispunct', 'isprint', 'isgraph', 'iscntrl', 'isxdigit', 'isblank', 'toupper', 'tolower'], 'time.h': ['time', 'clock'] };
      for (const h in H) if (H[h].indexOf(name) >= 0 && !this.incl.has(h)) {
        const k = 'inc|' + h; if (this.undeclared.has(k)) return; this.undeclared.add(k);
        this.warn('usás ' + name + ' pero falta #include <' + h + '> al principio del programa', line);
      }
    }
    call(n) {
      const name = n.name;
      this.needInclude(name, n.line);
      const args = n.args;
      const MATH1 = { sqrt: 'Math.sqrt', fabs: 'Math.abs', floor: 'Math.floor', ceil: 'Math.ceil', round: '$.round', trunc: 'Math.trunc', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', asin: 'Math.asin', acos: 'Math.acos', atan: 'Math.atan', exp: 'Math.exp', log: 'Math.log', log10: 'Math.log10', log2: 'Math.log2', cbrt: 'Math.cbrt', sinh: 'Math.sinh', cosh: 'Math.cosh', tanh: 'Math.tanh', asinh: 'Math.asinh', acosh: 'Math.acosh', atanh: 'Math.atanh', exp2: '((x)=>Math.pow(2,x))', expm1: 'Math.expm1', log1p: 'Math.log1p' };
      if (name === 'printf') return this.printfCall(n);
      if (name === 'scanf') return this.scanfCall(n);
      if (MATH1[name] !== undefined || ['pow', 'fmod', 'atan2', 'fmax', 'fmin', 'hypot'].indexOf(name) >= 0) {
        const want = ['pow', 'fmod', 'atan2', 'fmax', 'fmin', 'hypot'].indexOf(name) >= 0 ? 2 : 1;
        if (args.length !== want) { this.err("'" + name + "' recibe " + want + ' argumento(s)', n.line); return { c: '0', t: 'double' }; }
        const a = args.map((x) => { const r = this.expr(x); return this.conv(r, 'double'); });
        const m = { pow: 'Math.pow', fmod: '$.fmod', atan2: 'Math.atan2', fmax: 'Math.max', fmin: 'Math.min', hypot: 'Math.hypot' };
        const fn = MATH1[name] !== undefined ? MATH1[name] : m[name];
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
      if (name === 'putchar') { const r = this.expr(args[0]); return { c: '$.putchar(' + this.conv(r, 'int') + ')', t: 'int' }; }
      if (name === 'puts') {
        const pr = args[0] ? this.expr(args[0]) : null;
        if (!pr || pr.t !== 'str') { this.err('puts solo se soporta con un texto entre comillas', n.line); return { c: '0', t: 'int' }; }
        return { c: '$.puts(' + (pr.dyn ? pr.c : JSON.stringify(args[0].v)) + ')', t: 'int' };
      }
      if (name === 'system' || name === 'fflush' || name === 'setbuf' || name === 'setvbuf') { args.forEach((a) => { if (a.k !== 'str') this.expr(a); }); return { c: '0', t: 'int' }; }
      const CT = { isdigit: ['c>=48&&c<=57', 2048], isalpha: ['(c>=65&&c<=90)||(c>=97&&c<=122)', 1024], isupper: ['c>=65&&c<=90', 256], islower: ['c>=97&&c<=122', 512], isspace: ['c===32||(c>=9&&c<=13)', 8192], isalnum: ['(c>=48&&c<=57)||(c>=65&&c<=90)||(c>=97&&c<=122)', 8], ispunct: ['(c>=33&&c<=47)||(c>=58&&c<=64)||(c>=91&&c<=96)||(c>=123&&c<=126)', 4], isprint: ['c>=32&&c<=126', 16384], isgraph: ['c>=33&&c<=126', 32768], iscntrl: ['(c>=0&&c<=31)||c===127', 2], isxdigit: ['(c>=48&&c<=57)||(c>=65&&c<=70)||(c>=97&&c<=102)', 4096], isblank: ['c===32||c===9', 1] };
      if (CT[name]) { const r = this.expr(args[0]); return { c: '((c=>' + CT[name][0] + ')(' + this.conv(r, 'int') + ')?' + CT[name][1] + ':0)', t: 'int' }; }
      if (name === 'toupper') { const r = this.expr(args[0]); return { c: '((c=>c>=97&&c<=122?c-32:c)(' + this.conv(r, 'int') + '))', t: 'int' }; }
      if (name === 'tolower') { const r = this.expr(args[0]); return { c: '((c=>c>=65&&c<=90?c+32:c)(' + this.conv(r, 'int') + '))', t: 'int' }; }

      const f = this.funcs.get(name);
      if (!f) { const sg = this.suggest(name); this.err("la función '" + name + "' no está declarada" + (sg ? ". ¿Quisiste decir '" + sg + "'? (en C todo va en minúscula y se escribe igual)" : ''), n.line); args.forEach((a) => { if (a.k !== 'str') this.expr(a); }); return { c: '0', t: 'int' }; }
      if (f.node && !f.hasProto && f.node.line > n.line) this.warn("'" + name + "' se usa antes de estar definida: falta el prototipo arriba de main (por ejemplo: " + TNAME[f.ret] + ' ' + name + '(' + (f.params.map((p) => TNAME[p.type]).join(', ') || 'void') + ');)', n.line);
      if (args.length !== f.params.length) {
        this.err("la función '" + name + "' recibe " + f.params.length + ' argumento(s) y se la llamó con ' + args.length, n.line);
        return { c: '0', t: f.ret === 'void' ? 'void' : f.ret };
      }
      const a = args.map((x, i) => {
        const p = f.params[i];
        if (p.array) {
          const inf = x.k === 'id' ? this.lookup(x.name) : null;
          if (!inf || !inf.array) { this.err("el argumento " + (i + 1) + " de '" + name + "' tiene que ser un arreglo (la función lo pide con [ ])", n.line); return '[]'; }
          if (inf.ndims !== p.dims) this.err("el arreglo '" + x.name + "' tiene " + inf.ndims + ' dimensión(es) pero la función ' + name + ' espera ' + p.dims, n.line);
          return inf.js;
        }
        return this.conv(this.expr(x), p.type);
      });
      const call = 'f_' + name + '(' + a.join(',') + ')';
      return { c: f.async ? '(await ' + call + ')' : call, t: f.ret };
    }

    parseFmt(fmt) {
      const specs = [];
      const re = /%([-+ #0]*)(\*|\d+)?(?:\.(\*|\d*))?(hh|h|ll|l|L|z|j|t)?([diouxXfFeEgGcsp%])/g;
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
        const r = this.expr(a);
        if (r.t === 'void') { this.err('esa función no devuelve ningún valor', n.line); vals.push('0'); return; }
        const target = slots[k] || null;
        if (target && target.conv !== 'w') {
          const c = target.conv, t = r.t, d = this.describe(a, k);
          const isInt = INTLIKE.has(t), isFl = FLOATLIKE.has(t);
          if ('diuxXoc'.indexOf(c) >= 0 && isFl) this.warn("printf: '%" + target.len + c + "' espera un entero, pero " + d + ' es ' + t + ": usá '%f' (o '%.2f' para 2 decimales)", n.line);
          else if ('fFeEgG'.indexOf(c) >= 0 && (isInt || t === 'str')) this.warn("printf: '%" + c + "' espera un número decimal, pero " + d + ' es ' + (t === 'str' ? 'un texto' : t === 'char' ? 'char' : 'entero (' + t + ')') + ": usá '%d'", n.line);
          else if (c === 's' && t !== 'str') this.warn("printf: '%s' es para textos y " + d + ' es ' + t + ': los textos (char arrays) todavía no están soportados', n.line);
          else if (c === 'c' && isFl) this.warn("printf: '%c' espera un carácter, pero " + d + ' es ' + t, n.line);
          else if ((c === 'd' || c === 'i') && t === 'long' && target.len !== 'l' && target.len !== 'll') this.warn("printf: para un long usá '%ld'", n.line);
          else if (c === 'd' && t === 'str') this.warn("printf: '%d' espera un entero pero recibe un texto", n.line);
          else if (c === 'c' && t === 'str') this.warn("printf: '%c' espera un carácter (entre comillas simples 'a'), no un texto", n.line);
        }
        vals.push(r.t === 'str' ? (r.dyn ? r.c : JSON.stringify(a.v)) : this.val(r));
      });
      return { c: '$.printf(' + JSON.stringify(fmt) + ',[' + vals.join(',') + '])', t: 'int' };
    }
    scanfCall(n) {
      const args = n.args;
      if (!args.length || args[0].k !== 'str') { this.err('scanf necesita un texto entre comillas como primer argumento', n.line); return { c: '0', t: 'int' }; }
      const fmt = args[0].v;
      const specs = this.parseFmt(fmt).filter((s) => !/\*/.test(s.w || ''));
      const refs = [], types = [];
      const rest = args.slice(1);
      if (rest.length < specs.length) this.err('scanf pide leer ' + specs.length + ' valor(es) (hay ' + specs.length + " '%') pero solo tiene " + rest.length + " variable(s): falta una variable con '&' (por ejemplo scanf(\"%d %d\", &a, &b);)", n.line);
      else if (rest.length !== specs.length) this.warn('scanf lee ' + specs.length + ' valor(es) por los % del texto, pero recibe ' + rest.length + ' variable(s)', n.line);
      rest.forEach((a, k) => {
        if (a.k !== 'addr') {
          if (a.k === 'id' && this.lookup(a.name) && this.lookup(a.name).scalar) this.err("a scanf le falta el '&' delante de '" + a.name + "' (scanf necesita &" + a.name + ')', n.line);
          else this.err("scanf necesita '&' delante de cada variable", n.line);
          return;
        }
        const lv = this.lvalue(a.e, true);
        if (lv.bad) return;
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
          else if (c === 's') this.err('los textos (%s / char arrays) todavía no están soportados en este editor', n.line);
        }
        refs.push('[()=>' + lv.c + ',(v)=>{' + lv.c + '=v}]');
        types.push(JSON.stringify(lv.t));
      });
      return { c: '(await $.scanf(' + JSON.stringify(fmt) + ',[' + refs.join(',') + '],[' + types.join(',') + '],' + n.line + '))', t: 'int' };
    }
  }

  function compile(src, opts) {
    const includes = [], defines = new Map();
    let toks;
    try {
      toks = tokenize(src, 1, true, includes, defines);
      toks = expandDefines(toks, defines);
      const items = new Parser(toks).program();
      const g = new Gen(items, Object.assign({}, opts, { includes }));
      const js = g.run();
      g.errors.sort((a, b) => a.line - b.line);
      g.warnings.sort((a, b) => a.line - b.line);
      if (g.errors.length) { const el = new Set(g.errors.map((e) => e.line)); g.warnings = g.warnings.filter((w) => !el.has(w.line)); return { js: null, errors: g.errors, warnings: g.warnings }; }
      return { js, errors: [], warnings: g.warnings };
    } catch (e) {
      if (e instanceof CErr) return { js: null, errors: [{ line: e.cline, msg: e.message }], warnings: [] };
      throw e;
    }
  }

  const api = { compile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CCompiler = api;
})(typeof self !== 'undefined' ? self : this);

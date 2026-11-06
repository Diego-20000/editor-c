/* Runtime del Editor C: printf/scanf con la misma salida que gcc/glibc.
   Se usa en el worker del navegador y en node (tests). */
(function (root) {
  'use strict';

  class CRuntimeError extends Error {
    constructor(msg, line) { super(msg); this.cline = line; }
  }
  class ExitSignal { constructor(code) { this.code = code; } }

  /* ---------- formato de números como glibc ---------- */

  function signBit(x) { return x < 0 || Object.is(x, -0); }

  // |x| con p decimales, redondeo exacto "half-even" (igual que glibc)
  function fixedExact(x, p) {
    x = Math.abs(x);
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, x);
    const hi = dv.getUint32(0), lo = dv.getUint32(4);
    const exp = (hi >>> 20) & 0x7ff;
    let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
    let e;
    if (exp === 0) e = -1074; else { mant |= 1n << 52n; e = exp - 1075; }
    const num = mant * (10n ** BigInt(p));
    let q;
    if (e >= 0) q = num << BigInt(e);
    else {
      const sh = BigInt(-e);
      q = num >> sh;
      const rem = num - (q << sh);
      const half = 1n << (sh - 1n);
      if (rem > half || (rem === half && (q & 1n) === 1n)) q += 1n;
    }
    let s = q.toString();
    if (p > 0) {
      s = s.padStart(p + 1, '0');
      s = s.slice(0, -p) + '.' + s.slice(-p);
    }
    return s;
  }

  // dígitos decimales exactos de |x| en notación científica con p decimales (half-even, como glibc)
  function expDigits(x, p) {
    x = Math.abs(x);
    if (x === 0) return { d: '0'.repeat(p + 1), e: 0 };
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, x);
    const hi = dv.getUint32(0), lo = dv.getUint32(4);
    const ex = (hi >>> 20) & 0x7ff;
    let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
    let e2;
    if (ex === 0) e2 = -1074; else { mant |= 1n << 52n; e2 = ex - 1075; }
    let e10 = Math.floor(Math.log10(x));
    for (let tries = 0; tries < 4; tries++) {
      const k = e10 - p; // N = x / 10^k
      let num = mant, den = 1n;
      if (e2 >= 0) num <<= BigInt(e2); else den <<= BigInt(-e2);
      if (k > 0) den *= 10n ** BigInt(k); else if (k < 0) num *= 10n ** BigInt(-k);
      let q = num / den;
      const rem = num - q * den;
      if (rem * 2n > den || (rem * 2n === den && (q & 1n) === 1n)) q += 1n;
      const lowB = 10n ** BigInt(p), highB = lowB * 10n;
      if (q >= highB) { e10++; continue; }
      if (q < lowB) { e10--; continue; }
      return { d: q.toString(), e: e10 };
    }
    return { d: '0'.repeat(p + 1), e: 0 };
  }

  function expStr(e10, upper) {
    const s = (e10 < 0 ? '-' : '+') + String(Math.abs(e10)).padStart(2, '0');
    return (upper ? 'E' : 'e') + s;
  }
  function expForm(x, p, upper) {
    const r = expDigits(x, p);
    return r.d[0] + (p > 0 ? '.' + r.d.slice(1) : '') + expStr(r.e, upper);
  }

  function gForm(x, p, alt, upper) {
    if (p === 0) p = 1;
    if (x === 0) return alt ? '0.' + '0'.repeat(p - 1) : '0';
    const X = expDigits(x, p - 1).e;
    let s;
    if (X >= -4 && X < p) {
      s = fixedExact(x, p - 1 - X);
      if (!alt && s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
      else if (alt && s.indexOf('.') < 0) s += '.';
    } else {
      s = expForm(x, p - 1, upper);
      if (!alt) s = s.replace(/\.?0+([eE])/, '$1');
      else if (s.indexOf('.') < 0) s = s.replace(/([eE])/, '.$1');
    }
    return s;
  }

  const SPEC = /%([-+ #0]*)(\*|\d+)?(?:\.(\*|\d*))?(hh|h|ll|l|L|z|j|t)?([diouxXfFeEgGcsp%])/g;

  function toBig(a) {
    if (typeof a === 'bigint') return a;
    if (typeof a === 'number' && isFinite(a)) return BigInt(Math.trunc(a));
    return 0n;
  }
  const ENC = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const DEC = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
  function ulen(s) { if (!ENC) return s.length; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 127) return ENC.encode(s).length; return s.length; }
  function cformat(fmt, args) {
    if (fmt.indexOf('\0') >= 0) fmt = fmt.slice(0, fmt.indexOf('\0'));
    let ai = 0;
    return fmt.replace(SPEC, function (m, flags, width, prec, len, conv) {
      if (conv === '%') return '%';
      if ((width !== undefined && width !== '*' && parseInt(width, 10) > 100000) || (prec !== undefined && prec !== '*' && prec !== '' && parseInt(prec, 10) > 100000)) throw new CRuntimeError('el ancho o la precisión del formato es demasiado grande para este editor (máximo 100000)');
      let w = width === undefined ? 0 : (width === '*' ? (Number(args[ai++]) | 0) : parseInt(width, 10));
      let left = flags.indexOf('-') >= 0, zero = flags.indexOf('0') >= 0, plus = flags.indexOf('+') >= 0,
        space = flags.indexOf(' ') >= 0, alt = flags.indexOf('#') >= 0;
      if (w < 0) { left = true; w = -w; }
      let p = prec === undefined ? -1 : (prec === '*' ? (Number(args[ai++]) | 0) : (prec === '' ? 0 : parseInt(prec, 10)));
      const arg = args[ai++];
      let body = '', sign = '', numeric = true, isSpecial = false;
      const upper = conv === 'F' || conv === 'E' || conv === 'G' || conv === 'X';
      if (conv === 'd' || conv === 'i') {
        let bv = toBig(arg);
        const bits = len === 'hh' ? 8 : len === 'h' ? 16 : (len === 'l' || len === 'll' || len === 'z' || len === 'j' || len === 't') ? 64 : 32;
        if (bits === 64 && typeof arg === 'number') bv = BigInt.asUintN(32, bv);
        bv = BigInt.asIntN(bits, bv);
        const neg = bv < 0n;
        sign = neg ? '-' : (plus ? '+' : (space ? ' ' : ''));
        body = (neg ? -bv : bv).toString();
        if (p >= 0) { zero = false; body = body.padStart(p, '0'); if (p === 0 && bv === 0n) body = ''; }
      } else if (conv === 'u' || conv === 'x' || conv === 'X' || conv === 'o') {
        let bv = toBig(arg);
        const bits = len === 'hh' ? 8 : len === 'h' ? 16 : (len === 'l' || len === 'll' || len === 'z' || len === 'j' || len === 't') ? 64 : 32;
        if (bits === 64 && typeof arg === 'number') bv = BigInt.asUintN(32, bv);
        bv = BigInt.asUintN(bits, bv);
        const base = conv === 'u' ? 10 : (conv === 'o' ? 8 : 16);
        body = bv.toString(base);
        if (upper) body = body.toUpperCase();
        if (p >= 0) { zero = false; body = body.padStart(p, '0'); if (p === 0 && bv === 0n && !(alt && conv === 'o')) body = ''; }
        if (alt && bv !== 0n) { if (conv === 'x') body = '0x' + body; else if (conv === 'X') body = '0X' + body; else if (conv === 'o' && body[0] !== '0') body = '0' + body; }
      } else if ('fFeEgG'.indexOf(conv) >= 0) {
        const v = typeof arg === 'number' ? arg : (typeof arg === 'bigint' ? Number(arg) : 0);
        const neg = Number.isNaN(v) ? true : signBit(v);
        sign = neg ? '-' : (plus ? '+' : (space ? ' ' : ''));
        if (Number.isNaN(v)) { body = upper ? 'NAN' : 'nan'; isSpecial = true; }
        else if (!isFinite(v)) { body = upper ? 'INF' : 'inf'; isSpecial = true; }
        else {
          const pp = p < 0 ? 6 : p;
          if (conv === 'f' || conv === 'F') { body = fixedExact(v, pp); if (alt && pp === 0) body += '.'; }
          else if (conv === 'e' || conv === 'E') body = expForm(v, pp, upper);
          else body = gForm(v, pp, alt, upper);
        }
        if (isSpecial) zero = false;
      } else if (conv === 'c') {
        numeric = false; zero = false;
        body = String.fromCharCode(typeof arg === 'number' ? (arg & 255) : (typeof arg === 'bigint' ? Number(BigInt.asUintN(8, arg)) : 63));
      } else if (conv === 's') {
        numeric = false; zero = false;
        body = typeof arg === 'string' ? arg : String(arg === undefined ? '(null)' : arg);
        if (p >= 0) { if (ENC && ulen(body) !== body.length) body = DEC.decode(ENC.encode(body).slice(0, p)); else body = body.slice(0, p); }
      } else if (conv === 'p') {
        numeric = false; body = '0x' + ((typeof arg === 'number' ? arg : 0) >>> 0).toString(16);
      }
      let out = sign + body;
      const olen = ulen(out);
      if (olen < w) {
        if (left) out = out + ' '.repeat(w - olen);
        else if (zero && numeric) {
          let pre = sign;
          let rest = body;
          if ((conv === 'x' || conv === 'X') && alt && /^0[xX]/.test(rest)) { pre += rest.slice(0, 2); rest = rest.slice(2); }
          out = pre + '0'.repeat(w - olen) + rest;
        } else out = ' '.repeat(w - olen) + out;
      }
      return out;
    });
  }

  /* ---------- entrada estándar ---------- */

  function createRuntime(io) {
    // io.write(s)  io.readLine() -> Promise<string|null>   (null = fin de entrada)
    let buf = '', pos = 0, eof = false;

    async function fill() {
      if (eof) return false;
      const line = await io.readLine();
      if (line === null || line === undefined) { eof = true; return false; }
      buf = buf.slice(pos) + line + '\n';
      pos = 0;
      return true;
    }
    async function peek() {
      while (pos >= buf.length) { if (!(await fill())) return -1; }
      return buf.charCodeAt(pos);
    }
    const isWs = (c) => c === 32 || (c >= 9 && c <= 13);

    async function skipWs() {
      for (;;) { const c = await peek(); if (c < 0 || !isWs(c)) return c; pos++; }
    }

    function conv(t, v) {
      if (typeof v === 'bigint') {
        switch (t) {
          case 'int': return Number(BigInt.asIntN(32, v));
          case 'uint': return Number(BigInt.asUintN(32, v));
          case 'char': return Number(BigInt.asIntN(8, v));
          case 'uchar': return Number(BigInt.asUintN(8, v));
          case 'short': return Number(BigInt.asIntN(16, v));
          case 'ushort': return Number(BigInt.asUintN(16, v));
          case 'long': return BigInt.asIntN(64, v);
          case 'ulong': return BigInt.asUintN(64, v);
          case 'float': return Math.fround(Number(v));
          default: return Number(v);
        }
      }
      switch (t) {
        case 'int': return v | 0;
        case 'uint': return v >>> 0;
        case 'char': return (v << 24) >> 24;
        case 'uchar': return v & 255;
        case 'short': return (v << 16) >> 16;
        case 'ushort': return v & 65535;
        case 'float': return Math.fround(v);
        case 'long': return BigInt(isFinite(v) ? Math.trunc(v) : 0);
        case 'ulong': return BigInt.asUintN(64, BigInt(isFinite(v) ? Math.trunc(v) : 0));
        default: return v;
      }
    }

    // refs: [[get,set],...]  types: ['int','float',...]
    async function scanf(fmt, refs, types, line) {
      let count = 0, ri = 0, i = 0;
      const n = fmt.length;
      let first = true;
      while (i < n) {
        const ch = fmt[i];
        if (ch === '%') {
          i++;
          if (fmt[i] === '%') {
            const c = await skipWs();
            if (c !== 37) return count === 0 && c < 0 ? -1 : count;
            pos++; i++; continue;
          }
          let suppress = false;
          if (fmt[i] === '*') { suppress = true; i++; }
          let w = '';
          while (/\d/.test(fmt[i] || '')) w += fmt[i++];
          const maxw = w ? parseInt(w, 10) : Infinity;
          let len = '';
          while ('hlLzjt'.indexOf(fmt[i]) >= 0 && fmt[i] !== undefined) len += fmt[i++];
          const sp = fmt[i++];
          if (sp === 'c') {
            const c = await peek();
            if (c < 0) return count === 0 ? -1 : count;
            pos++;
            if (!suppress) { const r = refs[ri], t = types[ri]; ri++; r[1](conv(t, c)); count++; }
            first = false; continue;
          }
          if (sp === 'd' || sp === 'i' || sp === 'u' || sp === 'x' || sp === 'X' || sp === 'o') {
            const c0 = await skipWs();
            if (c0 < 0) return count === 0 ? -1 : count;
            const rest = buf.slice(pos);
            const re = (sp === 'x' || sp === 'X') ? /^[+-]?(0[xX])?[0-9a-fA-F]+/ : (sp === 'o' ? /^[+-]?[0-7]+/ : (sp === 'i' ? /^[+-]?(0[xX][0-9a-fA-F]+|0[0-7]*|[1-9][0-9]*)/ : /^[+-]?[0-9]+/));
            const m = re.exec(rest.slice(0, isFinite(maxw) ? maxw : undefined));
            if (!m) return count;
            pos += m[0].length;
            let txt = m[0], neg = false;
            if (txt[0] === '+' || txt[0] === '-') { neg = txt[0] === '-'; txt = txt.slice(1); }
            let radix = 10;
            if (sp === 'x' || sp === 'X') { radix = 16; txt = txt.replace(/^0[xX]/, ''); }
            else if (sp === 'o') radix = 8;
            else if (sp === 'i') { if (/^0[xX]/.test(txt)) { radix = 16; txt = txt.slice(2); } else if (/^0[0-7]/.test(txt)) radix = 8; }
            let v = BigInt((radix === 16 ? '0x' : (radix === 8 ? '0o' : '')) + txt);
            if (neg) v = -v;
            if (sp === 'd' || sp === 'i') { if (v > 9223372036854775807n) v = 9223372036854775807n; else if (v < -9223372036854775808n) v = -9223372036854775808n; }
            else { const mag = neg ? -v : v; if (mag > 18446744073709551615n) v = 18446744073709551615n; else if (neg) v = BigInt.asUintN(64, v); }
            if (!suppress) { const r = refs[ri], t = types[ri]; ri++; r[1](conv(t, v)); count++; }
            first = false; continue;
          }
          if ('feEgG'.indexOf(sp) >= 0) {
            const c0 = await skipWs();
            if (c0 < 0) return count === 0 ? -1 : count;
            const rest = buf.slice(pos);
            const m = /^[+-]?(\d+\.?\d*([eE][+-]?\d+)?|\.\d+([eE][+-]?\d+)?|inf(inity)?|nan)/i.exec(rest.slice(0, isFinite(maxw) ? maxw : undefined));
            if (!m) return count;
            pos += m[0].length;
            const v = /inf/i.test(m[0]) ? (m[0][0] === '-' ? -Infinity : Infinity) : (/nan/i.test(m[0]) ? NaN : parseFloat(m[0]));
            if (!suppress) { const r = refs[ri], t = types[ri]; ri++; r[1](conv(t, v)); count++; }
            first = false; continue;
          }
          return count; // especificador no soportado
        } else if (isWs(fmt.charCodeAt(i))) {
          while (i < n && isWs(fmt.charCodeAt(i))) i++;
          await skipWs();
        } else {
          const c = await peek();
          if (c < 0) return count === 0 ? -1 : count;
          if (c !== fmt.charCodeAt(i)) return count;
          pos++; i++;
        }
      }
      return count;
    }

    async function getchar() {
      const c = await peek();
      if (c < 0) return -1;
      pos++;
      return c;
    }

    let seed = 1;
    // rand()/srand() como glibc (TYPE_3, r[i-3] + r[i-31]): misma secuencia que gcc en Linux
    function makeRand(sd) {
      sd = sd >>> 0; if (sd === 0) sd = 1;
      const rs = new Int32Array(31); rs[0] = sd | 0;
      for (let i = 1; i < 31; i++) { const hi = Math.trunc(rs[i - 1] / 127773), lo = rs[i - 1] % 127773; let w = 16807 * lo - 2836 * hi; if (w < 0) w += 2147483647; rs[i] = w; }
      const buf = []; for (let i = 0; i < 31; i++) buf.push(rs[i] >>> 0);
      let f = 3, rI = 0;
      const next = () => { buf[f] = (buf[f] + buf[rI]) >>> 0; const res = buf[f] >>> 1; f = (f + 1) % 31; rI = (rI + 1) % 31; return res; };
      for (let i = 0; i < 310; i++) next();
      return next;
    }
    let nextRand = makeRand(1);
    function rand() { return nextRand(); }

    return {
      printf(fmt, args, line) { let s; try { s = cformat(fmt, args); } catch (e) { if (e instanceof CRuntimeError && e.cline == null) e.cline = line; throw e; } io.write(s); return ulen(s); },
      puts(s) { io.write(s + '\n'); return 1; },
      putchar(c) { io.write(String.fromCharCode(c & 255)); return c; },
      scanf, getchar,
      idiv(a, b, line) { if (b === 0) throw new CRuntimeError('división entera por cero (en C el programa se cierra con "Floating point exception")', line); return Math.trunc(a / b); },
      imod(a, b, line) { if (b === 0) throw new CRuntimeError('resto (%) con divisor cero (en C el programa se cierra con "Floating point exception")', line); return a % b; },
      ix(i, len, line) {
        if (typeof i === 'bigint') i = Number(i);
        if (i < 0 || i >= len) throw new CRuntimeError('índice ' + i + ' fuera del arreglo (tiene ' + len + ' posiciones: 0 a ' + (len - 1) + ')', line);
        return i;
      },
      d2i(v) { return (v > -2147483649 && v < 2147483648) ? (v | 0) : -2147483648; },
      mk(dims, fill, line) {
        dims = dims.map(Number);
        const build = (k) => { const a = new Array(dims[k]); for (let i = 0; i < dims[k]; i++) a[i] = k === dims.length - 1 ? fill : build(k + 1); return a; };
        for (const d of dims) if (!(d > 0)) throw new CRuntimeError('tamaño de arreglo inválido (' + d + ')', line);
        const total = dims.reduce((a, b) => a * b, 1);
        if (total > 20000000) throw new CRuntimeError('el arreglo es demasiado grande para este editor (' + total + ' elementos; el máximo es 20 millones). En un programa real esto suele cerrarse por falta de memoria de pila', line);
        return build(0);
      },
      pad(list, dims) {
        const d = dims[0];
        const out = list.slice(0, d);
        if (dims.length > 1) { for (let i = 0; i < out.length; i++) out[i] = this.pad(out[i], dims.slice(1)); while (out.length < d) out.push(this.mk(dims.slice(1), 0)); }
        else while (out.length < d) out.push(0);
        return out;
      },
      init(list, dims, fill, line) {
        const arr = this.mk(dims, fill === undefined ? 0 : fill, line);
        const fillFrom = (a, ds, lst, st) => {
          for (let k = 0; k < ds[0]; k++) {
            if (st.i >= lst.length) break;
            if (ds.length === 1) { let v = lst[st.i++]; while (Array.isArray(v)) v = v[0]; a[k] = v === undefined ? 0 : v; }
            else { const it = lst[st.i]; if (Array.isArray(it)) { st.i++; fillFrom(a[k], ds.slice(1), it, { i: 0 }); } else fillFrom(a[k], ds.slice(1), lst, st); }
          }
        };
        fillFrom(arr, dims, list, { i: 0 });
        return arr;
      },
      rint(x) { if (!isFinite(x)) return x; const f = Math.floor(x), d = x - f; if (d < 0.5) return f; if (d > 0.5) return f + 1; return (f % 2 === 0) ? f : f + 1; },
      lop(op, a, b) {
        if (!isFinite(a)) a = 0; if (!isFinite(b)) b = 0;
        const x = BigInt.asIntN(64, BigInt(Math.trunc(a))), y = BigInt.asIntN(64, BigInt(Math.trunc(b)));
        let v;
        switch (op) { case '&': v = x & y; break; case '|': v = x | y; break; case '^': v = x ^ y; break; case '<<': v = x << (y & 63n); break; default: v = x >> (y & 63n); }
        return Number(BigInt.asIntN(64, v));
      },
      round(x) { return x < 0 ? -Math.round(-x) : Math.round(x); },
      fmod(a, b) { return a % b; },
      yield: async function () { await new Promise((res) => setTimeout(res, 0)); if (io.cancelled && io.cancelled()) throw new ExitSignal(-999); },
      rand, srand(s) { nextRand = makeRand(s); return 0; },
      time() { return BigInt(Math.floor(Date.now() / 1000)); },
      clock() { return BigInt(Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) * 1000)); },
      ldiv(a, b, line) { if (b === 0n) throw new CRuntimeError('división entera por cero (en C el programa se cierra con "Floating point exception")', line); return a / b; },
      lmod(a, b, line) { if (b === 0n) throw new CRuntimeError('resto (%) con divisor cero (en C el programa se cierra con "Floating point exception")', line); return a % b; },
      f2l(v) { return (isFinite(v) && v >= -9223372036854775808 && v < 9223372036854775808) ? BigInt(Math.trunc(v)) : -(2n ** 63n); },
      f2ul(v) { return (isFinite(v) && v >= 0 && v < 18446744073709551616) ? BigInt(Math.trunc(v)) : BigInt.asUintN(64, this.f2l(v)); },
      exit(c) { throw new ExitSignal(c | 0); },
      CRuntimeError, ExitSignal
    };
  }

  // Crea la función del programa. Si la página tiene una política que prohíbe eval (unsafe-eval),
  // se inyecta como <script> en línea, que esas políticas sí permiten.
  let progN = 0;
  function makeProgram(js) {
    try { return new Function('$rt', js); }
    catch (e) {
      if (typeof document === 'undefined') throw e;
      const key = '__cprog' + (++progN);
      const s = document.createElement('script');
      s.textContent = 'window.' + key + '=function($rt){' + js + '\n};';
      (document.head || document.documentElement).appendChild(s);
      s.remove();
      const f = window[key];
      try { delete window[key]; } catch (e2) { window[key] = undefined; }
      if (typeof f !== 'function') throw e;
      return f;
    }
  }

  async function runProgram(js, io) {
    const rt = createRuntime(io);
    let main;
    try {
      main = makeProgram(js)(rt);
      const rc = await main();
      return { code: (rc | 0) & 255 };
    } catch (e) {
      if (e instanceof ExitSignal) return e.code === -999 ? { stopped: true, code: 0 } : { code: e.code & 255 };
      if (e instanceof CRuntimeError) return { error: e.message, line: e.cline, code: 136 };
      if (e instanceof RangeError && /Invalid (string|array) length|allocation/i.test(e.message)) return { error: 'el programa pidió más memoria de la que el editor puede darle', code: 139 };
      if (e instanceof RangeError && /call stack/i.test(e.message)) return { error: 'desbordamiento de la pila (recursión infinita o muy profunda)', code: 139 };
      return { error: 'Error inesperado del editor (no es culpa de tu programa): ' + (e && e.message) + '. Avisale al profe.', code: 1 };
    }
  }

  const api = { cformat, createRuntime, runProgram, fixedExact, CRuntimeError, ExitSignal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CRT = api;
})(typeof self !== 'undefined' ? self : this);

var RT_SRC = "/* Runtime del Editor C: printf/scanf con la misma salida que gcc/glibc.\n   Se usa en el worker del navegador y en node (tests). */\n(function (root) {\n  'use strict';\n\n  class CRuntimeError extends Error {\n    constructor(msg, line) { super(msg); this.cline = line; }\n  }\n  class ExitSignal { constructor(code) { this.code = code; } }\n\n  /* ---------- formato de números como glibc ---------- */\n\n  function signBit(x) { return x \u003c 0 || Object.is(x, -0); }\n\n  // |x| con p decimales, redondeo exacto \"half-even\" (igual que glibc)\n  function fixedExact(x, p) {\n    x = Math.abs(x);\n    const dv = new DataView(new ArrayBuffer(8));\n    dv.setFloat64(0, x);\n    const hi = dv.getUint32(0), lo = dv.getUint32(4);\n    const exp = (hi >>> 20) & 0x7ff;\n    let mant = (BigInt(hi & 0xfffff) \u003c\u003c 32n) | BigInt(lo);\n    let e;\n    if (exp === 0) e = -1074; else { mant |= 1n \u003c\u003c 52n; e = exp - 1075; }\n    const num = mant * (10n ** BigInt(p));\n    let q;\n    if (e >= 0) q = num \u003c\u003c BigInt(e);\n    else {\n      const sh = BigInt(-e);\n      q = num >> sh;\n      const rem = num - (q \u003c\u003c sh);\n      const half = 1n \u003c\u003c (sh - 1n);\n      if (rem > half || (rem === half && (q & 1n) === 1n)) q += 1n;\n    }\n    let s = q.toString();\n    if (p > 0) {\n      s = s.padStart(p + 1, '0');\n      s = s.slice(0, -p) + '.' + s.slice(-p);\n    }\n    return s;\n  }\n\n  // dígitos decimales exactos de |x| en notación científica con p decimales (half-even, como glibc)\n  function expDigits(x, p) {\n    x = Math.abs(x);\n    if (x === 0) return { d: '0'.repeat(p + 1), e: 0 };\n    const dv = new DataView(new ArrayBuffer(8));\n    dv.setFloat64(0, x);\n    const hi = dv.getUint32(0), lo = dv.getUint32(4);\n    const ex = (hi >>> 20) & 0x7ff;\n    let mant = (BigInt(hi & 0xfffff) \u003c\u003c 32n) | BigInt(lo);\n    let e2;\n    if (ex === 0) e2 = -1074; else { mant |= 1n \u003c\u003c 52n; e2 = ex - 1075; }\n    let e10 = Math.floor(Math.log10(x));\n    for (let tries = 0; tries \u003c 4; tries++) {\n      const k = e10 - p; // N = x / 10^k\n      let num = mant, den = 1n;\n      if (e2 >= 0) num \u003c\u003c= BigInt(e2); else den \u003c\u003c= BigInt(-e2);\n      if (k > 0) den *= 10n ** BigInt(k); else if (k \u003c 0) num *= 10n ** BigInt(-k);\n      let q = num / den;\n      const rem = num - q * den;\n      if (rem * 2n > den || (rem * 2n === den && (q & 1n) === 1n)) q += 1n;\n      const lowB = 10n ** BigInt(p), highB = lowB * 10n;\n      if (q >= highB) { e10++; continue; }\n      if (q \u003c lowB) { e10--; continue; }\n      return { d: q.toString(), e: e10 };\n    }\n    return { d: '0'.repeat(p + 1), e: 0 };\n  }\n\n  function expStr(e10, upper) {\n    const s = (e10 \u003c 0 ? '-' : '+') + String(Math.abs(e10)).padStart(2, '0');\n    return (upper ? 'E' : 'e') + s;\n  }\n  function expForm(x, p, upper) {\n    const r = expDigits(x, p);\n    return r.d[0] + (p > 0 ? '.' + r.d.slice(1) : '') + expStr(r.e, upper);\n  }\n\n  function gForm(x, p, alt, upper) {\n    if (p === 0) p = 1;\n    if (x === 0) return alt ? '0.' + '0'.repeat(p - 1) : '0';\n    const X = expDigits(x, p - 1).e;\n    let s;\n    if (X >= -4 && X \u003c p) {\n      s = fixedExact(x, p - 1 - X);\n      if (!alt && s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\\.$/, '');\n      else if (alt && s.indexOf('.') \u003c 0) s += '.';\n    } else {\n      s = expForm(x, p - 1, upper);\n      if (!alt) s = s.replace(/\\.?0+([eE])/, '$1');\n      else if (s.indexOf('.') \u003c 0) s = s.replace(/([eE])/, '.$1');\n    }\n    return s;\n  }\n\n  const SPEC = /%([-+ #0]*)(\\*|\\d+)?(?:\\.(\\*|\\d*))?(hh|h|ll|l|L|z|j|t)?([diouxXfFeEgGcsp%])/g;\n\n  function toBig(a) {\n    if (typeof a === 'bigint') return a;\n    if (typeof a === 'number' && isFinite(a)) return BigInt(Math.trunc(a));\n    return 0n;\n  }\n  const ENC = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;\n  const DEC = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;\n  function ulen(s) { if (!ENC) return s.length; for (let i = 0; i \u003c s.length; i++) if (s.charCodeAt(i) > 127) return ENC.encode(s).length; return s.length; }\n  function cformat(fmt, args) {\n    if (fmt.indexOf('\\0') >= 0) fmt = fmt.slice(0, fmt.indexOf('\\0'));\n    let ai = 0;\n    return fmt.replace(SPEC, function (m, flags, width, prec, len, conv) {\n      if (conv === '%') return '%';\n      if ((width !== undefined && width !== '*' && parseInt(width, 10) > 100000) || (prec !== undefined && prec !== '*' && prec !== '' && parseInt(prec, 10) > 100000)) throw new CRuntimeError('el ancho o la precisión del formato es demasiado grande para este editor (máximo 100000)');\n      let w = width === undefined ? 0 : (width === '*' ? (Number(args[ai++]) | 0) : parseInt(width, 10));\n      let left = flags.indexOf('-') >= 0, zero = flags.indexOf('0') >= 0, plus = flags.indexOf('+') >= 0,\n        space = flags.indexOf(' ') >= 0, alt = flags.indexOf('#') >= 0;\n      if (w \u003c 0) { left = true; w = -w; }\n      let p = prec === undefined ? -1 : (prec === '*' ? (Number(args[ai++]) | 0) : (prec === '' ? 0 : parseInt(prec, 10)));\n      const arg = args[ai++];\n      let body = '', sign = '', numeric = true, isSpecial = false;\n      const upper = conv === 'F' || conv === 'E' || conv === 'G' || conv === 'X';\n      if (conv === 'd' || conv === 'i') {\n        let bv = toBig(arg);\n        const bits = len === 'hh' ? 8 : len === 'h' ? 16 : (len === 'l' || len === 'll' || len === 'z' || len === 'j' || len === 't') ? 64 : 32;\n        if (bits === 64 && typeof arg === 'number') bv = BigInt.asUintN(32, bv);\n        bv = BigInt.asIntN(bits, bv);\n        const neg = bv \u003c 0n;\n        sign = neg ? '-' : (plus ? '+' : (space ? ' ' : ''));\n        body = (neg ? -bv : bv).toString();\n        if (p >= 0) { zero = false; body = body.padStart(p, '0'); if (p === 0 && bv === 0n) body = ''; }\n      } else if (conv === 'u' || conv === 'x' || conv === 'X' || conv === 'o') {\n        let bv = toBig(arg);\n        const bits = len === 'hh' ? 8 : len === 'h' ? 16 : (len === 'l' || len === 'll' || len === 'z' || len === 'j' || len === 't') ? 64 : 32;\n        if (bits === 64 && typeof arg === 'number') bv = BigInt.asUintN(32, bv);\n        bv = BigInt.asUintN(bits, bv);\n        const base = conv === 'u' ? 10 : (conv === 'o' ? 8 : 16);\n        body = bv.toString(base);\n        if (upper) body = body.toUpperCase();\n        if (p >= 0) { zero = false; body = body.padStart(p, '0'); if (p === 0 && bv === 0n && !(alt && conv === 'o')) body = ''; }\n        if (alt && bv !== 0n) { if (conv === 'x') body = '0x' + body; else if (conv === 'X') body = '0X' + body; else if (conv === 'o' && body[0] !== '0') body = '0' + body; }\n      } else if ('fFeEgG'.indexOf(conv) >= 0) {\n        const v = typeof arg === 'number' ? arg : (typeof arg === 'bigint' ? Number(arg) : 0);\n        const neg = Number.isNaN(v) ? true : signBit(v);\n        sign = neg ? '-' : (plus ? '+' : (space ? ' ' : ''));\n        if (Number.isNaN(v)) { body = upper ? 'NAN' : 'nan'; isSpecial = true; }\n        else if (!isFinite(v)) { body = upper ? 'INF' : 'inf'; isSpecial = true; }\n        else {\n          const pp = p \u003c 0 ? 6 : p;\n          if (conv === 'f' || conv === 'F') { body = fixedExact(v, pp); if (alt && pp === 0) body += '.'; }\n          else if (conv === 'e' || conv === 'E') body = expForm(v, pp, upper);\n          else body = gForm(v, pp, alt, upper);\n        }\n        if (isSpecial) zero = false;\n      } else if (conv === 'c') {\n        numeric = false; zero = false;\n        body = String.fromCharCode(typeof arg === 'number' ? (arg & 255) : (typeof arg === 'bigint' ? Number(BigInt.asUintN(8, arg)) : 63));\n      } else if (conv === 's') {\n        numeric = false; zero = false;\n        body = typeof arg === 'string' ? arg : String(arg === undefined ? '(null)' : arg);\n        if (p >= 0) { if (ENC && ulen(body) !== body.length) body = DEC.decode(ENC.encode(body).slice(0, p)); else body = body.slice(0, p); }\n      } else if (conv === 'p') {\n        numeric = false; body = '0x' + ((typeof arg === 'number' ? arg : 0) >>> 0).toString(16);\n      }\n      let out = sign + body;\n      const olen = ulen(out);\n      if (olen \u003c w) {\n        if (left) out = out + ' '.repeat(w - olen);\n        else if (zero && numeric) {\n          let pre = sign;\n          let rest = body;\n          if ((conv === 'x' || conv === 'X') && alt && /^0[xX]/.test(rest)) { pre += rest.slice(0, 2); rest = rest.slice(2); }\n          out = pre + '0'.repeat(w - olen) + rest;\n        } else out = ' '.repeat(w - olen) + out;\n      }\n      return out;\n    });\n  }\n\n  /* ---------- entrada estándar ---------- */\n\n  function createRuntime(io) {\n    // io.write(s)  io.readLine() -> Promise\u003cstring|null>   (null = fin de entrada)\n    let buf = '', pos = 0, eof = false;\n\n    async function fill() {\n      if (eof) return false;\n      const line = await io.readLine();\n      if (line === null || line === undefined) { eof = true; return false; }\n      buf = buf.slice(pos) + line + '\\n';\n      pos = 0;\n      return true;\n    }\n    async function peek() {\n      while (pos >= buf.length) { if (!(await fill())) return -1; }\n      return buf.charCodeAt(pos);\n    }\n    const isWs = (c) => c === 32 || (c >= 9 && c \u003c= 13);\n\n    async function skipWs() {\n      for (;;) { const c = await peek(); if (c \u003c 0 || !isWs(c)) return c; pos++; }\n    }\n\n    function conv(t, v) {\n      if (typeof v === 'bigint') {\n        switch (t) {\n          case 'int': return Number(BigInt.asIntN(32, v));\n          case 'uint': return Number(BigInt.asUintN(32, v));\n          case 'char': return Number(BigInt.asIntN(8, v));\n          case 'uchar': return Number(BigInt.asUintN(8, v));\n          case 'short': return Number(BigInt.asIntN(16, v));\n          case 'ushort': return Number(BigInt.asUintN(16, v));\n          case 'long': return BigInt.asIntN(64, v);\n          case 'ulong': return BigInt.asUintN(64, v);\n          case 'float': return Math.fround(Number(v));\n          default: return Number(v);\n        }\n      }\n      switch (t) {\n        case 'int': return v | 0;\n        case 'uint': return v >>> 0;\n        case 'char': return (v \u003c\u003c 24) >> 24;\n        case 'uchar': return v & 255;\n        case 'short': return (v \u003c\u003c 16) >> 16;\n        case 'ushort': return v & 65535;\n        case 'float': return Math.fround(v);\n        case 'long': return BigInt(isFinite(v) ? Math.trunc(v) : 0);\n        case 'ulong': return BigInt.asUintN(64, BigInt(isFinite(v) ? Math.trunc(v) : 0));\n        default: return v;\n      }\n    }\n\n    // refs: [[get,set],...]  types: ['int','float',...]\n    async function scanf(fmt, refs, types, line) {\n      let count = 0, ri = 0, i = 0;\n      const n = fmt.length;\n      let first = true;\n      while (i \u003c n) {\n        const ch = fmt[i];\n        if (ch === '%') {\n          i++;\n          if (fmt[i] === '%') {\n            const c = await skipWs();\n            if (c !== 37) return count === 0 && c \u003c 0 ? -1 : count;\n            pos++; i++; continue;\n          }\n          let suppress = false;\n          if (fmt[i] === '*') { suppress = true; i++; }\n          let w = '';\n          while (/\\d/.test(fmt[i] || '')) w += fmt[i++];\n          const maxw = w ? parseInt(w, 10) : Infinity;\n          let len = '';\n          while ('hlLzjt'.indexOf(fmt[i]) >= 0 && fmt[i] !== undefined) len += fmt[i++];\n          const sp = fmt[i++];\n          if (sp === 'c') {\n            const c = await peek();\n            if (c \u003c 0) return count === 0 ? -1 : count;\n            pos++;\n            if (!suppress) { const r = refs[ri], t = types[ri]; ri++; r[1](conv(t, c)); count++; }\n            first = false; continue;\n          }\n          if (sp === 'd' || sp === 'i' || sp === 'u' || sp === 'x' || sp === 'X' || sp === 'o') {\n            const c0 = await skipWs();\n            if (c0 \u003c 0) return count === 0 ? -1 : count;\n            const rest = buf.slice(pos);\n            const re = (sp === 'x' || sp === 'X') ? /^[+-]?(0[xX])?[0-9a-fA-F]+/ : (sp === 'o' ? /^[+-]?[0-7]+/ : (sp === 'i' ? /^[+-]?(0[xX][0-9a-fA-F]+|0[0-7]*|[1-9][0-9]*)/ : /^[+-]?[0-9]+/));\n            const m = re.exec(rest.slice(0, isFinite(maxw) ? maxw : undefined));\n            if (!m) return count;\n            pos += m[0].length;\n            let txt = m[0], neg = false;\n            if (txt[0] === '+' || txt[0] === '-') { neg = txt[0] === '-'; txt = txt.slice(1); }\n            let radix = 10;\n            if (sp === 'x' || sp === 'X') { radix = 16; txt = txt.replace(/^0[xX]/, ''); }\n            else if (sp === 'o') radix = 8;\n            else if (sp === 'i') { if (/^0[xX]/.test(txt)) { radix = 16; txt = txt.slice(2); } else if (/^0[0-7]/.test(txt)) radix = 8; }\n            let v = BigInt((radix === 16 ? '0x' : (radix === 8 ? '0o' : '')) + txt);\n            if (neg) v = -v;\n            if (sp === 'd' || sp === 'i') { if (v > 9223372036854775807n) v = 9223372036854775807n; else if (v \u003c -9223372036854775808n) v = -9223372036854775808n; }\n            else { const mag = neg ? -v : v; if (mag > 18446744073709551615n) v = 18446744073709551615n; else if (neg) v = BigInt.asUintN(64, v); }\n            if (!suppress) { const r = refs[ri], t = types[ri]; ri++; r[1](conv(t, v)); count++; }\n            first = false; continue;\n          }\n          if ('feEgG'.indexOf(sp) >= 0) {\n            const c0 = await skipWs();\n            if (c0 \u003c 0) return count === 0 ? -1 : count;\n            const rest = buf.slice(pos);\n            const m = /^[+-]?(\\d+\\.?\\d*([eE][+-]?\\d+)?|\\.\\d+([eE][+-]?\\d+)?|inf(inity)?|nan)/i.exec(rest.slice(0, isFinite(maxw) ? maxw : undefined));\n            if (!m) return count;\n            pos += m[0].length;\n            const v = /inf/i.test(m[0]) ? (m[0][0] === '-' ? -Infinity : Infinity) : (/nan/i.test(m[0]) ? NaN : parseFloat(m[0]));\n            if (!suppress) { const r = refs[ri], t = types[ri]; ri++; r[1](conv(t, v)); count++; }\n            first = false; continue;\n          }\n          return count; // especificador no soportado\n        } else if (isWs(fmt.charCodeAt(i))) {\n          while (i \u003c n && isWs(fmt.charCodeAt(i))) i++;\n          await skipWs();\n        } else {\n          const c = await peek();\n          if (c \u003c 0) return count === 0 ? -1 : count;\n          if (c !== fmt.charCodeAt(i)) return count;\n          pos++; i++;\n        }\n      }\n      return count;\n    }\n\n    async function getchar() {\n      const c = await peek();\n      if (c \u003c 0) return -1;\n      pos++;\n      return c;\n    }\n\n    let seed = 1;\n    // rand()/srand() como glibc (TYPE_3, r[i-3] + r[i-31]): misma secuencia que gcc en Linux\n    function makeRand(sd) {\n      sd = sd >>> 0; if (sd === 0) sd = 1;\n      const rs = new Int32Array(31); rs[0] = sd | 0;\n      for (let i = 1; i \u003c 31; i++) { const hi = Math.trunc(rs[i - 1] / 127773), lo = rs[i - 1] % 127773; let w = 16807 * lo - 2836 * hi; if (w \u003c 0) w += 2147483647; rs[i] = w; }\n      const buf = []; for (let i = 0; i \u003c 31; i++) buf.push(rs[i] >>> 0);\n      let f = 3, rI = 0;\n      const next = () => { buf[f] = (buf[f] + buf[rI]) >>> 0; const res = buf[f] >>> 1; f = (f + 1) % 31; rI = (rI + 1) % 31; return res; };\n      for (let i = 0; i \u003c 310; i++) next();\n      return next;\n    }\n    let nextRand = makeRand(1);\n    function rand() { return nextRand(); }\n\n    return {\n      printf(fmt, args, line) { let s; try { s = cformat(fmt, args); } catch (e) { if (e instanceof CRuntimeError && e.cline == null) e.cline = line; throw e; } io.write(s); return ulen(s); },\n      puts(s) { io.write(s + '\\n'); return 1; },\n      putchar(c) { io.write(String.fromCharCode(c & 255)); return c; },\n      scanf, getchar,\n      idiv(a, b, line) { if (b === 0) throw new CRuntimeError('división entera por cero (en C el programa se cierra con \"Floating point exception\")', line); return Math.trunc(a / b); },\n      imod(a, b, line) { if (b === 0) throw new CRuntimeError('resto (%) con divisor cero (en C el programa se cierra con \"Floating point exception\")', line); return a % b; },\n      ix(i, len, line) {\n        if (typeof i === 'bigint') i = Number(i);\n        if (i \u003c 0 || i >= len) throw new CRuntimeError('índice ' + i + ' fuera del arreglo (tiene ' + len + ' posiciones: 0 a ' + (len - 1) + ')', line);\n        return i;\n      },\n      d2i(v) { return (v > -2147483649 && v \u003c 2147483648) ? (v | 0) : -2147483648; },\n      mk(dims, fill, line) {\n        dims = dims.map(Number);\n        const build = (k) => { const a = new Array(dims[k]); for (let i = 0; i \u003c dims[k]; i++) a[i] = k === dims.length - 1 ? fill : build(k + 1); return a; };\n        for (const d of dims) if (!(d > 0)) throw new CRuntimeError('tamaño de arreglo inválido (' + d + ')', line);\n        const total = dims.reduce((a, b) => a * b, 1);\n        if (total > 20000000) throw new CRuntimeError('el arreglo es demasiado grande para este editor (' + total + ' elementos; el máximo es 20 millones). En un programa real esto suele cerrarse por falta de memoria de pila', line);\n        return build(0);\n      },\n      pad(list, dims) {\n        const d = dims[0];\n        const out = list.slice(0, d);\n        if (dims.length > 1) { for (let i = 0; i \u003c out.length; i++) out[i] = this.pad(out[i], dims.slice(1)); while (out.length \u003c d) out.push(this.mk(dims.slice(1), 0)); }\n        else while (out.length \u003c d) out.push(0);\n        return out;\n      },\n      init(list, dims, fill, line) {\n        const arr = this.mk(dims, fill === undefined ? 0 : fill, line);\n        const fillFrom = (a, ds, lst, st) => {\n          for (let k = 0; k \u003c ds[0]; k++) {\n            if (st.i >= lst.length) break;\n            if (ds.length === 1) { let v = lst[st.i++]; while (Array.isArray(v)) v = v[0]; a[k] = v === undefined ? 0 : v; }\n            else { const it = lst[st.i]; if (Array.isArray(it)) { st.i++; fillFrom(a[k], ds.slice(1), it, { i: 0 }); } else fillFrom(a[k], ds.slice(1), lst, st); }\n          }\n        };\n        fillFrom(arr, dims, list, { i: 0 });\n        return arr;\n      },\n      rint(x) { if (!isFinite(x)) return x; const f = Math.floor(x), d = x - f; if (d \u003c 0.5) return f; if (d > 0.5) return f + 1; return (f % 2 === 0) ? f : f + 1; },\n      lop(op, a, b) {\n        if (!isFinite(a)) a = 0; if (!isFinite(b)) b = 0;\n        const x = BigInt.asIntN(64, BigInt(Math.trunc(a))), y = BigInt.asIntN(64, BigInt(Math.trunc(b)));\n        let v;\n        switch (op) { case '&': v = x & y; break; case '|': v = x | y; break; case '^': v = x ^ y; break; case '\u003c\u003c': v = x \u003c\u003c (y & 63n); break; default: v = x >> (y & 63n); }\n        return Number(BigInt.asIntN(64, v));\n      },\n      round(x) { return x \u003c 0 ? -Math.round(-x) : Math.round(x); },\n      fmod(a, b) { return a % b; },\n      yield: async function () { await new Promise((res) => setTimeout(res, 0)); if (io.cancelled && io.cancelled()) throw new ExitSignal(-999); },\n      rand, srand(s) { nextRand = makeRand(s); return 0; },\n      time() { return BigInt(Math.floor(Date.now() / 1000)); },\n      clock() { return BigInt(Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) * 1000)); },\n      ldiv(a, b, line) { if (b === 0n) throw new CRuntimeError('división entera por cero (en C el programa se cierra con \"Floating point exception\")', line); return a / b; },\n      lmod(a, b, line) { if (b === 0n) throw new CRuntimeError('resto (%) con divisor cero (en C el programa se cierra con \"Floating point exception\")', line); return a % b; },\n      f2l(v) { return (isFinite(v) && v >= -9223372036854775808 && v \u003c 9223372036854775808) ? BigInt(Math.trunc(v)) : -(2n ** 63n); },\n      f2ul(v) { return (isFinite(v) && v >= 0 && v \u003c 18446744073709551616) ? BigInt(Math.trunc(v)) : BigInt.asUintN(64, this.f2l(v)); },\n      exit(c) { throw new ExitSignal(c | 0); },\n      CRuntimeError, ExitSignal\n    };\n  }\n\n  // Crea la función del programa. Si la página tiene una política que prohíbe eval (unsafe-eval),\n  // se inyecta como \u003cscript> en línea, que esas políticas sí permiten.\n  let progN = 0;\n  function makeProgram(js) {\n    try { return new Function('$rt', js); }\n    catch (e) {\n      if (typeof document === 'undefined') throw e;\n      const key = '__cprog' + (++progN);\n      const s = document.createElement('script');\n      s.textContent = 'window.' + key + '=function($rt){' + js + '\\n};';\n      (document.head || document.documentElement).appendChild(s);\n      s.remove();\n      const f = window[key];\n      try { delete window[key]; } catch (e2) { window[key] = undefined; }\n      if (typeof f !== 'function') throw e;\n      return f;\n    }\n  }\n\n  async function runProgram(js, io) {\n    const rt = createRuntime(io);\n    let main;\n    try {\n      main = makeProgram(js)(rt);\n      const rc = await main();\n      return { code: (rc | 0) & 255 };\n    } catch (e) {\n      if (e instanceof ExitSignal) return e.code === -999 ? { stopped: true, code: 0 } : { code: e.code & 255 };\n      if (e instanceof CRuntimeError) return { error: e.message, line: e.cline, code: 136 };\n      if (e instanceof RangeError && /Invalid (string|array) length|allocation/i.test(e.message)) return { error: 'el programa pidió más memoria de la que el editor puede darle', code: 139 };\n      if (e instanceof RangeError && /call stack/i.test(e.message)) return { error: 'desbordamiento de la pila (recursión infinita o muy profunda)', code: 139 };\n      return { error: 'Error inesperado del editor (no es culpa de tu programa): ' + (e && e.message) + '. Avisale al profe.', code: 1 };\n    }\n  }\n\n  const api = { cformat, createRuntime, runProgram, fixedExact, CRuntimeError, ExitSignal };\n  if (typeof module !== 'undefined' && module.exports) module.exports = api;\n  else root.CRT = api;\n})(typeof self !== 'undefined' ? self : this);\n";

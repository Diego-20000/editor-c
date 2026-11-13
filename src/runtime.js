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
  // Signo de un NaN, como en gcc para x86-64: una cuenta inválida (0.0/0.0, sqrt(-1)) da «-nan», y NAN, atof("nan") o scanf("nan") dan «nan».
  // JavaScript no distingue el signo de un NaN (y según el motor la cuenta 0/0 puede salir con uno u otro bit), así que el «nan» sin signo se marca
  // con una huella en la parte baja del NaN, que viaja con el valor (el hardware la conserva al sumar, restar, etc.). Todo NaN sin huella es «-nan».
  // Si el navegador no conserva la huella, todos salen «-nan» (lo que ya pasaba antes).
  const NANF = new Float64Array(1), NANU = new Uint32Array(NANF.buffer);
  const NAN_POS = (function () { NANU[0] = 1; NANU[1] = 0x7FF80000; return NANF[0]; })();
  const NAN_NEG = NaN;
  const NAN_OK = (function () {
    try {
      const id = Function('a', 'return a'), ng = Function('a', 'return -a'), sm = Function('a', 'return a + 1');
      const huella = (v) => { NANF[0] = v; return (NANU[0] & 1) === 1 && (NANU[1] & 0x7FF80000) === 0x7FF80000; };
      return huella(NAN_POS) && huella(id(NAN_POS)) && huella(ng(NAN_POS)) && huella(sm(NAN_POS)) && !((NANF[0] = NAN_NEG), (NANU[0] & 1));
    } catch (e) { return false; }
  })();
  function nanNegativo(v) { if (!NAN_OK) return true; NANF[0] = v; if ((NANU[0] & 1) !== 1) return true; return (NANU[1] >>> 31) === 1; }


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
  // La entrada y los textos de C son BYTES (UTF-8). La entrada se guarda como «texto binario»: cada carácter JS vale un byte (0..255).
  function aBin(s) { if (!ENC) return s; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 127) { const b = ENC.encode(s); let o = ''; for (let k = 0; k < b.length; k++) o += String.fromCharCode(b[k]); return o; } return s; }
  const binBytes = (t) => { const o = []; for (let i = 0; i < t.length; i++) o.push(t.charCodeAt(i) & 255); return o; };
  // Lo que se imprime de a un byte (%c, putchar) se decodifica como UTF-8 en continuo: dos llamadas con 0xC3 y 0xA9 muestran una «é», como la terminal con gcc
  let outDec = DEC ? new TextDecoder() : null;
  function byteOut(b) { b &= 255; if (b < 128 || !outDec) return String.fromCharCode(b); return outDec.decode(Uint8Array.of(b), { stream: true }); }
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
      if (w > 100000 || p > 100000) throw new CRuntimeError('el ancho o la precisión del formato es demasiado grande para este editor (máximo 100000)');   // también cuando viene de un * 
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
        const neg = Number.isNaN(v) ? nanNegativo(v) : signBit(v);
        sign = neg ? '-' : (plus ? '+' : (space ? ' ' : ''));
        if (Number.isNaN(v)) { body = upper ? 'NAN' : 'nan'; isSpecial = true; }
        else if (!isFinite(v)) { body = upper ? 'INF' : 'inf'; isSpecial = true; }
        else {
          const pp = p < 0 ? 6 : p;
          if (conv === 'f' || conv === 'F') { body = fixedExact(v, pp); if (alt && pp === 0) body += '.'; }
          else if (conv === 'e' || conv === 'E') { body = expForm(v, pp, upper); if (alt && pp === 0) body = body.replace(/^(-?\d)(e|E)/, '$1.$2'); }
          else body = gForm(v, pp, alt, upper);
        }
        if (isSpecial) zero = false;
      } else if (conv === 'c') {
        numeric = false; zero = false;
        body = byteOut(typeof arg === 'number' ? arg : (typeof arg === 'bigint' ? Number(BigInt.asUintN(8, arg)) : 63));
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

  /* ---------- textos de C: arreglos de char con terminador 0 ---------- */
  const sb = (b) => (b > 127 ? b - 256 : b); // byte -> char con signo
  function aBytes(x) { // JS string (literal) o arreglo de char -> bytes hasta el 0
    if (typeof x === 'string') return ENC ? Array.from(ENC.encode(x)) : Array.from(x).map((c) => c.charCodeAt(0) & 255);
    const out = [];
    for (let i = 0; i < x.length; i++) { const b = x[i] & 255; if (b === 0) break; out.push(b); }
    return out;
  }
  function tostr(x) {
    if (typeof x === 'string') return x;
    const b = aBytes(x);
    for (let i = 0; i < b.length; i++) if (b[i] > 127) return DEC ? DEC.decode(Uint8Array.from(b)) : String.fromCharCode.apply(null, b);
    return String.fromCharCode.apply(null, b);
  }
  function cstr(s, size) { // literal -> arreglo de char (con terminador y relleno)
    const b = aBytes(s);
    const n = size === undefined ? b.length + 1 : size;
    const a = new Array(n).fill(0);
    for (let i = 0; i < n && i < b.length; i++) a[i] = sb(b[i]);
    return a;
  }
  function escribir(dst, bytes, conCero, que, line) { // copia bytes (y un 0) a dst, controlando que entren
    const need = bytes.length + (conCero ? 1 : 0);
    if (need > dst.length) throw new CRuntimeError(que + ' necesita ' + need + ' posiciones pero el arreglo tiene ' + dst.length + ' (en C esto sobrescribe la memoria de otras variables)', line);
    for (let i = 0; i < bytes.length; i++) dst[i] = sb(bytes[i]);
    if (conCero) dst[bytes.length] = 0;
  }

  /* ---------- entrada estándar ---------- */

  function createRuntime(io) {
    // io.write(s)  io.readLine() -> Promise<string|null>   (null = fin de entrada)
    outDec = DEC ? new TextDecoder() : null;
    let buf = '', pos = 0, eof = false;

    async function fill() {
      if (eof) return false;
      const line = await io.readLine();
      if (line === null || line === undefined) { eof = true; return false; }
      buf = buf.slice(pos) + aBin(line + '\n');   // la línea tipeada pasa a bytes UTF-8 una sola vez
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
    // decimal escrito en hexadecimal (0x1F, 0x1.8p3), como lo lee strtod de glibc
    function hexFloat(t) {
      const neg = t[0] === '-', m = /^[+-]?0[xX]([0-9a-fA-F]*)\.?([0-9a-fA-F]*)(?:[pP]([+-]?\d+))?/.exec(t);
      let v = 0; const ent = m[1], fr = m[2];
      for (const c of ent) v = v * 16 + parseInt(c, 16);
      let esc = 1 / 16; for (const c of fr) { v += parseInt(c, 16) * esc; esc /= 16; }
      if (m[3]) v *= Math.pow(2, parseInt(m[3], 10));
      return neg ? -v : v;
    }
    async function scanf(fmt, refs, types, line) {
      fmt = aBin(fmt);   // el formato también son bytes: los literales y los %[...] con letras acentuadas se comparan byte a byte
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
          if (sp === 's' || sp === '[') {
            let neg = false, set = null;
            if (sp === '[') {
              if (fmt[i] === '^') { neg = true; i++; }
              let s0 = '';
              if (fmt[i] === ']') { s0 += ']'; i++; }
              while (i < n && fmt[i] !== ']') s0 += fmt[i++];
              i++;
              set = s0.replace(/(.)-(.)/g, (m, a, b) => { let o = ''; for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); c++) o += String.fromCharCode(c); return o; });
            }
            let c0 = sp === 's' ? await skipWs() : await peek();
            if (c0 < 0) return count === 0 ? -1 : count;
            let txt = '';
            for (;;) {
              const c = await peek();
              if (c < 0 || txt.length >= maxw) break;
              if (sp === 's' ? isWs(c) : (set.indexOf(String.fromCharCode(c)) >= 0) === neg) break;
              txt += String.fromCharCode(c); pos++;
            }
            if (sp === '[' && txt.length === 0) return count;
            if (!suppress) { const dst = refs[ri][0](); ri++; escribir(dst, binBytes(txt), true, 'scanf("%s") guarda el texto y su terminador y', line); count++; }
            first = false; continue;
          }
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
            if (!m) { if (/^[+-]/.test(rest) && maxw >= 1) pos += 1; return count; }
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
            const m = /^[+-]?(0[xX]([0-9a-fA-F]+\.?[0-9a-fA-F]*|\.[0-9a-fA-F]+)([pP][+-]?\d+)?|\d+\.?\d*([eE][+-]?\d+)?|\.\d+([eE][+-]?\d+)?|inf(inity)?|nan)/i.exec(rest.slice(0, isFinite(maxw) ? maxw : undefined));
            if (!m) { if (/^[+-]/.test(rest) && maxw >= 1) pos += 1; return count; }
            pos += m[0].length;
            const hx = /^[+-]?0[xX]/.exec(m[0]);
            const v = /inf/i.test(m[0]) ? (m[0][0] === '-' ? -Infinity : Infinity) : (/nan/i.test(m[0]) ? (m[0][0] === '-' ? NAN_NEG : NAN_POS) : (hx ? hexFloat(m[0]) : parseFloat(m[0])));
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
      puts(s) { io.write(tostr(s) + '\n'); return 1; },
      cstr, tostr,
      strlen(a) { return BigInt(aBytes(a).length); },
      strcpy(dst, src, line) { escribir(dst, aBytes(src), true, 'strcpy', line); return 1; },
      strncpy(dst, src, n, line) {
        n = Number(n); const b = aBytes(src).slice(0, n);
        if (n > dst.length) throw new CRuntimeError('strncpy copia ' + n + ' caracteres pero el arreglo tiene ' + dst.length + ' posiciones', line);
        for (let i = 0; i < n; i++) dst[i] = i < b.length ? sb(b[i]) : 0;
        return 1;
      },
      strcat(dst, src, line) { const d = aBytes(dst), s = aBytes(src); escribir(dst, d.concat(s), true, 'strcat', line); return 1; },
      strncat(dst, src, n, line) { const d = aBytes(dst), s = aBytes(src).slice(0, Number(n)); escribir(dst, d.concat(s), true, 'strncat', line); return 1; },
      strcmp(a, b) { const x = aBytes(a), y = aBytes(b); for (let i = 0; ; i++) { const p = i < x.length ? x[i] : 0, q = i < y.length ? y[i] : 0; if (p !== q || p === 0) return p - q; } },
      strncmp(a, b, n) { const x = aBytes(a), y = aBytes(b); n = Number(n); for (let i = 0; i < n; i++) { const p = i < x.length ? x[i] : 0, q = i < y.length ? y[i] : 0; if (p !== q) return p - q; if (p === 0) return 0; } return 0; },
      atoi(a) { const m = /^\s*[+-]?\d+/.exec(tostr(a)); return m ? Number(BigInt.asIntN(32, BigInt(m[0].trim()))) : 0; },
      atol(a) { const m = /^\s*[+-]?\d+/.exec(tostr(a)); return m ? BigInt.asIntN(64, BigInt(m[0].trim())) : 0n; },
      atof(a) {
        const t = tostr(a), z = /^\s*([+-]?)(inf(?:inity)?|nan)/i.exec(t);
        if (z) return /nan/i.test(z[2]) ? (z[1] === '-' ? NAN_NEG : NAN_POS) : (z[1] === '-' ? -Infinity : Infinity);
        const h = /^\s*[+-]?0[xX](?:[0-9a-fA-F]+\.?[0-9a-fA-F]*|\.[0-9a-fA-F]+)(?:[pP][+-]?\d+)?/.exec(t); if (h) return hexFloat(h[0].trim());
        const m = /^\s*[+-]?(\d+\.?\d*([eE][+-]?\d+)?|\.\d+([eE][+-]?\d+)?)/.exec(t); return m ? parseFloat(m[0]) : 0;
      },
      NANP: NAN_POS,
      neg: (v) => (v !== v ? (nanNegativo(v) ? NAN_POS : NAN_NEG) : -v),
      // las funciones de math.h de JavaScript devuelven un NaN «sin signo»: si el resultado es NaN, se le da el signo que le da glibc
      // (el de la entrada, si la entrada ya era NaN; si no, «-nan», como una cuenta inválida)
      nn(f, ...a) { const r = f(...a); if (r === r) return r; for (let i = 0; i < a.length; i++) if (a[i] !== a[i]) return a[i]; return NAN_NEG; },
      fabs(x) { return x !== x ? NAN_POS : Math.abs(x); },
      fmax(a, b) { return a !== a ? b : (b !== b ? a : Math.max(a, b)); },
      fmin(a, b) { return a !== a ? b : (b !== b ? a : Math.min(a, b)); },
      // glibc devuelve «nan» (sin signo) fuera del dominio de estas tres; el resto de las cuentas inválidas dan «-nan»
      asin(x) { return Math.abs(x) > 1 ? NAN_POS : Math.asin(x); },
      acos(x) { return Math.abs(x) > 1 ? NAN_POS : Math.acos(x); },
      log10(x) { return x < 0 ? NAN_POS : Math.log10(x); },
      sprintf(dst, fmt, args, line) { const s = cformat(fmt, args); const b = aBytes(s); escribir(dst, b, true, 'sprintf', line); return b.length; },
      snprintf(dst, n, fmt, args, line) {
        n = Number(n); const s = cformat(fmt, args); const b = aBytes(s);
        if (n > dst.length) throw new CRuntimeError('snprintf dice que el arreglo tiene ' + n + ' posiciones pero tiene ' + dst.length, line);
        if (n > 0) { const cut = b.slice(0, n - 1); for (let i = 0; i < cut.length; i++) dst[i] = sb(cut[i]); dst[cut.length] = 0; }
        return b.length;
      },
      async fgets(dst, n, line) { // lee una línea (con el \n) como fgets; devuelve 1 si leyó algo y 0 si no
        n = Number(n); const bytes = [];
        while (bytes.length < n - 1) {
          const c = await peek(); if (c < 0) break; pos++;
          bytes.push(c);
          if (c === 10) break;
        }
        if (!bytes.length) return 0;
        escribir(dst, bytes, true, 'fgets', line); return 1;
      },
      async gets(dst, line) {
        const bytes = []; let leyo = false;
        for (;;) { const c = await peek(); if (c < 0) break; pos++; leyo = true; if (c === 10) break; bytes.push(c); }
        if (!leyo) return 0;
        escribir(dst, bytes, true, 'gets', line); return 1;
      },
      putchar(c) { io.write(byteOut(c)); return c; },
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
      return { error: 'Error inesperado del editor (no es culpa de tu programa): ' + (e && e.message) + '. Avísale al profe.', code: 1 };
    }
  }

  const api = { cformat, createRuntime, runProgram, fixedExact, CRuntimeError, ExitSignal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CRT = api;
})(typeof self !== 'undefined' ? self : this);

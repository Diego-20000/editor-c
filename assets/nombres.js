/* Editor C, de Diego Segurotti (ArtPrograms Studio). Uso libre dentro de este sitio, sin fines comerciales. Prohibido copiar, redistribuir o vender sin permiso. PolyForm Strict License 1.0.0. */
/* Editor C: «¿Qué es esto?» para los nombres que pone el alumno (variables y funciones).
   No hay IA: se lee el propio código con reglas fijas (dónde se declara, de qué tipo es, dónde se le da valor, dónde se lee con scanf…),
   se decide qué papel cumple el nombre (contador, acumulador, bandera, parámetro…) y se completa una plantilla escrita a mano (kb/nuevo/NOMBRES.json).
   API: explicar(codigo, offset, plantillas) -> { rol, titulo, que_es, como_se_usa, error_tipico, detalle, ejemplo, nombre } o null.
   Navegador: window.Nombres. Node: module.exports. */
(function (root) {
  'use strict';

  var TIPOS = { int: 1, float: 1, double: 1, char: 1, long: 1, short: 1, unsigned: 1, signed: 1, bool: 1, void: 1, const: 1, static: 1, _Bool: 1 };
  var CONTROL = { if: 1, else: 1, while: 1, for: 1, do: 1, switch: 1, case: 1, default: 1, return: 1, break: 1, continue: 1, sizeof: 1, goto: 1 };
  var OPS3 = ['<<=', '>>=', '...'];
  var OPS2 = ['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '<<', '>>', '->', '&=', '|=', '^='];
  var ASIGNA = { '=': 1, '+=': 1, '-=': 1, '*=': 1, '/=': 1, '%=': 1, '&=': 1, '|=': 1, '^=': 1, '<<=': 1, '>>=': 1 };
  var FAM_PRINTF = { printf: 1, fprintf: 1, sprintf: 1, snprintf: 1, puts: 1 };

  /* ---------- lectura del código ---------- */

  function tokenizar(src) {
    var T = [], defines = Object.create(null), i = 0, n = src.length, line = 1, m;
    function inicioDeLinea(p) { for (var q = p - 1; q >= 0 && (src[q] === ' ' || src[q] === '\t'); q--); return q < 0 || src[q] === '\n'; }
    while (i < n) {
      var c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') {
        var f = src.indexOf('*/', i + 2), fin = f < 0 ? n : f + 2;
        for (var j = i; j < fin; j++) if (src[j] === '\n') line++;
        i = fin; continue;
      }
      if (c === '#' && inicioDeLinea(i)) {
        var ini = i, lin0 = line;
        while (i < n && src[i] !== '\n') { if (src[i] === '\\' && src[i + 1] === '\n') { line++; i++; } i++; }
        m = /^(#[ \t]*define[ \t]+)([A-Za-z_]\w*)(\()?/.exec(src.slice(ini, i));
        if (m && !defines[m[2]]) defines[m[2]] = { line: lin0, macro: !!m[3], i: ini + m[1].length, e: ini + m[1].length + m[2].length, valor: src.slice(ini + m[1].length + m[2].length, i).replace(/\s+/g, ' ').trim() };
        continue;
      }
      if (c === '"' || c === "'") {
        var q = c, st = i; i++;
        while (i < n && src[i] !== q && src[i] !== '\n') { if (src[i] === '\\') i++; i++; }
        if (src[i] === q) i++;
        T.push({ t: 'str', v: src.slice(st, i), line: line, i: st, e: i }); continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        m = /^(?:0[xX][0-9a-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)[uUlLfF]*/.exec(src.slice(i, i + 40));
        var ln = m ? m[0].length : 1;
        T.push({ t: 'num', v: src.slice(i, i + ln), line: line, i: i, e: i + ln }); i += ln; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var s = i; while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
        T.push({ t: 'id', v: src.slice(s, i), line: line, i: s, e: i }); continue;
      }
      var op = c, k;
      for (k = 0; k < OPS3.length; k++) if (src.substr(i, 3) === OPS3[k]) { op = OPS3[k]; break; }
      if (op === c) for (k = 0; k < OPS2.length; k++) if (src.substr(i, 2) === OPS2[k]) { op = OPS2[k]; break; }
      T.push({ t: 'op', v: op, line: line, i: i, e: i + op.length }); i += op.length;
    }
    return { T: T, defines: defines };
  }

  function esTipo(t) { return t && t.t === 'id' && TIPOS[t.v] === 1; }
  function esOp(t, v) { return !!t && t.t === 'op' && t.v === v; }

  // índice del cierre que corresponde a la apertura T[k] ('(' '[' '{'), o -1
  function cierre(T, k) {
    var ab = T[k].v, ce = ab === '(' ? ')' : ab === '[' ? ']' : '}', d = 0;
    for (var j = k; j < T.length; j++) {
      if (T[j].t !== 'op') continue;
      if (T[j].v === ab) d++;
      else if (T[j].v === ce) { d--; if (d === 0) return j; }
    }
    return -1;
  }
  // fin de la sentencia que empieza en T[k] (incluye el cuerpo de if/for/while y el else)
  function finSentencia(T, k) {
    var t = T[k];
    if (!t) return k;
    if (esOp(t, '{')) { var c = cierre(T, k); return c < 0 ? T.length - 1 : c; }
    if (t.t === 'id' && (t.v === 'if' || t.v === 'for' || t.v === 'while' || t.v === 'switch') && esOp(T[k + 1], '(')) {
      var h = cierre(T, k + 1); if (h < 0) return T.length - 1;
      var e = finSentencia(T, h + 1);
      if (t.v === 'if' && T[e + 1] && T[e + 1].t === 'id' && T[e + 1].v === 'else') return finSentencia(T, e + 2);
      return e;
    }
    if (t.t === 'id' && t.v === 'do') {
      var e2 = finSentencia(T, k + 1);
      if (T[e2 + 1] && T[e2 + 1].v === 'while' && esOp(T[e2 + 2], '(')) { var h2 = cierre(T, e2 + 2); return h2 < 0 ? e2 : (esOp(T[h2 + 1], ';') ? h2 + 1 : h2); }
      return e2;
    }
    var d = 0;
    for (var j = k; j < T.length; j++) {
      var u = T[j]; if (u.t !== 'op') continue;
      if (u.v === '(' || u.v === '[' || u.v === '{') d++;
      else if (u.v === ')' || u.v === ']' || u.v === '}') d--;
      else if (u.v === ';' && d <= 0) return j;
    }
    return T.length - 1;
  }
  function texto(T, a, b) { var s = []; for (var j = a; j < b && j < T.length; j++) s.push(T[j].v); return s.join(' '); }

  /* ---------- análisis: declaraciones, funciones, lazos ---------- */

  function analizar(src) {
    var tk = tokenizar(String(src == null ? '' : src)), T = tk.T;
    var decls = [], funcs = [], loops = [], fors = [], whiles = [], ifs = [], k = 0;

    function parseParams(a, b, fn) { // tokens entre '(' (a) y ')' (b)
      var segs = [], cur = [], d = 0;
      for (var j = a + 1; j < b; j++) {
        var t = T[j];
        if (t.t === 'op' && (t.v === '(' || t.v === '[')) d++;
        if (t.t === 'op' && (t.v === ')' || t.v === ']')) d--;
        if (esOp(t, ',') && d === 0) { segs.push(cur); cur = []; } else cur.push(j);
      }
      if (cur.length) segs.push(cur);
      segs.forEach(function (seg) {
        var tipos = [], nombre = null, dims = 0, ptr = false;
        for (var s = 0; s < seg.length; s++) {
          var t = T[seg[s]];
          if (esTipo(t)) tipos.push(t.v);
          else if (t.t === 'id' && !nombre) nombre = seg[s];
          else if (esOp(t, '[')) dims++;
          else if (esOp(t, '*')) ptr = true;
        }
        if (!nombre) return; // «void» o sin nombre
        fn.params.push({ type: tipos.join(' '), name: T[nombre].v, dims: dims + (ptr && !dims ? 1 : 0), line: T[nombre].line, tokIdx: nombre });
      });
    }

    function parseDeclaracion(j0) {
      var j = j0, tipos = [];
      while (j < T.length && esTipo(T[j])) { tipos.push(T[j].v); j++; }
      var primero = true;
      for (;;) {
        var ptr = false;
        while (esOp(T[j], '*')) { ptr = true; j++; }
        var idt = T[j];
        if (!idt || idt.t !== 'id' || CONTROL[idt.v]) return Math.max(j, j0 + 1);
        var idIdx = j; j++;
        if (primero && esOp(T[j], '(')) { // función: prototipo o definición
          var b = cierre(T, j);
          if (b < 0) return j;
          var fn = { name: idt.v, ret: tipos.join(' ') + (ptr ? ' *' : ''), params: [], line: idt.line, tokIdx: idIdx, proto: false, def: false, range: [j0, b], bodyStart: -1, bodyEnd: -1 };
          parseParams(j, b, fn);
          if (esOp(T[b + 1], '{')) { fn.def = true; fn.bodyStart = b + 1; fn.bodyEnd = cierre(T, b + 1); if (fn.bodyEnd < 0) fn.bodyEnd = T.length - 1; fn.range = [j0, fn.bodyEnd]; }
          else if (esOp(T[b + 1], ';')) fn.proto = true;
          funcs.push(fn);
          fn.params.forEach(function (p) { decls.push({ name: p.name, type: p.type, kind: 'param', dims: p.dims, init: null, line: p.line, tokIdx: p.tokIdx, fn: fn }); });
          return fn.def ? b + 1 : b + 1;
        }
        primero = false;
        var dims = 0, dimTxt = [];
        while (esOp(T[j], '[')) { var cb = cierre(T, j); if (cb < 0) break; dimTxt.push(texto(T, j + 1, cb)); dims++; j = cb + 1; }
        var init = null;
        if (esOp(T[j], '=')) {
          var a = j + 1, d = 0; j++;
          while (j < T.length) {
            var u = T[j];
            if (u.t === 'op') {
              if (u.v === '(' || u.v === '[' || u.v === '{') d++;
              else if (u.v === ')' || u.v === ']' || u.v === '}') { if (d === 0) break; d--; }
              else if ((u.v === ',' || u.v === ';') && d === 0) break;
            }
            j++;
          }
          init = texto(T, a, j);
        }
        decls.push({ name: idt.v, type: tipos.join(' ') + (ptr ? ' *' : ''), kind: dims ? 'arreglo' : 'var', dims: dims, dimTxt: dimTxt, init: init, line: idt.line, tokIdx: idIdx, fn: null });
        if (esOp(T[j], ',')) { j++; continue; }
        break;
      }
      return Math.max(j, j0 + 1);
    }

    while (k < T.length) {
      var t = T[k], prev = T[k - 1];
      var inicio = !prev || (prev.t === 'op' && (prev.v === ';' || prev.v === '{' || prev.v === '}')) || (esOp(prev, '(') && T[k - 2] && T[k - 2].v === 'for');
      if (inicio && esTipo(t)) { k = parseDeclaracion(k); continue; }
      if (t.t === 'id' && (t.v === 'for' || t.v === 'while') && esOp(T[k + 1], '(')) {
        var h = cierre(T, k + 1);
        if (h > 0) {
          var cuerpoFin = finSentencia(T, h + 1);
          loops.push({ a: k, b: cuerpoFin });
          if (t.v === 'for') {
            var pc = -1, dd = 0;
            for (var q = k + 2; q < h; q++) { var w = T[q]; if (w.t !== 'op') continue; if (w.v === '(') dd++; else if (w.v === ')') dd--; else if (w.v === ';' && dd === 0) { pc = q; break; } }
            fors.push({ a: k, h: h, init: [k + 2, pc < 0 ? h : pc], bodyA: h + 1, bodyB: cuerpoFin });
          } else whiles.push({ a: k, h: h, bodyA: h + 1, bodyB: cuerpoFin });
        }
      } else if (t.t === 'id' && t.v === 'do') { loops.push({ a: k, b: finSentencia(T, k) }); }
      else if (t.t === 'id' && t.v === 'if' && esOp(T[k + 1], '(')) { var hi = cierre(T, k + 1); if (hi > 0) ifs.push({ a: k, h: hi, bodyA: hi + 1, bodyB: finSentencia(T, hi + 1) }); }
      k++;
    }

    // en qué función cae cada token
    function fnEn(idx) { for (var f = 0; f < funcs.length; f++) if ((funcs[f].def || funcs[f].proto) && idx >= funcs[f].range[0] && idx <= funcs[f].range[1]) return funcs[f]; return null; }
    decls.forEach(function (d) { if (!d.fn) d.fn = fnEn(d.tokIdx); });

    // función que se está llamando en cada token (la llamada más interna)
    var llamada = new Array(T.length), pila = [];
    for (var z = 0; z < T.length; z++) {
      var u = T[z];
      if (esOp(u, '(')) { var pv = T[z - 1]; pila.push(pv && pv.t === 'id' && !CONTROL[pv.v] ? pv.v : null); }
      else if (esOp(u, ')')) pila.pop();
      var nom = null; for (var s2 = pila.length - 1; s2 >= 0; s2--) if (pila[s2]) { nom = pila[s2]; break; }
      llamada[z] = nom;
    }
    var switches = [];
    for (var sw = 0; sw < T.length; sw++) if (T[sw].t === 'id' && T[sw].v === 'switch' && esOp(T[sw + 1], '(')) { var hs = cierre(T, sw + 1); if (hs > 0) switches.push({ a: sw, h: hs, bodyA: hs + 1, bodyB: finSentencia(T, hs + 1) }); }
    return { T: T, defines: tk.defines, decls: decls, funcs: funcs, loops: loops, fors: fors, whiles: whiles, ifs: ifs, switches: switches, fnEn: fnEn, llamada: llamada };
  }

  /* ---------- usos de un nombre ---------- */

  function enLazo(A, idx) { for (var i = 0; i < A.loops.length; i++) if (idx >= A.loops[i].a && idx <= A.loops[i].b) return true; return false; }

  function usosDe(A, d) {
    var T = A.T, esFn = d.kind === 'func', lo = 0, hi = T.length - 1;
    if (!esFn && d.fn) { lo = d.fn.range[0]; hi = d.fn.range[1]; }
    var info = { asigna: [], lecturas: [], scanf: [], printf: [], todos: [], count: 0, primero: null };
    for (var i = lo; i <= hi; i++) {
      var t = T[i];
      if (t.t !== 'id' || t.v !== d.name || i === d.tokIdx) continue;
      if (!esFn && !d.fn) { // global: se saltean las funciones donde otro nombre igual la tapa
        var f = A.fnEn(i);
        if (f && A.decls.some(function (x) { return x.name === d.name && x.fn === f && x !== d; })) continue;
      }
      if (esFn && A.decls.some(function (x) { return x.tokIdx === i; })) continue; // la propia declaración de un parámetro
      var j = i + 1; while (esOp(T[j], '[')) { var cb = cierre(T, j); if (cb < 0) break; j = cb + 1; }
      var nx = T[j], pv = T[i - 1], rhs = null, esEscritura = false;
      if (nx && nx.t === 'op' && ASIGNA[nx.v]) {
        esEscritura = true;
        var e = j + 1, dd = 0;
        while (e < T.length) { var w = T[e]; if (w.t === 'op') { if (w.v === '(' || w.v === '[') dd++; else if (w.v === ')' || w.v === ']') { if (dd === 0) break; dd--; } else if ((w.v === ';' || w.v === ',') && dd === 0) break; } e++; }
        rhs = T.slice(j + 1, e);
      } else if ((nx && nx.t === 'op' && (nx.v === '++' || nx.v === '--')) || (pv && pv.t === 'op' && (pv.v === '++' || pv.v === '--'))) esEscritura = true;
      var op = esEscritura ? (nx && nx.t === 'op' && (ASIGNA[nx.v] || nx.v === '++' || nx.v === '--') ? nx.v : (pv ? pv.v : '++')) : null;
      var llam = A.llamada[i];
      var deScanf = llam === 'scanf' && ((pv && esOp(pv, '&')) || d.dims > 0);
      var u = { idx: i, line: t.line, escritura: esEscritura, op: op, rhs: rhs, scanf: deScanf };
      info.todos.push(u); info.count++;
      if (!info.primero) info.primero = u;
      if (deScanf) info.scanf.push(u);
      else if (esEscritura) info.asigna.push(u);
      else info.lecturas.push(u);
      if (FAM_PRINTF[llam]) info.printf.push(u);
    }
    return info;
  }

  function esLiteral(rhs, v) { return !!rhs && rhs.length === 1 && rhs[0].t === 'num' && /^\d+$/.test(rhs[0].v) && (v === undefined || +rhs[0].v === v); }
  function esBool(rhs) { return !!rhs && rhs.length === 1 && ((rhs[0].t === 'num' && (rhs[0].v === '0' || rhs[0].v === '1')) || (rhs[0].t === 'id' && (rhs[0].v === 'true' || rhs[0].v === 'false'))); }
  function valorBool(rhs) { return rhs[0].v === '1' || rhs[0].v === 'true' ? 1 : 0; }

  /* ---------- qué papel cumple ---------- */

  function rolDe(A, d, info) {
    var T = A.T, name = d.name;
    if (d.kind === 'param') return d.dims > 0 ? 'parametro_arreglo' : 'parametro_valor';
    if (d.kind === 'arreglo') return d.dims >= 2 ? 'arreglo_2d' : 'arreglo_1d';
    // variable escalar
    if (info.count === 0) return 'variable_no_usada';
    if (d.init === null && info.primero && !info.primero.escritura && !info.primero.scanf) return 'variable_sin_inicializar';
    // índice de un for: se inicia en el encabezado y se usa de subíndice en el cuerpo
    for (var f = 0; f < A.fors.length; f++) {
      var fo = A.fors[f], enInit = false, i;
      for (i = fo.init[0]; i < fo.init[1]; i++) if (T[i].t === 'id' && T[i].v === name && T[i + 1] && T[i + 1].v === '=') enInit = true;
      if (!enInit) continue;
      for (i = fo.bodyA; i <= fo.bodyB; i++) if (T[i].t === 'id' && T[i].v === name && esOp(T[i - 1], '[')) return 'indice_for';
    }
    // centinela: se lee antes de un while que lo compara con un literal y se vuelve a leer adentro
    for (var w = 0; w < A.whiles.length; w++) {
      var wh = A.whiles[w], enCond = false, conLit = false;
      for (var c = wh.a + 2; c < wh.h; c++) { if (T[c].t === 'id' && T[c].v === name) enCond = true; if (T[c].t === 'num') conLit = true; }
      if (!enCond || !conLit) continue;
      var antes = info.scanf.some(function (u) { return u.idx < wh.a; }), adentro = info.scanf.some(function (u) { return u.idx > wh.h && u.idx <= wh.bodyB; });
      if (antes && adentro) return 'centinela';
    }
    // máximo / mínimo: un if compara un candidato contra el nombre y, si gana, se lo asigna
    var cuenta = { maximo: 0, minimo: 0 };
    A.ifs.forEach(function (fi) {
      for (var c2 = fi.a + 2; c2 < fi.h; c2++) {
        if (!(T[c2].t === 'id' && T[c2].v === name)) continue;
        var sig = T[c2 + 1], ant = T[c2 - 1], tipo = null;
        if (sig && (sig.v === '<' || sig.v === '<=')) tipo = 'maximo'; else if (sig && (sig.v === '>' || sig.v === '>=')) tipo = 'minimo';
        else if (ant && (ant.v === '>' || ant.v === '>=')) tipo = 'maximo'; else if (ant && (ant.v === '<' || ant.v === '<=')) tipo = 'minimo';
        if (!tipo) continue;
        var asigna = info.asigna.some(function (u) { return u.idx >= fi.bodyA && u.idx <= fi.bodyB && u.op === '='; });
        if (asigna) cuenta[tipo]++;
      }
    });
    if (cuenta.maximo > 0 || cuenta.minimo > 0) return cuenta.maximo >= cuenta.minimo ? 'maximo' : 'minimo';
    // bandera: solo recibe 0 y 1 (o false/true), con los dos estados
    var estados = {}, soloBool = true, hay = false;
    if (d.init !== null) { var it = tokenizar(d.init).T; if (esBool(it)) { estados[valorBool(it)] = 1; hay = true; } else soloBool = false; }
    info.asigna.forEach(function (u) { if (u.op === '=' && esBool(u.rhs)) { estados[valorBool(u.rhs)] = 1; hay = true; } else soloBool = false; });
    if (hay && soloBool && estados[0] && estados[1] && info.asigna.length > 0) return 'bandera';
    // contador / acumulador
    var iniCero = (d.init !== null && /^0(\.0*)?$/.test(d.init.replace(/\s+/g, ''))) || info.asigna.some(function (u) { return u.op === '=' && esLiteral(u.rhs, 0) && !enLazo(A, u.idx); });
    var incrementa = info.asigna.some(function (u) {
      if (!enLazo(A, u.idx)) return false;
      if (u.op === '++' || u.op === '--') return true;
      if (u.op === '+=' || u.op === '-=') return esLiteral(u.rhs, 1);
      if (u.op === '=' && u.rhs && u.rhs.length === 3 && u.rhs[0].v === name && (u.rhs[1].v === '+' || u.rhs[1].v === '-') && esLiteral([u.rhs[2]], 1)) return true;
      return false;
    });
    if (iniCero && incrementa) return 'contador';
    var suma = info.asigna.some(function (u) {
      if (!enLazo(A, u.idx) && !(u.rhs)) return false;
      if (u.op === '+=') return !esLiteral(u.rhs, 1);
      if (u.op === '=' && u.rhs && u.rhs.length >= 3 && u.rhs[0].v === name && u.rhs[1].v === '+') return !(u.rhs.length === 3 && esLiteral([u.rhs[2]], 1));
      return false;
    });
    var iniciada = d.init !== null || info.asigna.some(function (u) { return u.op === '='; });
    if (suma && iniciada) return 'acumulador';
    if (!d.fn) return 'variable_global';
    if (info.scanf.length) return 'variable_scanf';
    var tp = d.type.replace(/\bconst\b|\bstatic\b/g, '').trim();
    if (/\bunsigned\b/.test(tp)) return 'variable_unsigned';
    if (/\bshort\b/.test(tp)) return 'variable_short';
    if (/\blong\b/.test(tp)) return 'variable_long';
    if (/\bfloat\b/.test(tp)) return 'variable_float';
    if (/\bdouble\b/.test(tp)) return 'variable_double';
    if (/\bchar\b/.test(tp)) return 'variable_char';
    if (/\b(bool|_Bool)\b/.test(tp)) return 'variable_bool';
    return 'variable_int';
  }

  function rolDeFuncion(A, fn) {
    var T = A.T;
    if (fn.name === 'main') return 'main';
    var tieneProto = A.funcs.some(function (f) { return f.name === fn.name && f.proto; }), def = A.funcs.filter(function (f) { return f.name === fn.name && f.def; })[0];
    if (def) {
      var recursiva = false;
      for (var i = def.bodyStart; i <= def.bodyEnd; i++) if (T[i].t === 'id' && T[i].v === fn.name && esOp(T[i + 1], '(')) { recursiva = true; break; }
      if (recursiva) return 'funcion_recursiva';
    }
    if (tieneProto && def) return 'prototipo_definicion';
    var f = def || fn;
    if (/^void$/.test(f.ret.trim())) return 'funcion_void';
    return 'funcion_retorna_valor';
  }

  /* ---------- armado de la respuesta ---------- */

  function lineas(arr) {
    var u = []; arr.forEach(function (l) { if (u.indexOf(l) < 0) u.push(l); });
    u.sort(function (a, b) { return a - b; });
    var mas = u.length > 8; if (mas) u = u.slice(0, 8);
    if (!u.length) return 'ninguna línea';
    if (u.length === 1) return 'la línea ' + u[0];
    return 'las líneas ' + u.slice(0, -1).join(', ') + (mas ? ', ' + u[u.length - 1] + ' y otras' : ' y ' + u[u.length - 1]);
  }

  function datos(A, d, info, fnCursor) {
    var esFn = d.kind === 'func', f = esFn ? (A.funcs.filter(function (x) { return x.name === d.name && x.def; })[0] || d.f) : null;
    var asig = info.asigna.map(function (u) { return u.line; }); if (d.init !== null && !esFn) asig.unshift(d.line);
    var dims = d.dimTxt && d.dimTxt.length ? d.dimTxt.map(function (x) { return x || '?'; }).join(' por ') : '';
    var o = {
      NOMBRE: d.name, TIPO: esFn ? f.ret : (d.type || 'int'), LINEA_DECL: String(d.line), CANT_USOS: String(info.count),
      LINEAS_ASIGNA: lineas(asig), LINEAS_LECTURA_SCANF: lineas(info.scanf.map(function (u) { return u.line; })),
      LINEAS_USO_PRINTF: lineas(info.printf.map(function (u) { return u.line; })),
      PARAMS: (function () { var pf = esFn ? f : d.fn; if (!pf) return ''; return pf.params.length ? pf.params.map(function (p) { return p.type + ' ' + p.name + (p.dims ? '[]' : ''); }).join(', ') : 'ninguno'; })(),
      RETORNO: esFn ? f.ret : '', FUNCION_ACTUAL: fnCursor ? fnCursor.name : 'ninguna (el nombre está fuera de las funciones)',
      DIMENSIONES: dims ? dims + (d.dimTxt.length > 1 ? ' elementos' : (/^\d+$/.test(dims) && +dims === 1 ? ' elemento' : ' elementos')) : 'sin tamaño fijo', VALOR_INICIAL: d.init !== null && !esFn ? d.init : '',
      SIN_VALOR_INICIAL: d.init === null && !esFn ? 'no tiene valor inicial (guarda un valor basura hasta que se le asigne algo)' : ''
    };
    return o;
  }
  function rellenar(s, o) { return String(s == null ? '' : s).replace(/\{([A-Z_]+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : m; }); }

  function explicar(codigo, offset, plantillas) {
    codigo = String(codigo == null ? '' : codigo);
    if (typeof offset !== 'number' || !(offset >= 0) || !Array.isArray(plantillas) || !plantillas.length) return null;
    var A;
    try { A = analizar(codigo); } catch (e) { return null; }
    var T = A.T, pos = -1, i;
    for (i = 0; i < T.length; i++) if (T[i].t === 'id' && offset >= T[i].i && offset <= T[i].e) { pos = i; if (offset < T[i].e) break; }
    var enDef = null; Object.keys(A.defines).forEach(function (k2) { var df = A.defines[k2]; if (offset >= df.i && offset <= df.e) enDef = k2; });
    if (pos < 0 && !enDef) return null;
    var tok = pos >= 0 ? T[pos] : { v: enDef }, name = tok.v;
    if (TIPOS[name] === 1 || CONTROL[name]) return null;
    var fnCursor = A.fnEn(pos), d = null, rol = null, info;
    // 1) variable o parámetro visible desde ese punto (la de la función, si no la global)
    var cand = A.decls.filter(function (x) { return x.name === name; });
    var local = cand.filter(function (x) { return x.fn && fnCursor && x.fn === fnCursor; }), glob = cand.filter(function (x) { return !x.fn; });
    var pick = function (lst) { var antes = lst.filter(function (x) { return x.tokIdx <= pos; }); return antes.length ? antes[antes.length - 1] : lst[0]; };
    if (local.length) d = pick(local); else if (glob.length) d = pick(glob);
    var fn = A.funcs.filter(function (x) { return x.name === name; });
    if (d && !(fn.length && !local.length && !glob.length)) {
      info = usosDe(A, d);
      rol = rolDe(A, d, info);
    } else if (fn.length) {
      var def = fn.filter(function (x) { return x.def; })[0] || fn[0];
      d = { name: name, kind: 'func', type: def.ret, dims: 0, init: null, line: def.line, tokIdx: def.tokIdx, fn: null, f: def };
      info = { asigna: [], lecturas: [], scanf: [], printf: [], todos: [], count: 0, primero: null };
      for (i = 0; i < T.length; i++) if (T[i].t === 'id' && T[i].v === name && i !== def.tokIdx && esOp(T[i + 1], '(') && !fn.some(function (x) { return x.tokIdx === i; })) info.count++;
      rol = rolDeFuncion(A, def);
    } else if (A.defines[name]) {
      d = { name: name, kind: 'define', type: '', dims: 0, init: A.defines[name].valor || '', line: A.defines[name].line, tokIdx: -1, fn: null };
      info = { asigna: [], lecturas: [], scanf: [], printf: [], todos: [], count: 0, primero: null };
      for (i = 0; i < T.length; i++) if (T[i].t === 'id' && T[i].v === name) info.count++;
      rol = 'constante_define';
    } else return null;
    var pl = null; for (i = 0; i < plantillas.length; i++) if (plantillas[i] && plantillas[i].rol === rol) { pl = plantillas[i]; break; }
    if (!pl) return null;
    var o = datos(A, d, info, fnCursor);
    var vars = Array.isArray(pl.variantes) ? pl.variantes.filter(function (v) { return typeof v === 'string' && v; }) : [];
    var variante = vars.length ? rellenar(vars[(name.length + d.line) % vars.length], o) : '';
    var queEs = rellenar(pl.que_es, o);
    return {
      rol: rol, nombre: name, titulo: rellenar(pl.titulo, o) || name, que_es: variante && queEs.indexOf(variante) < 0 ? queEs + ' ' + variante : queEs,
      como_se_usa: rellenar(pl.como_se_usa, o), error_tipico: rellenar(pl.error_tipico, o), detalle: rellenar(pl.detalle, o), ejemplo: pl.ejemplo || ''
    };
  }

  /* ---------- «¿qué uso es este?»: de las ocasiones de una entrada de ayuda, la que corresponde al lugar tocado ---------- */

  function sinAcentos(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  // etiquetas del lugar: dentro de un for / if / while / switch, argumentos de una llamada, declaración, índice de arreglo, encabezado de función…
  function contexto(codigo, offset) {
    var A; try { A = analizar(codigo); } catch (e) { return {}; }
    var T = A.T, k = -1, i;
    for (i = 0; i < T.length; i++) if (offset >= T[i].i && offset < T[i].e) { k = i; break; }
    if (k < 0) for (i = 0; i < T.length; i++) if (offset === T[i].e) { k = i; break; }
    var tags = {};
    if (k < 0) return tags;
    function dentro(lst, a, b) { return lst.some(function (x) { return k > x[a] && k <= x[b]; }); }
    if (dentro(A.fors, 'a', 'h')) tags['for'] = 1;
    if (dentro(A.ifs, 'a', 'h')) tags['if'] = 1;
    if (dentro(A.whiles, 'a', 'h')) tags['while'] = 1;
    if (dentro(A.switches, 'a', 'h')) tags['switch'] = 1;
    if (A.switches.some(function (x) { return k >= x.bodyA && k <= x.bodyB; })) tags['switch'] = 1;
    if (A.llamada[k]) { tags['llamada'] = 1; tags[A.llamada[k]] = 1; }
    if (A.funcs.some(function (f) { return k > f.range[0] && f.params.length >= 0 && k < (f.bodyStart > 0 ? f.bodyStart : f.range[1]); })) tags['funcion'] = 1;
    var d = 0; for (i = k - 1; i >= 0; i--) { var u = T[i]; if (u.t !== 'op') continue; if (u.v === ']') d++; else if (u.v === '[') { if (d === 0) { tags['arreglo'] = 1; break; } d--; } else if (u.v === ';' || u.v === '{' || u.v === '}') break; }
    for (i = k - 1; i >= -1; i--) { if (i < 0 || (T[i].t === 'op' && (T[i].v === ';' || T[i].v === '{' || T[i].v === '}'))) { if (esTipo(T[i + 1])) tags['declaracion'] = 1; break; } }
    if (T[k].t === 'str') tags['cadena'] = 1;
    return tags;
  }
  var SINONIMOS = { 'for': ['for', 'repeticion'], 'if': ['if', 'condicion', 'condicional'], 'while': ['while', 'bucle', 'repeticion'], 'switch': ['switch', 'case'], llamada: ['llamada', 'argumento', 'printf', 'scanf'], funcion: ['funcion', 'parametro', 'prototipo', 'encabezado'],
    arreglo: ['arreglo', 'indice', 'matriz', 'corchete', 'posicion'], declaracion: ['declaracion', 'declara', 'declarar', 'inicializ'], cadena: ['cadena', 'texto'] };
  function ocasionAqui(ayuda, codigo, offset) {
    if (!ayuda || !Array.isArray(ayuda.ocasiones) || !ayuda.ocasiones.length) return null;
    var tags; try { tags = contexto(String(codigo || ''), offset); } catch (e) { return null; }
    var mejor = null, mp = 0;
    ayuda.ocasiones.forEach(function (o) {
      var t = sinAcentos(o.cuando || ''), p = 0;
      Object.keys(tags).forEach(function (g) {
        var pal = SINONIMOS[g] || [g];
        if (pal.some(function (w) { return new RegExp('\\b' + w).test(t); })) p += (g === 'llamada' || g === 'declaracion') ? 1 : 2;
      });
      if (p > mp) { mp = p; mejor = o; }
    });
    return mejor;
  }

  var api = { explicar: explicar, analizar: analizar, tokenizar: tokenizar, rolDe: rolDe, contexto: contexto, ocasionAqui: ocasionAqui };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Nombres = api;
})(typeof window !== 'undefined' ? window : this);

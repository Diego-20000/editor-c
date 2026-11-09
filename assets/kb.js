/* Editor C, de Diego Segurotti (ArtPrograms Studio). Uso libre dentro de este sitio, sin fines comerciales. Prohibido copiar, redistribuir o vender sin permiso. PolyForm Strict License 1.0.0. */
/* El entrenador de Editor C: consulta la base de conocimiento (kb/) sin IA, sin red y sin dependencias.
   Navegador: window.KB (los datos vienen en window.KB_DATA, generado por build.js). Node: module.exports.
   API: cargar, explicar, entradaPara, ayudaNivel, pista, buscar, elementoEnPosicion, ayudaDe, normalizarMensaje. */
(function (root) {
  'use strict';

  /* ---------- texto: normalizar, tokenizar, stemming ---------- */

  function sinTildes(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function norm(s) { return sinTildes(String(s == null ? '' : s).toLowerCase()); }

  var PALABRAS_VACIAS = {};
  ('a al algo ante aca ahi ahora asi aun aunque con contra cual cuales cuando cuanto como de del desde donde dos e el ella ellos en entre era eran es esa ese eso esas esos esta estan este esto estos estoy fue ha hace hacen hacer hago han hay la las le les lo los me mi mis mucho muy ni no nos nuestro o os otra otro para pero por porque que quien quienes se ser si son su sus te ti tu tus un una uno unos unas va vamos van voy y ya yo da dan dar das dice dicen puede pueden puedo podria quiero quiere quieren saber necesito tengo tiene tienen sirve sirven usa usan usar significa sobre cada todo toda todos todas tambien segun sera seria hacemos hizo haga hagan muestra ayuda ayudame explicame explica decime dime').split(' ').forEach(function (w) { PALABRAS_VACIAS[w] = 1; });

  // Frases que se reemplazan por una sola palabra, igual en los textos de la base y en la consulta.
  var FRASES = [['punto y coma', 'puntoycoma'], ['punto flotante', 'flotante'], ['division entera', 'divisionentera'], ['division por cero', 'divisionporcero'], ['igual igual', 'sym:==']];

  var RE_TOKEN = /%[-+# 0]*[0-9*]*(?:\.[0-9*]+)?(?:hh|h|ll|l|z)?[a-z]|\\[ntrb0a\\'"]|&&|\|\||<=|>=|==|!=|\+\+|--|<<|>>|[a-z0-9_]+|[&|^~!<>=+*\/%#;]/g;

  // Devuelve las "palabras" de un texto: palabras normalizadas y, si conSimbolos, símbolos de C como 'sym:&&'.
  function palabras(texto, conSimbolos) {
    var t = norm(texto), i;
    for (i = 0; i < FRASES.length; i++) t = t.split(FRASES[i][0]).join(' ' + FRASES[i][1] + ' ');
    var out = [], m;
    RE_TOKEN.lastIndex = 0;
    while ((m = RE_TOKEN.exec(t))) {
      var w = m[0];
      if (/^[a-z0-9_]+$/.test(w)) { out.push(w); continue; }
      if (w.indexOf('sym:') === 0 || !conSimbolos) { if (w.indexOf('sym:') === 0) out.push(w); continue; }
      out.push('sym:' + w);
    }
    // 'sym:' que vino de una frase queda pegado como palabra: se separa
    var fin = [];
    for (i = 0; i < out.length; i++) {
      var o = out[i];
      if (o === 'sym') continue;
      fin.push(o);
    }
    return fin;
  }

  var VOCALES = /[aeo]$/;
  function stem(w) {
    if (w.indexOf('sym:') === 0 || /^\d+$/.test(w) || w.length <= 3) return w;
    var n = w.length;
    if (/ces$/.test(w) && n > 4) w = w.slice(0, -3) + 'z';
    else if (/[^aeiou]es$/.test(w) && n > 4) w = w.slice(0, -2);
    else if (/[^aeiouns]s$/.test(w) === false && /s$/.test(w) && n > 3 && !/(ss|is|us)$/.test(w)) w = w.slice(0, -1);
    var suf = ['aciones', 'amiento', 'imiento', 'iendo', 'ando', 'acion', 'cion', 'sion', 'ados', 'idos', 'ado', 'ida', 'ido', 'mente', 'ar', 'er', 'ir'];
    for (var i = 0; i < suf.length; i++) {
      var s = suf[i];
      if (w.length - s.length >= 4 && w.slice(-s.length) === s) { w = w.slice(0, -s.length); break; }
    }
    if (w.length >= 4 && VOCALES.test(w)) w = w.slice(0, -1);
    return w;
  }
  function raices(texto, conSimbolos) {
    var p = palabras(texto, conSimbolos), out = [];
    for (var i = 0; i < p.length; i++) {
      var w = p[i];
      if (PALABRAS_VACIAS[w]) continue;
      if (w.length === 1 && !/\d/.test(w)) continue;
      out.push(stem(w));
    }
    return out;
  }

  // Sinónimos: tabla fija y chica. Cada grupo es un conjunto de palabras que el alumno puede usar para lo mismo.
  var GRUPOS = [
    ['division', 'dividir', 'cociente', 'divisionentera', '/'],
    ['resto', 'modulo', 'mod', 'residuo', '%'],
    ['decimal', 'flotante', 'float', 'double', 'coma', 'real', 'fraccion', 'decimales'],
    ['texto', 'cadena', 'string', 'palabra', 'frase', 'caracteres'],
    ['char', 'caracter', 'letra'],
    ['ciclo', 'lazo', 'bucle', 'while', 'for', 'repeticion', 'repetir', 'iterar', 'loop', 'mientras'],
    ['if', 'condicional', 'condicion', 'decision', 'bifurcacion', 'else', 'sino'],
    ['funcion', 'procedimiento', 'subprograma', 'metodo'],
    ['arreglo', 'array', 'vector', 'matriz', 'tabla'],
    ['puntoycoma', ';', 'terminador'],
    ['infinito', 'eterno', 'cuelga', 'trabado', 'colgado', 'interminable'],
    ['cero', 'divisionporcero'],
    ['printf', 'imprimir', 'mostrar', 'pantalla', 'salida', 'print'],
    ['scanf', 'leer', 'entrada', 'teclado', 'ingresar', 'pedir', 'input'],
    ['entero', 'int', 'integer'],
    ['comparar', 'comparacion', 'igualdad', '==', 'igual'],
    ['asignar', 'asignacion', '='],
    ['incremento', 'incrementar', 'contador', '++', 'sumar1'],
    ['ampersand', '&', 'direccion', 'amp'],
    ['inicializar', 'inicial', 'basura', 'indeterminado', 'inicializacion'],
    ['desborde', 'desbordamiento', 'overflow', 'maximo'],
    ['compilar', 'compilador', 'compilacion', 'compila'],
    ['ejecutar', 'correr', 'ejecucion', 'run'],
    ['prototipo', 'declaracion'],
    ['global', 'ambito', 'scope', 'alcance', 'local'],
    ['&&', 'conjuncion'],
    ['||', 'disyuncion'],
    ['!', 'negacion']
  ];

  /* ---------- estado ---------- */

  var S = null;           // datos e índices cargados
  var NIVEL_AYUDA = 1;

  function vacio() {
    return { errores: [], ayuda: [], lecciones: [], porId: {}, ayudaMap: {}, plantillas: {}, porCodigo: {}, docs: [], post: {}, vocab: [], idf: {}, cacheExp: {}, sin: {} };
  }

  /* ---------- explicar: del diagnóstico del editor a la entrada de errores ---------- */

  var RE_RESERVADAS = /^(if|else|for|while|do|switch|case|default|break|continue|return|int|float|double|char|void|long|short|unsigned|printf|scanf|main)$/;
  // Igual que tools/catalogo-errores.js: 'Total' pasa a ‹nombre› y los números a N.
  function normalizarMensaje(msg) {
    var nombres = [];
    var t = String(msg == null ? '' : msg).replace(/'([A-Za-z_]\w*)'/g, function (m, id) {
      if (RE_RESERVADAS.test(id)) return m;
      if (nombres.indexOf(id) < 0 && !/^[aeouy]$/.test(id)) nombres.push(id);
      return "'‹nombre›'";
    });
    // el mismo nombre fuera de las comillas (por ejemplo «necesita &Total») también pasa a ‹nombre›
    nombres.forEach(function (id) { t = t.replace(new RegExp('\\b' + id + '\\b', 'g'), '‹nombre›'); });
    return t.replace(/\b\d+(\.\d+)?\b/g, 'N');
  }

  function normalizarNivel(n, porDefecto) {
    var v = typeof n === 'string' && n.trim() !== '' ? Number(n) : n;
    if (typeof v !== 'number' || !isFinite(v)) return porDefecto === undefined ? NIVEL_AYUDA : porDefecto;
    v = Math.round(v);
    return v < 0 ? 0 : v > 2 ? 2 : v;
  }

  // Devuelve { entrada, via: 'kb' | 'plantilla' | 'codigo', nivel } o null.
  function explicar(diag, nivel) {
    if (!S || !diag) return null;
    var niv = normalizarNivel(nivel);
    var e = entradaPara(diag);
    return e ? { entrada: e.entrada, via: e.via, nivel: niv } : null;
  }
  function entradaPara(diag) {
    if (!S || !diag) return null;
    var e = null;
    // 1) el diagnóstico trae el id del caso
    if (diag.kb && typeof diag.kb === 'string' && S.porId[diag.kb]) return { entrada: S.porId[diag.kb], via: 'kb' };
    // 2) por plantilla del mensaje
    var msg = String(diag.msg == null ? '' : diag.msg);
    var lista = S.plantillas[normalizarMensaje(msg)];
    if (lista && lista.length) {
      var i;
      for (i = 0; i < lista.length; i++) if (lista[i].mensaje_editor_actual === msg && (!diag.code || lista[i].codigo_editor_actual === diag.code)) e = lista[i];
      if (!e && diag.code) for (i = 0; i < lista.length; i++) if (lista[i].codigo_editor_actual === diag.code) { e = lista[i]; break; }
      if (!e) for (i = 0; i < lista.length; i++) if (lista[i].mensaje_editor_actual === msg) { e = lista[i]; break; }
      if (!e) e = lista[0];
      return { entrada: e, via: 'plantilla' };
    }
    // 3) por código del diagnóstico, si una sola entrada lo usa
    if (diag.code && S.porCodigo[diag.code] && S.porCodigo[diag.code].length === 1) return { entrada: S.porCodigo[diag.code][0], via: 'codigo' };
    return null;
  }

  function mensajeCorto(e) { return e.mensaje_editor || e.mensaje_editor_actual || e.nombre_corto || ''; }
  function pistasDe(e) { return Array.isArray(e && e.pistas) ? e.pistas.filter(function (p) { return typeof p === 'string' && p; }) : []; }

  // nivel 0: solo el mensaje original; 1: mensaje corto + primera pista; 2: mensaje + explicación + pistas hasta la segunda.
  // La solución (pista 3) no aparece nunca acá: se pide con pista(entrada, 3, { vistas: 2, confirmar: true }).
  function ayudaNivel(entrada, nivel, diag) {
    var niv = normalizarNivel(nivel);
    var p = pistasDe(entrada), hasta = niv === 0 ? 0 : niv === 1 ? 1 : 2;
    var vis = p.slice(0, Math.min(hasta, 2));
    return {
      nivel: niv,
      mensaje: niv === 0 ? (diag && diag.msg ? diag.msg : (entrada.mensaje_editor_actual || mensajeCorto(entrada))) : mensajeCorto(entrada),
      explicacion: niv >= 2 && entrada.explicacion ? entrada.explicacion : null,
      pistas: vis,
      hayMasPistas: p.length > vis.length && niv > 0 ? true : (niv === 0 && p.length > 0),
      totalPistas: p.length
    };
  }

  // Las pistas se piden de a una. n va de 1 a 3. opts.vistas = cuántas ya se mostraron (por defecto n - 1; para la 3, 0).
  // La pista 3 (casi la solución) solo sale con vistas >= 2 y confirmar === true.
  function pista(entrada, n, opts) {
    var p = pistasDe(entrada);
    n = Math.round(Number(n));
    if (!(n >= 1 && n <= 3) || n > p.length) return null;
    opts = opts || {};
    var vistas = typeof opts.vistas === 'number' ? opts.vistas : (n === 3 ? 0 : n - 1);
    if (n > vistas + 1) return { n: n, texto: null, bloqueada: true, motivo: 'Pedí primero la pista ' + (vistas + 1) + '.', esSolucion: n === 3 };
    if (n === 3 && opts.confirmar !== true) return { n: 3, texto: null, bloqueada: true, motivo: 'Esta pista es casi la solución. Confirmá que la querés ver.', esSolucion: true };
    return { n: n, texto: p[n - 1], bloqueada: false, esSolucion: n === 3, hayMas: n < p.length };
  }

  /* ---------- buscador ---------- */

  var PESOS = {
    error: { nombre_corto: 6, buscar: 6, mensaje_editor: 3, mensaje_editor_actual: 3, categoria: 2, explicacion: 2, relacion_con_la_materia: 1.5, como_arreglarlo: 1.5, pistas: 1 },
    ayuda: { elemento: 8, buscar: 6, que_es: 3, tipo: 1.5, error_tipico: 1.5, en_la_materia: 1.5, como_se_usa: 1 },
    leccion: { titulo: 7, buscar: 6, explicacion: 2 }
  };
  var TITULO = { error: 'nombre_corto', ayuda: 'elemento', leccion: 'titulo' };

  function texto(v) { return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }).join(' ') : (typeof v === 'string' ? v : ''); }

  function primeraOracion(s) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    var m = /^(.+?[.!?])(\s|$)/.exec(s);
    var o = m ? m[1] : s;
    return o.length > 160 ? o.slice(0, 157).replace(/\s+\S*$/, '') + '…' : o;
  }

  function agregarDoc(tipo, id, entrada) {
    var pesos = PESOS[tipo], doc = { tipo: tipo, id: id, entrada: entrada, idx: S.docs.length, frases: [], titulo: '', resumen: '' };
    var campos = Object.keys(pesos);
    for (var c = 0; c < campos.length; c++) {
      var campo = campos[c], peso = pesos[campo], valor = entrada[campo];
      if (valor == null) continue;
      var items = campo === 'buscar' ? (Array.isArray(valor) ? valor : [valor]) : [valor];
      for (var k = 0; k < items.length; k++) {
        var t = texto(items[k]);
        if (!t) continue;
        if (tipo === 'leccion' && campo === 'titulo') t = t.replace(/^\s*\d+\s*[.)-]\s*/, '');
        var simb = campo !== 'pistas' && campo !== 'explicacion';
        var rs = raices(t, simb);
        for (var r = 0; r < rs.length; r++) {
          var tok = rs[r], p = S.post[tok];
          if (!p) { p = S.post[tok] = {}; S.vocab.push(tok); }
          if (!(doc.idx in p) || p[doc.idx] < peso) p[doc.idx] = peso;
        }
        if ((campo === TITULO[tipo] || campo === 'buscar') && rs.length) {
          var frase = ' ' + rs.join(' ') + ' ';
          doc.frases.push(frase);
        }
      }
    }
    doc.titulo = tipo === 'leccion' ? String(entrada.titulo || '').replace(/^\s*\d+\s*[.)-]\s*/, '') : String(entrada[TITULO[tipo]] || '');
    doc.resumen = tipo === 'error' ? primeraOracion(entrada.mensaje_editor || entrada.explicacion) : tipo === 'ayuda' ? primeraOracion(entrada.que_es) : primeraOracion(texto(entrada.explicacion));
    S.docs.push(doc);
  }

  function construirIndice() {
    var i, g, k;
    S.docs = []; S.post = {}; S.vocab = []; S.sin = {}; S.cacheExp = {}; S.idf = {};
    for (i = 0; i < S.errores.length; i++) agregarDoc('error', S.errores[i].id, S.errores[i]);
    for (i = 0; i < S.ayuda.length; i++) agregarDoc('ayuda', S.ayuda[i].elemento, S.ayuda[i]);
    for (i = 0; i < S.lecciones.length; i++) agregarDoc('leccion', S.lecciones[i].id, S.lecciones[i]);
    var N = S.docs.length || 1, base = Math.log(1 + N);
    for (var tok in S.post) {
      var df = 0; for (k in S.post[tok]) df++;
      S.idf[tok] = 0.5 + 1.5 * Math.log(1 + N / df) / base;
    }
    for (g = 0; g < GRUPOS.length; g++) {
      var rs = [];
      for (i = 0; i < GRUPOS[g].length; i++) {
        var it = GRUPOS[g][i], r = (/^[a-z0-9_]+$/.test(it) ? [stem(it)] : raices(it, true));
        if (r.length === 1) rs.push(r[0]);
      }
      for (i = 0; i < rs.length; i++) (S.sin[rs[i]] = S.sin[rs[i]] || []).push(rs);
    }
  }

  // Todas las raíces del vocabulario que coinciden con q: exacta (1) o por prefijo (0,6).
  function expandir(q) {
    if (S.cacheExp[q]) return S.cacheExp[q];
    var out = [];
    if (S.post[q]) out.push([q, 1]);
    if (q.length >= 4 && q.indexOf('sym:') !== 0 && !/^\d+$/.test(q)) {
      for (var i = 0; i < S.vocab.length; i++) {
        var v = S.vocab[i];
        if (v === q || v.length < 4 || v.indexOf('sym:') === 0) continue;
        if (v.indexOf(q) === 0 || q.indexOf(v) === 0) out.push([v, 0.6]);
      }
    }
    S.cacheExp[q] = out;
    return out;
  }

  function buscar(textoConsulta, opts) {
    if (!S) return [];
    opts = opts || {};
    var max = opts.max > 0 ? opts.max : 8, tipos = opts.tipos;
    var qs = raices(textoConsulta, true), uniq = [], vistos = {}, i, j, k;
    for (i = 0; i < qs.length; i++) if (!vistos[qs[i]]) { vistos[qs[i]] = 1; uniq.push(qs[i]); }
    if (!uniq.length) return [];
    var total = {}, cubiertos = {};
    for (i = 0; i < uniq.length; i++) {
      var q = uniq[i], variantes = [[q, 1]], grupos = S.sin[q];
      if (grupos) for (j = 0; j < grupos.length; j++) for (k = 0; k < grupos[j].length; k++) if (grupos[j][k] !== q) variantes.push([grupos[j][k], 0.75]);
      var mejor = {};
      for (j = 0; j < variantes.length; j++) {
        var ex = expandir(variantes[j][0]);
        for (k = 0; k < ex.length; k++) {
          var tok = ex[k][0], calidad = ex[k][1] * variantes[j][1], pt = S.post[tok], idf = S.idf[tok];
          for (var d in pt) {
            var s = pt[d] * idf * calidad * (/^\d+$/.test(q) ? 0.6 : 1);
            if (!(d in mejor) || mejor[d] < s) mejor[d] = s;
          }
        }
      }
      for (var dd in mejor) { total[dd] = (total[dd] || 0) + mejor[dd]; cubiertos[dd] = (cubiertos[dd] || 0) + 1; }
    }
    var frase = ' ' + uniq.join(' ') + ' ', res = [];
    for (var di in total) {
      var doc = S.docs[di];
      if (tipos && tipos.indexOf(doc.tipo) < 0) continue;
      var sc = total[di] * (0.4 + 0.6 * cubiertos[di] / uniq.length);
      for (j = 0; j < doc.frases.length; j++) {
        var f = doc.frases[j];
        if (f === frase) { sc += 9; break; }
        if (f.indexOf(frase) >= 0) { sc += uniq.length > 1 ? 5 : 2.5; break; }
        if (f.split(' ').length > 3 && frase.indexOf(f) >= 0) { sc += 6; break; }
      }
      res.push({ tipo: doc.tipo, id: doc.id, titulo: doc.titulo, resumen: doc.resumen, puntaje: Math.round(sc * 100) / 100, entrada: doc.entrada, _o: doc.idx });
    }
    res.sort(function (a, b) { return b.puntaje - a.puntaje || a.titulo.length - b.titulo.length || a._o - b._o; });
    res = res.slice(0, max);
    for (i = 0; i < res.length; i++) delete res[i]._o;
    return res;
  }

  /* ---------- «¿qué es esto?»: elemento de C en una posición del código ---------- */

  var CONOCIDAS = {};
  ('auto break case char const continue default do double else enum extern float for goto if int long register return short signed sizeof static struct switch typedef union unsigned void volatile while true false bool main NULL EXIT_SUCCESS EXIT_FAILURE ' +
    'printf scanf getchar putchar puts gets fgets sprintf snprintf fmod sqrt pow fabs abs rand srand getch system tolower toupper isalpha isdigit isspace islower isupper isalnum ceil floor round sin cos tan log log10 exp atoi atol atof strlen strcpy strncpy strcat strncat strcmp strncmp').split(' ').forEach(function (w) { CONOCIDAS[w] = 1; });
  var CABECERAS = { 'stdio.h': 1, 'stdlib.h': 1, 'math.h': 1, 'ctype.h': 1, 'string.h': 1, 'stdbool.h': 1, 'time.h': 1, 'limits.h': 1, 'float.h': 1 };
  var OPS3 = ['<<=', '>>=', '...'];
  var OPS2 = ['&&', '||', '==', '!=', '<=', '>=', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '->'];
  var RE_FORMATO = /%(?:%|[-+ #0]*(?:\d+|\*)?(?:\.(?:\d+|\*))?(?:hh|h|ll|l|z|L|j|t)?[diouxXfFeEgGaAcspn])/g;
  var RE_ESCAPE = /\\(?:x[0-9a-fA-F]{1,2}|[0-7]{1,3}|.)/g;

  function enLiteral(cuerpo, ini, offset, soloEscapes) {
    // cuerpo: texto del literal sin comillas; ini: posición de cuerpo[0] en el código
    var m, hit = null;
    var esc = new RegExp(RE_ESCAPE.source, 'g');
    while ((m = esc.exec(cuerpo))) if (offset >= ini + m.index && offset <= ini + m.index + m[0].length) { hit = m[0]; if (offset < ini + m.index + m[0].length) break; }
    if (hit) return hit.length > 2 && /^\\[0-7]/.test(hit) ? '\\0' : (hit.length > 2 ? '\\' : hit);
    if (soloEscapes) return null;
    var fm = new RegExp(RE_FORMATO.source, 'g');
    while ((m = fm.exec(cuerpo))) if (offset >= ini + m.index && offset <= ini + m.index + m[0].length) { hit = m[0]; if (offset < ini + m.index + m[0].length) break; }
    return hit;
  }

  function elementoEnPosicion(codigo, offset) {
    codigo = String(codigo == null ? '' : codigo);
    if (typeof offset !== 'number' || !(offset >= 0) || offset > codigo.length) return null;
    var n = codigo.length, i = 0, cand = null, prev = null, sigPalabra;
    function esPalabra(c) { return /[A-Za-z0-9_]/.test(c); }
    var ultimo = null, sigDe = null;
    while (i < n) {
      var c = codigo[i], ini = i, tipo, clave = null;
      if (/\s/.test(c)) { i++; continue; }
      if (c === '/' && codigo[i + 1] === '/') { while (i < n && codigo[i] !== '\n') i++; if (offset >= ini && offset <= i && !(offset === i && false)) return null; continue; }
      if (c === '/' && codigo[i + 1] === '*') { var f = codigo.indexOf('*/', i + 2); i = f < 0 ? n : f + 2; if (offset >= ini && offset <= i) return null; continue; }
      if (c === '"' || c === "'") {
        var q = c; i++;
        while (i < n && codigo[i] !== q && codigo[i] !== '\n') { if (codigo[i] === '\\') i++; i++; }
        var cierra = codigo[i] === q; var fin = cierra ? i + 1 : i; i = fin;
        if (offset > ini && offset <= fin) return enLiteral(codigo.slice(ini + 1, cierra ? fin - 1 : fin), ini + 1, offset, q === "'");
        continue;
      }
      if (c === '#') {
        var m = /^#[ \t]*([A-Za-z_]\w*)/.exec(codigo.slice(i, i + 40));
        if (m) {
          i += m[0].length;
          if (offset >= ini && offset <= i) return '#' + m[1];
          if (m[1] === 'include') {
            var h = /^[ \t]*[<"]([^>"\n]*)[>"]/.exec(codigo.slice(i, i + 80));
            if (h) { var hi = i + h[0].indexOf(h[1]); var he = hi + h[1].length; i += h[0].length; if (offset >= hi && offset <= he) return CABECERAS[h[1]] ? h[1] : '#include'; }
          }
          continue;
        }
        i++; if (offset >= ini && offset <= i) return '#include'; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(codigo[i + 1] || ''))) {
        while (i < n && /[0-9A-Za-z_.]/.test(codigo[i])) { if ((codigo[i] === 'e' || codigo[i] === 'E') && /[+-]/.test(codigo[i + 1] || '')) i++; i++; }
        if (offset >= ini && offset <= i) return null;
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        while (i < n && esPalabra(codigo[i])) i++;
        var w = codigo.slice(ini, i);
        var dentro = offset >= ini && offset < i, borde = offset === i;
        if (dentro || (borde && cand === null)) {
          // else if
          if (w === 'if' && ultimo === 'else') clave = 'else if';
          else if (w === 'else' && /^\s+if\b/.test(codigo.slice(i, i + 20))) clave = 'else if';
          else clave = w;
          var conocida = CONOCIDAS[w] === 1 || (S && S.ayudaMap[w]);
          if (clave === 'else if') { if (!(S && S.ayudaMap['else if'])) clave = w; }
          clave = conocida ? clave : null;
          if (dentro) return clave;
          cand = { clave: clave };
        }
        ultimo = w;
        continue;
      }
      // operadores y signos
      var op = c, k;
      for (k = 0; k < OPS3.length; k++) if (codigo.substr(i, 3) === OPS3[k]) { op = OPS3[k]; break; }
      if (op === c) for (k = 0; k < OPS2.length; k++) if (codigo.substr(i, 2) === OPS2[k]) { op = OPS2[k]; break; }
      i += op.length;
      if (offset >= ini && offset < i) return claveOperador(op);
      if (offset === i && cand === null) cand = { clave: claveOperador(op) };
      ultimo = op;
      if (cand !== null && offset < ini) break;
    }
    return cand ? cand.clave : null;
  }
  function claveOperador(op) {
    if (op === '(' || op === ')') return '()';
    if (op === '{' || op === '}') return '{}';
    if (op === '[' || op === ']') return '[]';
    if (op === '?' || op === ':') return '?:';
    if (op === '\\' || op === '@' || op === '$' || op === '`') return null;
    return op;
  }

  // Entrada de ayuda de una clave. Los formatos con ancho, precisión o flags caen al más general que exista.
  function ayudaDe(clave) {
    if (!S || clave == null) return null;
    clave = String(clave);
    if (S.ayudaMap[clave]) return S.ayudaMap[clave];
    var m = /^%([-+ #0]*)(\d+|\*)?(?:\.(\d+|\*))?(hh|h|ll|l|z|L|j|t)?([a-zA-Z])$/.exec(clave);
    if (m) {
      var cand = ['%' + (m[1] || '') + (m[2] || '') + (m[4] || '') + m[5], '%' + (m[2] || '') + (m[4] || '') + m[5], '%' + (m[4] || '') + m[5], '%' + m[5]];
      for (var i = 0; i < cand.length; i++) if (S.ayudaMap[cand[i]]) return S.ayudaMap[cand[i]];
    }
    return null;
  }

  /* ---------- carga ---------- */

  function aLista(x) { return Array.isArray(x) ? x : []; }

  function cargar(datos) {
    datos = datos || {};
    S = vacio();
    S.errores = aLista(datos.errores).filter(function (e) { return e && typeof e === 'object' && typeof e.id === 'string'; });
    S.ayuda = aLista(datos.ayuda).filter(function (a) { return a && typeof a === 'object' && typeof a.elemento === 'string'; });
    S.lecciones = aLista(datos.lecciones).filter(function (l) { return l && typeof l === 'object'; }).map(function (l, i) {
      var c = Object.assign({}, l);
      if (typeof c.id !== 'string') c.id = 'L-' + String(i + 1).padStart(3, '0');
      if (Array.isArray(c.explicacion)) c.explicacion = c.explicacion.join(' ');
      return c;
    });
    S.errores.forEach(function (e) {
      S.porId[e.id] = e;
      if (typeof e.mensaje_editor_actual === 'string' && e.mensaje_editor_actual) {
        var t = normalizarMensaje(e.mensaje_editor_actual);
        (S.plantillas[t] = S.plantillas[t] || []).push(e);
      }
      if (typeof e.codigo_editor_actual === 'string' && e.codigo_editor_actual) (S.porCodigo[e.codigo_editor_actual] = S.porCodigo[e.codigo_editor_actual] || []).push(e);
    });
    S.ayuda.forEach(function (a) { if (!S.ayudaMap[a.elemento]) S.ayudaMap[a.elemento] = a; });
    construirIndice();
    api.cargado = true;
    return { errores: S.errores.length, ayuda: S.ayuda.length, lecciones: S.lecciones.length };
  }

  var api = {
    cargado: false,
    cargar: cargar,
    explicar: explicar,
    entradaPara: entradaPara,
    ayudaNivel: ayudaNivel,
    pista: pista,
    buscar: buscar,
    elementoEnPosicion: elementoEnPosicion,
    ayudaDe: ayudaDe,
    normalizarMensaje: normalizarMensaje,
    normalizarNivel: normalizarNivel,
    ayudaPorDefecto: function (n) { if (n !== undefined) NIVEL_AYUDA = normalizarNivel(n, 1); return NIVEL_AYUDA; },
    tamano: function () { return S ? { errores: S.errores.length, ayuda: S.ayuda.length, lecciones: S.lecciones.length } : { errores: 0, ayuda: 0, lecciones: 0 }; },
    entrada: function (id) { return S && S.porId[id] || null; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.KB = api;
    if (root.KB_DATA) { try { cargar(root.KB_DATA); } catch (e) { /* sin base: el editor sigue funcionando */ } }
  }
})(typeof self !== 'undefined' ? self : this);

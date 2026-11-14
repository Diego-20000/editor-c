/* Editor C, de Diego Segurotti (ArtPrograms Studio). Uso libre dentro de este sitio, sin fines comerciales. Prohibido copiar, redistribuir o vender sin permiso. PolyForm Strict License 1.0.0. */
/* Editor C: «Ordenar código». Solo cambia la FORMA (sangría, espacios al final de línea y un espacio después de if/for/while/switch);
   nunca el contenido: no toca nombres, números, textos entre comillas ni comentarios.
   Sin IA: reglas fijas sobre las llaves. La sangría sigue el estilo de las pizarras: llaves en la línea del if, cuerpo sangrado.
   API: ordenar(texto, unidad) -> texto ordenado (unidad: la sangría de un nivel, por defecto 4 espacios).
        mascara(texto) -> arreglo de 0/1 (1 = código; 0 = comentario, texto o letra entre comillas simples).
   Navegador: window.Ordenar. Node: module.exports. */
(function (root) {
  'use strict';

  function mascara(t) {
    var n = t.length, m = new Array(n), i = 0, j, q;
    while (i < n) {
      var c = t[i], d = t[i + 1];
      if (c === '/' && d === '/') { while (i < n && t[i] !== '\n') m[i++] = 0; }
      else if (c === '/' && d === '*') { j = t.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; while (i < j) m[i++] = 0; }
      else if (c === '"' || c === "'") {
        q = c; m[i++] = 0;
        while (i < n && t[i] !== q && t[i] !== '\n') { if (t[i] === '\\') { m[i++] = 0; if (i < n && t[i] !== '\n') m[i++] = 0; } else m[i++] = 0; }
        if (i < n && t[i] === q) m[i++] = 0;
      } else m[i++] = 1;
    }
    return m;
  }

  // un espacio entre if / for / while / switch y el paréntesis (solo en el código)
  function espaciarPalabras(t) {
    var m = mascara(t), re = /\b(if|for|while|switch)\(/g, r, pos = [], k;
    while ((r = re.exec(t))) if (m[r.index]) pos.push(r.index + r[1].length);
    for (k = pos.length - 1; k >= 0; k--) t = t.slice(0, pos[k]) + ' ' + t.slice(pos[k]);
    return t;
  }

  function ancho(sp, unidad) { var n = 0, i; for (i = 0; i < sp.length; i++) n += sp[i] === '\t' ? unidad.length : 1; return n; }
  function nivelDe(pila) { var n = pila.length, i; for (i = 0; i < pila.length; i++) if (pila[i] === 's') n++; return n; }

  function ordenar(texto, unidad) {
    unidad = unidad || '    ';
    var t = espaciarPalabras(String(texto).replace(/\r\n?/g, '\n'));
    var m = mascara(t), lineas = t.split('\n'), out = [], pila = [], tail = '', pend = 0, paren = 0, delta = 0, ctl = false, preCont = false, off = 0, li, k;
    for (li = 0; li < lineas.length; li++) {
      var raw = lineas[li], ini = off; off += raw.length + 1;
      // sigue dentro de un comentario de varias líneas: se deja como está
      if (li > 0 && m[ini - 1] === 0) { out.push(raw.replace(/[ \t]+$/, '')); continue; }
      var sinIni = raw.replace(/^[ \t]+/, ''), s = sinIni.replace(/[ \t]+$/, '');
      if (!s) { out.push(''); continue; }
      var lead = raw.length - sinIni.length, base = ini + lead;
      // directivas (#include, #define…): siempre pegadas a la izquierda; si siguen en el renglón de abajo con «\», quedan como están
      if (preCont) { out.push(raw.replace(/[ \t]+$/, '')); preCont = /\\$/.test(s); continue; }
      if (s[0] === '#' && m[base]) { out.push(s); preCont = /\\$/.test(s); continue; }
      // solo el código de la línea (sin comentarios ni textos), para reconocer cómo termina
      var cs = '', cierres = 0, empieza = true;
      for (k = 0; k < s.length; k++) if (m[base + k]) cs += s[k];
      cs = cs.replace(/\s+$/, '');
      for (k = 0; k < s.length; k++) {
        if (s[k] === '}' && m[base + k]) cierres++;
        else if (s[k] === ' ' || s[k] === '\t') continue;
        else break;
      }
      var parenIni = paren, indent;
      if (parenIni > 0) {
        // renglón de continuación (argumentos de un printf en varias líneas…): conserva su alineación relativa
        indent = Math.max(0, ancho(raw.slice(0, lead), unidad) + delta); empieza = false;
      } else {
        var copia = pila.slice(), c; for (c = 0; c < cierres; c++) copia.pop();
        var nivel = nivelDe(copia);
        if (/^(case\b|default\s*:)/.test(s) && m[base] && copia.length && copia[copia.length - 1] === 's') nivel--;
        else if (pend > 0 && s[0] !== '{') nivel += pend;
        indent = nivel * unidad.length;
        delta = indent - ancho(raw.slice(0, lead), unidad);
      }
      out.push(' '.repeat(indent) + s);
      // se recorren los caracteres del código para llevar las llaves y los paréntesis
      for (k = 0; k < s.length; k++) {
        if (!m[base + k]) continue;
        var ch = s[k];
        if (ch === '(' || ch === '[') paren++;
        else if (ch === ')' || ch === ']') { if (paren > 0) paren--; }
        else if (ch === '{') { pila.push(/\bswitch\s*\([^;{}]*\)\s*$/.test(tail) ? 's' : 'b'); tail = ''; continue; }
        else if (ch === '}') { pila.pop(); tail = ''; continue; }
        else if (ch === ';') { tail = ''; continue; }
        tail += /\s/.test(ch) ? ' ' : ch;
        if (tail.length > 300) tail = tail.slice(-300);
      }
      // instrucciones sin llaves: if (…) / for (…) / while (…) / else en un renglón, y su cuerpo en el siguiente
      if (empieza && /^(\}\s*)?(else\s+)?(if|for|while|switch)\b/.test(cs)) ctl = true;
      if (paren === 0) {
        var encabezado = (ctl && /\)$/.test(cs) && !/^(\}\s*)?(else\s+)?switch\b/.test(cs)) || /^(\}\s*)?(else|do)$/.test(cs);
        ctl = false;
        if (encabezado) pend++;
        else if (cs && /[;{}]$/.test(cs)) pend = 0;
        else if (cs && s[0] === '{') pend = 0;
      }
    }
    return out.join('\n');
  }

  var api = { ordenar: ordenar, mascara: mascara };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Ordenar = api;
})(typeof window !== 'undefined' ? window : this);

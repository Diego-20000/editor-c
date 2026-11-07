/* Casos sin respuesta y compartir por decisión del alumno. Nada se envía solo: este módulo solo arma
   textos y enlaces; la persona ve la vista previa y elige. Sin nombres ni datos personales. */
(function (root) {
  'use strict';

  var FORMATO = 'casos-sin-respuesta-v1';
  var MAX_CODIGO = 4000, MAX_ENTRADA = 500, MAX_MSG = 300, MAX_CASOS = 50, LIMITE_URL = 1800;
  var CLAVE = 'editor-c-casos';
  var AVISO = '(recortado: copiá el resto con Copiar)';

  /* ---------- privacidad ---------- */

  // Quita la cabecera de comentarios del principio (nombre, curso, materia, ciclo) y datos de contacto sueltos.
  function limpiarCodigo(codigo, info) {
    var lineas = String(codigo == null ? '' : codigo).replace(/\r\n?/g, '\n').split('\n'), i = 0;
    while (i < lineas.length && i < 6 && /^\s*\/\/(?!\s*$)/.test(lineas[i]) && !/^\s*\/\/\s*(main|incluye|calcula|lee|muestra)\b/i.test(lineas[i])) i++;
    var cuerpo = lineas.slice(i);
    while (cuerpo.length && /^\s*$/.test(cuerpo[0])) { cuerpo.shift(); i++; }
    if (info) info.quitadas = i;
    return cuerpo.join('\n')
      .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '(correo quitado)')
      .replace(/https?:\/\/\S+/g, '(enlace quitado)')
      .replace(/\+?\d[\d ()-]{7,}\d/g, function (m) { return m.replace(/\D/g, '').length >= 8 ? '(número quitado)' : m; });
  }
  function recortar(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) : s; }
  function entero(n, min, max, def) { n = Math.round(Number(n)); return isFinite(n) && n >= min && n <= max ? n : def; }

  function hoy() { return new Date().toISOString().slice(0, 10); }

  function nuevoCaso(o) {
    o = o || {};
    var d = o.diag || {}, info = {}, codigo = limpiarCodigo(o.codigo, info), caso;
    var largo = codigo.length;
    caso = {
      v: 1,
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(o.fecha || '') ? o.fecha : hoy(),
      version: recortar(o.version || '', 40).replace(/[^\w.-]/g, ''),
      nivel_ayuda: entero(o.nivelAyuda, 0, 2, 1),
      diag: {
        nivel: d.nivel === 'aviso' || d.nivel === 'informacion' ? d.nivel : 'error',
        code: recortar(d.code || '', 60).replace(/[^\w-]/g, ''),
        msg: recortar(limpiarCodigo(d.msg || '').replace(/\s+/g, ' '), MAX_MSG),
        line: entero(Number(d.line) - (info.quitadas || 0), 0, 100000, 0)   // la cabecera quitada corre las líneas
      },
      codigo: recortar(codigo, MAX_CODIGO),
      entrada: recortar(limpiarCodigo(o.entrada), MAX_ENTRADA)
    };
    if (largo > MAX_CODIGO) { caso.recortado = largo; caso.aviso = 'código recortado a ' + MAX_CODIGO + ' caracteres (original: ' + largo + ')'; }
    return caso;
  }

  /* ---------- almacén (interfaz de localStorage) ---------- */

  function clave(caso) { return String(caso && caso.codigo || '').replace(/\s+/g, ' ').trim() + '|' + String(caso && caso.diag && caso.diag.msg || ''); }

  function leer(almacen) {
    try {
      var t = almacen.getItem(CLAVE);
      var a = t ? JSON.parse(t) : [];
      return Array.isArray(a) ? a.filter(function (c) { return c && typeof c === 'object' && c.diag && typeof c.codigo === 'string'; }) : [];
    } catch (e) { return []; }
  }
  function escribir(almacen, lista) {
    try { almacen.setItem(CLAVE, JSON.stringify(lista)); return true; } catch (e) { return false; }
  }
  function listar(almacen) { return almacen ? leer(almacen) : []; }

  function guardar(caso, almacen) {
    if (!almacen || !caso) return { ok: false, duplicado: false, total: 0, error: 'sin almacén' };
    var lista = leer(almacen), k = clave(caso), i;
    for (i = 0; i < lista.length; i++) if (clave(lista[i]) === k) return { ok: true, duplicado: true, total: lista.length };
    lista.push(caso);
    while (lista.length > MAX_CASOS) lista.shift();
    var ok = escribir(almacen, lista);
    return { ok: ok, duplicado: false, total: lista.length, error: ok ? undefined : 'no se pudo guardar en este dispositivo' };
  }
  // quien: posición (número) o clave (texto) del caso
  function borrar(quien, almacen) {
    if (!almacen) return false;
    var lista = leer(almacen), antes = lista.length;
    if (typeof quien === 'number') lista = lista.filter(function (c, i) { return i !== quien; });
    else lista = lista.filter(function (c) { return clave(c) !== quien; });
    if (lista.length === antes) return false;
    return escribir(almacen, lista);
  }

  /* ---------- WhatsApp ---------- */

  function mensajeWhatsApp(casos) {
    casos = (casos || []).filter(Boolean);
    var ver = casos.length && casos[0].version ? casos[0].version : '';
    var t = ['Caso para el entrenador del Editor C', 'Versión: ' + (ver || 's/d') + ' · ' + casos.length + (casos.length === 1 ? ' caso' : ' casos'), ''];
    casos.forEach(function (c, i) {
      var d = c.diag || {};
      t.push('--- Caso ' + (i + 1) + ' ---');
      t.push('Diagnóstico: ' + (d.nivel || 'error') + (d.code ? ' (' + d.code + ')' : '') + (d.line ? ' línea ' + d.line : '') + ': ' + (d.msg || ''));
      t.push('Ayuda nivel ' + (c.nivel_ayuda == null ? 1 : c.nivel_ayuda) + (c.fecha ? ' · ' + c.fecha : ''));
      if (c.entrada) t.push('Entrada: ' + c.entrada.replace(/\n/g, ' / '));
      t.push('```c', c.codigo || '', '```');
      if (c.aviso) t.push(c.aviso);
      t.push('');
    });
    t.push('#DATOS ' + JSON.stringify({ formato: FORMATO, casos: casos }));
    return t.join('\n');
  }

  function cortarSeguro(s, n) { if (n < s.length && n > 0 && /[\uD800-\uDBFF]/.test(s[n - 1])) n--; return s.slice(0, n); }
  function cod(s) { return encodeURIComponent(s).length; }

  function urlWhatsApp(texto, numero) {
    texto = String(texto == null ? '' : texto);
    api.textoCompleto = texto; api.recortado = false;
    var num = String(numero == null ? '' : numero).replace(/\D/g, '');
    var base = 'https://wa.me/' + num + '?text=';
    var t = texto;
    if (cod(t) > LIMITE_URL) {
      api.recortado = true;
      // 1) la línea de datos JSON es redundante con el código: se quita primero
      t = t.replace(/\n?#DATOS .*$/, '');
      // 2) se acortan los bloques de código, de a una línea, empezando por el más largo
      var guardia = 0;
      while (cod(t + '\n' + AVISO) > LIMITE_URL && guardia++ < 5000) {
        var partes = t.split(/(```c\n[\s\S]*?\n```)/), mejor = -1, largo = 0, i;
        for (i = 0; i < partes.length; i++) if (/^```c\n/.test(partes[i]) && partes[i].split('\n').length > 3 && partes[i].length > largo) { mejor = i; largo = partes[i].length; }
        if (mejor < 0) break;
        var ls = partes[mejor].split('\n');
        ls.splice(ls.length - 2, 1);
        partes[mejor] = ls.join('\n');
        t = partes.join('');
      }
      // 3) último recurso: corte duro
      if (cod(t + '\n' + AVISO) > LIMITE_URL) {
        var n = t.length;
        while (n > 0 && cod(cortarSeguro(t, n) + '\n' + AVISO) > LIMITE_URL) n = Math.floor(n * 0.9);
        t = cortarSeguro(t, n);
      }
      t = t.replace(/\s+$/, '') + '\n' + AVISO;
    }
    return base + encodeURIComponent(t);
  }

  /* ---------- exportar e importar ---------- */

  function exportarJSON(casos, opts) {
    var o = { formato: FORMATO, casos: (casos || []).filter(Boolean) };
    return opts && opts.compacto ? JSON.stringify(o) : JSON.stringify(o, null, 1);
  }

  var CAMPOS = { v: 1, fecha: 1, version: 1, nivel_ayuda: 1, diag: 1, codigo: 1, entrada: 1, recortado: 1, aviso: 1 };

  function validarCaso(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return { motivo: 'no es un objeto' };
    if (c.v !== 1) return { motivo: 'versión de formato desconocida' };
    var k;
    for (k in c) if (Object.prototype.hasOwnProperty.call(c, k) && !CAMPOS[k]) {
      if (JSON.stringify(c[k]).length > 200) return { motivo: 'campo desconocido demasiado grande: ' + k.slice(0, 30) };
    }
    if (typeof c.codigo !== 'string' || !c.codigo) return { motivo: 'falta el código' };
    if (c.codigo.length > 2 * MAX_CODIGO) return { motivo: 'código demasiado largo' };
    var d = c.diag;
    if (!d || typeof d !== 'object' || typeof d.msg !== 'string') return { motivo: 'falta el diagnóstico' };
    if (d.msg.length > 3 * MAX_MSG) return { motivo: 'mensaje demasiado largo' };
    if (c.entrada != null && (typeof c.entrada !== 'string' || c.entrada.length > 4 * MAX_ENTRADA)) return { motivo: 'entrada inválida o demasiado larga' };
    if (c.fecha != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(c.fecha))) return { motivo: 'fecha inválida' };
    var limpio = {
      v: 1,
      fecha: c.fecha ? String(c.fecha) : hoy(),
      version: recortar(typeof c.version === 'string' ? c.version : '', 40).replace(/[^\w.-]/g, ''),
      nivel_ayuda: entero(c.nivel_ayuda, 0, 2, 1),
      diag: {
        nivel: d.nivel === 'aviso' || d.nivel === 'informacion' ? d.nivel : 'error',
        code: recortar(typeof d.code === 'string' ? d.code : '', 60).replace(/[^\w-]/g, ''),
        msg: recortar(d.msg, MAX_MSG),
        line: entero(d.line, 0, 100000, 0)
      },
      codigo: recortar(c.codigo, MAX_CODIGO),
      entrada: recortar(c.entrada || '', MAX_ENTRADA)
    };
    if (c.codigo.length > MAX_CODIGO) { limpio.recortado = c.codigo.length; limpio.aviso = 'código recortado a ' + MAX_CODIGO + ' caracteres (original: ' + c.codigo.length + ')'; }
    return { caso: limpio };
  }

  // Acepta el archivo exportado o el mensaje de WhatsApp (la línea #DATOS). Devuelve { casos, descartados:[{indice, motivo}] }.
  function importarJSON(texto) {
    var fuera = { casos: [], descartados: [] };
    if (typeof texto !== 'string') { fuera.descartados.push({ indice: -1, motivo: 'no es texto' }); return fuera; }
    if (texto.length > 2000000) { fuera.descartados.push({ indice: -1, motivo: 'archivo demasiado grande' }); return fuera; }
    var t = texto.replace(/^﻿/, '').trim(), obj;
    var m = /(?:^|\n)#DATOS (\{.*\})\s*$/.exec(t);
    if (m) t = m[1];
    try { obj = JSON.parse(t); } catch (e) { fuera.descartados.push({ indice: -1, motivo: 'no es JSON válido' }); return fuera; }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.formato !== FORMATO) { fuera.descartados.push({ indice: -1, motivo: 'formato desconocido (se esperaba ' + FORMATO + ')' }); return fuera; }
    if (!Array.isArray(obj.casos)) { fuera.descartados.push({ indice: -1, motivo: 'falta la lista de casos' }); return fuera; }
    obj.casos.forEach(function (c, i) {
      if (i >= 200) { if (i === 200) fuera.descartados.push({ indice: i, motivo: 'más de 200 casos: el resto se ignora' }); return; }
      var r = validarCaso(c);
      if (r.caso) fuera.casos.push(r.caso); else fuera.descartados.push({ indice: i, motivo: r.motivo });
    });
    return fuera;
  }

  var api = {
    FORMATO: FORMATO, MAX_CODIGO: MAX_CODIGO, MAX_CASOS: MAX_CASOS, LIMITE_URL: LIMITE_URL, AVISO_RECORTE: AVISO,
    nuevoCaso: nuevoCaso, guardar: guardar, listar: listar, borrar: borrar, clave: clave,
    mensajeWhatsApp: mensajeWhatsApp, urlWhatsApp: urlWhatsApp, exportarJSON: exportarJSON, importarJSON: importarJSON,
    textoCompleto: '', recortado: false
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Compartir = api;
})(typeof self !== 'undefined' ? self : this);

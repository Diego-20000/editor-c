/* Editor C, de Diego Segurotti (ArtPrograms Studio). Uso libre dentro de este sitio, sin fines comerciales. Prohibido copiar, redistribuir o vender sin permiso. PolyForm Strict License 1.0.0. */
/* Proceso: evidencia de cómo se escribió el código dentro del editor.
   Guarda, para cada carácter del texto, su PROCEDENCIA (no el contenido):
     t = tipeado, p = pegado, a = automático (lo puso el propio editor),
     c = cargado (archivo, ejemplo, programa guardado), u = desconocido.
   Los segmentos son de longitud variable (run-length). Los índices son de UTF-16,
   los mismos que usa el textarea (una tilde cuenta 1, un emoji cuenta 2).
   Núcleo puro (sin DOM) + adaptador de navegador (conectar). Todo queda en el dispositivo.
   No es un detector de nada: solo cuenta cómo entró el texto. */
(function (root) {
  'use strict';

  const TIPOS = 'tpacu';
  const TOPE_INACTIVIDAD = 60000;   // un intervalo mayor a 60 s entre eventos no suma tiempo activo
  const MAX_PEGADOS = 100;          // lista de pegados que se conserva (los más recientes)

  /* ---------- utilidades ---------- */
  const esAlta = (c) => c >= 0xd800 && c <= 0xdbff;
  const esBaja = (c) => c >= 0xdc00 && c <= 0xdfff;

  function hash(s) { // FNV-1a de 32 bits sobre unidades UTF-16, en base 36
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  }

  // diff mínimo por prefijo y sufijo común; no corta pares sustitutos
  function difMinimo(a, b) {
    const m = Math.min(a.length, b.length);
    let pre = 0;
    while (pre < m && a.charCodeAt(pre) === b.charCodeAt(pre)) pre++;
    if (pre > 0 && pre < m + 1 && esAlta(a.charCodeAt(pre - 1))) pre--;
    let suf = 0;
    while (suf < m - pre && a.charCodeAt(a.length - 1 - suf) === b.charCodeAt(b.length - 1 - suf)) suf++;
    if (suf > 0 && esBaja(a.charCodeAt(a.length - suf))) suf--;
    return { pre, suf, d: pre, h: a.length - suf, mid: b.slice(pre, b.length - suf) };
  }

  function lineasDe(s) { return s === '' ? 0 : s.replace(/\n$/, '').split('\n').length; }

  function tipoValido(t, porDefecto) { return typeof t === 'string' && t.length === 1 && TIPOS.indexOf(t) >= 0 ? t : porDefecto; }

  /* ---------- núcleo ---------- */
  class Proceso {
    constructor(texto, tipo, opc) {
      texto = typeof texto === 'string' ? texto : '';
      opc = opc || {};
      this.ahora = typeof opc.ahora === 'function' ? opc.ahora : Date.now;
      this.texto = texto;                      // último texto conocido (solo en memoria, nunca se guarda)
      this.segs = texto.length ? [[tipoValido(tipo, 'c'), texto.length]] : [];
      this.inicio = this.ahora();
      this.ultimo = null;                      // momento del último evento
      this.ms = 0;                             // tiempo activo
      this.teclas = 0; this.borrados = 0; this.correcciones = 0; this.ejecuciones = 0; this.bloqueados = 0;
      this.pegados = [];                       // {lineas, caracteres, momento}
      this.pegadoMayor = { lineas: 0, caracteres: 0 };
      this.previo = null;                      // 't' | 'c' | null: qué fue lo último (para detectar correcciones)
      this.reconciliadoAlRestaurar = false;
    }

    /* tiempo */
    _tick() {
      const t = this.ahora();
      if (this.ultimo !== null) { const d = t - this.ultimo; if (d >= 0 && d <= TOPE_INACTIVIDAD) this.ms += d; }
      this.ultimo = t;
      return t;
    }
    actividad() { this._tick(); }             // una tecla de navegación, un clic, etc.
    ejecutar() { this._tick(); this.ejecuciones++; }
    bloquearPegado() { this._tick(); this.bloqueados++; }
    tiempoActivo() { return this.ms; }

    /* segmentos */
    _norm() {
      const out = [];
      for (const s of this.segs) {
        if (s[1] <= 0) continue;
        const u = out[out.length - 1];
        if (u && u[0] === s[0]) u[1] += s[1]; else out.push([s[0], s[1]]);
      }
      this.segs = out;
    }
    _largo() { let n = 0; for (const s of this.segs) n += s[1]; return n; }
    _quitar(d, h) {
      if (h <= d) return;
      let off = 0;
      for (const s of this.segs) {
        const a = off, b = off + s[1]; off = b;
        const sol = Math.max(0, Math.min(b, h) - Math.max(a, d));
        s[1] -= sol;
      }
      this._norm();
    }
    _poner(pos, n, tipo) {
      if (n <= 0) return;
      const out = []; let off = 0, hecho = false;
      for (const s of this.segs) {
        const a = off, b = off + s[1]; off = b;
        if (!hecho && pos >= a && pos < b) {
          if (pos > a) out.push([s[0], pos - a]);
          out.push([tipo, n]);
          out.push([s[0], b - pos]);
          hecho = true;
        } else out.push(s);
      }
      if (!hecho) out.push([tipo, n]);
      this.segs = out; this._norm();
    }
    // reemplazo de segmentos (sin tocar texto ni métricas)
    _editar(d, h, largoNuevo, tipo) { this._quitar(d, h); this._poner(d, largoNuevo, tipo); }
    // si la suma de segmentos no coincide con el texto, se rehace todo como desconocido
    _cuadrar() { if (this._largo() !== this.texto.length) this.segs = this.texto.length ? [['u', this.texto.length]] : []; }
    _rango(d, h) { // cuenta de tipos dentro de [d,h)
      const r = { t: 0, p: 0, a: 0, c: 0, u: 0 }; let off = 0;
      for (const s of this.segs) {
        const a = off, b = off + s[1]; off = b;
        r[s[0]] += Math.max(0, Math.min(b, h) - Math.max(a, d));
      }
      return r;
    }
    tipoEn(i) { let off = 0; for (const s of this.segs) { off += s[1]; if (i < off) return s[0]; } return null; }

    _limites(d, h) {
      const n = this.texto.length;
      d = Math.max(0, Math.min(n, d | 0)); h = Math.max(d, Math.min(n, h | 0));
      return [d, h];
    }
    _registrarPegado(t, texto) {
      const r = { lineas: lineasDe(texto), caracteres: texto.length, momento: t };
      this.pegados.push(r);
      if (this.pegados.length > MAX_PEGADOS) this.pegados.shift();
      if (r.caracteres > this.pegadoMayor.caracteres) this.pegadoMayor = { lineas: r.lineas, caracteres: r.caracteres };
    }
    _metricaInsercion(tipo, texto, t) {
      if (tipo === 't') { this.teclas++; this.previo = 't'; }
      else { this.previo = null; if (tipo === 'p') this._registrarPegado(t, texto); }
    }

    /* operaciones públicas */
    insertar(pos, texto, tipo) {
      texto = String(texto == null ? '' : texto);
      if (!texto.length) return this;
      tipo = tipoValido(tipo, 't');
      this._cuadrar();
      const t = this._tick();
      const d = this._limites(pos, pos)[0];
      this._editar(d, d, texto.length, tipo);
      this.texto = this.texto.slice(0, d) + texto + this.texto.slice(d);
      this._metricaInsercion(tipo, texto, t);
      return this;
    }

    borrar(desde, hasta, opc) {
      this._cuadrar();
      const [d, h] = this._limites(desde, hasta);
      if (h <= d) return this;
      this._tick();
      const r = this._rango(d, h);
      this._editar(d, h, 0, 't');
      this.texto = this.texto.slice(0, d) + this.texto.slice(h);
      if (!(opc && opc.auto)) {
        this.borrados++;
        const soloTipeado = r.t === h - d;
        if (soloTipeado && (this.previo === 't' || this.previo === 'c')) { this.correcciones++; this.previo = 'c'; }
        else this.previo = null;
      }
      return this;
    }

    reemplazar(desde, hasta, texto, tipo) {
      texto = String(texto == null ? '' : texto);
      tipo = tipoValido(tipo, 't');
      this._cuadrar();
      const [d, h] = this._limites(desde, hasta);
      if (h <= d) return this.insertar(d, texto, tipo);
      if (!texto.length) return this.borrar(d, h, tipo === 't' ? null : { auto: true });
      if (tipo === 'a') return this._reemplazarAuto(d, h, texto);
      const t = this._tick();
      this._editar(d, h, texto.length, tipo);
      this.texto = this.texto.slice(0, d) + texto + this.texto.slice(h);
      this._metricaInsercion(tipo, texto, t);
      return this;
    }

    // un cambio automático (comentar, sangrar) conserva el origen de lo que no cambió:
    // se compara línea por línea si el número de líneas es el mismo, y si no, por prefijo y sufijo
    _reemplazarAuto(d, h, texto) {
      this._tick();
      const viejo = this.texto.slice(d, h);
      const ediciones = [];
      const lv = viejo.split('\n'), ln = texto.split('\n');
      if (lv.length === ln.length && lv.length > 1) {
        let off = d;
        for (let i = 0; i < lv.length; i++) {
          if (lv[i] !== ln[i]) { const x = difMinimo(lv[i], ln[i]); ediciones.push([off + x.d, off + x.h, x.mid.length]); }
          off += lv[i].length + 1;
        }
      } else if (viejo !== texto) {
        const x = difMinimo(viejo, texto); ediciones.push([d + x.d, d + x.h, x.mid.length]);
      }
      for (let i = ediciones.length - 1; i >= 0; i--) this._editar(ediciones[i][0], ediciones[i][1], ediciones[i][2], 'a');
      this.texto = this.texto.slice(0, d) + texto + this.texto.slice(h);
      this.previo = null;
      return this;
    }

    // el texto cambió sin que el módulo se enterara (deshacer, rehacer, autocorrector)
    reconciliar(textoNuevo, tipo) {
      textoNuevo = String(textoNuevo == null ? '' : textoNuevo);
      tipo = tipoValido(tipo, 'u');
      this._cuadrar();
      if (textoNuevo === this.texto) return this;
      this._tick();
      const x = difMinimo(this.texto, textoNuevo);
      this._editar(x.d, x.h, x.mid.length, tipo);
      this.texto = textoNuevo;
      this.previo = null;
      return this;
    }

    // todo el texto pasa a ser de un solo origen (abrir un archivo, elegir un ejemplo)
    cargar(texto, tipo) {
      texto = String(texto == null ? '' : texto);
      this.texto = texto;
      this.segs = texto.length ? [[tipoValido(tipo, 'c'), texto.length]] : [];
      this.previo = null;
      return this;
    }

    contar() {
      const r = { total: 0, t: 0, p: 0, a: 0, c: 0, u: 0 };
      for (const s of this.segs) { r[s[0]] += s[1]; r.total += s[1]; }
      return r;
    }

    metricas() {
      return {
        teclas: this.teclas, borrados: this.borrados, correcciones: this.correcciones, ejecuciones: this.ejecuciones,
        bloqueados: this.bloqueados,
        pegados: this.pegados.map((x) => ({ lineas: x.lineas, caracteres: x.caracteres, momento: x.momento })),
        pegadoMayor: { lineas: this.pegadoMayor.lineas, caracteres: this.pegadoMayor.caracteres },
        tiempoActivoMs: this.ms, inicio: this.inicio
      };
    }

    // formato compacto para guardar con cada programa: segmentos, contadores y huellas de líneas. Sin texto.
    serializar() {
      const lineas = this.texto.split('\n').map((l) => l.length + '.' + hash(l)).join(',');
      return {
        v: 1,
        s: this.segs.map((x) => x[0] + x[1]).join(''),
        l: this.texto.length,
        h: hash(this.texto),
        ln: lineas,
        m: [this.teclas, this.borrados, this.correcciones, this.ejecuciones, this.bloqueados],
        pg: this.pegados.map((x) => [x.lineas, x.caracteres, x.momento]),
        pm: [this.pegadoMayor.lineas, this.pegadoMayor.caracteres],
        ms: this.ms, i: this.inicio
      };
    }
  }

  function nuevo(textoInicial, tipoInicial, opc) { return new Proceso(textoInicial, tipoInicial, opc); }

  const esNum = (x) => typeof x === 'number' && isFinite(x) && x >= 0;

  function leerSegmentos(s) {
    if (typeof s !== 'string') return null;
    const segs = []; const re = /([tpacu])(\d+)/g; let m, usado = 0;
    while ((m = re.exec(s))) { usado += m[0].length; segs.push([m[1], parseInt(m[2], 10)]); }
    return usado === s.length ? segs : null;
  }
  function leerLineas(ln) {
    if (typeof ln !== 'string') return null;
    const out = [];
    for (const it of ln.split(',')) {
      const m = /^(\d+)\.([0-9a-z]+)$/.exec(it);
      if (!m) return null;
      out.push([parseInt(m[1], 10), m[2]]);
    }
    return out;
  }

  // Reconstruye un Proceso desde lo guardado. Si el texto actual no es el que se guardó, reconcilia
  // con las huellas de líneas: lo que cambió pasa a 'u'; lo que sigue igual conserva su origen.
  function restaurar(obj, textoActual, opc) {
    textoActual = String(textoActual == null ? '' : textoActual);
    const segs = obj && obj.v === 1 ? leerSegmentos(obj.s) : null;
    const p = new Proceso('', 'c', opc);
    const sano = segs && esNum(obj.l) && segs.reduce((a, x) => a + x[1], 0) === obj.l &&
      Array.isArray(obj.m) && obj.m.length >= 4 && obj.m.every(esNum) && Array.isArray(obj.pg) && esNum(obj.ms) && esNum(obj.i);
    if (!sano) { // objeto ausente o dañado: no hay historia confiable
      p.cargar(textoActual, 'u'); p.reconciliadoAlRestaurar = true; return p;
    }
    p.segs = segs; p._norm();
    p.teclas = obj.m[0]; p.borrados = obj.m[1]; p.correcciones = obj.m[2]; p.ejecuciones = obj.m[3]; p.bloqueados = obj.m[4] || 0;
    p.pegados = obj.pg.filter((x) => Array.isArray(x) && x.length === 3 && x.every(esNum)).slice(-MAX_PEGADOS)
      .map((x) => ({ lineas: x[0], caracteres: x[1], momento: x[2] }));
    if (Array.isArray(obj.pm) && esNum(obj.pm[0]) && esNum(obj.pm[1])) p.pegadoMayor = { lineas: obj.pm[0], caracteres: obj.pm[1] };
    p.ms = obj.ms; p.inicio = obj.i; p.ultimo = null;
    if (obj.l === textoActual.length && obj.h === hash(textoActual)) { p.texto = textoActual; return p; }

    p.reconciliadoAlRestaurar = true;
    const viejas = leerLineas(obj.ln);
    const nl = textoActual.split('\n');
    if (!viejas || viejas.reduce((a, x) => a + x[0] + 1, -1) !== obj.l) {
      p.cargar(textoActual, 'u'); // sin huellas no se sabe qué quedó igual: todo 'u'
      p.texto = textoActual;
      return p;
    }
    const nuevas = nl.map((l) => [l.length, hash(l)]);
    const cap = Math.min(viejas.length, nuevas.length);
    let pre = 0;
    while (pre < cap && viejas[pre][0] === nuevas[pre][0] && viejas[pre][1] === nuevas[pre][1]) pre++;
    pre = Math.min(pre, cap - 1); if (pre < 0) pre = 0;
    let suf = 0;
    while (suf < cap - pre && viejas[viejas.length - 1 - suf][0] === nuevas[nuevas.length - 1 - suf][0] &&
           viejas[viejas.length - 1 - suf][1] === nuevas[nuevas.length - 1 - suf][1]) suf++;
    const inicios = (ls) => { const r = [0]; for (const x of ls) r.push(r[r.length - 1] + x[0] + 1); return r; };
    const iv = inicios(viejas), inn = inicios(nuevas);
    const dV = iv[pre], hV = suf > 0 ? iv[viejas.length - suf] : obj.l;
    const dN = inn[pre], hN = suf > 0 ? inn[nuevas.length - suf] : textoActual.length;
    p._editar(dV, hV, hN - dN, 'u');
    p.texto = textoActual;
    p._cuadrar();
    return p;
  }

  /* ---------- resumen y frase para la captura ---------- */
  function resumen(p) {
    const c = p.contar(), m = p.metricas();
    const claves = ['t', 'p', 'a', 'c', 'u'];
    const pct = { t: 0, p: 0, a: 0, c: 0, u: 0 };
    if (c.total > 0) { // redondeo por mayor resto: los cinco suman siempre 100
      const exact = claves.map((k) => c[k] * 100 / c.total);
      claves.forEach((k, i) => { pct[k] = Math.floor(exact[i]); });
      let falta = 100 - claves.reduce((a, k) => a + pct[k], 0);
      claves.map((k, i) => [k, exact[i] - Math.floor(exact[i])]).sort((x, y) => y[1] - x[1])
        .forEach(([k]) => { if (falta > 0 && c[k] > 0) { pct[k]++; falta--; } });
    }
    return {
      total: c.total,
      tipeado: pct.t, pegado: pct.p, automatico: pct.a, cargado: pct.c, desconocido: pct.u,
      caracteres: { t: c.t, p: c.p, a: c.a, c: c.c, u: c.u },
      minutos: Math.round(m.tiempoActivoMs / 60000), segundos: Math.round(m.tiempoActivoMs / 1000),
      ejecuciones: m.ejecuciones, correcciones: m.correcciones,
      pegados: m.pegados.length,
      pegadoMayor: m.pegadoMayor
    };
  }

  // Una frase corta, con hechos. Sin juicios y sin acusar.
  function linea(r) {
    if (!r || !r.total) return 'Escrito en el editor: sin datos de proceso para este código';
    const partes = [];
    partes.push(r.tipeado + ' % tipeado');
    if (r.pegado > 0) partes.push(r.pegado + ' % pegado');
    else if (r.caracteres && r.caracteres.p > 0) partes.push('menos de 1 % pegado');
    if (r.automatico >= 5) partes.push(r.automatico + ' % automático (sangría y llaves)');
    if (r.cargado > 0) partes.push(r.cargado + ' % abierto desde un archivo');
    if (r.desconocido >= 5) partes.push(r.desconocido + ' % de origen no determinado');
    partes.push(r.minutos < 1 ? 'menos de 1 min de trabajo' : r.minutos + ' min de trabajo');
    partes.push(r.ejecuciones + (r.ejecuciones === 1 ? ' ejecución' : ' ejecuciones'));
    let s = 'Escrito en el editor: ' + partes.join(' · ');
    if (r.cargado >= 90) s += ' · el código se abrió desde un archivo';
    else if (r.cargado >= 20) s += ' · parte del código se abrió desde un archivo';
    return s;
  }

  /* ---------- política de pegado (modo práctica) ---------- */
  let politica = { permitir: true, aviso: null };
  function politicaPegado(o) {
    if (o && typeof o === 'object') {
      if ('permitir' in o) politica.permitir = o.permitir !== false;
      if ('aviso' in o) politica.aviso = typeof o.aviso === 'function' ? o.aviso : null;
    }
    return { permitir: politica.permitir, aviso: politica.aviso };
  }
  // ?practica=1 en el enlace apaga el pegado; devuelve true si el modo práctica quedó activo
  function politicaDesdeEnlace(search, aviso) {
    const m = /[?&]practica=([^&#]*)/.exec(String(search || ''));
    const activo = !!m && (m[1] === '1' || m[1] === 'si' || m[1] === 'true');
    politicaPegado({ permitir: !activo, aviso: aviso || politica.aviso });
    return activo;
  }

  /* ---------- adaptador de navegador ---------- */
  const INSERTA = {
    insertText: 't', insertCompositionText: 't', insertFromComposition: 't', insertLineBreak: 't', insertParagraph: 't',
    insertFromPaste: 'p', insertFromPasteAsQuotation: 'p', insertFromDrop: 'p', insertFromYank: 'p',
    insertReplacementText: 'u', insertTranspose: 'u'
  };
  const ES_PEGADO = { insertFromPaste: 1, insertFromPasteAsQuotation: 1, insertFromDrop: 1, insertFromYank: 1 };

  function medir(texto) { return { lineas: lineasDe(texto), caracteres: texto.length }; }

  // Engancha un textarea. Nunca guarda lo que se tipea ni lo que se pega: solo largos, líneas y tipos.
  function conectar(ta, opc) {
    opc = opc || {};
    let p = opc.proceso || nuevo(ta.value, opc.tipoInicial || 'c', { ahora: opc.ahora });
    let auto = 0, autoTecla = false, pend = null;

    function avisar(tipo, texto) {
      p.bloquearPegado();
      const cb = opc.aviso || politica.aviso;
      if (cb) { const m = medir(texto || ''); try { cb({ tipo, lineas: m.lineas, caracteres: m.caracteres }); } catch (e) { /* el aviso no puede romper el editor */ } }
    }
    function textoDe(dt) { try { return dt ? (dt.getData('text/plain') || dt.getData('text') || '') : ''; } catch (e) { return ''; } }
    function bloqueado() { return politica.permitir === false && auto === 0; }

    function sincronizar(tipo) { // el texto cambió por fuera: se alinea
      if (ta.value !== p.texto) p.reconciliar(ta.value, tipo);
    }

    function enPaste(e) {
      if (!bloqueado()) return;
      e.preventDefault();
      avisar('pegado', textoDe(e.clipboardData));
    }
    function enDrop(e) {
      if (!bloqueado()) return;
      const dt = e.dataTransfer, tipos = dt && dt.types ? Array.prototype.slice.call(dt.types) : [];
      if (tipos.length && !tipos.some((t) => t === 'text/plain' || t === 'text' || t === 'Text')) return; // archivos y otros: no es texto
      e.preventDefault();
      avisar('arrastre', textoDe(dt));
    }
    function enDragOver(e) { if (bloqueado() && e.preventDefault) e.preventDefault(); }

    function antes(e) {
      pend = null;
      if (e.defaultPrevented) return;
      const it = e.inputType || '';
      if (ES_PEGADO[it] && bloqueado()) { // respaldo si el navegador no mandó paste/drop antes
        e.preventDefault();
        avisar(it === 'insertFromDrop' ? 'arrastre' : 'pegado', typeof e.data === 'string' ? e.data : textoDe(e.dataTransfer));
        return;
      }
      sincronizar(auto > 0 ? 'a' : 'u');
      pend = { it, s: ta.selectionStart, e: ta.selectionEnd, v: ta.value };
    }

    function region(viejo, nuevoT, pe, inserta) {
      if (pe && pe.v === viejo) {
        const s = pe.s, en = pe.e;
        if (inserta) {
          const L = nuevoT.length - viejo.length + (en - s);
          if (L >= 0 && nuevoT.slice(0, s) === viejo.slice(0, s) && nuevoT.slice(s + L) === viejo.slice(en)) return { d: s, h: en, mid: nuevoT.slice(s, s + L) };
        } else {
          const L = viejo.length - nuevoT.length;
          const cand = s !== en ? [[s, en]] : [[s - L, s], [s, s + L]];
          for (const [a, b] of cand) if (a >= 0 && b <= viejo.length && viejo.slice(0, a) + viejo.slice(b) === nuevoT) return { d: a, h: b, mid: '' };
        }
      }
      const x = difMinimo(viejo, nuevoT);
      return { d: x.d, h: x.h, mid: x.mid };
    }

    function despues(e) {
      const pe = pend; pend = null;
      const v = ta.value;
      if (v === p.texto) return;
      const it = (pe && pe.it) || (e && e.inputType) || '';
      const esAuto = auto > 0;
      if (!it) { p.reconciliar(v, esAuto ? 'a' : 'u'); return; }                 // input sin tipo (p. ej. dispatchEvent)
      if (it === 'historyUndo' || it === 'historyRedo') { p.reconciliar(v, 'u'); return; }
      if (it.indexOf('insert') === 0) {
        const tipo = esAuto ? 'a' : INSERTA[it];
        if (!tipo) { p.reconciliar(v, esAuto ? 'a' : 'u'); return; }              // tipo desconocido
        const r = region(p.texto, v, pe, true);
        if (esAuto && autoTecla && r.mid.charAt(0) === '\n') { // Enter con sangría: el salto lo tipeó el alumno, la sangría la puso el editor
          p.reemplazar(r.d, r.h, '\n', 't');
          if (r.mid.length > 1) p.insertar(r.d + 1, r.mid.slice(1), 'a');
        } else if (r.h > r.d || r.mid) p.reemplazar(r.d, r.h, r.mid, tipo);
        if (p.texto !== v) p.reconciliar(v, 'u');
        return;
      }
      if (it.indexOf('delete') === 0) {
        const r = region(p.texto, v, pe, false);
        if (r.mid === '') p.borrar(r.d, r.h, { auto: esAuto });
        else p.reconciliar(v, esAuto ? 'a' : 'u');
        if (p.texto !== v) p.reconciliar(v, 'u');
        return;
      }
      p.reconciliar(v, esAuto ? 'a' : 'u');
    }

    function tecla() { p.actividad(); }

    const lista = [['paste', enPaste], ['drop', enDrop], ['dragover', enDragOver], ['beforeinput', antes], ['input', despues], ['keydown', tecla]];
    lista.forEach(([n, f]) => ta.addEventListener(n, f));

    return {
      get proceso() { return p; },
      // envuelve inserciones programáticas del propio editor (sangría, llaves, comentar, Tab)
      marcarAuto(fn, o) {
        auto++; const prev = autoTecla; autoTecla = !!(o && o.primerCaracterTipeado);
        try { return fn(); }
        finally { auto--; autoTecla = prev; if (ta.value !== p.texto) p.reconciliar(ta.value, 'a'); pend = null; }
      },
      // abrir un .c, elegir un ejemplo, recuperar un programa guardado sin datos de proceso: arranca un proceso nuevo
      marcarCargado(texto, tipo) {
        const t = typeof texto === 'string' ? texto : ta.value;
        p = nuevo(t, tipo || 'c', { ahora: opc.ahora }); pend = null;
        return p;
      },
      restaurar(obj, texto) { p = restaurar(obj, typeof texto === 'string' ? texto : ta.value, { ahora: opc.ahora }); pend = null; return p; },
      serializar() { sincronizar('u'); return p.serializar(); },
      contar() { sincronizar('u'); return p.contar(); },
      resumen() { sincronizar('u'); return resumen(p); },
      linea() { sincronizar('u'); return linea(resumen(p)); },
      ejecutar() { p.ejecutar(); },
      desconectar() { lista.forEach(([n, f]) => ta.removeEventListener(n, f)); }
    };
  }

  const api = { nuevo, restaurar, resumen, linea, conectar, politicaPegado, politicaDesdeEnlace, TOPE_INACTIVIDAD, _hash: hash, _dif: difMinimo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Proceso = api;
})(typeof self !== 'undefined' ? self : this);

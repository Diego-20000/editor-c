(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  // íconos propios (sprite inline en la página, docs/identidad/iconos.svg): <svg class="i"><use href="#i-nombre"/></svg>
  const NS = 'http://www.w3.org/2000/svg';
  function ico(nombre) {
    const sv = document.createElementNS(NS, 'svg'), u = document.createElementNS(NS, 'use');
    sv.setAttribute('class', 'i'); sv.setAttribute('aria-hidden', 'true'); u.setAttribute('href', '#i-' + nombre); sv.appendChild(u); return sv;
  }
  const ta = $('code'), hl = $('hl'), ul = $('ul'), fm = $('fm'), gut = $('gut'), out = $('out'), cons = $('console'),
    diag = $('diag'), diagList = $('diagList'), statusEl = $('status'), runBtn = $('run'), stopBtn = $('stop'),
    inTxt = $('inTxt'), layers = [hl, ul, fm];
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  /* ---------- almacenamiento local (todo queda en este dispositivo) ---------- */
  let storeWarned = false;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('editorc.' + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) {
      try { localStorage.setItem('editorc.' + k, v); }
      catch (e) { if (!storeWarned) { storeWarned = true; toast('No se pudo guardar en este dispositivo (¿navegación privada o sin espacio?). Descargá el .c para no perder el trabajo.'); } }
    },
    json(k, d) { try { const v = JSON.parse(store.get(k, '')); return v === null || v === undefined ? d : v; } catch (e) { return d; } }
  };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const pad2 = (n) => (n < 10 ? '0' : '') + n;

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg, label, fn, sticky) {
    let t = $('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    const dlgAbierto = document.querySelector('dialog[open]');
    const anfitrion = dlgAbierto || document.body;
    if (t.parentNode !== anfitrion) anfitrion.appendChild(t);
    t.textContent = msg + ' ';
    if (label) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn mini'; b.textContent = label;
      b.addEventListener('click', () => { fn(); t.hidden = true; });
      t.appendChild(b);
    }
    if (sticky) {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'btn mini'; c.textContent = 'Después';
      c.addEventListener('click', () => { t.hidden = true; });
      t.appendChild(c);
    }
    t.hidden = false;
    clearTimeout(toastTimer); if (!sticky) toastTimer = setTimeout(() => { t.hidden = true; }, label ? 9000 : 4500);
  }

  /* ---------- datos del alumno y cabecera ---------- */
  let user = Object.assign({ name: '', dni: '', curso: '', mat: '', ciclo: '' }, store.json('user', {}));
  function headerText() {
    const c = user.ciclo || String(new Date().getFullYear());
    return ['// ' + (user.name || 'Apellido, Nombre'), '// ' + (user.curso || 'Curso'), '// ' + (user.mat || 'Materia'),
      '// ' + (/ciclo/i.test(c) ? c : 'Ciclo lectivo ' + c)].join('\n');
  }
  function template() { return headerText() + '\n\n#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n'; }

  /* ---------- programas guardados ---------- */
  let progs = store.json('progs', []);
  if (!Array.isArray(progs)) progs = [];
  progs = progs.filter((p) => p && typeof p.code === 'string' && p.id);
  let cur = null;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function nextName(base) {
    base = base || 'Programa';
    const names = new Set(progs.map((p) => p.name));
    if (!names.has(base)) return base;
    for (let i = 2; ; i++) if (!names.has(base + ' ' + i)) return base + ' ' + i;
  }
  function persist() { store.set('progs', JSON.stringify(progs)); store.set('cur', cur ? cur.id : ''); }
  let saveTimer = null;
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 350); }
  function flushSave() {
    clearTimeout(saveTimer); saveTimer = null;
    if (!cur) return;
    cur.code = ta.value; cur.input = inTxt.value; cur.t = Date.now();
    try { cur.proc = proc.serializar() || undefined; } catch (e) { /* sin evidencia de proceso: el programa se guarda igual */ }
    persist();
  }
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
  window.addEventListener('beforeunload', flushSave);

  // origen: de dónde viene el texto si el programa no trae datos de proceso ('c' archivo o ejemplo, 'a' plantilla, 'u' programa de antes)
  function showProgram(p, origen) {
    cur = p;
    stopRun(true);
    ta.value = p.code; inTxt.value = p.input || '';
    try { if (p.proc) proc.restaurar(p.proc, p.code); else proc.marcarCargado(p.code, origen || 'u'); } catch (e) { proc.marcarCargado(p.code, 'u'); }
    cerrarBurbuja();
    ta.scrollTop = 0; ta.scrollLeft = 0;
    clearProblems(); clearConsole(); setStatus('Listo');
    $('pnameTxt').textContent = p.name; $('pname').setAttribute('aria-label', 'Programa actual: ' + p.name + '. Abrir lista de programas');
    updateInDot(); refresh(); updatePos();
    if (fbar.open) updateFind(true);
    persist();
  }
  function newProgram(name, code, input) {
    if (cur) flushSave();
    const p = { id: uid(), name: nextName(name), code: code === undefined ? template() : code, input: input || '', t: Date.now() };
    progs.push(p); showProgram(p, code === undefined ? 'a' : 'c');
    return p;
  }
  function isPristine(code) { return !code.trim() || EXAMPLES.some((x) => x.c === code) || code === template(); }

  /* ---------- vista del código: sangría y espacios (solo cambian cómo se ve) ---------- */
  let SANG = [2, 3, 4, 8].indexOf(parseInt(store.get('sang', '4'), 10)) >= 0 ? parseInt(store.get('sang', '4'), 10) : 4;
  let verEsp = store.get('ws', '') === '1';
  const SP = () => ' '.repeat(SANG);
  function aplicarVista() {
    const r = document.documentElement;
    r.style.setProperty('--tab', String(SANG));
  }
  aplicarVista();

  /* ---------- resaltado ---------- */
  const HL_RE = /(\/\*[\s\S]*?\*\/|\/\*[\s\S]*$|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"?)|('(?:\\.|[^'\\\n])*'?)|(^[ \t]*#[^\n]*)|(\b(?:int|float|double|char|void|long|short|unsigned|signed|const|static|bool)\b)|(\b(?:if|else|while|do|for|return|break|continue|switch|case|default|sizeof)\b)|(\b\d+\.?\d*(?:[eE][+-]?\d+)?[fFlLuU]*\b|\.\d+\b)|(\b[A-Za-z_]\w*(?=\s*\())/gm;
  const CLS = [null, 'c', 's', 's', 'p', 't', 'k', 'n', 'f'];
  function tokens(src) {
    const res = []; let last = 0, m;
    HL_RE.lastIndex = 0;
    while ((m = HL_RE.exec(src))) {
      if (m[0] === '') { HL_RE.lastIndex++; continue; }
      if (m.index > last) res.push([null, src.slice(last, m.index)]);
      let g = 1; while (g < 9 && m[g] === undefined) g++;
      res.push([CLS[g], m[0]]);
      last = m.index + m[0].length;
    }
    if (last < src.length) res.push([null, src.slice(last)]);
    return res;
  }
  function highlight(src) {
    return tokens(src).map((t) => t[0] ? '<span class="' + t[0] + '">' + esc(t[1]) + '</span>' : esc(t[1])).join('');
  }
  // pinta un texto transparente con rangos marcados {s,e,c} (para subrayados y coincidencias)
  function paint(el, text, ranges) {
    ranges.sort((a, b) => a.s - b.s);
    let res = '', last = 0;
    for (const r of ranges) {
      if (r.s < last || r.e <= r.s) continue;
      res += esc(text.slice(last, r.s)) + '<span class="' + r.c + '">' + esc(text.slice(r.s, r.e)) + '</span>';
      last = r.e;
    }
    el.innerHTML = res + esc(text.slice(last)) + '\n';
  }

  /* ---------- editor ---------- */
  let marks = new Map(), lastLines = 0;
  function renderGutter(force) {
    const n = ta.value.split('\n').length;
    if (!force && n === lastLines) return;
    lastLines = n;
    let h = '';
    for (let i = 1; i <= n; i++) { const m = marks.get(i); h += '<div' + (m ? ' class="' + m + '"' : '') + '>' + i + '</div>'; }
    gut.innerHTML = h;
    if (gut.children[curLn]) gut.children[curLn].classList.add('cur');
    gut.scrollTop = ta.scrollTop;
  }
  function refresh() {
    hl.innerHTML = highlight(ta.value) + '\n';
    gdEl.innerHTML = guias(ta.value);
    renderGutter(false);
    paintProblems();
    syncScroll();
    updatePos();
  }
  const gdEl = $('gd'), brEl = $('br'), curEl = $('curline'), codeBox = $('codeBox');
  layers.push(gdEl, brEl);
  // guías de sangría (y espacios visibles si se pidió): una capa transparente, solo para leer la estructura
  function guias(src) {
    if (src.length > 300000) return '\n';
    const ws = verEsp, dot = '<b class="sp">·</b>';
    return src.split('\n').map((ln) => {
      const m = /^[ \t]*/.exec(ln)[0];
      let h = '', k = 0;
      while (k < m.length) {
        if (m[k] === '\t') { h += '<i class="ig' + (ws ? ' tb' : '') + '">\t</i>'; k++; }
        else {
          let j = k; while (j < m.length && m[j] === ' ') j++;
          let n = j - k;
          while (n >= SANG) { h += '<i class="ig">' + (ws ? dot.repeat(SANG) : SP()) + '</i>'; n -= SANG; }
          if (n) h += ws ? dot.repeat(n) : ' '.repeat(n);
          k = j;
        }
      }
      if (ws) h += esc(ln.slice(m.length)).replace(/ /g, dot).replace(/\t/g, '<i class="tb">\t</i>');
      return h;
    }).join('\n') + '\n';
  }
  let curLn = 0;
  function syncScroll() {
    layers.forEach((l) => { l.scrollTop = ta.scrollTop; l.scrollLeft = ta.scrollLeft; });
    gut.scrollTop = ta.scrollTop;
    codeBox.style.setProperty('--sy', ta.scrollTop + 'px');
    curEl.style.top = (12 + curLn * lineH() - ta.scrollTop) + 'px';
  }
  function lineH() { return (parseFloat(getComputedStyle(ta).fontSize) || 15) * 1.5; }
  function marcarActual(ln) {
    const k = gut.children;
    if (k[curLn]) k[curLn].classList.remove('cur');
    curLn = ln;
    if (k[ln]) k[ln].classList.add('cur');
    curEl.style.top = (12 + ln * lineH() - ta.scrollTop) + 'px';
  }
  // pareja del paréntesis, corchete o llave que toca el cursor (ignora lo que está en comentarios, textos y #líneas)
  function marcarPareja() {
    const v = ta.value, s = ta.selectionStart;
    if (ta.selectionEnd !== s || v.length > 60000) { brEl.innerHTML = ''; return; }
    const PAR = { '(': ')', '[': ']', '{': '}', ')': '(', ']': '[', '}': '{' };
    let pos = -1;
    if (s > 0 && PAR[v[s - 1]]) pos = s - 1; else if (s < v.length && PAR[v[s]]) pos = s;
    if (pos < 0) { brEl.innerHTML = ''; return; }
    const skip = new Uint8Array(v.length); let at = 0;
    tokens(v).forEach(([c, t]) => { if (c === 'c' || c === 's' || c === 'p') skip.fill(1, at, at + t.length); at += t.length; });
    if (skip[pos]) { brEl.innerHTML = ''; return; }
    const ch = v[pos], op = '([{'.indexOf(ch) >= 0, other = PAR[ch], dir = op ? 1 : -1;
    let depth = 0, m = -1;
    for (let i = pos; i >= 0 && i < v.length; i += dir) {
      if (skip[i]) continue;
      if (v[i] === ch) depth++; else if (v[i] === other) { depth--; if (!depth) { m = i; break; } }
    }
    paint(brEl, v, m < 0 ? [{ s: pos, e: pos + 1, c: 'bu' }] : [{ s: pos, e: pos + 1, c: 'bm' }, { s: m, e: m + 1, c: 'bm' }]);
  }
  /* evidencia de proceso: mide de dónde viene cada carácter (tipeado, pegado, automático, cargado). Todo queda en este dispositivo. */
  const PROC_NULO = { marcarAuto(fn) { return fn(); }, marcarCargado() {}, restaurar() {}, serializar() { return null; }, resumen() { return null; }, linea() { return ''; }, ejecutar() {} };
  let proc = PROC_NULO, practica = false;
  try {
    if (window.Proceso) {
      practica = Proceso.politicaDesdeEnlace(location.search, () => toast('Modo práctica: en este enlace no se puede pegar. Escribilo vos.'));
      proc = Proceso.conectar(ta, { tipoInicial: 'u' });
    }
  } catch (e) { proc = PROC_NULO; practica = false; }
  $('practica').hidden = !practica;
  const auto = (fn, o) => proc.marcarAuto(fn, o);
  /* cierre automático de llaves, paréntesis y comillas: apagado por defecto (que el alumno tipee todo) */
  let autoCierre = store.get('autocierre', '') === '1';

  ta.addEventListener('scroll', syncScroll);
  ta.addEventListener('input', () => {
    if (problems.length && ta.value.split('\n').length !== problemLines) clearProblems();
    refresh(); scheduleSave();
    if (fbar.open) updateFind(false);
    updatePos();
  });

  /* ---------- barra de símbolos (solo celular): un toque escribe un símbolo, igual que tipearlo ---------- */
  const SIMBOLOS = ['{', '}', '(', ')', '[', ']', ';', '"', "'", '&', '*', '%', '#', '<', '>', '=', '!', '|', '\\', '/', '+', '-', ','];
  let simbolos = store.get('simbolos', '1') !== '0';
  function armarBarraSimbolos() {
    const bar = $('symbar'); if (!bar || bar.childNodes.length) return;
    const mk = (txt, aria, fn) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.setAttribute('aria-label', aria);
      b.addEventListener('pointerdown', (e) => e.preventDefault());   // no le saca el foco al código: el teclado se queda abierto
      b.addEventListener('click', fn); bar.appendChild(b); return b;
    };
    mk('←', 'Mover el cursor a la izquierda', () => { ta.focus({ preventScroll: true }); const p = Math.max(0, ta.selectionStart - 1); ta.setSelectionRange(p, p); });
    mk('→', 'Mover el cursor a la derecha', () => { ta.focus({ preventScroll: true }); const p = Math.min(ta.value.length, ta.selectionEnd + 1); ta.setSelectionRange(p, p); });
    mk('⇥', 'Sangría (Tab)', () => insert(' '.repeat(SANG)));
    SIMBOLOS.forEach((c) => mk(c, 'Símbolo ' + c, () => insert(c)));
  }
  function mostrarBarraSimbolos() { const bar = $('symbar'); if (!bar) return; bar.hidden = !(coarse && simbolos && document.activeElement === ta && !ta.readOnly); }
  armarBarraSimbolos();
  ta.addEventListener('focus', mostrarBarraSimbolos);
  ta.addEventListener('blur', () => { setTimeout(mostrarBarraSimbolos, 0); });
  function insert(text) {
    if (ta.readOnly) return;
    ta.focus({ preventScroll: true });
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
    if (!ok) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.setRangeText(text, s, e, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  }
  // reemplaza un tramo manteniendo el historial de deshacer; devuelve el foco a donde estaba
  function editRange(s, e, text) {
    const prev = document.activeElement;
    guard = true;
    try { auto(() => { ta.focus({ preventScroll: true }); ta.setSelectionRange(s, e); insert(text); }); } finally { guard = false; }
    if (prev && prev !== ta && prev.focus) prev.focus({ preventScroll: true });
  }
  function lineStart(v, pos) { return v.lastIndexOf('\n', pos - 1) + 1; }
  function lineIndexAt(v, pos) { let n = 0; for (let i = v.indexOf('\n'); i >= 0 && i < pos; i = v.indexOf('\n', i + 1)) n++; return n; }

  function toggleComment() {
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    const a = lineStart(v, s);
    const b = en > s && v[en - 1] === '\n' ? en - 1 : en;
    const eol = v.indexOf('\n', b), bb = eol < 0 ? v.length : eol;
    const lines = v.slice(a, bb).split('\n');
    const some = lines.filter((l) => l.trim());
    if (!some.length) return;
    let nl;
    if (some.every((l) => /^\s*\/\//.test(l))) nl = lines.map((l) => l.replace(/^(\s*)\/\/ ?/, '$1'));
    else {
      const ind = Math.min.apply(null, some.map((l) => /^[ \t]*/.exec(l)[0].length));
      nl = lines.map((l) => (l.trim() ? l.slice(0, ind) + '// ' + l.slice(ind) : l));
    }
    const text = nl.join('\n');
    guard = true; try { auto(() => { ta.setSelectionRange(a, bb); insert(text); ta.setSelectionRange(a, a + text.length); }); } finally { guard = false; }
  }

  let guard = false;
  // si el alumno tipea la '}' final y ya hay una '}' automática en la línea de abajo (programa balanceado), la pisa en vez de agregar otra
  function pisarLlave(v, s, en) {
    if (!autoCierre || s !== en) return false;
    const ls = lineStart(v, s);
    if (!/^[ \t]*$/.test(v.slice(ls, s))) return false;
    const m = /^[ \t]*\n([ \t]*)\}/.exec(v.slice(en));
    if (!m) return false;
    const ab = (v.match(/\{/g) || []).length, ce = (v.match(/\}/g) || []).length;
    if (ab !== ce) return false;
    const fin = en + m[0].length;
    guard = true; try { auto(() => { ta.setSelectionRange(ls, fin); insert(m[1] + '}'); const pos = ls + m[1].length + 1; ta.setSelectionRange(pos, pos); }); } finally { guard = false; }
    return true;
  }
  const OPEN = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
  const CLOSE = new Set([')', ']', '}', '"', "'"]);
  ta.addEventListener('beforeinput', (e) => {
    if (guard || e.isComposing || !autoCierre) return;
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (e.inputType === 'insertText' && e.data && e.data.length === 1) {
      const ch = e.data, nx = v[en], pv = v[s - 1];
      if (ch === '}' && pisarLlave(v, s, en)) { e.preventDefault(); return; }
      if (CLOSE.has(ch) && s === en && nx === ch) { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
      const close = OPEN[ch];
      if (!close) return;
      if (s !== en) { e.preventDefault(); guard = true; try { auto(() => { insert(ch + v.slice(s, en) + close); ta.setSelectionRange(s + 1, en + 1); }); } finally { guard = false; } return; }
      if (v.slice(lineStart(v, s), s).indexOf('//') >= 0) return;
      const quote = ch === '"' || ch === "'";
      if (quote && (/\w/.test(pv || '') || /\w/.test(nx || ''))) return;
      if (!quote && nx && !/[\s)\]};,]/.test(nx)) return;
      e.preventDefault(); guard = true; try { auto(() => { insert(ch + close); ta.setSelectionRange(s + 1, s + 1); }, { primerCaracterTipeado: true }); } finally { guard = false; }
    } else if (e.inputType === 'deleteContentBackward' && s === en && s > 0 && OPEN[v[s - 1]] === v[s]) {
      e.preventDefault(); guard = true; try { auto(() => { ta.setSelectionRange(s - 1, s + 1); document.execCommand('delete'); }); } finally { guard = false; }
    }
  });

  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && e.target !== ta) { e.preventDefault(); save(); } });
  ta.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    if (mod && (e.key === '/' || e.code === 'Slash' || (e.shiftKey && e.code === 'Digit7'))) { e.preventDefault(); toggleComment(); return; }
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (e.key === 'Tab') {
      e.preventDefault();
      if (s === en && !e.shiftKey) { auto(() => insert(SP())); return; }
      const a = lineStart(v, s);
      const b = en > s && v[en - 1] === '\n' ? en - 1 : en;
      const block = v.slice(a, b).split('\n');
      const nb = block.map((l) => e.shiftKey ? l.replace(new RegExp('^( {1,' + SANG + '}|\\t)'), '') : SP() + l).join('\n');
      guard = true; try { auto(() => { ta.setSelectionRange(a, b); insert(nb); ta.setSelectionRange(a, a + nb.length); }); } finally { guard = false; }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !mod && !e.altKey) {
      e.preventDefault();
      const ls = lineStart(v, s);
      const ind = /^[ \t]*/.exec(v.slice(ls, s))[0];
      const before = v[s - 1], after = v[en];
      guard = true;
      try {
        auto(() => {
          if (before === '{' && after === '}') { insert('\n' + ind + SP() + '\n' + ind); const p = s + 1 + ind.length + SANG; ta.setSelectionRange(p, p); }
          else insert('\n' + ind + (before === '{' ? SP() : ''));
        }, { primerCaracterTipeado: true });
      } finally { guard = false; }
      return;
    }
    if (e.key === '}' && !mod) {
      if (pisarLlave(v, s, en)) { e.preventDefault(); return; }
      const ls = lineStart(v, s);
      if (s === en && /^ +$/.test(v.slice(ls, s)) && s - ls >= SANG) { e.preventDefault(); guard = true; try { auto(() => { ta.setSelectionRange(s - SANG, s); insert('}'); }, { primerCaracterTipeado: true }); } finally { guard = false; } }
    }
  });

  function updatePos() {
    const v = ta.value, s = ta.selectionStart, ln = lineIndexAt(v, s);
    $('pos').textContent = 'Lín ' + (ln + 1) + ', Col ' + (s - lineStart(v, s) + 1);
    marcarActual(ln); marcarPareja();
  }
  document.addEventListener('selectionchange', () => { if (document.activeElement === ta) updatePos(); });

  function scrollToPos(pos, center) {
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 22;
    const ln = lineIndexAt(ta.value, pos), top = 12 + ln * lh;
    if (center || top < ta.scrollTop + lh || top > ta.scrollTop + ta.clientHeight - 3 * lh) ta.scrollTop = Math.max(0, top - ta.clientHeight / 3);
    syncScroll();
  }
  function goLine(n) {
    if (typeof setTab === 'function' && tabMode()) setTab('ed', true);
    const lines = ta.value.split('\n');
    let pos = 0; for (let i = 0; i < n - 1 && i < lines.length; i++) pos += lines[i].length + 1;
    if (!coarse) ta.focus({ preventScroll: true });
    ta.setSelectionRange(pos, pos + (lines[n - 1] || '').length);
    scrollToPos(pos, true);
    if (coarse) ta.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- buscar y reemplazar ---------- */
  const fbar = { open: false, matches: [], idx: -1, cs: false };
  const fq = $('fq'), fr = $('fr'), fcount = $('fcount');
  function findOpen(replace) {
    fbar.open = true; $('find').hidden = false;
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    if (sel && sel.indexOf('\n') < 0) fq.value = sel;
    updateFind(true);
    (replace ? fr : fq).focus(); (replace ? fr : fq).select();
  }
  function findClose() { fbar.open = false; $('find').hidden = true; fm.innerHTML = ''; ta.focus({ preventScroll: true }); }
  function updateFind(jump) {
    const q = fq.value, v = ta.value;
    fbar.matches = [];
    if (q) {
      const hay = fbar.cs ? v : v.toLowerCase(), nd = fbar.cs ? q : q.toLowerCase();
      for (let i = hay.indexOf(nd); i >= 0 && fbar.matches.length < 5000; i = hay.indexOf(nd, i + nd.length)) fbar.matches.push(i);
    }
    const n = fbar.matches.length;
    if (!n) fbar.idx = -1;
    else if (jump || fbar.idx < 0 || fbar.idx >= n) {
      let k = fbar.matches.findIndex((p) => p >= ta.selectionStart);
      fbar.idx = k < 0 ? 0 : k;
    }
    paintFind();
    if (jump && n && document.activeElement !== ta) selectMatch(false);
  }
  function paintFind() {
    const q = fq.value.length, n = fbar.matches.length;
    if (!fbar.open || !n) { fm.innerHTML = ''; }
    else paint(fm, ta.value, fbar.matches.map((p, i) => ({ s: p, e: p + q, c: i === fbar.idx ? 'cur' : 'm' })));
    fcount.textContent = !fq.value ? '' : n ? (fbar.idx + 1) + ' de ' + n : 'Sin resultados';
    syncScroll();
  }
  function selectMatch(focus) {
    const p = fbar.matches[fbar.idx]; if (p === undefined) return;
    ta.setSelectionRange(p, p + fq.value.length);
    scrollToPos(p, false); paintFind();
    if (focus) ta.focus({ preventScroll: true });
  }
  function findStep(dir) {
    const n = fbar.matches.length; if (!n) return;
    fbar.idx = (fbar.idx + dir + n) % n; selectMatch(false);
  }
  function replaceOne() {
    const p = fbar.matches[fbar.idx]; if (p === undefined) return;
    editRange(p, p + fq.value.length, fr.value);
    updateFind(false);
    const q = p + fr.value.length;
    const k = fbar.matches.findIndex((x) => x >= q);
    fbar.idx = k < 0 ? 0 : k; if (fbar.matches.length) selectMatch(false); else paintFind();
  }
  function replaceAll() {
    const n = fbar.matches.length; if (!n) return;
    const q = fq.value, v = ta.value;
    let res = '', last = 0;
    fbar.matches.forEach((p) => { res += v.slice(last, p) + fr.value; last = p + q.length; });
    res += v.slice(last);
    editRange(0, v.length, res);
    updateFind(false);
    toast(n === 1 ? 'Se reemplazó 1 coincidencia.' : 'Se reemplazaron ' + n + ' coincidencias.');
  }
  fq.addEventListener('input', () => updateFind(true));
  fq.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); findStep(e.shiftKey ? -1 : 1); } });
  fr.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); replaceOne(); } });
  $('find').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); findClose(); } });
  $('fnext').addEventListener('click', () => findStep(1));
  $('fprev').addEventListener('click', () => findStep(-1));
  $('frep').addEventListener('click', replaceOne);
  $('frepall').addEventListener('click', replaceAll);
  $('fclose').addEventListener('click', findClose);
  $('fcase').addEventListener('click', () => { fbar.cs = !fbar.cs; $('fcase').setAttribute('aria-pressed', String(fbar.cs)); updateFind(true); });
  $('findBtn').addEventListener('click', () => (fbar.open ? findClose() : findOpen(false)));

  /* ---------- problemas (errores y avisos) ---------- */
  let problems = [], problemLines = 0;
  function clearProblems() {
    problems = [];
    if (marks.size) { marks = new Map(); renderGutter(true); }
    diag.hidden = true; diagList.innerHTML = ''; pistasEstado.clear();
    paintProblems();
  }
  function paintProblems() {
    if (!problems.length) { ul.innerHTML = ''; return; }
    const v = ta.value, offs = [0];
    for (let i = v.indexOf('\n'); i >= 0; i = v.indexOf('\n', i + 1)) offs.push(i + 1);
    const ranges = [], seen = new Map();
    problems.forEach((p) => { if (p.line && !(seen.get(p.line) === 'e' && p.k !== 'e')) seen.set(p.line, p.k); });
    seen.forEach((k, line) => {
      if (line > offs.length) return;
      const a = offs[line - 1], b = line < offs.length ? offs[line] - 1 : v.length, txt = v.slice(a, b);
      const lead = /^\s*/.exec(txt)[0].length, trail = txt.length - txt.trimEnd().length;
      if (b - trail > a + lead) ranges.push({ s: a + lead, e: b - trail, c: k });
    });
    paint(ul, v, ranges);
  }
  $('diagHead').addEventListener('click', () => {
    const open = $('diagHead').getAttribute('aria-expanded') !== 'true';
    $('diagHead').setAttribute('aria-expanded', String(open)); diagList.hidden = !open;
  });
  /* avisos silenciados por código estable (si el motor lo informa); se guardan en este dispositivo */
  let muted = store.json('muted', []); if (!Array.isArray(muted)) muted = muted && typeof muted === 'object' ? Object.keys(muted) : [];
  muted = muted.filter((c) => typeof c === 'string').slice(0, 200);
  function saveMuted() { store.set('muted', JSON.stringify(muted)); updateMutedRow(); }
  function updateMutedRow() {
    $('mutedRow').hidden = !muted.length;
    $('mutedTxt').textContent = 'Avisos silenciados: ' + muted.join(', ');
  }
  $('mutedReset').addEventListener('click', () => { muted = []; saveMuted(); if (lastRes) renderDiag(lastRes, lastRt, true); toast('Los avisos vuelven a mostrarse.'); });
  let lastRt = null;
  function showDiag(res, rtErr) { lastRt = rtErr || null; renderDiag(res, rtErr, false); }
  function renderDiag(res, rtErr, noScroll) {
    const lines = ta.value.split('\n');
    const items = [];
    let hidden = 0;
    (res.errors || []).forEach((e) => items.push({ k: 'e', line: e.line, msg: e.msg, code: typeof e.code === 'string' ? e.code : '', kb: typeof e.kb === 'string' ? e.kb : '' }));
    if (rtErr) items.push({ k: 'e', line: rtErr.line, msg: rtErr.msg, rt: true });
    (res.warnings || []).forEach((w) => {
      const code = typeof w.code === 'string' ? w.code : '';
      if (code && muted.indexOf(code) >= 0) { hidden++; return; }
      items.push({ k: 'w', line: w.line, msg: w.msg, code, kb: typeof w.kb === 'string' ? w.kb : '' });
    });
    problems = items; problemLines = lines.length;
    // Ayuda 1 (apagada, la predeterminada): no se dice dónde está el error ni qué dice el compilador; solo de qué tipo general es.
    // Ayuda 2 (línea): se indica el número de línea y nada más (sin mensaje, sin sugerencias, sin pistas).
    const conLinea = nivelAyuda >= 2;
    marks = new Map();
    if (conLinea) items.forEach((it) => { if (it.line && marks.get(it.line) !== 'e') marks.set(it.line, it.k); });
    if (!conLinea) problems = [];
    renderGutter(true); paintProblems();
    if (!conLinea) problems = items;
    diagList.innerHTML = '';
    items.forEach((it) => {
      const wrap = document.createElement('div'); wrap.className = 'it ' + it.k;
      if (conLinea && it.line) { wrap.dataset.line = String(it.line); wrap.dataset.txt = lines[it.line - 1] || ''; }
      ayudaItem(it);   // los casos que el editor no supo explicar se guardan en el dispositivo (no se muestran acá)
      const b = document.createElement('button'); b.type = 'button';
      const tag = document.createElement('span'); tag.className = 'tag';
      tag.appendChild(ico(it.k === 'e' ? 'error' : 'aviso'));
      tag.appendChild(document.createTextNode(tipoGeneral(it) + (conLinea && it.line ? ' · línea ' + it.line : '')));
      b.appendChild(tag);
      if (conLinea && it.line) { b.title = 'Ir a la línea ' + it.line; b.addEventListener('click', () => goLine(it.line)); }
      else b.disabled = true;
      wrap.appendChild(b);
      diagList.appendChild(wrap);
    });
    const ne = items.filter((i) => i.k === 'e').length, nw = items.length - ne;
    $('diagTitle').textContent = 'Problemas' + (conLinea && items.length ? ' · ' + (ne ? ne + (ne === 1 ? ' error' : ' errores') : '') + (ne && nw ? ', ' : '') + (nw ? nw + (nw === 1 ? ' aviso' : ' avisos') : '') : '');
    diag.hidden = !items.length;
    diagList.hidden = $('diagHead').getAttribute('aria-expanded') !== 'true';
    const first = items.find((i) => i.k === 'e' && i.line) || items.find((i) => i.line);
    if (conLinea && first && !noScroll) scrollToPos(lineOffset(first.line), false);
  }
  // tipo general del problema, sin detalle (ayuda apagada) y como rótulo (ayuda con línea)
  function tipoGeneral(it) { return it.k === 'w' ? 'Aviso' : it.rt ? 'Error al ejecutar' : 'Error de sintaxis'; }
  function lineOffset(n) { const l = ta.value.split('\n'); let p = 0; for (let i = 0; i < n - 1 && i < l.length; i++) p += l[i].length + 1; return p; }

  /* ---------- ayuda por niveles, panel «Ayuda», «¿Qué es esto?» y casos sin respuesta ----------
     Todo sale de la base fija (window.KB, datos en assets/kb-data.js): sin red y sin IA. Los scripts de la base
     se cargan después de este (defer), así que siempre se piden de forma perezosa. */
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined && txt !== null) n.textContent = txt; return n; };
  const btnEl = (txt, cls, fn, aria) => { const b = el('button', 'btn ' + (cls || ''), txt); b.type = 'button'; if (aria) b.setAttribute('aria-label', aria); if (fn) b.addEventListener('click', fn); return b; };
  const KBx = () => (window.KB && window.KB.cargado ? window.KB : null);
  const kbDatos = () => (window.KB_DATA && typeof window.KB_DATA === 'object' ? window.KB_DATA : { errores: [], ayuda: [], lecciones: [] });
  const asLista = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : typeof v === 'string' && v ? [v] : []);
  const NIVELES_TXT = { 1: 'Apagada: al ejecutar con un error solo se dice que no compiló y de qué tipo es. Encontrarlo es tu trabajo.', 2: 'Línea: además se marca el número de línea donde hay un problema. Nada más: sin mensaje, sin sugerencias y sin pistas.' };
  // nivel de ayuda: ?ayuda=1|2 en el enlace (se recuerda en el dispositivo) > lo guardado > 1 (apagada). Solo hay dos niveles.
  let nivelAyuda = (function () {
    let q = null; try { q = new URLSearchParams(location.search).get('ayuda'); } catch (e) { q = null; }
    if (q !== null && /^\s*[012]\s*$/.test(q)) { const n = q.trim() === '2' ? 2 : 1; store.set('ayuda', String(n)); return n; }
    return store.get('ayuda', '') === '2' ? 2 : 1;
  })();
  const almacen = { getItem(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, setItem(k, v) { localStorage.setItem(k, v); } };

  /* --- de un diagnóstico a una explicación --- */
  let ambCache = null;
  // Si muchos casos de la base comparten el mismo mensaje del editor no se sabe cuál es el del alumno: no se afirma nada
  function esAmbiguo(ex) {
    if (!ex || ex.via === 'kb') return false;
    if (!ambCache) { ambCache = {}; (kbDatos().errores || []).forEach((e) => { const k = (e.codigo_editor_actual || '') + '|' + (e.mensaje_editor_actual || ''); ambCache[k] = (ambCache[k] || 0) + 1; }); }
    const e = ex.entrada || {};
    return ambCache[(e.codigo_editor_actual || '') + '|' + (e.mensaje_editor_actual || '')] > 1;
  }
  function explicarDiag(d) {
    const K = KBx(); if (!K) return { estado: 'sinkb' };
    let ex = null;
    try { ex = K.explicar({ line: d.line, msg: d.msg, code: d.code, kb: d.kb }, nivelAyuda); } catch (e) { ex = null; }
    if (!ex || !ex.entrada) return { estado: 'sinexp' };
    if (esAmbiguo(ex)) return { estado: 'ambiguo' };
    return { estado: 'ok', entrada: ex.entrada };
  }
  // los textos de la base nombran las variables y la línea de un programa de ejemplo: se llevan a las del alumno
  function adaptador(d, e) {
    const mapa = {};
    const a = ((e && e.mensaje_editor_actual) || '').match(/'[^']*'/g) || [], b = ((d && d.msg) || '').match(/'[^']*'/g) || [];
    a.forEach((x, i) => {
      const u = (b[i] || '').slice(1, -1), v = x.slice(1, -1);
      if (u && v && u !== v && /^[A-Za-z_]\w*$/.test(u) && /^[A-Za-z_]\w*$/.test(v)) mapa[v] = u;
    });
    const claves = Object.keys(mapa);
    const re = claves.length ? new RegExp('(?<![\\p{L}\\d_])(' + claves.map((k) => k.replace(/[^\w]/g, '\\$&')).join('|') + ')(?![\\p{L}\\d_])', 'gu') : null;
    return (t) => {
      if (typeof t !== 'string') return '';
      t = t.replace(/^L[ií]nea \d+:\s*/, '');
      if (re) t = t.replace(re, (m, g, off, all) => {
        // una "A" de frase («A scanf le falta…») es la preposición, no la variable
        if (m.length === 1 && (off === 0 || /[.:]\s$/.test(all.slice(Math.max(0, off - 2), off))) && /^\s[a-záéíóú]/.test(all.slice(off + 1, off + 3))) return m;
        return mapa[g];
      });
      return t;
    };
  }

  /* --- pistas de a una --- */
  const pistasEstado = new Map();
  function pistasWidget(entrada, clave, adapt, extra) {
    const K = KBx(), box = el('div', 'pistasbox'), ol = el('ol', 'pistas'), act = el('div', 'hact');
    box.appendChild(ol); box.appendChild(act);
    const total = asLista(entrada.pistas).length;
    function pintar(confirmando) {
      const v = pistasEstado.get(clave) || 0;
      ol.innerHTML = ''; act.innerHTML = '';
      ol.hidden = !v;
      for (let n = 1; n <= v; n++) {
        const r = K && K.pista(entrada, n, { vistas: n - 1, confirmar: n === 3 });
        if (!r || r.bloqueada) continue;
        const li = el('li', r.esSolucion ? 'sol' : '', adapt(r.texto));
        if (r.esSolucion) li.insertBefore(el('b', '', 'Casi la solución: '), li.firstChild);
        ol.appendChild(li);
      }
      if (extra) act.appendChild(extra);
      if (v >= total) return;
      if (confirmando) {
        const c = el('div', 'conf');
        c.appendChild(el('span', '', 'Esta pista es casi la solución. ¿Probaste con las anteriores? ¿La querés ver igual?'));
        c.appendChild(btnEl('Sí, mostrarla', 'mini', () => { pistasEstado.set(clave, v + 1); pintar(false); }));
        const no = btnEl('Todavía no', 'mini', () => { pintar(false); act.querySelector('button').focus(); });
        c.appendChild(no); act.appendChild(c); no.focus();
        return;
      }
      const sol = v === 2 && total >= 3;
      const b = btnEl(sol ? 'Mostrar la solución' : v === 0 ? 'Pista' : 'Otra pista', 'mini', () => {
        if (sol) { pintar(true); return; }
        pistasEstado.set(clave, v + 1); pintar(false);
        const items = ol.querySelectorAll('li'); if (items.length) items[items.length - 1].scrollIntoView({ block: 'nearest' });
        const nb = act.querySelector('button'); if (nb) nb.focus();
      });
      b.setAttribute('aria-label', sol ? 'Mostrar la solución (pide confirmación)' : v === 0 ? 'Pedir una pista' : 'Pedir otra pista');
      act.insertBefore(b, act.firstChild);
    }
    pintar(false);
    return box;
  }

  /* --- casos sin respuesta: se guardan en el dispositivo; mandarlos es decisión del alumno --- */
  function guardarCaso(it) {
    if (!window.Compartir) return null;
    try {
      const caso = Compartir.nuevoCaso({ codigo: ta.value, entrada: inTxt.value, diag: { nivel: it.k === 'w' ? 'aviso' : 'error', code: it.code, msg: it.msg, line: it.line }, nivelAyuda, version: (window.CONFIG && CONFIG.VERSION) || '' });
      Compartir.guardar(caso, almacen);
      return Compartir.clave(caso);
    } catch (e) { return null; }
  }

  /* --- ayuda de un diagnóstico: { texto, orig, bloque } --- */
  function relacionDe(e) {
    const D = kbDatos(), id = e.id;
    const lec = (D.lecciones || []).find((l) => asLista(l.errores_ids).indexOf(id) >= 0);
    if (lec) return { tipo: 'leccion', entrada: lec };
    const ay = (D.ayuda || []).find((a) => asLista(a.errores_ids).indexOf(id) >= 0);
    if (ay) return { tipo: 'ayuda', entrada: ay };
    return { tipo: 'error', entrada: e };
  }
  function ayudaItem(it) {
    const r = explicarDiag(it);
    if (r.estado === 'sinexp') guardarCaso(it);   // sin cambios: el caso queda guardado en el dispositivo para que el alumno elija si lo manda
  }
  // al editar la línea marcada, la ayuda de ese problema se esconde sola (se vuelve a calcular al ejecutar)
  function revisarViejos() {
    if (!problems.length) return;
    const lines = ta.value.split('\n');
    diagList.querySelectorAll('.it').forEach((w) => {
      const ln = +w.dataset.line;
      if (!ln) return;
      w.classList.toggle('stale', (lines[ln - 1] || '') !== w.dataset.txt);
    });
  }
  ta.addEventListener('input', revisarViejos);

  /* ---------- panel «Ayuda»: buscador y detalle ---------- */
  const dA = $('dAyuda'), aQ = $('aQ'), aList = $('aList'), aDet = $('aDet'), aRes = $('aRes'), aLive = $('aLive'), aSug = $('aSug');
  const TIPO_TXT = { error: 'Error', ayuda: 'Ayuda', leccion: 'Lección' };
  const SUGERENCIAS = ['¿por qué 7/2 da 3?', 'scanf', '&', '%d', 'for', 'while', 'if y else', 'prototipo'];
  let aHist = [];
  function filaResultado(r) {
    const li = el('li'), b = el('button'); b.type = 'button';
    const t = el('span'); t.appendChild(el('span', 'tipo ' + r.tipo, TIPO_TXT[r.tipo] || r.tipo)); t.appendChild(document.createTextNode(' ')); t.appendChild(el('b', '', r.titulo));
    b.appendChild(t);
    if (r.resumen) b.appendChild(el('span', 'sub', r.resumen));
    b.addEventListener('click', () => mostrarDetalle({ tipo: r.tipo, entrada: r.entrada }));
    li.appendChild(b); return li;
  }
  function mostrarResultados(q) {
    aHist = []; aQ.value = q; aDet.hidden = true; aRes.hidden = false; aList.innerHTML = '';
    const K = KBx();
    if (!K) { aSug.hidden = true; aLive.textContent = 'La ayuda no está disponible en este momento.'; return; }
    if (!q.trim()) {
      aSug.hidden = false; aSug.innerHTML = '';
      SUGERENCIAS.forEach((s) => aSug.appendChild(btnEl(s, 'mini', () => { mostrarResultados(s); aQ.focus(); })));
      (kbDatos().lecciones || []).forEach((l) => aList.appendChild(filaResultado({ tipo: 'leccion', titulo: l.titulo, resumen: '', entrada: l })));
      aLive.textContent = 'Escribí una palabra o una pregunta, o elegí una lección.';
      return;
    }
    aSug.hidden = true;
    let res = []; try { res = K.buscar(q, { max: 12 }); } catch (e) { res = []; }
    res.forEach((r) => aList.appendChild(filaResultado(r)));
    aLive.textContent = res.length ? res.length + (res.length === 1 ? ' resultado' : ' resultados') : 'No encontré nada para «' + q.trim().slice(0, 40) + '». Probá con otra palabra.';
  }
  function abrirEnEditor(codigo, entrada, nombre, tostada) {
    cerrarBurbuja();
    newProgram(nombre, String(codigo).replace(/\r\n?/g, '\n'), entrada || '');
    if (dA.open) dA.close();
    if (tabMode()) setTab('ed', true);
    toast(tostada || 'Se abrió como programa nuevo; el anterior sigue en «Programas».');
  }
  function bloqueCodigo(titulo, codigo, acciones) {
    const w = el('div');
    w.appendChild(el('div', 'lbl', titulo));
    w.appendChild(el('pre', 'ej', codigo));
    if (acciones) { const r = el('div', 'row'); acciones.forEach((a) => r.appendChild(a)); w.appendChild(r); }
    return w;
  }
  function relacionados(v) {
    const K = KBx(), D = kbDatos(), out2 = [], e = v.entrada;
    const ids = v.tipo === 'error' ? [e.id] : asLista(e.errores_ids);
    if (v.tipo === 'error') {
      (D.lecciones || []).filter((l) => asLista(l.errores_ids).indexOf(e.id) >= 0).forEach((l) => out2.push({ tipo: 'leccion', entrada: l }));
      (D.ayuda || []).filter((a) => asLista(a.errores_ids).indexOf(e.id) >= 0).forEach((a) => out2.push({ tipo: 'ayuda', entrada: a }));
    } else {
      ids.forEach((id) => { const x = K && K.entrada(id); if (x) out2.push({ tipo: 'error', entrada: x }); });
      (D.lecciones || []).filter((l) => l !== e && asLista(l.errores_ids).some((id) => ids.indexOf(id) >= 0)).forEach((l) => out2.push({ tipo: 'leccion', entrada: l }));
      if (v.tipo === 'leccion') (D.ayuda || []).filter((a) => asLista(a.errores_ids).some((id) => ids.indexOf(id) >= 0)).forEach((a) => out2.push({ tipo: 'ayuda', entrada: a }));
    }
    return out2.filter((x, i) => out2.findIndex((y) => y.entrada === x.entrada) === i && x.entrada !== e).slice(0, 8);
  }
  function tituloDe(v) { const e = v.entrada; return v.tipo === 'error' ? e.nombre_corto : v.tipo === 'ayuda' ? e.elemento : e.titulo; }
  function mostrarDetalle(v) {
    aHist.push(v);
    aRes.hidden = true; aDet.hidden = false; aDet.innerHTML = ''; aDet.scrollTop = 0;
    const e = v.entrada, K = KBx();
    const top = el('div', 'row');
    top.appendChild(btnEl('← Volver', 'mini', () => { aHist.pop(); const prev = aHist.pop(); if (prev) mostrarDetalle(prev); else { mostrarResultados(aQ.value); aQ.focus(); } }));
    aDet.appendChild(top);
    const h = el('h2', 'dt'); h.tabIndex = -1;
    h.appendChild(el('span', 'tipo ' + v.tipo, TIPO_TXT[v.tipo]));
    h.appendChild(document.createTextNode(' ' + (tituloDe(v) || '')));
    aDet.appendChild(h);
    const sec = (t, txt) => { if (!txt) return; aDet.appendChild(el('div', 'lbl', t)); asLista(txt).forEach((p) => aDet.appendChild(el('p', '', p))); };
    if (v.tipo === 'error') {
      sec('Lo que dice el editor', e.mensaje_editor);
      sec('Qué pasa', e.explicacion);
      sec('Cómo arreglarlo', e.como_arreglarlo);
      if (asLista(e.pistas).length) { aDet.appendChild(el('div', 'lbl', 'Pistas (de a una)')); aDet.appendChild(pistasWidget(e, 'panel|' + e.id, (t) => t.replace(/^L[ií]nea \d+:\s*/, ''))); }
      if (e.codigo_mal) aDet.appendChild(bloqueCodigo('Así falla', e.codigo_mal, [btnEl('Abrir en el editor', 'mini', () => abrirEnEditor(e.codigo_mal, e.entrada, 'Ejemplo: ' + e.nombre_corto.slice(0, 30)))]));
      if (e.codigo_bien) aDet.appendChild(bloqueCodigo('Así queda bien', e.codigo_bien, [btnEl('Abrir en el editor', 'mini', () => abrirEnEditor(e.codigo_bien, e.entrada, 'Ejemplo: ' + e.nombre_corto.slice(0, 30)))]));
    } else if (v.tipo === 'ayuda') {
      sec('Qué es', e.que_es);
      if (e.como_se_usa) aDet.appendChild(bloqueCodigo('Cómo se usa', e.como_se_usa));
      sec('Error típico', e.error_tipico);
      if (e.en_la_materia) sec('En la materia', e.en_la_materia);
      aDet.appendChild(btnEl('Buscar más sobre «' + e.elemento.slice(0, 20) + '»', 'mini', () => { mostrarResultados(e.elemento); aQ.focus(); }));
    } else {
      sec('Explicación', e.explicacion);
      if (e.ejemplo) aDet.appendChild(bloqueCodigo('Ejemplo', e.ejemplo, [btnEl('Probar', 'mini primary', () => abrirEnEditor(e.ejemplo, e.entrada, 'Lección ' + (e.titulo || '').replace(/^\d+\.\s*/, '').slice(0, 28), 'Cargado como programa nuevo. Apretá Ejecutar para probarlo.'))]));
      if (e.resultado) aDet.appendChild(bloqueCodigo('Resultado', e.resultado));
    }
    const rel = relacionados(v);
    if (rel.length) {
      aDet.appendChild(el('div', 'lbl', 'Relacionados'));
      const r = el('div', 'rel');
      rel.forEach((x) => r.appendChild(btnEl((TIPO_TXT[x.tipo] || '') + ': ' + (tituloDe(x) || '').slice(0, 40), 'mini', () => mostrarDetalle(x))));
      aDet.appendChild(r);
    }
    aLive.textContent = '';
    h.focus({ preventScroll: true });
  }
  function abrirAyuda(o) {
    o = o || {};
    cerrarBurbuja();
    if (!dA.open) dA.showModal();
    if (o.ver) { aHist = []; mostrarResultados(aQ.value); mostrarDetalle(o.ver); }
    else { mostrarResultados(o.q !== undefined ? String(o.q) : ''); aQ.focus(); aQ.select(); }
  }
  aQ.addEventListener('input', () => mostrarResultados(aQ.value));
  $('aForm').addEventListener('submit', (e) => e.preventDefault());
  aQ.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { const b = aList.querySelector('button'); if (b && !aRes.hidden) { e.preventDefault(); b.focus(); } }
    else if (e.key === 'Enter') { const b = aList.querySelector('button'); if (b && !aRes.hidden && aQ.value.trim()) { e.preventDefault(); b.click(); } }
  });
  aList.addEventListener('keydown', (e) => {
    const bs = Array.prototype.slice.call(aList.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (bs[i + 1]) bs[i + 1].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (i === 0) aQ.focus(); else bs[i - 1].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); bs[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); bs[bs.length - 1].focus(); }
  });
  $('ayudaBtn').addEventListener('click', () => abrirAyuda());

  /* ---------- «¿Qué es esto?» sobre el código: no mueve el cursor ni toca el texto ---------- */
  const bubble = $('bubble'), whatLay = $('whatLay'), whatBtn = $('whatBtn');
  let whatOn = false;
  function cerrarBurbuja() {
    if (!bubble.hidden) { bubble.hidden = true; bubble.innerHTML = ''; if (coarse && whatOn) setWhat(false); }
  }
  function setWhat(on) {
    whatOn = !!on; whatBtn.setAttribute('aria-pressed', String(whatOn)); whatLay.hidden = !whatOn;
    if (!whatOn && !bubble.hidden) { bubble.hidden = true; bubble.innerHTML = ''; }
    if (whatOn) toast('Tocá una palabra, un operador o un %d del código. Esc para salir.');
  }
  whatBtn.addEventListener('click', () => setWhat(!whatOn));
  // carácter del textarea bajo un punto de la pantalla (fuente monoespaciada, tabulador de 4); null si cae fuera del texto
  let cwCache = { f: '', w: 0 };
  function offsetEn(cx, cy) {
    const r = ta.getBoundingClientRect(), cs = getComputedStyle(ta);
    const f = cs.fontSize + ' ' + cs.fontFamily;
    if (cwCache.f !== f) { const c = document.createElement('canvas').getContext('2d'); c.font = f; cwCache = { f, w: c.measureText('M').width }; }
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5, cw = cwCache.w || 8;
    const x = cx - r.left - (parseFloat(cs.paddingLeft) || 0) + ta.scrollLeft, y = cy - r.top - (parseFloat(cs.paddingTop) || 0) + ta.scrollTop;
    if (x < 0 || y < 0) return null;
    const ln = Math.floor(y / lh), lines = ta.value.split('\n');
    if (ln >= lines.length) return null;
    const colV = Math.floor(x / cw), txt = lines[ln];
    let v = 0, idx = 0;
    for (; idx < txt.length; idx++) { const w = txt[idx] === '\t' ? SANG - (v % SANG) : 1; if (colV < v + w) break; v += w; }
    if (idx >= txt.length) return null;
    let off = 0; for (let i = 0; i < ln; i++) off += lines[i].length + 1;
    return off + idx;
  }
  function mostrarBurbuja(off, cx, cy) {
    const K = KBx();
    bubble.innerHTML = '';
    let clave = null, a = null;
    if (K && off !== null) { try { clave = K.elementoEnPosicion(ta.value, off); a = clave ? K.ayudaDe(clave) : null; } catch (e) { a = null; } }
    const cierre = btnEl('', 'mini ico', () => cerrarBurbuja(), 'Cerrar la explicación'); cierre.appendChild(ico('cerrar'));
    if (a) {
      const h = el('h4'); h.appendChild(el('code', '', a.elemento)); h.appendChild(cierre); bubble.appendChild(h);
      if (a.tipo) bubble.appendChild(el('div', 'muted', a.tipo));
      bubble.appendChild(el('p', '', a.que_es || ''));
      if (a.como_se_usa) bubble.appendChild(el('pre', '', a.como_se_usa));
      if (a.error_tipico) bubble.appendChild(el('p', 'muted', 'Error típico: ' + a.error_tipico));
      const r = el('div', 'row'); r.appendChild(btnEl('Más ayuda', 'mini', () => abrirAyuda({ ver: { tipo: 'ayuda', entrada: a } }))); bubble.appendChild(r);
    } else {
      const h = el('h4'); h.appendChild(el('span', '', '¿Qué es esto?')); h.appendChild(cierre); bubble.appendChild(h);
      bubble.appendChild(el('p', 'muted', K ? 'No tengo una explicación para eso: puede ser un nombre tuyo, un número o un comentario. Probá tocando una palabra de C, un operador o un %d.' : 'La ayuda no está disponible en este momento.'));
    }
    bubble.hidden = false;
    if (!coarse && window.innerWidth >= 700) {
      const bw = Math.min(380, window.innerWidth - 16);
      bubble.style.left = Math.max(8, Math.min(window.innerWidth - bw - 8, cx + 8)) + 'px';
      const bh = bubble.offsetHeight;
      bubble.style.top = Math.max(8, cy + 16 + bh > window.innerHeight - 8 ? cy - bh - 12 : cy + 16) + 'px';
    }
  }
  function consultar(cx, cy) { mostrarBurbuja(offsetEn(cx, cy), cx, cy); }
  whatLay.addEventListener('click', (e) => consultar(e.clientX, e.clientY));
  // la capa tapa el texto: la rueda y el arrastre con el dedo siguen moviendo el editor
  whatLay.addEventListener('wheel', (e) => { e.preventDefault(); ta.scrollTop += e.deltaY; ta.scrollLeft += e.deltaX; syncScroll(); }, { passive: false });
  let wtx = 0, wty = 0;
  whatLay.addEventListener('touchstart', (e) => { const t = e.touches[0]; wtx = t.clientX; wty = t.clientY; }, { passive: true });
  whatLay.addEventListener('touchmove', (e) => { const t = e.touches[0]; ta.scrollTop -= t.clientY - wty; ta.scrollLeft -= t.clientX - wtx; wtx = t.clientX; wty = t.clientY; syncScroll(); }, { passive: true });
  ta.addEventListener('mousedown', (e) => { if (e.altKey && e.button === 0) { e.preventDefault(); consultar(e.clientX, e.clientY); } }, true);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'F1') { e.preventDefault(); const r = ta.getBoundingClientRect(); mostrarBurbuja(Math.min(ta.selectionStart, Math.max(0, ta.value.length - 1)), r.left + 48, r.top + 40); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!bubble.hidden) { e.preventDefault(); bubble.hidden = true; bubble.innerHTML = ''; if (coarse && whatOn) setWhat(false); }
    else if (whatOn && !document.querySelector('dialog[open]')) { e.preventDefault(); setWhat(false); }
  });

  /* ---------- casos para enviar ---------- */
  const dCasos = $('dCasos');
  let casosSel = new Set();
  const casosLista = () => { try { return window.Compartir ? Compartir.listar(almacen) : []; } catch (e) { return []; } };
  function abrirCasos(claves) {
    const lista = casosLista();
    casosSel = new Set(claves && claves.length ? claves : lista.map((c) => Compartir.clave(c)));
    if ($('dSet').open) $('dSet').close();
    pintarCasos();
    if (!dCasos.open) dCasos.showModal();
  }
  function pintarCasos() {
    const lista = casosLista(), ul2 = $('cList');
    ul2.innerHTML = '';
    lista.forEach((c) => {
      const k = Compartir.clave(c), li = el('li'), lb = el('label'), cb = el('input');
      cb.type = 'checkbox'; cb.checked = casosSel.has(k); cb.setAttribute('aria-label', 'Incluir este caso en el envío');
      cb.addEventListener('change', () => { if (cb.checked) casosSel.add(k); else casosSel.delete(k); pintarVistaCasos(); });
      const cm = el('span', 'cm'); const d = c.diag || {};
      cm.appendChild(el('b', '', d.msg ? (d.line ? 'Línea ' + d.line + ': ' : '') + d.msg : 'Consulta del alumno (sin mensaje del compilador)'));
      cm.appendChild(el('small', '', (d.nivel === 'aviso' ? 'Aviso' : 'Error') + (c.fecha ? ' · ' + c.fecha : '') + ' · ' + (c.codigo || '').split('\n').length + ' líneas de código'));
      lb.appendChild(cb); lb.appendChild(cm); li.appendChild(lb);
      const del = btnEl('', 'mini ico', () => {
        Compartir.borrar(k, almacen); casosSel.delete(k); pintarCasos();
        toast('Caso borrado.', 'Deshacer', () => { Compartir.guardar(c, almacen); casosSel.add(k); pintarCasos(); });
      }, 'Borrar este caso'); del.title = 'Borrar este caso'; del.appendChild(ico('borrar'));
      li.appendChild(del); ul2.appendChild(li);
    });
    $('cVacio').hidden = lista.length > 0; $('cAcc').hidden = !lista.length; $('cDelAll').hidden = !lista.length;
    pintarVistaCasos();
  }
  let casosTexto = '', casosSelLista = [];
  function pintarVistaCasos() {
    const sel = casosLista().filter((c) => casosSel.has(Compartir.clave(c)));
    casosSelLista = sel;
    const wa = $('cWa'), cfgNum = (window.CONFIG && CONFIG.WHATSAPP_NUMERO) || '';
    if (!sel.length) {
      casosTexto = ''; $('cPrev').textContent = '(elegí al menos un caso)'; $('cNota').textContent = '';
      wa.setAttribute('aria-disabled', 'true'); wa.removeAttribute('href'); $('cCopy').disabled = true; $('cDl').disabled = true;
      return;
    }
    const nota = $('cNota2').value, texto = Compartir.mensajeWhatsApp(sel, nota), url = Compartir.urlWhatsApp(texto, cfgNum);
    casosTexto = Compartir.textoCompleto || texto;
    let enviado = texto;
    if (Compartir.recortado) { try { enviado = decodeURIComponent(url.slice(url.indexOf('?text=') + 6)); } catch (e) { enviado = texto; } }
    $('cPrev').textContent = enviado;
    wa.setAttribute('href', url); wa.removeAttribute('aria-disabled'); $('cCopy').disabled = false; $('cDl').disabled = false;
    const notas = [];
    if (!cfgNum) notas.push('Todavía no está configurado el número de Diego: WhatsApp se abre sin destinatario y elegís vos a quién mandarlo.');
    if (Compartir.recortado) notas.push('El texto es largo y por WhatsApp va recortado (es lo que ves arriba). Usá «Copiar» para tener el texto completo.');
    $('cNota').textContent = notas.join(' ');
  }
  $('cNota2').addEventListener('input', () => pintarVistaCasos());
  $('casosBtn').addEventListener('click', () => abrirCasos());
  // «Avisar a Diego»: arma un caso con el programa actual y el último mensaje, lo deja elegido y abre la vista previa (nada se manda solo)
  $('avisar').addEventListener('click', () => {
    $('more').open = false;
    const it = (typeof problems !== 'undefined' && problems && problems[0]) || { k: 'e', code: '', msg: '', line: 0 };
    const clave = guardarCaso(it);
    abrirCasos(clave ? [clave] : undefined);
    setTimeout(() => $('cNota2').focus(), 50);
  });
  $('cCopy').addEventListener('click', () => {
    copyText(casosTexto, dCasos).then((ok) => {
      if (ok) { toast('Texto copiado. Pegalo en el chat que quieras.'); return; }
      $('cNota').textContent = 'El navegador no dejó copiar. Tocá el texto de la vista previa, copialo a mano y pegalo en el chat.';
      const r = document.createRange(); r.selectNodeContents($('cPrev')); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); $('cPrev').focus();
    });
  });
  $('cDl').addEventListener('click', () => {
    if (!casosSelLista.length) return;
    const d = new Date(), stamp = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
    download(new Blob([Compartir.exportarJSON(casosSelLista, { nota: $('cNota2').value })], { type: 'application/json' }), 'casos-editor-c-' + stamp + '.json');
    toast('Archivo descargado. Mandalo vos si querés.');
  });
  $('cDelAll').addEventListener('click', () => {
    const todos = casosLista();
    todos.forEach(() => Compartir.borrar(0, almacen));
    casosSel = new Set(); pintarCasos();
    toast('Se borraron ' + todos.length + (todos.length === 1 ? ' caso.' : ' casos.'), 'Deshacer', () => { todos.forEach((c) => Compartir.guardar(c, almacen)); casosSel = new Set(todos.map((c) => Compartir.clave(c))); pintarCasos(); });
  });
  // un enlace de WhatsApp sin casos elegidos no debe abrirse
  $('cWa').addEventListener('click', (e) => { if ($('cWa').getAttribute('aria-disabled') === 'true') e.preventDefault(); });

  /* selector segmentado (role=radiogroup): el valor está en data-v de cada botón */
  function segSet(g, v) { g.querySelectorAll('button').forEach((b) => { const on = b.dataset.v === String(v); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }); }
  const segGet = (g) => { const b = g.querySelector('[aria-checked="true"]'); return b ? b.dataset.v : ''; };
  function segInit(g, fn) {
    const bs = Array.from(g.querySelectorAll('button'));
    const pick = (b) => { segSet(g, b.dataset.v); fn(b.dataset.v); };
    bs.forEach((b, i) => {
      b.addEventListener('click', () => pick(b));
      b.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (d) { e.preventDefault(); const n = bs[(i + d + bs.length) % bs.length]; n.focus(); pick(n); }
      });
    });
  }
  window.__seg = { get: segGet, set: segSet };

  /* ---------- ajustes: ayuda, escritura, evidencia de proceso ---------- */
  function sincronizarAjustesNuevos() {
    segSet($('ayudaSel'), String(nivelAyuda)); $('ayudaDesc').textContent = NIVELES_TXT[nivelAyuda];
    $('autoCierre').checked = autoCierre;
    $('tabSel').value = String(SANG); $('wsChk').checked = verEsp;
    const n = casosLista().length;
    $('casosBtn').textContent = 'Casos para enviar' + (n ? ' (' + n + ')' : '');
  }
  segInit($('ayudaSel'), (v) => {
    nivelAyuda = +v === 2 ? 2 : 1; store.set('ayuda', String(nivelAyuda)); $('ayudaDesc').textContent = NIVELES_TXT[nivelAyuda];
    if (lastRes && problems.length) renderDiag(lastRes, lastRt, true);
  });
  $('symChk').checked = simbolos;
  $('symChk').addEventListener('change', () => { simbolos = $('symChk').checked; store.set('simbolos', simbolos ? '1' : '0'); mostrarBarraSimbolos(); });
  $('autoCierre').addEventListener('change', () => { autoCierre = $('autoCierre').checked; store.set('autocierre', autoCierre ? '1' : '0'); });
  $('tabSel').addEventListener('change', () => { SANG = +$('tabSel').value; store.set('sang', String(SANG)); aplicarVista(); refresh(); });
  $('wsChk').addEventListener('change', () => { verEsp = $('wsChk').checked; store.set('ws', verEsp ? '1' : '0'); refresh(); });
  /* modo lectura: solo el código, sin barra ni consola; el texto no se puede cambiar */
  function setLectura(on) {
    document.documentElement.classList.toggle('lectura', on);
    ta.readOnly = on;
    $('readBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('readTxt').textContent = on ? 'Salir' : 'Lectura';
    $('readBtn').setAttribute('aria-label', on ? 'Salir del modo lectura' : 'Modo lectura');
    if (on) { if (tabMode()) setTab('ed', true); findClose(); cerrarBurbuja(); }
    refresh();
  }
  $('readBtn').addEventListener('click', () => setLectura(!document.documentElement.classList.contains('lectura')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.documentElement.classList.contains('lectura') && $('bubble').hidden && !document.querySelector('dialog[open]')) { e.preventDefault(); setLectura(false); }
  });

  /* ---------- consola ---------- */
  let total = 0; const CAP = 400000;
  // La salida se junta y se vuelca a la página cada ~40 ms: un programa que escribe a toda velocidad no frena la interfaz
  let outBuf = '', outTimer = null;
  function flushOut() {
    clearTimeout(outTimer); outTimer = null;
    if (!outBuf) return;
    const t = outBuf; outBuf = '';
    const last = out.lastChild;
    if (last && last.nodeType === 3) last.appendData(t); else out.appendChild(document.createTextNode(t));
    cons.scrollTop = cons.scrollHeight;
    if (tabMode() && tab === 'ed') $('tabDot').hidden = false;
  }
  function appendText(text, cls) {
    if (!text) return;
    total += text.length;
    if (!cls) { outBuf += text; if (!outTimer) outTimer = setTimeout(flushOut, 40); return; }
    flushOut();
    const sp = document.createElement('span'); sp.className = cls; sp.textContent = text; out.appendChild(sp);
    cons.scrollTop = cons.scrollHeight;
  }
  function consoleText() {
    flushOut();
    let s = '';
    out.childNodes.forEach((n) => { if (n.nodeType === 3 || !(n.classList.contains('stdin') || n.classList.contains('eofbtn'))) s += n.textContent; });
    return s;
  }
  function endsWithNewline() { const s = consoleText(); return !s || s.endsWith('\n'); }
  function setStatus(txt, cls) {
    statusEl.textContent = txt; statusEl.className = 'chip' + (cls ? ' ' + cls : '');
    // cartel bien visible mientras algo corre o espera datos (no depende solo del color)
    const rb = $('runBar'), on = cls === 'run' || cls === 'wait';
    rb.hidden = !on; rb.className = 'runbar' + (cls === 'wait' ? ' wait' : '');
    $('runBarTxt').textContent = cls === 'wait' ? 'Esperando datos: tipeá en la consola y apretá Enter' : txt === 'Compilando…' ? 'Compilando…' : 'Ejecutando… el programa está en marcha';
  }
  function clearConsole() { clearTimeout(outTimer); outTimer = null; outBuf = ''; out.textContent = ''; total = 0; }
  $('clear').addEventListener('click', () => { removeInput(); clearConsole(); if ((worker || main) && waiting) showInput(); });
  function copyText(s, host) {
    const fallback = () => {
      const t = document.createElement('textarea'); t.value = s; t.style.position = 'fixed'; t.style.opacity = '0'; (host || document.body).appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      t.remove(); return ok;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s).then(() => true, () => fallback());
    return Promise.resolve(fallback());
  }
  $('copy').addEventListener('click', () => {
    const s = consoleText().replace(/\n+$/, '');
    if (!s) { toast('No hay salida para copiar.'); return; }
    copyText(s).then((ok) => toast(ok ? 'Salida copiada.' : 'No se pudo copiar: seleccioná el texto y copialo a mano.'));
  });

  /* datos de entrada precargados */
  function updateInDot() { $('inDot').hidden = !inTxt.value.trim(); }
  $('inBtn').addEventListener('click', () => {
    const open = $('inbox').hidden;
    $('inbox').hidden = !open; $('inBtn').setAttribute('aria-expanded', String(open));
    if (open) inTxt.focus({ preventScroll: true });
  });
  inTxt.addEventListener('input', () => { updateInDot(); scheduleSave(); });
  let presetQ = [];
  function preparePreset() {
    const t = inTxt.value.replace(/\r\n?/g, '\n');
    presetQ = t.trim() ? t.replace(/\n$/, '').split('\n') : [];
  }
  function nextPreset() {
    if (!presetQ.length) return null;
    const l = presetQ.shift();
    removeInput(); appendText(l + '\n', 'in');
    return l;
  }

  let worker = null, waiting = false;
  // tiempo de ejecución: desde que se aprieta Ejecutar hasta que termina, sin contar lo que el alumno tarda en tipear datos
  let tRun0 = 0, tEspera = 0, tEsperaIni = 0;
  const finEspera = () => { if (tEsperaIni) { tEspera += performance.now() - tEsperaIni; tEsperaIni = 0; } };
  const fmtSeg = (ms) => (ms < 10 ? 'menos de 0,01 s' : ((ms / 1000 < 10 ? (ms / 1000).toFixed(2) : (ms / 1000).toFixed(1)).replace('.', ',') + ' s'));
  function removeInput() { const w = out.querySelector('.stdin'); if (w) w.remove(); const b = out.querySelector('.eofbtn'); if (b) b.remove(); }
  function showInput() {
    flushOut(); removeInput(); waiting = true; tEsperaIni = performance.now();
    const wrap = document.createElement('span'); wrap.className = 'stdin';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('autocorrect', 'off');
    inp.setAttribute('aria-label', 'Entrada del programa (Enter para enviar)'); inp.enterKeyHint = 'send'; inp.inputMode = 'text';
    wrap.appendChild(inp); out.appendChild(wrap);
    const eof = document.createElement('button'); eof.type = 'button'; eof.className = 'eofbtn'; eof.textContent = 'Fin de entrada (Ctrl+D)';
    eof.addEventListener('click', () => sendEOF()); out.appendChild(eof);
    const fit = () => { inp.style.width = Math.max(1, inp.value.length + 1) + 'ch'; };
    inp.addEventListener('input', fit);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const s = inp.value; removeInput(); waiting = false; finEspera(); appendText(s + '\n', 'in'); setStatus('Ejecutando…', 'run'); send({ type: 'line', s }); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); sendEOF(); }
    });
    fit(); setStatus('Esperando datos…', 'wait');
    inp.focus({ preventScroll: true });
    ensureInputVisible();
  }
  function sendEOF() { removeInput(); waiting = false; finEspera(); appendText('^D\n', 'dim'); setStatus('Ejecutando…', 'run'); send({ type: 'eof' }); }
  cons.addEventListener('click', () => { const i = out.querySelector('.stdin input'); if (i && !window.getSelection().toString()) i.focus({ preventScroll: true }); });

  /* ---------- ejecución ---------- */
  // El Worker recibe el código fuente, lo compila y lo ejecuta: la página solo recibe diagnósticos y salida.
  // Así un código patológico (compilación eterna, bucle infinito, arreglo gigante) nunca congela la página
  // y Detener siempre funciona (termina el Worker).
  const BOOT = `
const CAP = ${CAP};
let pend = '', sent = 0, resolver = null, capped = false;
function flush() { if (pend) { self.postMessage({ type: 'out', s: pend }); pend = ''; } }
self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.type === 'run') {
    let res;
    try { res = CCompiler.compile(m.src); }
    catch (e) { res = { js: null, errors: [{ line: 0, msg: 'error interno del editor: ' + (e && e.message) }], warnings: [] }; }
    const diag = JSON.parse(JSON.stringify({ errors: res.errors || [], warnings: res.warnings || [] }));
    self.postMessage({ type: 'compiled', res: diag });
    if (!res.js || diag.errors.length) return;
    const io = {
      write(s) {
        if (capped) return;
        const room = CAP - sent;
        if (s.length > room) { pend += s.slice(0, Math.max(0, room)); sent = CAP; capped = true; flush(); self.postMessage({ type: 'cap' }); throw new CRT.ExitSignal(-999); }
        sent += s.length; pend += s; if (pend.length > 2048) flush();
      },
      readLine() { flush(); self.postMessage({ type: 'need' }); return new Promise((r) => { resolver = r; }); }
    };
    const r = await CRT.runProgram(res.js, io);
    if (capped) return;
    flush(); self.postMessage({ type: 'done', res: r });
  } else if (m.type === 'line') { if (resolver) { const r = resolver; resolver = null; r(m.s); } }
  else if (m.type === 'eof') { if (resolver) { const r = resolver; resolver = null; r(null); } }
};
self.postMessage({ type: 'ready' });`;
  let blobUrl = null;
  function makeWorker() {
    if (typeof CC_SRC === 'undefined' || typeof RT_SRC === 'undefined') throw new Error('sin texto del motor');
    if (!blobUrl) blobUrl = URL.createObjectURL(new Blob([CC_SRC + '\n' + RT_SRC + '\n' + BOOT], { type: 'text/javascript' }));
    return new Worker(blobUrl);
  }
  let workerBroken = false;   // si el navegador no deja usar Workers, se compila y ejecuta en la página
  let main = null;            // ejecución en la página: { cancel, send }
  const cfg = { slowMs: 5000 };

  /* aviso (no bloqueante) si lleva mucho sin pedir datos ni escribir: puede ser un bucle infinito */
  let lastAct = 0, slowTimer = null, slowShown = false, phase = '';
  const slowEl = $('slow');
  function hideSlow() { slowShown = false; slowEl.hidden = true; }
  function act() { lastAct = Date.now(); if (slowShown) hideSlow(); }
  function slowCheck() {
    if ((!worker && !main) || waiting || slowShown) return;
    if (Date.now() - lastAct < cfg.slowMs) return;
    slowShown = true;
    $('slowTxt').textContent = phase === 'compiling'
      ? 'Sigue compilando. Si tarda demasiado, apretá Detener.'
      : 'El programa sigue ejecutándose. Si no lo esperabas, puede haber un bucle infinito: apretá Detener.';
    slowEl.hidden = false;
  }
  $('slowStop').addEventListener('click', () => stop());
  function resetRun() {
    if (worker) { worker.terminate(); worker = null; }
    if (main) { main.cancel(); main = null; }
    waiting = false; runBtn.disabled = false; stopBtn.disabled = true;
    clearInterval(slowTimer); slowTimer = null; hideSlow(); phase = '';
  }
  function beginRun(ph) {
    runBtn.disabled = true; stopBtn.disabled = false; phase = ph; act();
    setStatus(ph === 'compiling' ? 'Compilando…' : 'Ejecutando…', 'run');
    clearInterval(slowTimer); slowTimer = setInterval(slowCheck, 400);
  }
  function stopRun(silent) { resetRun(); if (silent) removeInput(); }
  function stop() {
    if (!worker && !main) return;
    if (main) { main.cancel(); return; }   // el aviso de "Detenido" lo pone el final de la ejecución
    const compiling = phase === 'compiling';
    resetRun(); removeInput();
    if (!endsWithNewline()) appendText('\n');
    appendText(compiling ? '— Compilación detenida por el usuario —\n' : '— Detenido por el usuario —\n', 'dim'); setStatus('Detenido');
  }
  stopBtn.addEventListener('click', stop);
  function send(msg) { act(); if (main) { if (msg.type === 'line') main.send(msg.s); else main.send(null); } else if (worker) worker.postMessage(msg); }

  let lastRes = null;
  function finish(r) {
    resetRun(); removeInput();
    if (!endsWithNewline()) appendText('\n');
    if (r.stopped) { appendText('— Detenido por el usuario —\n', 'dim'); setStatus('Detenido'); return; }
    if (r.error) {
      appendText('Error al ejecutar: el programa falló' + (nivelAyuda >= 2 && r.line ? ' en la línea ' + r.line : '') + '.\n', 'er');
      showDiag(lastRes, { line: r.line, msg: r.error });
      setStatus('Error al ejecutar', 'err');
    } else {
      const c = r.code === undefined || r.code === null ? 0 : r.code;
      finEspera();
      const seg = fmtSeg(Math.max(0, performance.now() - tRun0 - tEspera));
      appendText('— Programa terminado · código de salida ' + c + ' · ' + seg + ' —\n', c === 0 ? 'ok' : 'er');
      setStatus('Terminó (código ' + c + ') · ' + seg, c === 0 ? '' : 'err');
    }
  }
  function capped() {
    resetRun(); removeInput();
    if (!endsWithNewline()) appendText('\n');
    appendText('— Salida cortada: demasiado texto (¿bucle infinito?) —\n', 'er'); setStatus('Detenido', 'err');
  }
  // ayuda 1: solo el tipo general; ayuda 2: además el número de línea
  function mensajeNoCompilo(errs) {
    if (nivelAyuda < 2) return 'No se pudo ejecutar: el programa no compiló (error de sintaxis). Revisá el código y volvé a ejecutar.';
    const ls = errs.map((e) => e.line).filter((l, i, a) => l && a.indexOf(l) === i);
    return 'No se pudo ejecutar: el programa no compiló (error de sintaxis)' + (ls.length ? (ls.length === 1 ? ' en la línea ' + ls[0] : ' en las líneas ' + ls.join(', ')) : '') + '. Corregí y volvé a ejecutar.';
  }
  // devuelve true si había errores (y ya los mostró)
  function reportCompile(res) {
    lastRes = res; showDiag(res);
    if (res.errors.length) {
      const n = res.errors.length;
      appendText(mensajeNoCompilo(res.errors) + '\n', 'er');
      setStatus('No compiló', 'err');
      return true;
    }
    return false;
  }

  // Ejecución dentro de la página (solo si el navegador no deja crear el Worker): compila acá y los lazos ceden el control cada tanto
  function runInPage(src) {
    let res;
    try { res = CCompiler.compile(src, { yieldLoops: true }); }
    catch (e) { res = { js: null, errors: [{ line: 0, msg: 'error interno del editor: ' + e.message }], warnings: [] }; }
    if (reportCompile(res)) { resetRun(); return; }
    if (!res.js || typeof CRT === 'undefined') { appendText('No se pudo iniciar la ejecución en este navegador.\n', 'er'); setStatus('Error', 'err'); resetRun(); return; }
    let cancelled = false, resolver = null;
    const me = {
      cancel() { cancelled = true; if (resolver) { const r = resolver; resolver = null; r(null); } },
      send(line) { if (resolver) { const r = resolver; resolver = null; r(line); } }
    };
    main = me;
    beginRun('running');
    let pend = '', size = 0;
    const flush = () => { if (pend) { const t = pend; pend = ''; act(); appendText(t); } };
    const io = {
      cancelled: () => { flush(); return cancelled; },
      write(s) {
        if (cancelled) return;
        pend += s; size += s.length;
        if (size > CAP) { cancelled = true; flush(); appendText('\n— Salida cortada: demasiado texto (¿bucle infinito?) —\n', 'er'); }
      },
      readLine() { flush(); const l = nextPreset(); if (l !== null) return Promise.resolve(l); showInput(); return new Promise((r) => { resolver = r; }); }
    };
    CRT.runProgram(res.js, io).then((r) => { flush(); if (main === me) finish(r); });
  }

  /* aviso único: a la tercera ejecución se cuenta que el cierre automático de llaves se puede encender en Ajustes (sigue apagado por defecto) */
  function avisoCierre() {
    if (store.get('avisoCierre', '') === '1' || store.get('autocierre', '') !== '') return;
    const n = (+store.get('nEjec', '0') || 0) + 1; store.set('nEjec', String(n));
    if (n < 3) return;
    store.set('avisoCierre', '1');
    setTimeout(() => toast('¿Querés que las llaves, paréntesis y comillas se cierren solas? Se enciende en Ajustes.', 'Ajustes', () => $('settings').click()), 2500);
  }
  function run() {
    tRun0 = performance.now(); tEspera = 0; tEsperaIni = 0;
    resetRun();
    removeInput(); clearConsole(); clearProblems();
    flushSave();
    proc.ejecutar();
    avisoCierre();
    const src = ta.value;
    if (tabMode()) setTab('co');
    preparePreset();
    if (workerBroken) { beginRun('compiling'); runInPage(src); return; }
    let w;
    try { w = makeWorker(); } catch (e) { workerBroken = true; beginRun('compiling'); runInPage(src); return; }
    worker = w;
    beginRun('compiling');
    let ready = false;
    const giveUp = () => { if (ready || w !== worker) return; workerBroken = true; w.terminate(); worker = null; runInPage(src); };
    const timer = setTimeout(giveUp, 2500);
    w.onmessage = (ev) => {
      if (w !== worker) return;
      const m = ev.data;
      if (m.type === 'ready') { ready = true; clearTimeout(timer); w.postMessage({ type: 'run', src }); }
      else if (m.type === 'compiled') {
        if (reportCompile(m.res)) { resetRun(); return; }
        phase = 'running'; act(); setStatus('Ejecutando…', 'run');
      } else if (m.type === 'out') {
        act(); appendText(m.s);
        if (total > CAP) capped();
      } else if (m.type === 'cap') capped();
      else if (m.type === 'need') {
        act(); const l = nextPreset();
        if (l !== null) w.postMessage({ type: 'line', s: l }); else showInput();
      } else if (m.type === 'done') finish(m.res);
    };
    w.onerror = (e) => {
      if (w !== worker) return;
      if (!ready) { clearTimeout(timer); giveUp(); return; }
      resetRun(); removeInput(); appendText('\nError interno: ' + (e.message || 'desconocido') + '\n', 'er'); setStatus('Error', 'err');
    };
  }
  runBtn.addEventListener('click', run);

  /* ---------- archivos ---------- */
  // nombre de la imagen: lo elige el alumno (por ejemplo «Ejercicio 20 b, prueba 2»); se limpian solo los caracteres que los sistemas no aceptan
  const nombreCaptura = () => { const t = ($('shotName') ? $('shotName').value : '').replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); return t || (cur && cur.name) || 'Programa'; };
  const archivoCaptura = () => nombreCaptura().replace(/^[. ]+|[. ]+$/g, '') || 'captura';
  const slug = () => ((cur && cur.name) || 'programa').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'programa';
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  function save() { download(new Blob([ta.value], { type: 'text/plain' }), slug() + '.c'); }
  $('save').addEventListener('click', save);
  $('popen').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    const inp = e.target;
    r.onload = () => { newProgram(f.name.replace(/\.[^.]*$/, ''), String(r.result).replace(/\r\n?/g, '\n')); $('dProgs').close(); };
    r.onloadend = () => { try { inp.value = ''; } catch (err) { /* nada */ } };
    r.readAsText(f);
  });

  /* ---------- captura PNG (código + entrada + salida) ---------- */
  function rowsOf(segs, cols) {
    const rows = []; let row = [], n = 0;
    const push = () => { rows.push(row); row = []; n = 0; };
    segs.forEach(([cls, text]) => {
      text.replace(/\t/g, SP()).split('\n').forEach((part, i) => {
        if (i > 0) push();
        while (part.length) {
          const take = part.slice(0, cols - n);
          row.push([cls, take]); n += take.length; part = part.slice(take.length);
          if (n >= cols) { push(); row.wrapped = true; }
        }
      });
    });
    if (row.length || !rows.length) rows.push(row);
    return rows;
  }
  function makePng(opts) {
    opts = opts || {};
    // Hoja neutra para entregar: fondo blanco, texto casi negro, filetes finos. Se lee en el celular y al imprimir en blanco y negro:
    // lo tipeado va en negrita, los títulos de sección en mayúscula con filete, y la marca se dibuja con el mismo trazo que el logo.
    const COL = { k: '#a8390c', t: '#0a6e78', s: '#2c7339', n: '#8a5200', c: '#5c5e66', f: '#2a5fa3', p: '#7a6420', in: '#0a6e78', er: '#c2261b', dim: '#55565d', ok: '#1c7a3a' };
    const TXT = '#1c1c1e', SUB = '#4a4a50', HAIR = '#d4d4d9', GUT = '#6c6d74', ACC = '#0a7580', PANEL = '#f7f7f8';
    const MONO = '"Liberation Mono", Menlo, Consolas, ui-monospace, monospace', UI = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, Arial, sans-serif';
    const fs = 15, lh = 22, padX = 28, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    ctx.font = fs + 'px ' + MONO; const cw = ctx.measureText('M').width;
    const codeLines = ta.value.replace(/\n$/, '').split('\n');
    const longest = Math.max.apply(null, codeLines.map((l) => l.replace(/\t/g, SP()).length));
    const cols = Math.max(52, Math.min(100, longest + 1));
    const gutW = Math.max(3, String(codeLines.length).length + 1) * cw + 16;
    const leftW = Math.ceil(gutW + cols * cw + 14), rightW = Math.ceil(46 * cw + 24), gapX = 30;
    const W = opts.lado ? padX * 2 + leftW + gapX + rightW : padX * 2 + leftW;
    const codeRows = [];
    let curSegs = [];
    const lineSegs = [];
    tokens(ta.value.replace(/\n$/, '')).forEach(([cls, text]) => {
      text.split('\n').forEach((part, i) => { if (i > 0) { lineSegs.push(curSegs); curSegs = []; } if (part) curSegs.push([cls, part]); });
    });
    lineSegs.push(curSegs);
    lineSegs.forEach((segs, i) => { rowsOf(segs, cols).forEach((r, j) => codeRows.push({ n: j === 0 ? i + 1 : '', r })); });
    const outSegs = [];
    out.childNodes.forEach((n) => {
      if (n.nodeType === 3) outSegs.push([null, n.textContent]);
      else if (!(n.classList.contains('stdin') || n.classList.contains('eofbtn')) && !/^—\s*Programa terminado · código de salida 0( · [^—]*)?\s*—\s*$/.test(n.textContent.trim())) outSegs.push([n.className, n.textContent]);
    });
    const colsR = opts.lado ? 46 : cols + 3;
    let outRows = rowsOf(outSegs, colsR);
    while (outRows.length > 1 && !outRows[outRows.length - 1].length) outRows.pop();
    // salidas muy largas (por ejemplo cuando se leen 150 valores y cada uno se repite en pantalla): se deja el principio y el final, que es donde está el resultado
    if (outRows.length > 32) { const om = outRows.length - 30; outRows = outRows.slice(0, 20).concat([[['dim', '… (' + om + ' líneas omitidas) …']]], outRows.slice(-10)); }
    // si la entrada son muchas líneas cortas (números), se muestra en pocas filas y no una por renglón; si es muy larga se recorta
    let inTxtImg = inTxt.value.replace(/\n+$/, '');
    { const ls = inTxtImg.split('\n'); if (ls.length > 4 && ls.every((l) => l.length <= 14)) inTxtImg = ls.join('   '); }
    let inRows = opts.input !== false && inTxt.value.trim() ? rowsOf([['in', inTxtImg]], colsR) : [];
    if (inRows.length > 8) { const mas = inRows.length - 7; inRows = inRows.slice(0, 7); inRows.push([['dim', '… (' + mas + ' filas más de entrada)']]); }
    // la segunda línea de la cabecera (DNI, curso, materia, ciclo) pasa a dos líneas si no entra junto a la fecha
    const datosPartes = [user.dni && 'DNI ' + user.dni, user.curso, user.mat, user.ciclo && (/ciclo/i.test(user.ciclo) ? user.ciclo : 'Ciclo lectivo ' + user.ciclo)].filter(Boolean);
    const stampTxt = (() => { const q = new Date(); return pad2(q.getDate()) + '/' + pad2(q.getMonth() + 1) + '/' + q.getFullYear() + ' ' + pad2(q.getHours()) + ':' + pad2(q.getMinutes()); })();
    ctx.font = '13px ' + UI;
    const maxDatos = W - 2 * padX - (user.name ? ctx.measureText(stampTxt).width + 24 : 0);
    const datosLin = []; { let ln = ''; datosPartes.forEach((t) => { const c = ln ? ln + '  ·  ' + t : t; if (ln && ctx.measureText(c).width > maxDatos) { datosLin.push(ln); ln = t; } else ln = c; }); if (ln) datosLin.push(ln); }
    const secH = 24, headH = 50 + Math.max(1, datosLin.length) * 18, gap = 6, footH = 24, pad = 8;
    const blockH = (n) => n * lh + 2 * pad;
    const hCode = secH + blockH(codeRows.length), hIn = inRows.length ? secH + blockH(inRows.length) + gap : 0, hOut = secH + blockH(Math.max(1, outRows.length));
    const bodyH = opts.lado ? Math.max(hCode, hIn + hOut) : hCode + gap + hIn + hOut;
    const H = headH + gap + bodyH + footH;
    let S = 2; while (W * S * H * S > 14e6 && S > 1) S -= 0.5;
    cv.width = Math.round(W * S); cv.height = Math.round(H * S); ctx.scale(S, S);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'middle';
    // cabecera: quién es y qué entrega; solo lo necesario, un filete fino abajo
    const nombre = (opts.nombre || (cur ? cur.name : '') || 'Programa');
    const d = new Date(), stamp = pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    ctx.fillStyle = TXT; ctx.font = '700 19px ' + UI; ctx.fillText(user.name || nombre, padX, 22);
    ctx.font = '13px ' + UI; ctx.fillStyle = SUB; datosLin.forEach((t, i) => ctx.fillText(t, padX, 44 + i * 18));
    ctx.textAlign = 'right';
    ctx.font = '700 14px ' + UI; ctx.fillStyle = TXT; ctx.fillText(user.name ? nombre : stamp, W - padX, 22);
    if (user.name) { ctx.font = '12px ' + UI; ctx.fillStyle = SUB; ctx.fillText(stamp, W - padX, 44); }
    ctx.textAlign = 'left';
    ctx.fillStyle = TXT; ctx.fillRect(padX, headH - 10, W - 2 * padX, 1);
    let y = headH + gap;
    let xb = padX, wb = leftW;
    const section = (title) => {
      ctx.font = '700 11px ' + UI; ctx.fillStyle = SUB;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
      ctx.fillText(title.toUpperCase(), xb, y + secH / 2 + 2);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      y += secH;
    };
    const drawRows = (rows, x0, numbers) => {
      const h = blockH(rows.length);
      if (numbers) { ctx.fillStyle = HAIR; ctx.fillRect(xb + gutW - 6, y, 1, h); }
      else { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(xb, y, wb, h, 8) : ctx.rect(xb, y, wb, h); ctx.fillStyle = PANEL; ctx.fill(); }
      rows.forEach((row, i) => {
        const r = numbers ? row.r : row, yy = y + pad + i * lh + lh / 2;
        if (numbers) { ctx.font = (fs - 1) + 'px ' + MONO; ctx.fillStyle = GUT; ctx.textAlign = 'right'; ctx.fillText(String(row.n), xb + gutW - 14, yy); ctx.textAlign = 'left'; }
        let x = x0;
        r.forEach(([cls, text]) => {
          const bold = cls === 'in' || cls === 't' || cls === 'er';
          ctx.font = (bold ? '700 ' : cls === 'c' ? 'italic ' : '') + fs + 'px ' + MONO;
          ctx.fillStyle = (cls && COL[cls]) || TXT; ctx.fillText(text, x, yy);
          x += ctx.measureText(text).width;
        });
      });
      y += h;
    };
    const y0 = y;
    section('Código');
    drawRows(codeRows, xb + gutW, true);
    if (opts.lado) { y = y0; xb = padX + leftW + gapX; wb = rightW; } else y += gap;
    if (inRows.length) { section('Entrada'); drawRows(inRows, xb + 12, false); y += gap; }
    section('Salida');
    drawRows(outRows.length && (outRows.length > 1 || outRows[0].length) ? outRows : [[['dim', '(sin salida: ejecutá el programa antes de sacar la captura)']]], xb + 12, false);
    if (opts.lado) { y = y0 + bodyH; xb = padX; wb = leftW; }
    // pie: cómo se escribió (si se incluye) y la marca, en letra chica
    ctx.font = '12px ' + UI; ctx.fillStyle = SUB;
    ctx.textAlign = 'right'; ctx.font = '600 11px ' + UI; ctx.fillText('Editor C', W - padX, y + 12); ctx.textAlign = 'left';
    return cv;
  }
  // Vista previa antes de descargar: se puede incluir u omitir la entrada
  const dShot = $('dShot');
  let shotBlob = null, shotUrl = '', shotSeq = 0;
  function shotRender() {
    const seq = ++shotSeq;
    $('shotBox').classList.add('cargando');
    let cv;
    try { cv = makePng({ input: $('shotIn').checked, lado: $('shotLay').value === 'lado', nombre: nombreCaptura() }); } catch (e) { toast('No se pudo armar la imagen: ' + e.message); dShot.close(); return; }
    cv.toBlob((blob) => {
      if (seq !== shotSeq) return;
      if (!blob) { toast('No se pudo generar la imagen.'); dShot.close(); return; }
      const listo = (b) => {
        if (seq !== shotSeq) return;
        shotBlob = b; $('shotBox').classList.remove('cargando');
        if (shotUrl) URL.revokeObjectURL(shotUrl);
        shotUrl = URL.createObjectURL(b); $('shotImg').src = shotUrl;
        $('shotImg').dataset.w = cv.width; $('shotImg').dataset.h = cv.height;
      };
      listo(blob);
    }, 'image/png');
  }
  $('shot').addEventListener('click', () => {
    const hasIn = !!inTxt.value.trim();
    $('shotInRow').hidden = !hasIn; $('shotIn').checked = hasIn;
    const canShare = !!(coarse && typeof File === 'function' && navigator.canShare && navigator.canShare({ files: [new File([new Blob(['x'])], 'a.png', { type: 'image/png' })] }));
    $('shotShare').hidden = !canShare;
    $('shotName').value = (cur && cur.name) || '';
    $('shotLay').value = !coarse && window.innerWidth >= 1000 ? 'lado' : 'abajo';
    shotBlob = null; $('shotImg').removeAttribute('src');
    dShot.showModal(); $('shotBox').classList.add('cargando'); setTimeout(shotRender, 40);   // primero se ve el cuadro, después se arma la imagen
  });
  $('shotIn').addEventListener('change', shotRender);
  $('shotLay').addEventListener('change', shotRender);
  { let tN = 0; $('shotName').addEventListener('input', () => { clearTimeout(tN); tN = setTimeout(shotRender, 250); }); }
  dShot.addEventListener('close', () => { shotSeq++; shotBlob = null; if (shotUrl) { URL.revokeObjectURL(shotUrl); shotUrl = ''; } $('shotImg').removeAttribute('src'); });
  $('shotDl').addEventListener('click', () => {
    if (!shotBlob) { toast('La imagen todavía se está preparando.'); return; }
    const name = archivoCaptura() + '.png'; download(shotBlob, name); toast('Imagen descargada: ' + name); dShot.close();
  });
  $('shotShare').addEventListener('click', () => {
    if (!shotBlob) return;
    const name = archivoCaptura() + '.png', file = new File([shotBlob], name, { type: 'image/png' });
    navigator.share({ files: [file], title: name }).then(() => dShot.close(), (err) => { if (err && err.name !== 'AbortError') { download(shotBlob, name); toast('Imagen descargada.'); dShot.close(); } });
  });

  /* ---------- ejemplos ---------- */
  const dEj = $('dEj');
  let exTema = 'Todos';
  function pintarEjemplos() {
    const temas = []; EXAMPLES.forEach((e) => { if (temas.indexOf(e.g) < 0) temas.push(e.g); });
    const chips = $('exChips'); chips.textContent = '';
    ['Todos'].concat(temas).forEach((t) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chipbtn'; b.textContent = t; b.setAttribute('aria-pressed', t === exTema ? 'true' : 'false');
      b.addEventListener('click', () => { exTema = t; pintarEjemplos(); });
      chips.appendChild(b);
    });
    const lista = $('exList'); lista.textContent = '';
    temas.forEach((t) => {
      if (exTema !== 'Todos' && exTema !== t) return;
      const h = document.createElement('h3'); h.textContent = t; lista.appendChild(h);
      EXAMPLES.forEach((e, i) => {
        if (e.g !== t) return;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'exrow';
        const a = document.createElement('b'); a.textContent = e.t; const s = document.createElement('span'); s.textContent = e.d || '';
        b.appendChild(a); b.appendChild(s); b.addEventListener('click', () => abrirEjemplo(i)); lista.appendChild(b);
      });
    });
  }
  function abrirEjemplo(i) {
    const ex = EXAMPLES[i]; if (!ex) return;
    if (isPristine(ta.value)) { cur.name = nextName(ex.t); cur.code = ex.c; cur.input = ex.e || ''; cur.proc = undefined; showProgram(cur, 'c'); }
    else { newProgram(ex.t, ex.c, ex.e || ''); toast('Ejemplo abierto como programa nuevo; el anterior sigue en "Programas".'); }
    dEj.close();
  }
  $('exBtn').addEventListener('click', () => { $('more').open = matchMedia('(min-width: 900px)').matches; pintarEjemplos(); dEj.showModal(); });

  /* ---------- lista de programas ---------- */
  const dProgs = $('dProgs');
  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'recién'; if (m < 60) return 'hace ' + m + ' min';
    const h = Math.round(m / 60); if (h < 24) return 'hace ' + h + ' h';
    const d = Math.round(h / 24); return d === 1 ? 'ayer' : 'hace ' + d + ' días';
  }
  function renderProgs() {
    const ul2 = $('plist'); ul2.innerHTML = '';
    progs.slice().sort((a, b) => b.t - a.t).forEach((p) => {
      const li = document.createElement('li'); if (p === cur) li.className = 'cur';
      const ob = document.createElement('button'); ob.type = 'button'; ob.className = 'open';
      const nm = document.createElement('b'); nm.textContent = p.name;
      const sm = document.createElement('small'); sm.textContent = p.code.split('\n').length + ' líneas · ' + ago(p.t) + (p === cur ? ' · abierto' : '');
      ob.appendChild(nm); ob.appendChild(sm);
      ob.addEventListener('click', () => { if (p !== cur) { flushSave(); showProgram(p); } dProgs.close(); });
      const rn = document.createElement('button'); rn.type = 'button'; rn.className = 'btn mini ico'; rn.appendChild(ico('editar')); rn.title = 'Cambiar nombre'; rn.setAttribute('aria-label', 'Cambiar nombre de ' + p.name);
      rn.addEventListener('click', () => {
        const inp = document.createElement('input'); inp.value = p.name; inp.maxLength = 40; inp.setAttribute('aria-label', 'Nombre del programa');
        li.replaceChild(inp, ob); rn.hidden = true; inp.focus(); inp.select();
        let done = false;
        const commit = (ok) => {
          if (done) return; done = true;
          const v = inp.value.trim();
          if (ok && v && v !== p.name) { p.name = v; if (p === cur) { $('pnameTxt').textContent = v; $('pname').setAttribute('aria-label', 'Programa actual: ' + v + '. Abrir lista de programas'); } persist(); }
          renderProgs();
        };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(true); } else if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); commit(false); } });
        inp.addEventListener('blur', () => commit(true));
      });
      const del = document.createElement('button'); del.type = 'button'; del.className = 'btn mini ico'; del.appendChild(ico('borrar')); del.title = 'Borrar'; del.setAttribute('aria-label', 'Borrar ' + p.name);
      del.addEventListener('click', () => {
        const idx = progs.indexOf(p); if (p === cur) flushSave();
        progs.splice(idx, 1);
        if (p === cur) { if (progs.length) showProgram(progs.slice().sort((a, b) => b.t - a.t)[0]); else newProgram(); }
        persist(); renderProgs();
        toast('Programa borrado.', 'Deshacer', () => { progs.splice(Math.min(idx, progs.length), 0, p); persist(); if (dProgs.open) renderProgs(); });
      });
      li.appendChild(ob); li.appendChild(rn); li.appendChild(del); ul2.appendChild(li);
    });
  }
  function openProgs() { flushSave(); renderProgs(); dProgs.showModal(); }
  $('progs').addEventListener('click', openProgs);
  $('pname').addEventListener('click', openProgs);
  $('pnew').addEventListener('click', () => { newProgram(); dProgs.close(); if (!coarse) { const p = ta.value.indexOf('{\n') + 6; ta.focus(); ta.setSelectionRange(p, p); } });

  /* ---------- ajustes, tema, letra ---------- */
  document.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('[data-close]')) { d.close(); return; }
      if (e.target === d) { const r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); }
    });
    d.addEventListener('close', () => { $('more').open = matchMedia('(min-width: 900px)').matches; });
  });
  $('settings').addEventListener('click', () => {
    $('uName').value = user.name; $('uDni').value = user.dni; $('uCurso').value = user.curso; $('uMat').value = user.mat; $('uCiclo').value = user.ciclo;
    segSet($('theme'), store.get('theme', 'auto')); sincronizarAjustesNuevos(); $('dSet').showModal();
  });
  let lastHeader = headerText();
  [['uName', 'name'], ['uDni', 'dni'], ['uCurso', 'curso'], ['uMat', 'mat'], ['uCiclo', 'ciclo']].forEach(([id, key]) => {
    $(id).addEventListener('input', () => {
      user[key] = $(id).value.trim(); store.set('user', JSON.stringify(user));
      const nh = headerText();
      if (nh !== lastHeader && ta.value.startsWith(lastHeader)) { const p = ta.selectionStart; auto(() => { ta.value = nh + ta.value.slice(lastHeader.length); }); ta.setSelectionRange(Math.max(p + nh.length - lastHeader.length, 0), Math.max(p + nh.length - lastHeader.length, 0)); refresh(); scheduleSave(); }
      lastHeader = nh;
    });
  });
  $('helpBtn').addEventListener('click', () => { $('dSet').close(); $('dlg').showModal(); });
  // color de la barra del sistema (<meta name="theme-color">): con tema automático siguen las dos metas con media; con uno elegido, ambas toman su color
  const TEMA_BARRA = { light: '#f2f2f4', dark: '#141517' };
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      if (m.dataset.auto === undefined) m.dataset.auto = m.getAttribute('content');
      m.setAttribute('content', TEMA_BARRA[t] || m.dataset.auto);
    });
  }
  segInit($('theme'), (v) => { store.set('theme', v); applyTheme(v); });
  applyTheme(store.get('theme', 'auto'));
  let fs = parseInt(store.get('fs', '15'), 10) || 15;
  function setFs(n) { fs = Math.max(11, Math.min(26, n)); document.documentElement.style.setProperty('--fs', fs + 'px'); $('fsv').textContent = fs + ' px'; store.set('fs', String(fs)); refresh(); }
  $('fsp').addEventListener('click', () => setFs(fs + 1));
  $('fsm').addEventListener('click', () => setFs(fs - 1));
  setFs(fs);

  const more = $('more');
  if (window.matchMedia) {
    const mq = window.matchMedia('(min-width: 900px)');
    const sync = () => { more.open = mq.matches; };
    sync(); (mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync));
    document.addEventListener('click', (e) => { if (!mq.matches && more.open && !more.contains(e.target)) more.open = false; });
    $('more').querySelector('.menu').addEventListener('click', (e) => { if (!mq.matches && e.target.closest('button')) more.open = false; });
  } else more.open = true;

  /* ---------- atajos globales ---------- */
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if ((mod && e.key === 'Enter') || e.key === 'F5') { e.preventDefault(); run(); return; }
    const inEditor = document.activeElement === ta || $('find').contains(document.activeElement);
    if (mod && !e.shiftKey && !e.altKey && inEditor) {
      if (k === 'f') { e.preventDefault(); findOpen(false); }
      else if (k === 'h') { e.preventDefault(); findOpen(true); }
      else if (k === 's') { e.preventDefault(); save(); }
    }
  });

  /* ---------- pasar un programa a otro dispositivo por enlace: los datos van en la parte # y no llegan a ningún servidor ---------- */
  const MAX_ENLACE = 8000;
  const b64u = (u8) => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = (t) => { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; const b = atob(t), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  async function empaquetar(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'function') { try { return 'z.' + b64u(new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer())); } catch (e) { /* sin compresión */ } }
    return 'r.' + b64u(raw);
  }
  async function desempaquetar(s) {
    let u = unb64u(s.slice(2));
    if (s.slice(0, 2) === 'z.') u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else if (s.slice(0, 2) !== 'r.') throw new Error('formato');
    const o = JSON.parse(new TextDecoder().decode(u));
    if (!o || typeof o.c !== 'string' || o.c.length > MAX_ENLACE * 4) throw new Error('datos');
    return { name: String(o.n || 'Programa recibido').slice(0, 60), code: o.c, input: typeof o.i === 'string' ? o.i.slice(0, 2000) : '' };
  }
  $('enlace').addEventListener('click', async () => {
    $('more').open = false; flushSave();
    if (!/^https?:$/.test(location.protocol)) { toast('El enlace funciona desde la página publicada. Desde un archivo usá «Guardar .c».'); return; }
    if (cur.code.length > MAX_ENLACE) { toast('El programa es demasiado largo para un enlace. Usá «Guardar .c».'); return; }
    let url;
    try { url = location.origin + location.pathname + '#p=' + await empaquetar({ v: 1, n: cur.name, c: cur.code, i: cur.input || '' }); } catch (e) { toast('No se pudo armar el enlace.'); return; }
    $('enlUrl').value = url;
    $('enlTxt').textContent = 'Abrí este enlace en el otro dispositivo para traer «' + cur.name + '». Mandátelo a vos mismo, por ejemplo por WhatsApp.';
    $('enlShare').hidden = !navigator.share;
    $('dEnlace').showModal(); $('enlUrl').select();
  });
  $('enlCopy').addEventListener('click', () => {
    copyText($('enlUrl').value, $('dEnlace')).then((ok) => { if (ok) toast('Enlace copiado.'); else { $('enlUrl').focus(); $('enlUrl').select(); toast('Tocá el enlace, copialo a mano y pegalo donde quieras.'); } });
  });
  $('enlShare').addEventListener('click', () => { navigator.share({ title: 'Programa de Editor C', url: $('enlUrl').value }).catch(() => {}); });
  let recibido = null;
  async function recibirEnlace() {
    const m = /^#p=([zr]\.[A-Za-z0-9_-]+)$/.exec(location.hash);
    if (!m) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* nada */ }
    try {
      recibido = await desempaquetar(m[1]);
      const lineas = recibido.code.split('\n').length;
      $('recTxt').textContent = '«' + recibido.name + '» (' + lineas + (lineas === 1 ? ' línea' : ' líneas') + '). Revisá que lo esperabas antes de abrirlo.';
      $('recPrev').textContent = recibido.code.split('\n').slice(0, 15).join('\n') + (lineas > 15 ? '\n…' : '');
      $('dRecibido').showModal();
    } catch (e) { toast('El enlace del programa no se pudo leer. Pedí que te lo manden de nuevo.'); }
  }
  $('recOk').addEventListener('click', () => { if (!recibido) return; newProgram(recibido.name, recibido.code, recibido.input); recibido = null; $('dRecibido').close(); toast('Programa abierto.'); });

  /* ---------- exportar e importar todos los programas (.json) ---------- */
  const EXP_APP = 'editor-c', MAX_PROGS = 1000, MAX_CODE = 1000000, MAX_FILE = 25e6;
  $('pexp').addEventListener('click', () => {
    flushSave();
    const d = new Date(), stamp = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
    const data = { app: EXP_APP, version: 1, exported: d.toISOString(), programs: progs.map((p) => ({ name: p.name, code: p.code, input: p.input || '', t: p.t })) };
    download(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), 'editor-c-programas-' + stamp + '.json');
    toast('Se exportaron ' + progs.length + (progs.length === 1 ? ' programa.' : ' programas.'));
  });
  $('pimp').addEventListener('click', () => $('fileJson').click());
  function parseImport(txt) {
    let d; try { d = JSON.parse(txt); } catch (e) { return { error: 'El archivo no es un JSON válido.' }; }
    if (!d || typeof d !== 'object' || d.app !== EXP_APP) return { error: 'Este archivo no es una exportación de Editor C.' };
    if (d.version !== 1) return { error: 'Es de una versión de exportación que este editor no conoce.' };
    if (!Array.isArray(d.programs)) return { error: 'El archivo no trae la lista de programas.' };
    if (d.programs.length > MAX_PROGS) return { error: 'El archivo trae demasiados programas (más de ' + MAX_PROGS + ').' };
    const list = []; let invalid = 0;
    d.programs.forEach((p) => {
      if (!p || typeof p !== 'object' || typeof p.code !== 'string' || p.code.length > MAX_CODE || typeof p.name !== 'string') { invalid++; return; }
      const name = p.name.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 60);
      if (!name) { invalid++; return; }
      list.push({ name, code: p.code.replace(/\r\n?/g, '\n'), input: typeof p.input === 'string' && p.input.length <= MAX_CODE ? p.input : '', t: typeof p.t === 'number' && isFinite(p.t) ? p.t : Date.now() });
    });
    if (!list.length) return { error: invalid ? 'Ningún programa del archivo es válido.' : 'El archivo no trae programas.' };
    return { list, invalid };
  }
  // simula (o aplica) la importación sin pisar nada: repetidos se omiten, mismo nombre con otro contenido se agrega con otro nombre
  function planImport(list, commit) {
    const sim = progs.map((p) => ({ name: p.name, code: p.code }));
    const res = { add: 0, dup: 0, renamed: 0 };
    const nm = (base) => { const names = new Set(sim.map((x) => x.name)); if (!names.has(base)) return base; for (let i = 2; ; i++) if (!names.has(base + ' ' + i)) return base + ' ' + i; };
    list.forEach((p) => {
      if (sim.some((x) => x.name === p.name && x.code === p.code)) { res.dup++; return; }
      let name = p.name;
      if (sim.some((x) => x.name === name)) { name = nm(p.name + ' (importado)'); res.renamed++; } else res.add++;
      sim.push({ name, code: p.code });
      if (commit) {
        let pr; try { pr = window.Proceso ? Proceso.nuevo(p.code, 'c').serializar() : undefined; } catch (e) { pr = undefined; }
        progs.push({ id: uid(), name, code: p.code, input: p.input, t: p.t, proc: pr });
      }
    });
    return res;
  }
  let impPending = null;
  $('fileJson').addEventListener('change', (e) => {
    const inp = e.target, f = inp.files[0]; if (!f) return;   // el campo se vacía recién después de leer: en algunos celulares vaciarlo antes deja el archivo sin poder leerse
    if (f.size > MAX_FILE) { toast('El archivo es demasiado grande para ser una exportación de Editor C.'); return; }
    const r = new FileReader();
    r.onerror = () => toast('No se pudo leer el archivo.');
    r.onloadend = () => { try { inp.value = ''; } catch (err) { /* nada */ } };
    r.onload = () => {
      const pr = parseImport(String(r.result).replace(/^\uFEFF/, ''));
      if (pr.error) { toast('No se importó nada. ' + pr.error); return; }
      const plan = planImport(pr.list, false);
      impPending = pr.list;
      $('impTxt').textContent = 'El archivo "' + f.name.slice(0, 60) + '" trae ' + pr.list.length + (pr.list.length === 1 ? ' programa.' : ' programas.');
      const ul2 = $('impList'); ul2.innerHTML = '';
      const li = (t) => { const x = document.createElement('li'); x.textContent = t; ul2.appendChild(x); };
      if (plan.add) li(plan.add + (plan.add === 1 ? ' programa nuevo se agrega.' : ' programas nuevos se agregan.'));
      if (plan.renamed) li(plan.renamed + (plan.renamed === 1 ? ' tiene el mismo nombre que uno tuyo pero otro contenido: se agrega con otro nombre ("… (importado)").' : ' tienen el mismo nombre que otros tuyos pero distinto contenido: se agregan con otro nombre ("… (importado)").'));
      if (plan.dup) li(plan.dup + (plan.dup === 1 ? ' ya lo tenés igual: se omite.' : ' ya los tenés iguales: se omiten.'));
      if (pr.invalid) li(pr.invalid + (pr.invalid === 1 ? ' entrada inválida se ignora.' : ' entradas inválidas se ignoran.'));
      $('impOk').hidden = !(plan.add + plan.renamed);
      if ($('impOk').hidden) $('impTxt').textContent += ' No hay nada para agregar.';
      $('dImp').showModal();
    };
    r.readAsText(f);
  });
  $('impOk').addEventListener('click', () => {
    if (!impPending) return;
    flushSave();
    const plan = planImport(impPending, true); impPending = null;
    persist(); if (dProgs.open) renderProgs();
    $('dImp').close();
    const n = plan.add + plan.renamed;
    toast('Se importaron ' + n + (n === 1 ? ' programa.' : ' programas.') + (plan.dup ? ' (' + plan.dup + ' repetidos omitidos)' : ''));
  });

  /* ---------- diseño: pestañas (celular), divisor arrastrable y teclado virtual ---------- */
  const mq = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {}, addListener() {} });
  const tabMQ = mq('(max-width: 699px), (max-height: 480px)'), rowMQ = mq('(min-width: 900px)');
  const onMQ = (m, f) => (m.addEventListener ? m.addEventListener('change', f) : m.addListener(f));
  function tabMode() { return tabMQ.matches; }
  let tab = 'ed', edHadFocus = false;
  // se recuerda si el foco estaba en el editor aunque el toque en la pestaña lo haya movido al botón
  ta.addEventListener('focus', () => { edHadFocus = true; });
  ta.addEventListener('blur', (e) => { if (!(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('#tabs'))) edHadFocus = false; });
  function setTab(t, quiet) {
    const prev = tab;
    tab = t;
    $('paneEd').classList.toggle('on', t === 'ed'); $('paneCo').classList.toggle('on', t === 'co');
    [['tabEd', 'ed'], ['tabCo', 'co']].forEach(([id, k]) => { $(id).setAttribute('aria-selected', String(t === k)); $(id).tabIndex = t === k ? 0 : -1; });
    if (t === 'co') $('tabDot').hidden = true;
    if (quiet || !tabMode() || prev === t) return;
    if (t === 'co') { const i = out.querySelector('.stdin input'); if (i) { i.focus({ preventScroll: true }); ensureInputVisible(); } }
    else if (edHadFocus) ta.focus({ preventScroll: true });
  }
  $('tabEd').addEventListener('click', () => setTab('ed'));
  $('tabCo').addEventListener('click', () => setTab('co'));
  $('tabs').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); const t = e.key === 'ArrowLeft' || e.key === 'Home' ? 'ed' : 'co'; setTab(t); $(t === 'ed' ? 'tabEd' : 'tabCo').focus();
    }
  });
  onMQ(tabMQ, () => setTab(tab, true));

  const split = $('split'), divider = $('divider'), DEF_SPLIT = 55;
  let pct = DEF_SPLIT, dragging = false;
  const splitKey = () => (rowMQ.matches ? 'split.row' : 'split.col');
  const clampPct = (p) => Math.max(20, Math.min(80, Math.round(p * 10) / 10));
  function applySplit() {
    const row = rowMQ.matches, r = Math.round(pct);
    split.style.setProperty('--split', String(pct));
    divider.setAttribute('aria-valuenow', String(r));
    divider.setAttribute('aria-valuetext', 'Editor ' + r + ' %, consola ' + (100 - r) + ' %');
    divider.setAttribute('aria-orientation', row ? 'vertical' : 'horizontal');
  }
  function setPct(p, save) { pct = clampPct(p); applySplit(); if (save) store.set(splitKey(), String(pct)); }
  function loadSplit() { const v = parseFloat(store.get(splitKey(), '')); pct = isFinite(v) ? clampPct(v) : DEF_SPLIT; applySplit(); }
  onMQ(rowMQ, loadSplit);
  divider.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    e.preventDefault(); dragging = true; split.classList.add('dragging');
    try { divider.setPointerCapture(e.pointerId); } catch (x) { /* sin captura */ }
    divider.dataset.pointer = '1'; divider.focus({ preventScroll: true });
  });
  divider.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const row = rowMQ.matches, r = split.getBoundingClientRect(), cs = getComputedStyle(split);
    const a = parseFloat(row ? cs.paddingLeft : cs.paddingTop) || 0, b = parseFloat(row ? cs.paddingRight : cs.paddingBottom) || 0;
    const size = (row ? r.width : r.height) - a - b - 10;
    if (size <= 0) return;
    setPct(((row ? e.clientX - r.left : e.clientY - r.top) - a - 5) / size * 100, false);
  });
  const endDrag = () => { if (!dragging) return; dragging = false; split.classList.remove('dragging'); store.set(splitKey(), String(pct)); };
  divider.addEventListener('pointerup', endDrag); divider.addEventListener('pointercancel', endDrag); divider.addEventListener('lostpointercapture', endDrag);
  divider.addEventListener('keydown', (e) => {
    delete divider.dataset.pointer;
    const step = e.shiftKey ? 10 : 2; let n = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = pct - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = pct + step;
    else if (e.key === 'Home') n = 20; else if (e.key === 'End') n = 80;
    else if (e.key === 'Enter') n = DEF_SPLIT;
    if (n === null) return;
    e.preventDefault(); setPct(n, true);
  });
  divider.addEventListener('dblclick', () => setPct(DEF_SPLIT, true));

  // Teclado virtual: el alto de la app sigue al área realmente visible (visualViewport) y la línea de entrada se mantiene a la vista
  const vv = window.visualViewport;
  let baseH = 0, baseW = 0;
  function ensureInputVisible() {
    const i = out.querySelector('.stdin input');
    if (!i) return;
    cons.scrollTop = cons.scrollHeight;
    try { i.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* sin scrollIntoView */ }
  }
  function onViewport() {
    const h = vv ? vv.height : window.innerHeight, w = vv ? vv.width : window.innerWidth, top = vv ? vv.offsetTop : 0;
    if (vv && vv.scale > 1.01) return;                   // con zoom de pellizco no se toca el diseño
    if (Math.abs(w - baseW) > 40) baseH = 0;             // giro de pantalla: se vuelve a medir
    baseW = w; baseH = Math.max(baseH, h);
    const root = document.documentElement;
    root.style.setProperty('--app-h', Math.round(h) + 'px'); root.style.setProperty('--app-top', Math.round(top) + 'px');
    root.classList.add('vv');
    root.classList.toggle('kb', h < baseH - 120);
    if (top) window.scrollTo(0, 0);
    requestAnimationFrame(ensureInputVisible);
  }
  if (vv) { vv.addEventListener('resize', onViewport); vv.addEventListener('scroll', onViewport); }
  else window.addEventListener('resize', onViewport);
  window.addEventListener('orientationchange', () => { baseH = 0; setTimeout(onViewport, 250); });
  onViewport();
  loadSplit(); setTab('ed', true); updateMutedRow();

  /* ---------- sin conexión (solo http/https; con file:// y en el archivo único no se registra nada) ---------- */
  (function () {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) || !document.querySelector('link[rel="manifest"]')) return;
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    const offer = (sw) => toast('Hay una versión nueva del editor.', 'Recargar', () => { flushSave(); sw.postMessage({ type: 'SKIP_WAITING' }); }, true);
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloading) return; reloading = true; flushSave(); location.reload(); });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) offer(nw);
          else if (nw.state === 'activated' && !hadController && !store.get('offlineSeen', '')) { store.set('offlineSeen', '1'); toast('Listo: el editor ya funciona sin conexión.'); }
        });
      });
      const check = () => { try { reg.update().catch(() => {}); } catch (e) { /* sin red */ } };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      setInterval(check, 3600000);
    }).catch(() => { /* sin service worker: todo sigue funcionando en línea */ });
  })();

  /* ---------- arranque ---------- */
  (function init() {
    const id = store.get('cur', '');
    let p = progs.find((x) => x.id === id) || progs.slice().sort((a, b) => b.t - a.t)[0];
    if (!p) {
      const old = store.get('code', '');           // versión anterior: un solo programa
      p = { id: uid(), name: 'Programa 1', code: old && old.trim() ? old : template(), input: '', t: Date.now() };
      progs.push(p);
      showProgram(p, old && old.trim() ? 'u' : 'a');
    } else showProgram(p);
    if (!store.get('seen', '')) { store.set('seen', '1'); }
  })();
  recibirEnlace();
  window.__editorc = { run, cfg, proceso: () => proc.resumen(), procLinea: () => proc.linea(), nivelAyuda: () => nivelAyuda, setNivel: (n) => { nivelAyuda = +n === 2 ? 2 : 1; store.set('ayuda', String(nivelAyuda)); segSet($('ayudaSel'), String(nivelAyuda)); $('ayudaDesc').textContent = NIVELES_TXT[nivelAyuda]; }, setCode: (s) => { ta.value = s; proc.marcarCargado(s, 'c'); refresh(); scheduleSave(); }, compile: (s) => CCompiler.compile(s), showDiag: (r) => { lastRes = r; showDiag(r); } };
})();

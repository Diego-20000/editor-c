(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const ta = $('code'), hl = $('hl'), ul = $('ul'), fm = $('fm'), gut = $('gut'), out = $('out'), cons = $('console'),
    diag = $('diag'), diagList = $('diagList'), statusEl = $('status'), runBtn = $('run'), stopBtn = $('stop'), exSel = $('examples'),
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
  let user = Object.assign({ name: '', curso: '', mat: '', ciclo: '' }, store.json('user', {}));
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
    persist();
  }
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
  window.addEventListener('beforeunload', flushSave);

  function showProgram(p) {
    cur = p;
    stopRun(true);
    ta.value = p.code; inTxt.value = p.input || '';
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
    progs.push(p); showProgram(p);
    return p;
  }
  function isPristine(code) { return !code.trim() || EXAMPLES.some((x) => x.c === code) || code === template(); }

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
    gut.scrollTop = ta.scrollTop;
  }
  function refresh() {
    hl.innerHTML = highlight(ta.value) + '\n';
    renderGutter(false);
    paintProblems();
    syncScroll();
  }
  function syncScroll() { layers.forEach((l) => { l.scrollTop = ta.scrollTop; l.scrollLeft = ta.scrollLeft; }); gut.scrollTop = ta.scrollTop; }
  ta.addEventListener('scroll', syncScroll);
  ta.addEventListener('input', () => {
    if (problems.length && ta.value.split('\n').length !== problemLines) clearProblems();
    refresh(); scheduleSave();
    if (fbar.open) updateFind(false);
    updatePos();
  });

  function insert(text) {
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
    try { ta.focus({ preventScroll: true }); ta.setSelectionRange(s, e); insert(text); } finally { guard = false; }
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
    guard = true; try { ta.setSelectionRange(a, bb); insert(text); ta.setSelectionRange(a, a + text.length); } finally { guard = false; }
  }

  let guard = false;
  const OPEN = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
  const CLOSE = new Set([')', ']', '}', '"', "'"]);
  ta.addEventListener('beforeinput', (e) => {
    if (guard || e.isComposing) return;
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (e.inputType === 'insertText' && e.data && e.data.length === 1) {
      const ch = e.data, nx = v[en], pv = v[s - 1];
      if (CLOSE.has(ch) && s === en && nx === ch) { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
      const close = OPEN[ch];
      if (!close) return;
      if (s !== en) { e.preventDefault(); guard = true; try { insert(ch + v.slice(s, en) + close); ta.setSelectionRange(s + 1, en + 1); } finally { guard = false; } return; }
      if (v.slice(lineStart(v, s), s).indexOf('//') >= 0) return;
      const quote = ch === '"' || ch === "'";
      if (quote && (/\w/.test(pv || '') || /\w/.test(nx || ''))) return;
      if (!quote && nx && !/[\s)\]};,]/.test(nx)) return;
      e.preventDefault(); guard = true; try { insert(ch + close); ta.setSelectionRange(s + 1, s + 1); } finally { guard = false; }
    } else if (e.inputType === 'deleteContentBackward' && s === en && s > 0 && OPEN[v[s - 1]] === v[s]) {
      e.preventDefault(); guard = true; try { ta.setSelectionRange(s - 1, s + 1); document.execCommand('delete'); } finally { guard = false; }
    }
  });

  ta.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    if (mod && (e.key === '/' || e.code === 'Slash' || (e.shiftKey && e.code === 'Digit7'))) { e.preventDefault(); toggleComment(); return; }
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (e.key === 'Tab') {
      e.preventDefault();
      if (s === en && !e.shiftKey) { insert('    '); return; }
      const a = lineStart(v, s);
      const b = en > s && v[en - 1] === '\n' ? en - 1 : en;
      const block = v.slice(a, b).split('\n');
      const nb = block.map((l) => e.shiftKey ? l.replace(/^( {1,4}|\t)/, '') : '    ' + l).join('\n');
      guard = true; try { ta.setSelectionRange(a, b); insert(nb); ta.setSelectionRange(a, a + nb.length); } finally { guard = false; }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !mod && !e.altKey) {
      e.preventDefault();
      const ls = lineStart(v, s);
      const ind = /^[ \t]*/.exec(v.slice(ls, s))[0];
      const before = v[s - 1], after = v[en];
      guard = true;
      try {
        if (before === '{' && after === '}') { insert('\n' + ind + '    \n' + ind); const p = s + 1 + ind.length + 4; ta.setSelectionRange(p, p); }
        else insert('\n' + ind + (before === '{' ? '    ' : ''));
      } finally { guard = false; }
      return;
    }
    if (e.key === '}' && !mod) {
      const ls = lineStart(v, s);
      if (s === en && /^ +$/.test(v.slice(ls, s)) && s - ls >= 4) { e.preventDefault(); guard = true; try { ta.setSelectionRange(s - 4, s); insert('}'); } finally { guard = false; } }
    }
  });

  function updatePos() {
    const v = ta.value, s = ta.selectionStart, ln = lineIndexAt(v, s);
    $('pos').textContent = 'Lín ' + (ln + 1) + ', Col ' + (s - lineStart(v, s) + 1);
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
    diag.hidden = true; diagList.innerHTML = '';
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
    (res.errors || []).forEach((e) => items.push({ k: 'e', line: e.line, msg: e.msg, code: typeof e.code === 'string' ? e.code : '' }));
    if (rtErr) items.push({ k: 'e', line: rtErr.line, msg: rtErr.msg, rt: true });
    (res.warnings || []).forEach((w) => {
      const code = typeof w.code === 'string' ? w.code : '';
      if (code && muted.indexOf(code) >= 0) { hidden++; return; }
      items.push({ k: 'w', line: w.line, msg: w.msg, code });
    });
    problems = items; problemLines = lines.length;
    marks = new Map();
    items.forEach((it) => { if (it.line && marks.get(it.line) !== 'e') marks.set(it.line, it.k); });
    renderGutter(true); paintProblems();
    diagList.innerHTML = '';
    items.forEach((it) => {
      const wrap = document.createElement('div'); wrap.className = 'it ' + it.k;
      const b = document.createElement('button'); b.type = 'button';
      const tag = document.createElement('span'); tag.className = 'tag';
      tag.textContent = (it.k === 'e' ? (it.rt ? 'Error al ejecutar' : 'Error') : 'Aviso') + (it.line ? ' · línea ' + it.line : '');
      const body = document.createElement('span'); body.className = 'body';
      const t = document.createElement('span'); t.textContent = it.msg; body.appendChild(t);
      if (it.line && lines[it.line - 1] !== undefined && lines[it.line - 1].trim()) { const c = document.createElement('code'); c.textContent = lines[it.line - 1].trim(); body.appendChild(c); }
      if (it.code) { const c = document.createElement('span'); c.className = 'cd'; c.textContent = it.code; body.appendChild(c); }
      b.appendChild(tag); b.appendChild(body);
      if (it.line) { b.title = 'Ir a la línea ' + it.line; b.addEventListener('click', () => goLine(it.line)); }
      wrap.appendChild(b);
      if (it.k === 'w' && it.code) {
        const m = document.createElement('button'); m.type = 'button'; m.className = 'btn mini mute'; m.textContent = 'Silenciar';
        m.title = 'No mostrar más avisos de tipo ' + it.code + ' (se guarda en este dispositivo)'; m.setAttribute('aria-label', 'Silenciar los avisos de tipo ' + it.code);
        m.addEventListener('click', () => { if (muted.indexOf(it.code) < 0) muted.push(it.code); saveMuted(); renderDiag(res, rtErr, true); toast('Aviso silenciado: ' + it.code + '.', 'Deshacer', () => { muted = muted.filter((x) => x !== it.code); saveMuted(); renderDiag(res, rtErr, true); }); });
        wrap.appendChild(m);
      }
      diagList.appendChild(wrap);
    });
    if (hidden && items.length) {
      const f = document.createElement('div'); f.className = 'dfoot';
      f.appendChild(document.createTextNode(hidden + (hidden === 1 ? ' aviso silenciado.' : ' avisos silenciados.') + ' '));
      const r = document.createElement('button'); r.type = 'button'; r.className = 'btn mini'; r.textContent = 'Mostrar de nuevo';
      r.addEventListener('click', () => { muted = []; saveMuted(); renderDiag(res, rtErr, true); });
      f.appendChild(r); diagList.appendChild(f);
    }
    const ne = items.filter((i) => i.k === 'e').length, nw = items.length - ne;
    $('diagTitle').textContent = 'Problemas' + (items.length ? ' · ' + (ne ? ne + (ne === 1 ? ' error' : ' errores') : '') + (ne && nw ? ', ' : '') + (nw ? nw + (nw === 1 ? ' aviso' : ' avisos') : '') : '');
    diag.hidden = !items.length;
    diagList.hidden = $('diagHead').getAttribute('aria-expanded') !== 'true';
    const first = items.find((i) => i.k === 'e' && i.line) || items.find((i) => i.line);
    if (first && !noScroll) scrollToPos(lineOffset(first.line), false);
  }
  function lineOffset(n) { const l = ta.value.split('\n'); let p = 0; for (let i = 0; i < n - 1 && i < l.length; i++) p += l[i].length + 1; return p; }

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
  function setStatus(txt, cls) { statusEl.textContent = txt; statusEl.className = 'chip' + (cls ? ' ' + cls : ''); }
  function clearConsole() { clearTimeout(outTimer); outTimer = null; outBuf = ''; out.textContent = ''; total = 0; }
  $('clear').addEventListener('click', () => { removeInput(); clearConsole(); if ((worker || main) && waiting) showInput(); });
  function copyText(s) {
    const fallback = () => {
      const t = document.createElement('textarea'); t.value = s; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
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
  function removeInput() { const w = out.querySelector('.stdin'); if (w) w.remove(); const b = out.querySelector('.eofbtn'); if (b) b.remove(); }
  function showInput() {
    flushOut(); removeInput(); waiting = true;
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
      if (e.key === 'Enter') { e.preventDefault(); const s = inp.value; removeInput(); waiting = false; appendText(s + '\n', 'in'); setStatus('Ejecutando…', 'run'); send({ type: 'line', s }); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); sendEOF(); }
    });
    fit(); setStatus('Esperando datos…', 'wait');
    inp.focus({ preventScroll: true });
    ensureInputVisible();
  }
  function sendEOF() { removeInput(); waiting = false; appendText('^D\n', 'dim'); setStatus('Ejecutando…', 'run'); send({ type: 'eof' }); }
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
      appendText('Error' + (r.line ? ' en la línea ' + r.line : '') + ': ' + r.error + '\n', 'er');
      showDiag(lastRes, { line: r.line, msg: r.error });
      setStatus('Error al ejecutar', 'err');
    } else {
      const c = r.code === undefined || r.code === null ? 0 : r.code;
      appendText('— Programa terminado · código de salida ' + c + ' —\n', c === 0 ? 'ok' : 'er');
      setStatus('Terminó (código ' + c + ')', c === 0 ? '' : 'err');
    }
  }
  function capped() {
    resetRun(); removeInput();
    if (!endsWithNewline()) appendText('\n');
    appendText('— Salida cortada: demasiado texto (¿bucle infinito?) —\n', 'er'); setStatus('Detenido', 'err');
  }
  // devuelve true si había errores (y ya los mostró)
  function reportCompile(res) {
    lastRes = res; showDiag(res);
    if (res.errors.length) {
      const n = res.errors.length;
      appendText('No se pudo ejecutar: ' + (n === 1 ? 'hay 1 error' : 'hay ' + n + ' errores') + ' (mirá "Problemas" y las líneas marcadas en rojo). Corregí y volvé a ejecutar.\n', 'er');
      setStatus(n === 1 ? '1 error' : n + ' errores', 'err');
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

  function run() {
    resetRun();
    removeInput(); clearConsole(); clearProblems();
    flushSave();
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
    r.onload = () => { newProgram(f.name.replace(/\.[^.]*$/, ''), String(r.result).replace(/\r\n?/g, '\n')); $('dProgs').close(); };
    r.readAsText(f); e.target.value = '';
  });

  /* ---------- captura PNG (código + entrada + salida) ---------- */
  function rowsOf(segs, cols) {
    const rows = []; let row = [], n = 0;
    const push = () => { rows.push(row); row = []; n = 0; };
    segs.forEach(([cls, text]) => {
      text.replace(/\t/g, '    ').split('\n').forEach((part, i) => {
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
    const COL = { k: '#cf222e', t: '#0550ae', s: '#0a7a3d', n: '#b35900', c: '#6b7587', f: '#8250df', p: '#8250df', in: '#0b5ed7', er: '#c62828', dim: '#566174', ok: '#0b7a4b' };
    const TXT = '#1b2230', MONO = '"Liberation Mono", Menlo, Consolas, ui-monospace, monospace', UI = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';
    const fs = 14, lh = 20, padX = 22, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    ctx.font = fs + 'px ' + MONO; const cw = ctx.measureText('M').width;
    const codeLines = ta.value.replace(/\n$/, '').split('\n');
    const longest = Math.max.apply(null, codeLines.map((l) => l.replace(/\t/g, '    ').length));
    const cols = Math.max(64, Math.min(110, longest + 1));
    const gutW = Math.max(3, String(codeLines.length).length + 1) * cw + 14;
    const W = Math.ceil(padX * 2 + gutW + cols * cw + 12);
    // código: filas con número
    const codeRows = []; let nline = 0;
    let curSegs = [];
    const lineSegs = []; // tokens separados por línea
    tokens(ta.value.replace(/\n$/, '')).forEach(([cls, text]) => {
      text.split('\n').forEach((part, i) => { if (i > 0) { lineSegs.push(curSegs); curSegs = []; } if (part) curSegs.push([cls, part]); });
    });
    lineSegs.push(curSegs);
    lineSegs.forEach((segs, i) => { rowsOf(segs, cols).forEach((r, j) => codeRows.push({ n: j === 0 ? i + 1 : '', r })); nline++; });
    // entrada y salida
    const outSegs = [];
    out.childNodes.forEach((n) => {
      if (n.nodeType === 3) outSegs.push([null, n.textContent]);
      else if (!(n.classList.contains('stdin') || n.classList.contains('eofbtn'))) outSegs.push([n.className, n.textContent]);
    });
    const outRows = rowsOf(outSegs, cols + 4);
    while (outRows.length > 1 && !outRows[outRows.length - 1].length) outRows.pop();
    const inRows = opts.input !== false && inTxt.value.trim() ? rowsOf([['in', inTxt.value.replace(/\n+$/, '')]], cols + 4) : [];
    const secH = 30, headH = 64, gap = 14;
    const H = headH + gap + secH + codeRows.length * lh + 16 + (inRows.length ? gap + secH + inRows.length * lh + 16 : 0) + gap + secH + Math.max(1, outRows.length) * lh + 16 + 14;
    let S = 2; while (W * S * H * S > 14e6 && S > 1) S -= 0.5;
    cv.width = Math.round(W * S); cv.height = Math.round(H * S); ctx.scale(S, S);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    // cabecera
    ctx.fillStyle = '#f1f4f8'; ctx.fillRect(0, 0, W, headH);
    ctx.fillStyle = '#d6dce6'; ctx.fillRect(0, headH - 1, W, 1);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TXT; ctx.font = '700 17px ' + UI;
    ctx.fillText(user.name || 'Editor C', padX, 22);
    ctx.font = '13px ' + UI; ctx.fillStyle = '#566174';
    ctx.fillText([user.curso, user.mat, user.ciclo && (/ciclo/i.test(user.ciclo) ? user.ciclo : 'Ciclo lectivo ' + user.ciclo)].filter(Boolean).join('  ·  ') || 'Captura del programa', padX, 44);
    const d = new Date(), stamp = pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    ctx.textAlign = 'right'; ctx.font = '600 13px ' + UI; ctx.fillStyle = TXT; ctx.fillText((cur ? cur.name : 'Programa') + '.c', W - padX, 22);
    ctx.font = '12px ' + UI; ctx.fillStyle = '#566174'; ctx.fillText(stamp, W - padX, 44); ctx.textAlign = 'left';
    let y = headH + gap;
    const section = (title, color) => {
      ctx.font = '700 12px ' + UI; ctx.fillStyle = color || '#566174';
      ctx.fillText(title.toUpperCase(), padX, y + secH / 2); y += secH;
    };
    const drawRows = (rows, x0, bg, numbers) => {
      const h = rows.length * lh + 16;
      ctx.fillStyle = bg; ctx.fillRect(padX - 8, y, W - 2 * padX + 16, h);
      ctx.strokeStyle = '#d6dce6'; ctx.lineWidth = 1; ctx.strokeRect(padX - 8 + .5, y + .5, W - 2 * padX + 16 - 1, h - 1);
      ctx.font = fs + 'px ' + MONO;
      rows.forEach((row, i) => {
        const r = numbers ? row.r : row, yy = y + 8 + i * lh + lh / 2;
        if (numbers) { ctx.fillStyle = '#8b95a7'; ctx.textAlign = 'right'; ctx.fillText(String(row.n), padX + gutW - 12, yy); ctx.textAlign = 'left'; }
        let x = x0;
        r.forEach(([cls, text]) => { ctx.fillStyle = (cls && COL[cls]) || TXT; ctx.fillText(text, x, yy); x += ctx.measureText(text).width; });
      });
      y += h;
    };
    section('Código');
    drawRows(codeRows, padX + gutW, '#fbfcfe', true);
    if (inRows.length) { y += gap; section('Datos de entrada'); drawRows(inRows, padX, '#f6f9ff', false); }
    y += gap; section('Salida');
    drawRows(outRows.length && (outRows.length > 1 || outRows[0].length) ? outRows : [[['dim', '(sin salida: ejecutá el programa antes de sacar la captura)']]], padX, '#fbfcfe', false);
    return cv;
  }
  // Vista previa antes de descargar: se puede incluir u omitir la entrada
  const dShot = $('dShot');
  let shotBlob = null, shotUrl = '', shotSeq = 0;
  function shotRender() {
    const seq = ++shotSeq;
    let cv;
    try { cv = makePng({ input: $('shotIn').checked }); } catch (e) { toast('No se pudo armar la imagen: ' + e.message); dShot.close(); return; }
    cv.toBlob((blob) => {
      if (seq !== shotSeq) return;
      if (!blob) { toast('No se pudo generar la imagen.'); dShot.close(); return; }
      shotBlob = blob;
      if (shotUrl) URL.revokeObjectURL(shotUrl);
      shotUrl = URL.createObjectURL(blob); $('shotImg').src = shotUrl;
      $('shotImg').dataset.w = cv.width; $('shotImg').dataset.h = cv.height;
    }, 'image/png');
  }
  $('shot').addEventListener('click', () => {
    const hasIn = !!inTxt.value.trim();
    $('shotInRow').hidden = !hasIn; $('shotIn').checked = hasIn;
    const canShare = !!(coarse && typeof File === 'function' && navigator.canShare && navigator.canShare({ files: [new File([new Blob(['x'])], 'a.png', { type: 'image/png' })] }));
    $('shotShare').hidden = !canShare;
    shotBlob = null; $('shotImg').removeAttribute('src');
    dShot.showModal(); shotRender();
  });
  $('shotIn').addEventListener('change', shotRender);
  dShot.addEventListener('close', () => { shotSeq++; shotBlob = null; if (shotUrl) { URL.revokeObjectURL(shotUrl); shotUrl = ''; } $('shotImg').removeAttribute('src'); });
  $('shotDl').addEventListener('click', () => {
    if (!shotBlob) { toast('La imagen todavía se está preparando.'); return; }
    const name = slug() + '.png'; download(shotBlob, name); toast('Imagen descargada: ' + name); dShot.close();
  });
  $('shotShare').addEventListener('click', () => {
    if (!shotBlob) return;
    const name = slug() + '.png', file = new File([shotBlob], name, { type: 'image/png' });
    navigator.share({ files: [file], title: name }).then(() => dShot.close(), (err) => { if (err && err.name !== 'AbortError') { download(shotBlob, name); toast('Imagen descargada.'); dShot.close(); } });
  });

  /* ---------- ejemplos ---------- */
  (function () {
    const groups = {};
    EXAMPLES.forEach((e, i) => {
      if (!groups[e.g]) { groups[e.g] = document.createElement('optgroup'); groups[e.g].label = e.g; exSel.appendChild(groups[e.g]); }
      const o = document.createElement('option'); o.value = String(i); o.textContent = e.t; groups[e.g].appendChild(o);
    });
  })();
  exSel.addEventListener('change', () => {
    const i = exSel.value; exSel.value = '';
    if (i === '') return;
    const ex = EXAMPLES[+i];
    if (isPristine(ta.value)) { cur.name = nextName(ex.t); cur.code = ex.c; cur.input = ''; showProgram(cur); }
    else { newProgram(ex.t, ex.c); toast('Ejemplo abierto como programa nuevo; el anterior sigue en "Programas".'); }
    $('more').open = matchMedia('(min-width: 900px)').matches;
  });

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
      const rn = document.createElement('button'); rn.type = 'button'; rn.className = 'btn mini ico'; rn.textContent = '✎'; rn.title = 'Cambiar nombre'; rn.setAttribute('aria-label', 'Cambiar nombre de ' + p.name);
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
      const del = document.createElement('button'); del.type = 'button'; del.className = 'btn mini ico'; del.textContent = '✕'; del.title = 'Borrar'; del.setAttribute('aria-label', 'Borrar ' + p.name);
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
    $('uName').value = user.name; $('uCurso').value = user.curso; $('uMat').value = user.mat; $('uCiclo').value = user.ciclo;
    $('theme').value = store.get('theme', 'auto'); $('dSet').showModal();
  });
  let lastHeader = headerText();
  [['uName', 'name'], ['uCurso', 'curso'], ['uMat', 'mat'], ['uCiclo', 'ciclo']].forEach(([id, key]) => {
    $(id).addEventListener('input', () => {
      user[key] = $(id).value.trim(); store.set('user', JSON.stringify(user));
      const nh = headerText();
      if (nh !== lastHeader && ta.value.startsWith(lastHeader)) { const p = ta.selectionStart; ta.value = nh + ta.value.slice(lastHeader.length); ta.setSelectionRange(Math.max(p + nh.length - lastHeader.length, 0), Math.max(p + nh.length - lastHeader.length, 0)); refresh(); scheduleSave(); }
      lastHeader = nh;
    });
  });
  $('helpBtn').addEventListener('click', () => { $('dSet').close(); $('dlg').showModal(); });
  function applyTheme(t) { if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
  $('theme').addEventListener('change', () => { store.set('theme', $('theme').value); applyTheme($('theme').value); });
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
      if (commit) progs.push({ id: uid(), name, code: p.code, input: p.input, t: p.t });
    });
    return res;
  }
  let impPending = null;
  $('fileJson').addEventListener('change', (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (f.size > MAX_FILE) { toast('El archivo es demasiado grande para ser una exportación de Editor C.'); return; }
    const r = new FileReader();
    r.onerror = () => toast('No se pudo leer el archivo.');
    r.onload = () => {
      const pr = parseImport(String(r.result));
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
    }
    showProgram(p);
    if (!store.get('seen', '')) { store.set('seen', '1'); }
  })();
  window.__editorc = { run, cfg, setCode: (s) => { ta.value = s; refresh(); scheduleSave(); }, compile: (s) => CCompiler.compile(s), showDiag: (r) => { lastRes = r; showDiag(r); } };
})();

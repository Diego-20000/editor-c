(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const ta = $('code'), hl = $('hl'), gut = $('gut'), out = $('out'), cons = $('console'), diag = $('diag'),
    statusEl = $('status'), runBtn = $('run'), stopBtn = $('stop'), exSel = $('examples');
  const store = {
    get(k, d) { try { const v = localStorage.getItem('editorc.' + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('editorc.' + k, v); } catch (e) { /* sin almacenamiento */ } }
  };

  /* ---------- ejemplos ---------- */
  const EXAMPLES = [
    ['Hola mundo', `#include <stdio.h>

int main() {
    printf("Hola, mundo!\\n");
    return 0;
}
`],
    ['Suma de dos números', `#include <stdio.h>

int main() {
    int A, B, SUMA;

    printf("Primer número: ");
    scanf("%d", &A);
    printf("Segundo número: ");
    scanf("%d", &B);

    SUMA = A + B;
    printf("%d + %d = %d\\n", A, B, SUMA);
    return 0;
}
`],
    ['Promedio de 3 notas (decimales)', `#include <stdio.h>

int main() {
    float N1, N2, N3, PROM;

    printf("Notas (separadas por Enter): ");
    scanf("%f", &N1);
    scanf("%f", &N2);
    scanf("%f", &N3);

    PROM = (N1 + N2 + N3) / 3;
    printf("El promedio es: %.2f\\n", PROM);
    return 0;
}
`],
    ['Mayor de tres (if / else)', `#include <stdio.h>

int main() {
    int A, B, C, MAYOR;

    printf("Tres números: ");
    scanf("%d %d %d", &A, &B, &C);

    MAYOR = A;
    if (B > MAYOR) { MAYOR = B; }
    if (C > MAYOR) { MAYOR = C; }

    printf("El mayor es %d\\n", MAYOR);
    return 0;
}
`],
    ['Tabla de multiplicar (for)', `#include <stdio.h>

int main() {
    int N, i;

    printf("Tabla del: ");
    scanf("%d", &N);

    for (i = 1; i <= 10; i++) {
        printf("%d x %d = %d\\n", N, i, N * i);
    }
    return 0;
}
`],
    ['Suma hasta ingresar 0 (while)', `#include <stdio.h>

main() {
    int V, SUMA, CANT;

    SUMA = 0; CANT = 0;
    printf("Valor (0 termina): ");
    scanf("%d", &V);
    while (V != 0) {
        SUMA = SUMA + V;
        CANT++;
        printf("Valor (0 termina): ");
        scanf("%d", &V);
    }
    printf("Se ingresaron %d valores, suma %d\\n", CANT, SUMA);
}
`],
    ['Factorial (función)', `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) { return 1; }
    return n * factorial(n - 1);
}

int main() {
    int N;
    printf("N: ");
    scanf("%d", &N);
    printf("%d! = %d\\n", N, factorial(N));
    return 0;
}
`]
  ];
  EXAMPLES.forEach((e, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = e[0]; exSel.appendChild(o); });

  /* ---------- resaltado ---------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const HL_RE = /(\/\*[\s\S]*?\*\/|\/\*[\s\S]*$|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"?)|('(?:\\.|[^'\\\n])*'?)|(^[ \t]*#[^\n]*)|(\b(?:int|float|double|char|void|long|short|unsigned|signed|const|static|bool)\b)|(\b(?:if|else|while|do|for|return|break|continue|switch|case|default|sizeof)\b)|(\b\d+\.?\d*(?:[eE][+-]?\d+)?[fFlLuU]*\b|\.\d+\b)|(\b[A-Za-z_]\w*(?=\s*\())/gm;
  const CLS = [null, 'c', 's', 's', 'p', 't', 'k', 'n', 'f'];
  function highlight(src) {
    let res = '', last = 0, m;
    HL_RE.lastIndex = 0;
    while ((m = HL_RE.exec(src))) {
      if (m[0] === '') { HL_RE.lastIndex++; continue; }
      res += esc(src.slice(last, m.index));
      let g = 1; while (g < 9 && m[g] === undefined) g++;
      res += '<span class="' + CLS[g] + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return res + esc(src.slice(last));
  }

  /* ---------- editor ---------- */
  let marks = new Map(); let lastLines = 0;
  function renderGutter(force) {
    const n = ta.value.split('\n').length;
    if (!force && n === lastLines && !gut.dataset.dirty) return;
    lastLines = n; delete gut.dataset.dirty;
    let h = '';
    for (let i = 1; i <= n; i++) { const m = marks.get(i); h += '<div' + (m ? ' class="' + m + '"' : '') + '>' + i + '</div>'; }
    gut.innerHTML = h;
    gut.scrollTop = ta.scrollTop;
  }
  function refresh() {
    hl.innerHTML = highlight(ta.value) + '\n';
    renderGutter(false);
    syncScroll();
  }
  function syncScroll() { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; gut.scrollTop = ta.scrollTop; }
  ta.addEventListener('scroll', syncScroll);
  ta.addEventListener('input', () => { clearMarks(); refresh(); store.set('code', ta.value); });

  function insert(text) {
    ta.focus();
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
    if (!ok) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.setRangeText(text, s, e, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  }
  function lineStart(v, pos) { return v.lastIndexOf('\n', pos - 1) + 1; }
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (e.key === 'Tab') {
      e.preventDefault();
      if (s === en && !e.shiftKey) { insert('    '); return; }
      // sangrar / quitar sangría en las líneas elegidas
      const a = lineStart(v, s);
      const b = en > s && v[en - 1] === '\n' ? en - 1 : en;
      const block = v.slice(a, b).split('\n');
      const nb = block.map((l) => e.shiftKey ? l.replace(/^( {1,4}|\t)/, '') : '    ' + l).join('\n');
      ta.setSelectionRange(a, b);
      insert(nb);
      ta.setSelectionRange(a, a + nb.length);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const ls = lineStart(v, s);
      const cur = v.slice(ls, s);
      const ind = /^[ \t]*/.exec(cur)[0];
      const before = v[s - 1], after = v[en];
      if (before === '{' && after === '}') { insert('\n' + ind + '    \n' + ind); const p = s + 1 + ind.length + 4; ta.setSelectionRange(p, p); return; }
      insert('\n' + ind + (before === '{' ? '    ' : ''));
      return;
    }
    if (e.key === '}' && !e.ctrlKey && !e.metaKey) {
      const ls = lineStart(v, s);
      if (s === en && /^ +$/.test(v.slice(ls, s)) && s - ls >= 4) { e.preventDefault(); ta.setSelectionRange(s - 4, s); insert('}'); }
    }
  });

  /* ---------- marcas y diagnósticos ---------- */
  function clearMarks() { if (marks.size) { marks = new Map(); gut.dataset.dirty = '1'; renderGutter(true); } diag.hidden = true; diag.innerHTML = ''; }
  function goLine(n) {
    const lines = ta.value.split('\n');
    let pos = 0; for (let i = 0; i < n - 1 && i < lines.length; i++) pos += lines[i].length + 1;
    ta.focus(); ta.setSelectionRange(pos, pos + (lines[n - 1] || '').length);
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 22;
    ta.scrollTop = Math.max(0, (n - 3) * lh);
    syncScroll();
  }
  function showDiag(res, rtErr) {
    const items = [];
    res.errors.forEach((e) => items.push({ k: 'e', line: e.line, msg: e.msg }));
    if (rtErr) items.push({ k: 'e', line: rtErr.line, msg: rtErr.msg });
    res.warnings.forEach((w) => items.push({ k: 'w', line: w.line, msg: w.msg }));
    marks = new Map();
    items.forEach((it) => { if (it.line) { if (marks.get(it.line) !== 'e') marks.set(it.line, it.k); } });
    gut.dataset.dirty = '1'; renderGutter(true);
    diag.innerHTML = '';
    items.forEach((it) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = it.k;
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = (it.k === 'e' ? 'Error' : 'Aviso') + (it.line ? ' · línea ' + it.line : '');
      const t = document.createElement('span'); t.textContent = it.msg;
      b.appendChild(tag); b.appendChild(t);
      if (it.line) b.addEventListener('click', () => goLine(it.line));
      const wrap = document.createElement('div'); wrap.className = it.k; wrap.appendChild(b); diag.appendChild(wrap);
    });
    diag.hidden = !items.length;
  }

  /* ---------- consola ---------- */
  let total = 0; const CAP = 400000;
  function appendText(text, cls) {
    if (!text) return;
    total += text.length;
    const last = out.lastChild;
    if (!cls) {
      if (last && last.nodeType === 3) { last.appendData(text); }
      else out.appendChild(document.createTextNode(text));
    } else {
      const sp = document.createElement('span'); sp.className = cls; sp.textContent = text; out.appendChild(sp);
    }
    cons.scrollTop = cons.scrollHeight;
  }
  function endsWithNewline() { return !out.textContent || out.textContent.endsWith('\n'); }
  function setStatus(txt, cls) { statusEl.textContent = txt; statusEl.className = 'chip' + (cls ? ' ' + cls : ''); }
  function clearConsole() { out.textContent = ''; total = 0; }
  $('clear').addEventListener('click', () => { removeInput(); clearConsole(); if ((worker || main) && waiting) showInput(); });

  let worker = null, waiting = false;
  function removeInput() { const w = out.querySelector('.stdin'); if (w) w.remove(); const b = out.querySelector('.eofbtn'); if (b) b.remove(); }
  function showInput() {
    removeInput(); waiting = true;
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
    cons.scrollTop = cons.scrollHeight;
    inp.focus({ preventScroll: true });
  }
  function sendEOF() { removeInput(); waiting = false; appendText('^D\n', 'dim'); setStatus('Ejecutando…', 'run'); send({ type: 'eof' }); }
  cons.addEventListener('click', (e) => { const i = out.querySelector('.stdin input'); if (i && !window.getSelection().toString()) i.focus({ preventScroll: true }); });

  const BOOT = `
let pend = '', resolver = null;
function flush() { if (pend) { self.postMessage({ type: 'out', s: pend }); pend = ''; } }
self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.type === 'run') {
    const io = {
      write(s) { pend += s; if (pend.length > 2048) flush(); },
      readLine() { flush(); self.postMessage({ type: 'need' }); return new Promise((r) => { resolver = r; }); }
    };
    const res = await CRT.runProgram(m.js, io);
    flush(); self.postMessage({ type: 'done', res });
  } else if (m.type === 'line') { if (resolver) { const r = resolver; resolver = null; r(m.s); } }
  else if (m.type === 'eof') { if (resolver) { const r = resolver; resolver = null; r(null); } }
};
self.postMessage({ type: 'ready' });`;
  let blobUrl = null;
  function makeWorker() {
    if (!blobUrl) blobUrl = URL.createObjectURL(new Blob([RT_SRC + '\n' + BOOT], { type: 'text/javascript' }));
    return new Worker(blobUrl);
  }
  let workerBroken = false;   // si el navegador no deja usar Workers, se ejecuta en la página
  let main = null;            // ejecución en la página: { cancel, send }
  function resetRun() { if (worker) { worker.terminate(); worker = null; } if (main) { main.cancel(); main = null; } waiting = false; runBtn.disabled = false; stopBtn.disabled = true; }
  function stopWorker() { resetRun(); }
  function stop() {
    if (!worker && !main) return;
    const wasMain = !!main;
    if (wasMain) { main.cancel(); return; }   // el aviso de "Detenido" lo pone el final de la ejecución
    resetRun(); removeInput();
    if (!endsWithNewline()) appendText('\n');
    appendText('— Detenido —\n', 'dim'); setStatus('Detenido');
  }
  stopBtn.addEventListener('click', stop);
  function send(msg) { if (main) { if (msg.type === 'line') main.send(msg.s); else main.send(null); } else if (worker) worker.postMessage(msg); }

  let lastRes = null;
  function finish(r) {
    resetRun(); removeInput();
    if (!endsWithNewline()) appendText('\n');
    if (r.stopped) { appendText('— Detenido —\n', 'dim'); setStatus('Detenido'); return; }
    if (r.error) {
      appendText('Error' + (r.line ? ' en la línea ' + r.line : '') + ': ' + r.error + '\n', 'er');
      showDiag(lastRes, { line: r.line, msg: r.error });
      setStatus('Error al ejecutar', 'err');
    } else { appendText('— Programa terminado (código ' + r.code + ') —\n', 'dim'); setStatus('Terminó'); }
  }

  // Ejecución dentro de la página (cuando el navegador no permite Workers): los lazos ceden el control cada tanto
  function runInPage(src) {
    let res;
    try { res = CCompiler.compile(src, { yieldLoops: true }); } catch (e) { res = { js: null }; }
    if (!res.js || typeof CRT === 'undefined') { appendText('No se pudo iniciar la ejecución en este navegador.\n', 'er'); setStatus('Error', 'err'); return; }
    let cancelled = false, resolver = null;
    const me = {
      cancel() { cancelled = true; if (resolver) { const r = resolver; resolver = null; r(null); } },
      send(line) { if (resolver) { const r = resolver; resolver = null; r(line); } }
    };
    main = me;
    runBtn.disabled = true; stopBtn.disabled = false; setStatus('Ejecutando…', 'run');
    let pend = '', size = 0;
    const flush = () => { if (pend) { const t = pend; pend = ''; appendText(t); } };
    const io = {
      cancelled: () => { flush(); return cancelled; },
      write(s) {
        if (cancelled) return;
        pend += s; size += s.length;
        if (size > CAP) { cancelled = true; flush(); appendText('\n— Salida cortada: demasiado texto (¿bucle infinito?) —\n', 'er'); }
      },
      readLine() { flush(); showInput(); return new Promise((r) => { resolver = r; }); }
    };
    CRT.runProgram(res.js, io).then((r) => { flush(); if (main === me) finish(r); });
  }

  function run() {
    resetRun();
    removeInput(); clearConsole(); clearMarks();
    const src = ta.value;
    let res;
    try { res = CCompiler.compile(src); }
    catch (e) { res = { js: null, errors: [{ line: 0, msg: 'error interno del editor: ' + e.message }], warnings: [] }; }
    lastRes = res;
    showDiag(res);
    if (res.errors.length) {
      appendText('No se pudo ejecutar: ' + (res.errors.length === 1 ? 'hay 1 error' : 'hay ' + res.errors.length + ' errores') + '. Corregilos y volvé a ejecutar.\n', 'er');
      setStatus('Con errores', 'err');
      return;
    }
    if (workerBroken) { runInPage(src); return; }
    let w;
    try { w = makeWorker(); } catch (e) { workerBroken = true; runInPage(src); return; }
    worker = w;
    runBtn.disabled = true; stopBtn.disabled = false; setStatus('Ejecutando…', 'run');
    let ready = false;
    const giveUp = () => { if (ready || w !== worker) return; workerBroken = true; w.terminate(); worker = null; runInPage(src); };
    const timer = setTimeout(giveUp, 2500);
    w.onmessage = (ev) => {
      if (w !== worker) return;
      const m = ev.data;
      if (m.type === 'ready') { ready = true; clearTimeout(timer); w.postMessage({ type: 'run', js: res.js }); }
      else if (m.type === 'out') {
        appendText(m.s);
        if (total > CAP) { resetRun(); removeInput(); appendText('\n— Salida cortada: demasiado texto (¿bucle infinito?) —\n', 'er'); setStatus('Detenido', 'err'); }
      } else if (m.type === 'need') showInput();
      else if (m.type === 'done') finish(m.res);
    };
    w.onerror = (e) => {
      if (w !== worker) return;
      if (!ready) { clearTimeout(timer); giveUp(); return; }
      resetRun(); removeInput(); appendText('\nError interno: ' + (e.message || 'desconocido') + '\n', 'er'); setStatus('Error', 'err');
    };
  }
  runBtn.addEventListener('click', run);
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });

  /* ---------- archivos, ejemplos, tema, letra ---------- */
  function setCode(src) { ta.value = src; ta.scrollTop = 0; ta.scrollLeft = 0; clearMarks(); refresh(); store.set('code', src); }
  function save() {
    const blob = new Blob([ta.value], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'programa.c';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $('save').addEventListener('click', save);
  $('open').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setCode(String(r.result).replace(/\r\n?/g, '\n')); r.readAsText(f); e.target.value = '';
  });
  const isExample = (v) => EXAMPLES.some((x) => x[1] === v) || !v.trim();
  exSel.addEventListener('change', () => {
    const i = exSel.value; exSel.value = '';
    if (i === '') return;
    const prev = ta.value;
    setCode(EXAMPLES[+i][1]);
    if (!isExample(prev)) toast('Ejemplo cargado', 'Deshacer', () => setCode(prev));
  });
  let toastTimer = null;
  function toast(msg, label, fn) {
    let t = $('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg + ' ';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn mini'; b.textContent = label;
    b.addEventListener('click', () => { fn(); t.hidden = true; });
    t.appendChild(b); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 9000);
  }
  $('help').addEventListener('click', () => $('dlg').showModal());
  function setTheme(t) { document.documentElement.dataset.theme = t; store.set('theme', t); }
  $('theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  const sysDark = !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(store.get('theme', sysDark ? 'dark' : 'light'));
  let fs = parseInt(store.get('fs', '15'), 10) || 15;
  function setFs(n) { fs = Math.max(11, Math.min(26, n)); document.documentElement.style.setProperty('--fs', fs + 'px'); store.set('fs', String(fs)); refresh(); }
  $('fsp').addEventListener('click', () => setFs(fs + 1));
  $('fsm').addEventListener('click', () => setFs(fs - 1));
  setFs(fs);

  const more = $('more');
  if (window.matchMedia) {
    const mq = window.matchMedia('(min-width: 900px)');
    const sync = () => { more.open = mq.matches; };
    sync(); (mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync));
    document.addEventListener('click', (e) => { if (!mq.matches && more.open && !more.contains(e.target)) more.open = false; });
  } else more.open = true;

  ta.value = store.get('code', '') || EXAMPLES[2][1];
  refresh();
  window.__editorc = { run, setCode, compile: (s) => CCompiler.compile(s) };
})();

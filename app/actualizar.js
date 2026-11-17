'use strict';
// Actualización del editor al abrir la app: compara la versión publicada (hash en sw.js) con la instalada y,
// si es más nueva, baja los archivos públicos del editor a una carpeta nueva y la intercambia. Sin internet o
// ante cualquier falla se sigue con lo que ya hay. Nada del alumno sale de la computadora.
const fs = require('fs');
const path = require('path');

const URL_PUBLICADA = 'https://diego-20000.github.io/editor-c/';
const RE_VERSION = /const VERSION = '([0-9a-f]{12})'/;
const RE_FILES = /const FILES = (\[[^\]]*\])/;
const RE_NOMBRE = /^[A-Za-z0-9_][A-Za-z0-9_./-]{0,120}$/;

async function leer(url, max, fetchFn) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetchFn(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('http ' + r.status);
    const b = Buffer.from(await r.arrayBuffer());
    if (b.length > max) throw new Error('archivo demasiado grande');
    return b;
  } finally { clearTimeout(t); }
}

function versionLocal(dir) { try { return fs.readFileSync(path.join(dir, 'VERSION'), 'utf8').trim(); } catch (e) { return ''; } }
function versionDeSw(dir) { try { const m = RE_VERSION.exec(fs.readFileSync(path.join(dir, 'sw.js'), 'utf8')); return m ? m[1] : ''; } catch (e) { return ''; } }

// devuelve { version, cambio } o lanza un Error
async function actualizar(dirEditor, dirEmbebida, opts) {
  opts = opts || {};
  const base = (opts.base || URL_PUBLICADA).replace(/\/*$/, '/');
  const fetchFn = opts.fetch || fetch;
  if (!/^https:\/\//.test(base) && !/^http:\/\/127\.0\.0\.1[:/]/.test(base)) throw new Error('direccion no permitida');
  const sw = (await leer(base + 'sw.js', 1 << 20, fetchFn)).toString('utf8');
  const m = RE_VERSION.exec(sw), f = RE_FILES.exec(sw);
  if (!m || !f) throw new Error('sw.js sin version');
  const nueva = m[1];
  const actual = versionLocal(dirEditor) || versionDeSw(dirEmbebida);
  if (nueva === actual) return { version: nueva, cambio: false };
  let nombres;
  try { nombres = JSON.parse(f[1]).filter((n) => typeof n === 'string' && n !== './' && n !== 'sw.js'); } catch (e) { throw new Error('lista de archivos invalida'); }
  for (const n of nombres) if (!RE_NOMBRE.test(n) || n.includes('..')) throw new Error('nombre de archivo no permitido: ' + n);
  if (!nombres.length || nombres.length > 200) throw new Error('lista de archivos invalida');
  const tmp = dirEditor + '.nuevo', viejo = dirEditor + '.viejo';
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  try {
    let total = 0;
    for (const n of nombres) {
      const b = await leer(base + n, 8 << 20, fetchFn);
      total += b.length; if (total > 40 << 20) throw new Error('actualizacion demasiado grande');
      const dst = path.join(tmp, ...n.split('/'));
      fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, b);
    }
    if (!fs.existsSync(path.join(tmp, 'index.html'))) throw new Error('falta index.html');
    fs.writeFileSync(path.join(tmp, 'sw.js'), sw);   // el sw.js (con su versión) va también: la página lo usa para avisar y aplicar la nueva
    fs.writeFileSync(path.join(tmp, 'VERSION'), nueva + '\n');
  } catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); throw e; }
  fs.rmSync(viejo, { recursive: true, force: true });
  if (fs.existsSync(dirEditor)) fs.renameSync(dirEditor, viejo);
  try { fs.renameSync(tmp, dirEditor); } catch (e) { if (fs.existsSync(viejo)) fs.renameSync(viejo, dirEditor); throw e; }
  fs.rmSync(viejo, { recursive: true, force: true });
  return { version: nueva, cambio: true };
}

module.exports = { actualizar, versionLocal, versionDeSw, URL_PUBLICADA };

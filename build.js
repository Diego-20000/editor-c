// Genera el sitio a partir de src/. Uso: node build.js
//   index.html + assets/*   -> sitio (GitHub Pages desde la raíz, o doble clic en index.html)
//   manifest.webmanifest, sw.js, assets/icon-*.png -> app instalable y uso sin conexión (solo http/https)
//   dist/editor-c.html      -> un solo archivo para compartir sin internet (sin service worker)
// Sin dependencias: solo node.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const ROOT = __dirname;
const R = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
const OUT = {};   // archivo generado -> contenido (Buffer o texto), para calcular la versión
const W = (f, s) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), s); OUT[f] = s;
  console.log(f.padEnd(28), (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB');
};
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const json = (s) => JSON.stringify(s).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

// El compilador y el runtime también corren dentro de un Worker creado desde un Blob; como con file://
// no se puede leer un archivo con fetch, sus textos viajan como cadenas (CC_SRC y RT_SRC).
const compiler = R('compiler.js'), runtime = R('runtime.js');
const JS = [
  ['compiler.js', compiler + '\nvar CC_SRC = ' + json(compiler) + ';\n'],
  ['runtime.js', runtime + '\nvar RT_SRC = ' + json(runtime) + ';\n'],
  ['examples.js', R('examples.js')],
  ['proceso.js', R('proceso.js')],   // evidencia de proceso: antes de app.js, que lo conecta al editor
  ['app.js', R('app.js')]
];
const css = R('app.css');

// ---- base de conocimiento (kb/): se lee lo que haya; si falta algo, se sigue sin romper ----
const KB_DIR = process.env.KB_DIR ? path.resolve(process.env.KB_DIR) : path.join(ROOT, 'kb');
function leerJSON(f) {
  try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); return Array.isArray(d) ? d : []; }
  catch (e) { if (e.code !== 'ENOENT') console.warn('aviso: no se pudo leer ' + path.relative(ROOT, f) + ' (' + e.message + '); se ignora'); return []; }
}
const lim = (t) => String(t).replace(/\s*\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();   // prosa: comprime espacios y saltos
const limDeep = (v) => Array.isArray(v) ? v.map(limDeep) : typeof v === 'string' ? lim(v) : v;
// campos del error que usa la interfaz; el resto (que_dice_gcc, codigo_mal, riesgo_falso_positivo, deteccion…) solo sirve para validar
const CAMPOS_ERROR = ['id', 'categoria', 'nombre_corto', 'mensaje_editor', 'explicacion', 'como_arreglarlo', 'pistas', 'relacion_con_la_materia', 'nivel', 'mensaje_editor_actual', 'codigo_editor_actual', 'codigo_mal', 'entrada', 'buscar'];
function kbDatos() {
  let errores = [];
  const dirE = path.join(KB_DIR, 'errores');
  if (fs.existsSync(dirE)) for (const f of fs.readdirSync(dirE).filter((x) => /\.json$/.test(x) && x !== 'NUEVOS.json').sort()) errores = errores.concat(leerJSON(path.join(dirE, f)));
  errores = errores.filter((e) => e && typeof e.id === 'string' && !/^NUE-/.test(e.id)).map((e) => {
    const o = {};
    for (const k of CAMPOS_ERROR) if (e[k] !== undefined && e[k] !== null) o[k] = limDeep(e[k]);
    if (e.codigo_bien && !e.solucion_ejercicio) o.codigo_bien = e.codigo_bien;   // si el programa corregido es la solución de un ejercicio de la materia, no viaja al navegador   // se muestra tal cual (con sus saltos de línea)
    if (e.entrada) o.entrada = e.entrada;
    return o;
  });
  const ayuda = leerJSON(path.join(KB_DIR, 'ayuda.json')).filter((a) => a && typeof a.elemento === 'string').map((a) => {
    const o = {};
    for (const k of Object.keys(a)) o[k] = k === 'como_se_usa' ? a[k] : limDeep(a[k]);
    return o;
  });
  const lecciones = leerJSON(path.join(KB_DIR, 'lecciones.json')).filter((l) => l && typeof l === 'object').map((l) => {
    const o = {};
    for (const k of Object.keys(l)) o[k] = (k === 'ejemplo' || k === 'resultado' || k === 'entrada') ? l[k] : limDeep(l[k]);
    return o;
  });
  return { errores, ayuda, lecciones };
}
const KBD = kbDatos();
const KB_JS = [['kb-data.js', 'window.KB_DATA=' + json(KBD) + ';\n'], ['config.js', R('config.js')], ['kb.js', R('kb.js')], ['compartir.js', R('compartir.js')]];
const tpl = R('template.html');

// ---- íconos (PNG generados sin dependencias: "C" verde del favicon sobre el color de acento) ----
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function icon(size, maskable) {
  const BG = [0x3d, 0xdc, 0x97], INK = [0x06, 0x28, 0x1a], SS = 3, raw = Buffer.alloc(size * (size * 4 + 1));
  const k = maskable ? 0.74 : 1;                         // el área segura de un ícono "maskable" es el 80% central
  const R0 = 0.56 * k, R1 = 0.31 * k, mid = (R0 + R1) / 2, cap = (R0 - R1) / 2, cut = 40 * Math.PI / 180;
  const capX = Math.cos(cut) * mid, capY = Math.sin(cut) * mid;
  const inRR = (x, y) => { const h = 0.64, r = 0.38, qx = Math.abs(x) - (h - r), qy = Math.abs(y) - (h - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) <= r; };
  const inC = (x, y) => {
    const d = Math.hypot(x, y), a = Math.abs(Math.atan2(y, x));
    if (d <= R0 && d >= R1 && a >= cut) return true;
    return Math.hypot(x - capX, y - capY) <= cap || Math.hypot(x - capX, y + capY) <= cap;
  };
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let a = 0, c = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = ((px + (sx + .5) / SS) / size - .5) * 2 * 0.64, y = ((py + (sy + .5) / SS) / size - .5) * 2 * 0.64;
        if (maskable || inRR(x, y)) { a++; if (inC(x - 0.04 * k, y)) c++; }
      }
      const o = py * (size * 4 + 1) + 1 + px * 4, n = SS * SS;
      const f = a ? c / a : 0;
      raw[o] = Math.round(BG[0] + (INK[0] - BG[0]) * f); raw[o + 1] = Math.round(BG[1] + (INK[1] - BG[1]) * f); raw[o + 2] = Math.round(BG[2] + (INK[2] - BG[2]) * f);
      raw[o + 3] = Math.round(255 * a / n);
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// 1) sitio en varios archivos
W('assets/styles.css', css);
JS.forEach(([n, s]) => W('assets/' + n, s));
KB_JS.filter(([n]) => n !== 'config.js').forEach(([n, s]) => W('assets/' + n, s));   // config.js se escribe al final, con la versión
W('assets/icon-192.png', icon(192, false));
W('assets/icon-512.png', icon(512, false));
W('assets/icon-maskable-512.png', icon(512, true));
W('assets/apple-touch-icon.png', icon(180, true));
W('manifest.webmanifest', JSON.stringify({
  name: 'Editor C', short_name: 'Editor C', lang: 'es',
  description: 'Editor de C sin anuncios que corre en tu navegador, también sin conexión.',
  start_url: './', scope: './', id: './', display: 'standalone',
  background_color: '#0e1116', theme_color: '#141922',
  icons: [
    { src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'assets/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2) + '\n');
const HEAD_SITE = [
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">',
  '<meta name="theme-color" content="#141922" media="(prefers-color-scheme: dark)">',
  '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">'
].join('\n');
const HEAD_ONE = '<meta name="theme-color" content="#141922" media="(prefers-color-scheme: dark)">\n<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">';
W('index.html', tpl
  .replace('<!--@@HEAD@@-->', () => HEAD_SITE)
  .replace('<!--@@CSS@@-->', () => '<link rel="stylesheet" href="assets/styles.css">')
  .replace('<!--@@JS@@-->', () => JS.map(([n]) => '<script src="assets/' + n + '"></script>').concat(KB_JS.map(([n]) => '<script defer src="assets/' + n + '"></script>')).join('\n')));

// 2) service worker: la versión es el hash del contenido de todo lo que precachea
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'assets/styles.css', 'assets/compiler.js', 'assets/runtime.js', 'assets/examples.js', 'assets/proceso.js', 'assets/app.js',
  'assets/kb-data.js', 'assets/config.js', 'assets/kb.js', 'assets/compartir.js', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png', 'assets/apple-touch-icon.png'];
const hash = crypto.createHash('sha256');
// config.js lleva la versión adentro: se calcula con su texto sin completar
PRECACHE.filter((f) => f !== './').forEach((f) => { hash.update(f); hash.update(f === 'assets/config.js' ? R('config.js') : OUT[f]); });
const VERSION = hash.digest('hex').slice(0, 12);
const cfg = R('config.js').replace('@@VERSION@@', VERSION);
KB_JS[1][1] = cfg;
W('assets/config.js', cfg);
const swSrc = R('sw.js');
if (swSrc.split('@@VERSION@@').length !== 2 || swSrc.split('@@FILES@@').length !== 2) throw new Error('src/sw.js: los marcadores @@VERSION@@ y @@FILES@@ deben aparecer una sola vez');
W('sw.js', swSrc.replace('@@VERSION@@', VERSION).replace('@@FILES@@', () => JSON.stringify(PRECACHE)));

// 3) un solo archivo (sin manifest ni service worker)
W('dist/editor-c.html', tpl
  .replace('<!--@@HEAD@@-->', () => HEAD_ONE)
  .replace('<!--@@CSS@@-->', () => '<style>\n' + css + '</style>')
  .replace('<!--@@JS@@-->', () => JS.concat(KB_JS).map(([, s]) => '<script>\n' + safe(s) + '</script>').join('\n')));
console.log('versión', VERSION);

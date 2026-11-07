// Genera el sitio a partir de src/. Uso: node build.js
//   index.html + assets/*   -> sitio (GitHub Pages desde la raíz, o doble clic en index.html)
//   manifest.webmanifest, sw.js, assets/icon-*.png, favicon, pantalla de inicio -> app instalable y uso sin conexión (solo http/https)
//   dist/editor-c.html      -> un solo archivo para compartir sin internet (sin service worker)
// Sin dependencias: solo node.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
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

// ---- identidad: los íconos PNG, el favicon y la pantalla de inicio se dibujan con tools/generar-iconos.js (a partir de los SVG de
//      docs/identidad/) y quedan guardados en docs/identidad/app/. Acá solo se copian: build.js sigue necesitando solo node. ----
const ID = path.join(ROOT, 'docs', 'identidad');
const leerId = (f) => { const q = path.join(ID, f); if (!fs.existsSync(q)) throw new Error('falta docs/identidad/' + f + ' (corré: node tools/generar-identidad.js && node tools/generar-iconos.js)'); return fs.readFileSync(q); };
const ICONOS_SVG = leerId('iconos.svg').toString('utf8').trim();   // sprite de íconos, se incrusta en la página (sin pedidos de red)
const FAVICON_SVG = leerId('favicon.svg');
const APP = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'favicon.ico', 'splash-claro.png', 'splash-oscuro.png'];

// 1) sitio en varios archivos
W('assets/styles.css', css);
JS.forEach(([n, s]) => W('assets/' + n, s));
KB_JS.filter(([n]) => n !== 'config.js').forEach(([n, s]) => W('assets/' + n, s));   // config.js se escribe al final, con la versión
APP.forEach((n) => W('assets/' + n, leerId('app/' + n)));
W('assets/favicon.svg', FAVICON_SVG);
W('manifest.webmanifest', JSON.stringify({
  name: 'Editor C', short_name: 'Editor C', lang: 'es',
  description: 'Editor de C sin anuncios que corre en tu navegador, también sin conexión.',
  start_url: './', scope: './', id: './', display: 'standalone',
  background_color: '#17181b', theme_color: '#141517',
  icons: [
    { src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'assets/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2) + '\n');
const META_TEMA = ['<meta name="theme-color" content="#141517" media="(prefers-color-scheme: dark)">', '<meta name="theme-color" content="#f2f2f4" media="(prefers-color-scheme: light)">'];
const SPLASH = (modo, img) => '<link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: ' + modo + ')" href="assets/' + img + '">';
const HEAD_SITE = [
  '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">',
  '<link rel="icon" href="assets/favicon-32.png" sizes="32x32" type="image/png">',
  '<link rel="shortcut icon" href="assets/favicon.ico">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Editor C">',
  SPLASH('light', 'splash-claro.png'), SPLASH('dark', 'splash-oscuro.png')
].concat(META_TEMA).join('\n');
// un solo archivo: el favicon viaja dentro (data:), sin manifest ni service worker
const HEAD_ONE = ['<link rel="icon" href="data:image/svg+xml;base64,' + FAVICON_SVG.toString('base64') + '" type="image/svg+xml">'].concat(META_TEMA).join('\n');
const conIconos = (h) => h.replace('<!--@@ICONOS@@-->', () => ICONOS_SVG);
W('index.html', conIconos(tpl)
  .replace('<!--@@HEAD@@-->', () => HEAD_SITE)
  .replace('<!--@@CSS@@-->', () => '<link rel="stylesheet" href="assets/styles.css">')
  .replace('<!--@@JS@@-->', () => JS.map(([n]) => '<script src="assets/' + n + '"></script>').concat(KB_JS.map(([n]) => '<script defer src="assets/' + n + '"></script>')).join('\n')));

// 2) service worker: la versión es el hash del contenido de todo lo que precachea
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'assets/styles.css', 'assets/compiler.js', 'assets/runtime.js', 'assets/examples.js', 'assets/proceso.js', 'assets/app.js',
  'assets/kb-data.js', 'assets/config.js', 'assets/kb.js', 'assets/compartir.js', 'assets/favicon.svg', 'assets/favicon-32.png', 'assets/favicon.ico'].concat(APP.filter((n) => !/^(favicon|splash)/.test(n)).map((n) => 'assets/' + n));
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
W('dist/editor-c.html', conIconos(tpl)
  .replace('<!--@@HEAD@@-->', () => HEAD_ONE)
  .replace('<!--@@CSS@@-->', () => '<style>\n' + css + '</style>')
  .replace('<!--@@JS@@-->', () => JS.concat(KB_JS).map(([, s]) => '<script>\n' + safe(s) + '</script>').join('\n')));
console.log('versión', VERSION);

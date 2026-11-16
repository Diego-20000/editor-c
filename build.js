// Genera el sitio a partir de src/. Uso: node build.js
//   index.html + assets/*   -> sitio (GitHub Pages desde la raíz, o doble clic en index.html)
//   manifest.webmanifest, sw.js, assets/icon-*.png, favicon, pantalla de inicio -> app instalable y uso sin conexión (solo http/https)
//   dist/editor-c.html      -> un solo archivo para compartir sin internet (sin service worker)
// Sin dependencias: solo node.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = __dirname;
const R = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
const OUT = {};   // archivo generado -> contenido (Buffer o texto), para calcular la versión
// Aviso de licencia al inicio de cada archivo publicado (el .webmanifest es JSON y no admite comentarios)
const AVISO = 'Editor C, de Diego Segurotti (ArtPrograms Studio). Uso libre dentro de este sitio, sin fines comerciales. Prohibido copiar, redistribuir o vender sin permiso. PolyForm Strict License 1.0.0.';
const conAviso = (f, s) => {
  if (typeof s !== 'string') return s;
  if (/\.(js|css)$/.test(f)) return '/* ' + AVISO + ' */\n' + s;
  if (/\.html$/.test(f)) return s.replace(/^(<!doctype html>\s*)/i, (m) => m.trimEnd() + '\n<!-- ' + AVISO + ' -->\n');
  return s;
};
const W = (f, s) => {
  s = conAviso(f, s);
  fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), s); OUT[f] = s;
  console.log(f.padEnd(28), (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB');
};
// texto de un script que va en línea (archivo único): «</script» lo cerraría antes de tiempo y «<!--» cambia cómo el navegador busca ese cierre
const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const json = (s) => JSON.stringify(s).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

// El compilador y el runtime también corren dentro de un Worker creado desde un Blob; como con file://
// no se puede leer un archivo con fetch, sus textos viajan como cadenas (CC_SRC y RT_SRC).
const compiler = R('compiler.js'), runtime = R('runtime.js');
const JS = [
  ['compat.js', R('compat.js')],   // primero: avisa si el navegador es demasiado viejo (se escribe con JavaScript antiguo a propósito)
  ['compiler.js', compiler + '\nvar CC_SRC = ' + json(compiler) + ';\n'],
  ['runtime.js', runtime + '\nvar RT_SRC = ' + json(runtime) + ';\n'],
  ['examples.js', R('examples.js')],
  ['app.js', R('app.js')]
];
// fuente del código: Source Code Pro (Adobe, licencia SIL OFL 1.1; el texto está en src/fuentes/). Viaja con el sitio, sin pedidos a terceros.
const FUENTE = fs.readFileSync(path.join(ROOT, 'src', 'fuentes', 'SourceCodePro.ttf'));
const FUENTE_LIC = fs.readFileSync(path.join(ROOT, 'src', 'fuentes', 'OFL-SourceCodePro.txt'));
const FACE = (url) => '@font-face { font-family: "Source Code Pro"; src: url(' + url + ') format("truetype"); font-weight: 200 900; font-style: normal; font-display: swap; }';
const cssBase = R('app.css');
const css = cssBase.replace('/*@@FONT@@*/', () => FACE('SourceCodePro.ttf'));
const cssUno = cssBase.replace('/*@@FONT@@*/', () => FACE('data:font/ttf;base64,' + FUENTE.toString('base64')));

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
    for (const k of Object.keys(a)) o[k] = (k === 'como_se_usa' || k === 'detalle') ? a[k] : k === 'ocasiones' && Array.isArray(a[k]) ? a[k].map((oc) => { const r = {}; for (const kk of Object.keys(oc)) r[kk] = kk === 'ejemplo' ? oc[kk] : limDeep(oc[kk]); return r; }) : limDeep(a[k]);
    return o;
  });
  const lecciones = leerJSON(path.join(KB_DIR, 'lecciones.json')).filter((l) => l && typeof l === 'object').map((l) => {
    const o = {};
    for (const k of Object.keys(l)) o[k] = (k === 'ejemplo' || k === 'resultado' || k === 'entrada') ? l[k] : limDeep(l[k]);
    return o;
  });
  // plantillas de «¿Qué es esto?» para los nombres que pone el alumno (el editor las completa leyendo el código)
  const nombres = leerJSON(path.join(KB_DIR, 'nuevo', 'NOMBRES.json')).filter((x) => x && typeof x.rol === 'string').map((x) => {
    const o = {};
    for (const k of Object.keys(x)) o[k] = (k === 'detalle' || k === 'ejemplo' || k === 'cuando_aplica') ? x[k] : limDeep(x[k]);
    delete o.cuando_aplica; delete o.verificado_gcc13;
    return o;
  });
  return { errores, ayuda, lecciones, nombres };
}
const KBD = kbDatos();
const KB_JS = [['kb-data.js', 'window.KB_DATA=' + json(KBD) + ';\n'], ['config.js', R('config.js')], ['kb.js', R('kb.js')], ['compartir.js', R('compartir.js')], ['nombres.js', R('nombres.js')], ['ordenar.js', R('ordenar.js')]];
const tpl = R('template.html');
if (/\son[a-z]+\s*=|<script|\sstyle=|javascript:/i.test(tpl)) throw new Error('src/template.html trae un manejador en línea (onclick=…), un <script>, un atributo style o un enlace javascript: — la política de seguridad de contenido (CSP) los bloquea');

/* ---- Política de seguridad de contenido (CSP), por <meta> porque GitHub Pages no deja poner cabeceras ----
   Defensa en profundidad: aunque algún día se colara marcado HTML en la página (un nombre de programa, un enlace, un archivo importado),
   el navegador no ejecuta manejadores en línea ni scripts que no sean los del sitio, y la página no puede mandar datos a otro servidor.
   - 'unsafe-eval' hace falta: el programa en C se traduce a JavaScript y se ejecuta con new Function (en el Worker y, si no hay Worker, en la página).
   - worker-src/child-src blob: — el Worker se arma desde un Blob (con file:// no se puede leer un archivo con fetch).
   - file: — con doble clic (file://) los archivos del sitio se cargan con ese esquema; desde http(s) el navegador igual no deja cargar file:.
   - connect-src blob: — leer un Blob propio (la imagen de la captura) no saca nada del dispositivo; la red sigue limitada al propio sitio.
   - frame-ancestors no se puede poner en un <meta> (el navegador lo ignora): que otro sitio muestre el editor en un marco no se puede impedir así.
   Lo vigila tools/ui-seguridad.js (http, sin conexión, file:// y el archivo único). */
const sha = (t) => "'sha256-" + crypto.createHash('sha256').update(t, 'utf8').digest('base64') + "'";
const cspMeta = (d) => '<meta http-equiv="Content-Security-Policy" content="' + d.join('; ') + '">';
const CSP_SITIO = cspMeta([
  "default-src 'none'", "script-src 'self' file: 'unsafe-eval'", "worker-src 'self' blob:", "child-src 'self' blob:", "style-src 'self' file:",
  "img-src 'self' file: data: blob:", "font-src 'self' file: data:", "connect-src 'self' blob:", "manifest-src 'self'", "base-uri 'none'", "form-action 'none'", "object-src 'none'"
]);

// ---- identidad: los íconos PNG, el favicon y la pantalla de inicio se dibujan con tools/generar-iconos.js (a partir de los SVG de
//      docs/identidad/) y quedan guardados en docs/identidad/app/. Acá solo se copian: build.js sigue necesitando solo node. ----
const ID = path.join(ROOT, 'docs', 'identidad');
const leerId = (f) => { const q = path.join(ID, f); if (!fs.existsSync(q)) throw new Error('falta docs/identidad/' + f + ' (corré: node tools/generar-identidad.js && node tools/generar-iconos.js)'); return fs.readFileSync(q); };
// sprite de íconos, se incrusta en la página (sin pedidos de red). Su estilo en línea pasa a una clase (.sprite en app.css):
// la política de seguridad de contenido no admite atributos style
const ICONOS_SVG = leerId('iconos.svg').toString('utf8').trim().replace(' style="position:absolute"', ' class="sprite"');
if (/\sstyle=/.test(ICONOS_SVG)) throw new Error('docs/identidad/iconos.svg trae un atributo style: la política de seguridad de contenido (CSP) lo bloquea; pásalo a una clase de app.css');
const FAVICON_SVG = leerId('favicon.svg');
const APP = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'favicon.ico', 'splash-claro.png', 'splash-oscuro.png'];

// 1) sitio en varios archivos
W('assets/styles.css', css);
W('assets/SourceCodePro.ttf', FUENTE);
W('assets/OFL-SourceCodePro.txt', FUENTE_LIC);
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
  .replace('<!--@@CSP@@-->', () => CSP_SITIO)
  .replace('<!--@@HEAD@@-->', () => HEAD_SITE)
  .replace('<!--@@CSS@@-->', () => '<link rel="stylesheet" href="assets/styles.css">')
  .replace('<!--@@JS@@-->', () => JS.map(([n]) => '<script src="assets/' + n + '"></script>').concat(KB_JS.map(([n]) => '<script defer src="assets/' + n + '"></script>')).join('\n')));

// 2) service worker: la versión es el hash del contenido de todo lo que precachea
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'assets/styles.css', 'assets/compat.js', 'assets/compiler.js', 'assets/runtime.js', 'assets/examples.js', 'assets/app.js',
  'assets/SourceCodePro.ttf', 'assets/kb-data.js', 'assets/config.js', 'assets/kb.js', 'assets/compartir.js', 'assets/nombres.js', 'assets/ordenar.js', 'assets/favicon.svg', 'assets/favicon-32.png', 'assets/favicon.ico'].concat(APP.filter((n) => !/^(favicon|splash)/.test(n)).map((n) => 'assets/' + n));
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
// los scripts y el estilo van en línea: la política los permite por su hash (sha256 del texto exacto), no con 'unsafe-inline'.
// El navegador calcula el hash después de pasar los saltos de línea a \n, así que el texto se incrusta ya normalizado.
const enLinea = (t) => '\n' + t.replace(/\r\n?/g, '\n');
const UNO_JS = JS.concat(KB_JS).map(([, s]) => enLinea(safe(s))), UNO_CSS = enLinea(cssUno);
const CSP_UNO = cspMeta([
  "default-src 'none'", 'script-src ' + UNO_JS.map(sha).join(' ') + " 'unsafe-eval'", 'worker-src blob:', 'child-src blob:', 'style-src ' + sha(UNO_CSS),
  'img-src data: blob:', 'font-src data:', 'connect-src blob:', "base-uri 'none'", "form-action 'none'", "object-src 'none'"
]);
W('dist/editor-c.html', conIconos(tpl)
  .replace('<!--@@CSP@@-->', () => CSP_UNO)
  .replace('<!--@@HEAD@@-->', () => HEAD_ONE)
  .replace('<!--@@CSS@@-->', () => '<style>' + UNO_CSS + '</style>')
  .replace('<!--@@JS@@-->', () => UNO_JS.map((t) => '<script>' + t + '</script>').join('\n')));
console.log('versión', VERSION);

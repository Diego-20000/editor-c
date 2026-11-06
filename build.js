// Genera el sitio a partir de src/. Uso: node build.js
//   index.html + assets/*   -> sitio (GitHub Pages desde la raíz, o doble clic en index.html)
//   dist/editor-c.html      -> un solo archivo para compartir sin internet
// Sin dependencias: solo node.
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
const R = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
const W = (f, s) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), s); console.log(f.padEnd(24), (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB'); };
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const json = (s) => JSON.stringify(s).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

// El runtime también corre dentro de un Worker creado desde un Blob; como con file://
// no se puede leer un archivo con fetch, su texto viaja como cadena (RT_SRC).
const runtime = R('runtime.js');
const JS = [
  ['compiler.js', R('compiler.js')],
  ['runtime.js', runtime + '\nvar RT_SRC = ' + json(runtime) + ';\n'],
  ['examples.js', R('examples.js')],
  ['app.js', R('app.js')]
];
const css = R('app.css');
const tpl = R('template.html');

// 1) sitio en varios archivos
W('assets/styles.css', css);
JS.forEach(([n, s]) => W('assets/' + n, s));
W('index.html', tpl
  .replace('<!--@@CSS@@-->', () => '<link rel="stylesheet" href="assets/styles.css">')
  .replace('<!--@@JS@@-->', () => JS.map(([n]) => '<script src="assets/' + n + '"></script>').join('\n')));

// 2) un solo archivo
W('dist/editor-c.html', tpl
  .replace('<!--@@CSS@@-->', () => '<style>\n' + css + '</style>')
  .replace('<!--@@JS@@-->', () => JS.map(([, s]) => '<script>\n' + safe(s) + '</script>').join('\n')));

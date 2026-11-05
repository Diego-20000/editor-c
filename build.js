// Genera index.html (un solo archivo con todo adentro) a partir de src/.
// Uso: node build.js
const fs = require('fs'), path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
let html = R('template.html');
const rt = R('runtime.js');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const json = (s) => JSON.stringify(s).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
html = html.replace('/*@@CSS@@*/', () => R('app.css'))
  .replace('/*@@COMPILER@@*/', () => safe(R('compiler.js')))
  .replace('/*@@RUNTIME@@*/', () => safe(rt))
  .replace('/*@@RTJSON@@*/', () => json(rt))
  .replace('/*@@APP@@*/', () => safe(R('app.js')));
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB');

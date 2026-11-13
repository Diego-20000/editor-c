// Prueba del enlace para pasar un programa a otro dispositivo: armarlo, abrirlo en otro navegador, comprobar que no se pide nada a la red
// uso: node tools/ui-enlace.js   (necesita playwright; levanta un servidor local solo para la prueba)
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
let ok = 0, fallas = 0; const check = (c, m) => { if (c) { ok++; console.log('  ok   ' + m); } else { fallas++; console.log('  FALLA ' + m); } };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0].split('#')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } const t = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }[path.extname(f)] || 'application/octet-stream'; r.writeHead(200, { 'content-type': t + '; charset=utf-8' }); r.end(d); }); }).listen(8765, async () => {
  const br = await chromium.launch();
  const c1 = await br.newContext({ viewport: { width: 1280, height: 800 } }); const p1 = await c1.newPage();
  await p1.goto('http://localhost:8765/index.html'); await p1.waitForSelector('#code');
  await p1.evaluate(() => { const t = document.getElementById('code'); t.value = '#include <stdio.h>\nint main() {\n  printf("hola ñandú\\n");\n  return 0;\n}\n'; t.dispatchEvent(new Event('input')); });
  await p1.waitForTimeout(500);
  await p1.click('#enlace'); await p1.waitForSelector('#dEnlace[open]');
  const url = await p1.inputValue('#enlUrl'); check(/#p=z\.|#p=r\./.test(url) && url.length < 600, 'el enlace se arma y es corto (' + url.length + ' caracteres)');
  
  const c2 = await br.newContext({ viewport: { width: 1280, height: 800 } }); const p2 = await c2.newPage();
  const reqs = []; p2.on('request', (r) => reqs.push(r.url()));
  await p2.goto(url); await p2.waitForSelector('#dRecibido[open]', { timeout: 8000 });
  check((await p2.evaluate(() => location.hash)) === '', 'al abrirlo se borra la parte # de la barra de direcciones');
  check(reqs.filter((u) => u.includes('#p=') || u.includes('hola')).length === 0 && reqs.every((u) => u.startsWith('http://localhost:8765') || u.startsWith('data:') || u.startsWith('blob:')), 'el programa no viaja en ningún pedido de red');
  
  await p2.click('#recOk'); await p2.waitForTimeout(500);
  check((await p2.inputValue('#code')).includes('hola ñandú'), 'el programa llega completo, con acentos');
  // enlace dañado
  const p3 = await (await br.newContext()).newPage(); await p3.goto('http://localhost:8765/index.html#p=z.AAAA'); await p3.waitForTimeout(800);
  check(!(await p3.evaluate(() => !!document.querySelector('#dRecibido[open]'))), 'un enlace dañado no abre nada');
  await br.close(); srv.close(); console.log(ok + ' ok, ' + fallas + ' fallas'); process.exit(fallas ? 1 : 0);
});

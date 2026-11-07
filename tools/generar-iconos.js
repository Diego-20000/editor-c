// Dibuja los PNG de la identidad a partir de los SVG de docs/identidad/ con Chromium (Playwright), sin descargar nada.
// Salida: docs/identidad/app/  (build.js los copia a assets/ y los incrusta donde hace falta)
//   icon-192.png, icon-512.png            íconos «any» (cuadrado con esquinas redondeadas, esquinas transparentes)
//   icon-maskable-512.png                 «maskable»: fondo hasta el borde, símbolo dentro del círculo seguro (radio 40 %)
//   apple-touch-icon.png (180)            iOS le pone sus propias esquinas: fondo hasta el borde
//   favicon-16/32/48.png y favicon.ico    pestaña del navegador (el .ico lleva 16, 32 y 48 en PNG)
//   splash-claro.png, splash-oscuro.png   pantalla de inicio de iPhone (1170 × 2532)
// Uso: node tools/generar-identidad.js && node tools/generar-iconos.js
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ID = path.join(__dirname, '..', 'docs', 'identidad'), OUT = path.join(ID, 'app');
fs.mkdirSync(OUT, { recursive: true });
const svg = (n) => fs.readFileSync(path.join(ID, n), 'utf8');
(async () => {
  const br = await chromium.launch();
  async function png(svgText, w, h, file, transparente) {
    const p = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent('<body style="margin:0;background:transparent"><img id="i" style="display:block;width:' + w + 'px;height:' + h + 'px" src="data:image/svg+xml;base64,' + Buffer.from(svgText).toString('base64') + '"></body>');
    await p.waitForFunction(() => document.getElementById('i').complete && document.getElementById('i').naturalWidth > 0);
    const b = await p.screenshot({ omitBackground: !!transparente, clip: { x: 0, y: 0, width: w, height: h } });
    fs.writeFileSync(path.join(OUT, file), b); await p.close(); return b;
  }
  await png(svg('app-icono.svg'), 192, 192, 'icon-192.png', true);
  await png(svg('app-icono.svg'), 512, 512, 'icon-512.png', true);
  await png(svg('app-icono-maskable.svg'), 512, 512, 'icon-maskable-512.png', false);
  await png(svg('app-icono-maskable.svg'), 180, 180, 'apple-touch-icon.png', false);
  const fav = { 16: null, 32: null, 48: null };
  for (const n of [16, 32, 48]) fav[n] = await png(svg('favicon.svg'), n, n, 'favicon-' + n + '.png', true);
  // .ico con PNG adentro (válido desde Windows Vista y en todos los navegadores)
  const ent = [16, 32, 48], head = Buffer.alloc(6 + 16 * ent.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(ent.length, 4);
  let off = head.length; const datos = [];
  ent.forEach((n, i) => { const b = fav[n], o = 6 + 16 * i; head[o] = n; head[o + 1] = n; head[o + 2] = 0; head[o + 3] = 0; head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(b.length, o + 8); head.writeUInt32LE(off, o + 12); off += b.length; datos.push(b); });
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), Buffer.concat([head].concat(datos)));
  await png(svg('pantalla-inicio.svg'), 1170, 2532, 'splash-claro.png', false);
  await png(svg('pantalla-inicio-oscura.svg'), 1170, 2532, 'splash-oscuro.png', false);
  await br.close();
  console.log('PNG e .ico en docs/identidad/app/:', fs.readdirSync(OUT).join(', '));
})().catch((e) => { console.error(e); process.exit(1); });

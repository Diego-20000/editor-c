// Genera la identidad visual de «Editor C» a partir de código (sin descargar nada, solo node):
//   docs/identidad/*.svg      símbolo, nombre (horizontal y apilado), monocromo, fondo oscuro, ícono de app, favicon, íconos de la interfaz, exploración
//   docs/identidad/index.html página de identidad (autocontenida, sin red)
// Los PNG, el .ico y la pantalla de inicio salen de tools/generar-iconos.js (necesita Chromium de Playwright para dibujar los SVG).
// Uso: node tools/generar-identidad.js
const fs = require('fs'), path = require('path');
const M = require('./identidad/marca.js');
const ICONOS = require('./identidad/iconos.js');
const OUT = path.join(__dirname, '..', 'docs', 'identidad');
fs.mkdirSync(OUT, { recursive: true });
const W = (f, s) => { fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true }); fs.writeFileSync(path.join(OUT, f), s); };
const { U, ARCO, BARRA, BBOX, f } = M;

// colores de la marca (los mismos valores que --accent y --text de src/app.css; la página de identidad los lee de ahí y avisa si no coinciden)
const COL = {
  claro: { tinta: '#1c1c1e', acento: '#0a7580' },
  oscuro: { tinta: '#f2f2f4', acento: '#3cc4cd' }
};
const FONDO_APP = '#17181b';   // grafito del ícono de la app

const trazo = (c) => `fill="none" stroke="${c}" stroke-width="${U}" stroke-linecap="round" stroke-linejoin="round"`;
// símbolo: C + cursor. tinta y acento pueden ser el mismo color (monocromo)
const simboloG = (tinta, acento) => `<path d="${ARCO}" ${trazo(tinta)}/><path d="${BARRA}" ${trazo(acento)}/>`;
const SVG = (vb, body, extra) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra || ''}>${body}</svg>\n`;
const TIT = (t) => `<title>${t}</title>`;
const caja = (pad) => `${f(BBOX.x0 - pad)} ${f(BBOX.y0 - pad)} ${f(BBOX.x1 - BBOX.x0 + 2 * pad)} ${f(BBOX.y1 - BBOX.y0 + 2 * pad)}`;

// ---- símbolo ----
const PAD = 3 * U;   // margen mínimo alrededor del logo = 3 u
function simbolo(c, titulo) { return SVG(caja(0), TIT(titulo) + simboloG(c.tinta, c.acento), 'role="img"'); }
W('simbolo.svg', simbolo(COL.claro, 'Editor C'));
W('simbolo-oscuro.svg', simbolo(COL.oscuro, 'Editor C'));
W('simbolo-mono.svg', simbolo({ tinta: 'currentColor', acento: 'currentColor' }, 'Editor C'));
W('simbolo-mono-blanco.svg', simbolo({ tinta: '#ffffff', acento: '#ffffff' }, 'Editor C'));

// ---- nombre horizontal: «Editor» + C con cursor (la C del nombre es el símbolo) ----
const pal = M.palabra('Editor', 0, 'X');
const xC = pal.fin + 14 - BBOX.x0;    // separación de palabra = 2 u, medida entre la «r» y el borde exterior de la C
const horizW = xC + BBOX.x1, horizVB = `0 ${BBOX.y0} ${f(horizW)} ${f(BBOX.y1 - BBOX.y0)}`;
function horizontal(c, titulo) {
  const p = M.palabra('Editor', 0, c.tinta);
  return SVG(horizVB, TIT(titulo) + `<g ${trazo(c.tinta)}>${p.svg}</g><g transform="translate(${f(xC)} 0)">${simboloG(c.tinta, c.acento)}</g>`, 'role="img"');
}
W('nombre-horizontal.svg', horizontal(COL.claro, 'Editor C'));
W('nombre-horizontal-oscuro.svg', horizontal(COL.oscuro, 'Editor C'));
W('nombre-horizontal-mono.svg', horizontal({ tinta: 'currentColor', acento: 'currentColor' }, 'Editor C'));

// ---- nombre apilado: símbolo grande arriba, «Editor C» en letras debajo ----
{
  const txt = (c) => { const a = M.palabra('Editor', 0, c.tinta); const ca = M.palabra('C', 0, c.tinta); return { a, ca }; };
  const esc = 0.78;    // escala del texto respecto del símbolo (texto = 0,78; símbolo = 1,9)
  const S = 1.9;
  function apilado(c, titulo) {
    const t = txt(c); const anchoTxt = (t.a.fin + 14 + 40.3) * esc;
    const sw = (BBOX.x1 - BBOX.x0) * S, sh = (BBOX.y1 - BBOX.y0) * S;
    const W2 = Math.max(anchoTxt, sw) + 2 * 0, gapV = 16;
    const th = 46 * esc + U * esc;           // alto de las letras con trazo
    const H2 = sh + gapV + th;
    const sx = (W2 - sw) / 2 - BBOX.x0 * S, sy = -BBOX.y0 * S;
    const tx0 = (W2 - anchoTxt) / 2, ty = sh + gapV - (BBOX.y0 + 0) * esc + 0;   // las letras tienen su borde superior en y = 5,5 (9 − 3,5)
    const ca = M.palabra('C', 0, c.tinta);
    return SVG(`0 0 ${f(W2)} ${f(H2)}`, TIT(titulo) +
      `<g transform="translate(${f(sx)} ${f(sy)}) scale(${S})">${simboloG(c.tinta, c.acento)}</g>` +
      `<g transform="translate(${f(tx0)} ${f(sh + gapV - 5.5 * esc)}) scale(${esc})"><g ${trazo(c.tinta)}>${t.a.svg}<g transform="translate(${f(t.a.fin + 14)} 0)">${ca.svg}</g></g></g>`, 'role="img"');
  }
  W('nombre-apilado.svg', apilado(COL.claro, 'Editor C'));
  W('nombre-apilado-oscuro.svg', apilado(COL.oscuro, 'Editor C'));
  W('nombre-apilado-mono.svg', apilado({ tinta: 'currentColor', acento: 'currentColor' }, 'Editor C'));
}

// ---- ícono de la app: cuadrado redondeado de grafito con el símbolo al 54 % del ancho ----
{
  const S = 5.4, cx = (BBOX.x0 + BBOX.x1) / 2, cy = (BBOX.y0 + BBOX.y1) / 2;
  const sim = (extra) => `<g transform="translate(${f(256 - cx * S)} ${f(256 - cy * S)}) scale(${S})">${simboloG(COL.oscuro.tinta, COL.oscuro.acento)}</g>`;
  // «any»: esquinas de radio 22,5 % (como las de iOS, sin copiar la curva exacta) y un margen transparente de 0
  W('app-icono.svg', SVG('0 0 512 512', TIT('Editor C') + `<rect width="512" height="512" rx="115" fill="${FONDO_APP}"/>` + sim(), 'role="img"'));
  // «maskable»: sin esquinas, el fondo llega al borde; el símbolo cabe en el círculo seguro (radio 40 % = 204,8 px)
  W('app-icono-maskable.svg', SVG('0 0 512 512', TIT('Editor C') + `<rect width="512" height="512" fill="${FONDO_APP}"/>` + sim(), 'role="img"'));
  // pantalla de inicio (claro y oscuro): solo el símbolo centrado
  const spl = (bg, c) => SVG('0 0 390 844', `<rect width="390" height="844" fill="${bg}"/><g transform="translate(${f(195 - cx * 2.2)} ${f(380 - cy * 2.2)}) scale(2.2)">${simboloG(c.tinta, c.acento)}</g>`);
  W('pantalla-inicio.svg', spl('#f2f2f4', COL.claro));
  W('pantalla-inicio-oscura.svg', spl('#141517', COL.oscuro));
}

// ---- favicon: símbolo sin margen, trazo más grueso para que se vea a 16 px; se adapta a pestañas claras y oscuras ----
{
  // en 16 px el trazo de 7/64 queda en 1,5 px: se engrosa a 9 y se acorta la boca
  const g = (c, a) => `<path d="${ARCO}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/><path d="${BARRA}" fill="none" stroke="${a}" stroke-width="9" stroke-linecap="round"/>`;
  W('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><style>.c{stroke:${COL.claro.tinta}}.a{stroke:${COL.claro.acento}}@media (prefers-color-scheme:dark){.c{stroke:${COL.oscuro.tinta}}.a{stroke:${COL.oscuro.acento}}}</style><g transform="translate(0.25 0)"><path class="c" d="${ARCO}" fill="none" stroke-width="9" stroke-linecap="round"/><path class="a" d="${BARRA}" fill="none" stroke-width="9" stroke-linecap="round"/></g></svg>\n`);
  void g;
}

// ---- íconos de la interfaz ----
const sprite = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
  ICONOS.map(([id, , , body]) => `<symbol id="i-${id}" viewBox="0 0 24 24">${body}</symbol>`).join('') + '</svg>\n';
W('iconos.svg', sprite);

// ---- ideas probadas (hoja de exploración) ----
{
  const t = (c, w) => `fill="none" stroke="${c}" stroke-width="${w || 7}" stroke-linecap="round" stroke-linejoin="round"`;
  const I = COL.claro.tinta, A = COL.claro.acento;
  const ideas = [
    ['A · C con cursor', 'ELEGIDA', simboloG(I, A)],
    ['B · C de diagrama N-S', 'descartada', `<path d="M47 12.5H11.5v39H47" ${t(I)}/><rect x="23" y="25" width="17" height="14" rx="2" fill="none" stroke="${A}" stroke-width="5"/>`],
    ['C · placas de capacitor', 'descartada', `<path d="M4 32h13M47 32h13" ${t(I, 5)}/><path d="M27 12.5C19 19 19 45 27 51.5" ${t(I)}/><path d="M41 12.5v39" ${t(A)}/>`],
    ['D · C con guion bajo', 'descartada', `<path d="${ARCO}" ${t(I)}/><path d="M36 54h19" ${t(A)}/>`]
  ];
  const body = ideas.map(([n, e, g], i) => `<g transform="translate(${i * 200 + 20} 20)"><rect width="160" height="160" rx="26" fill="#fff" stroke="#d0d0d6"/><g transform="translate(16 16) scale(1.88)">${g}</g><text x="0" y="190" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#1c1c1e">${n}</text><text x="0" y="210" font-family="system-ui,sans-serif" font-size="13" fill="${e === 'ELEGIDA' ? '#0a7580' : '#66666d'}">${e}</text></g>`).join('');
  W('exploracion.svg', SVG('0 0 820 240', `<rect width="820" height="240" fill="#f2f2f4"/>` + body, 'font-family="system-ui,sans-serif"'));
}

// ---- la página ----
require('./identidad/pagina.js')({ OUT, COL, ICONOS, sprite, M, FONDO_APP, horizW });
console.log('identidad generada en docs/identidad/');

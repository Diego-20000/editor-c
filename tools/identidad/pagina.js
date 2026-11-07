// Arma docs/identidad/index.html: una sola página, sin red, con el logo en todas sus variantes, la construcción, la paleta (leída de
// src/app.css, así no puede quedar desactualizada), la tipografía, los íconos, ejemplos de uso y la guía.
const fs = require('fs'), path = require('path');
module.exports = function ({ OUT, COL, ICONOS, sprite, M, FONDO_APP }) {
  const ROOT = path.join(OUT, '..', '..');
  const rd = (f) => fs.readFileSync(path.join(OUT, f), 'utf8').replace(/<\?xml[^>]*>\s*/, '');
  const inline = (f, cls, extra) => rd(f).replace('<svg ', '<svg class="' + (cls || '') + '" ' + (extra || '')).trim();
  const css = fs.readFileSync(path.join(ROOT, 'src', 'app.css'), 'utf8');
  const tokens = (re) => { const m = css.match(re); const o = {}; (m ? m[1] : '').replace(/--([\w-]+):\s*([^;]+);/g, (x, k, v) => { o[k] = v.trim(); }); return o; };
  const L = tokens(/^:root \{([^}]*)\}/m), D = tokens(/:root\[data-theme="dark"\] \{([^}]*)\}/);
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const fmt = (n) => n.toFixed(1).replace('.', ',');
  const sync = (L.accent === COL.claro.acento && D.accent === COL.oscuro.acento && L.text === COL.claro.tinta && D.text === COL.oscuro.tinta);
  if (!sync) console.warn('aviso: los colores de la marca (tools/generar-identidad.js) no coinciden con --accent/--text de src/app.css');

  const filas = (T, etiqueta) => [
    ['text', 'Texto', 'panel'], ['muted', 'Texto secundario', 'panel'], ['accent', 'Acento', 'panel'], ['danger', 'Error', 'panel'], ['warn', 'Aviso', 'panel'], ['ok', 'Correcto', 'panel'],
    ['kw', 'Código: palabras de control', 'panel'], ['ty', 'Código: tipos', 'panel'], ['st', 'Código: cadenas', 'panel'], ['nu', 'Código: números', 'panel'], ['fn', 'Código: funciones', 'panel'], ['pp', 'Código: #include', 'panel'], ['co', 'Código: comentarios', 'panel'], ['gut', 'Números de línea', 'panel'], ['lineS', 'Borde de campos (mínimo 3:1)', 'panel']
  ].map(([k, n, bg]) => { const r = cr(T[k], T[bg]); const min = k === 'lineS' ? 3 : 4.5; return `<tr><td><i class="sw" style="background:${T[k]}"></i></td><td>${n}<br><code>--${k}</code></td><td><code>${T[k]}</code></td><td class="${r >= min ? 'okc' : 'malc'}">${fmt(r)} : 1</td></tr>`; }).join('');
  const sup = (T) => [['bg', 'Fondo de la página'], ['panel', 'Superficie (hojas, listas)'], ['panel2', 'Superficie secundaria']].map(([k, n]) => `<tr><td><i class="sw" style="background:${T[k]}"></i></td><td>${n}<br><code>--${k}</code></td><td><code>${T[k]}</code></td><td>—</td></tr>`).join('');
  const tabla = (T, t) => `<div class="tbl"><h4>${t}</h4><table><thead><tr><th></th><th>Uso</th><th>Valor</th><th>Contraste sobre la superficie</th></tr></thead><tbody>${sup(T)}${filas(T)}<tr><td><i class="sw" style="background:${T.accent}"></i></td><td>Texto del botón primario<br><code>--accent-ink</code> sobre <code>--accent</code></td><td><code>${T['accent-ink']}</code></td><td class="okc">${fmt(cr(T['accent-ink'], T.accent))} : 1</td></tr></tbody></table></div>`;

  const iconos = ICONOS.map(([id, n, uso]) => `<figure><svg class="i" aria-hidden="true"><use href="#i-${id}"/></svg><figcaption><b>${n}</b><span>${uso}</span></figcaption></figure>`).join('');
  const CX = (M.BBOX.x0 + M.BBOX.x1) / 2;
  // construcción: símbolo sobre grilla de 8 con las cotas
  const grilla = (() => {
    let g = '';
    for (let x = 0; x <= 64; x += 8) g += `<path d="M${x} 0V64" stroke="#8a8a91" stroke-width=".25" opacity=".6"/>`;
    for (let y = 0; y <= 64; y += 8) g += `<path d="M0 ${y}H64" stroke="#8a8a91" stroke-width=".25" opacity=".6"/>`;
    const cota = `<circle cx="${M.CX}" cy="${M.CY}" r="${M.R + M.U / 2}" fill="none" stroke="${COL.claro.acento}" stroke-width=".4" stroke-dasharray="1.2 1"/><circle cx="${M.CX}" cy="${M.CY}" r="${M.R - M.U / 2}" fill="none" stroke="${COL.claro.acento}" stroke-width=".4" stroke-dasharray="1.2 1"/><circle cx="${M.CX}" cy="${M.CY}" r="1" fill="${COL.claro.acento}"/><path d="M${M.CX} ${M.CY}L${M.CX + 13.79} ${M.CY - 13.79}M${M.CX} ${M.CY}L${M.CX + 13.79} ${M.CY + 13.79}" stroke="${COL.claro.acento}" stroke-width=".4"/><path d="M4 18.21H60M4 45.79H60" stroke="${COL.claro.acento}" stroke-width=".3" stroke-dasharray="1 1"/>`;
    return `<svg viewBox="0 0 64 64" class="constr" role="img" aria-label="Construcción del símbolo sobre una grilla de 8 unidades"><rect width="64" height="64" fill="#fff"/>${g}<g opacity=".92">${rd('simbolo.svg').replace(/<svg[^>]*>/, '').replace('</svg>', '').replace(/<title>.*?<\/title>/, '')}</g>${cota}</svg>`;
  })();
  const seguro = `<svg viewBox="0 0 512 512" class="app" role="img" aria-label="Ícono maskable con la zona segura"><image href="data:image/svg+xml;base64,${Buffer.from(rd('app-icono-maskable.svg')).toString('base64')}" width="512" height="512"/><circle cx="256" cy="256" r="204.8" fill="none" stroke="${COL.oscuro.acento}" stroke-width="3" stroke-dasharray="10 8"/></svg>`;
  const img = (f) => 'data:image/svg+xml;base64,' + Buffer.from(fs.readFileSync(path.join(OUT, f))).toString('base64');
  const png = (f) => { try { return 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, 'app', f)).toString('base64'); } catch (e) { return ''; } };

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">
<title>Identidad de Editor C</title>
<style>
:root{--bg:${L.bg};--panel:${L.panel};--panel2:${L.panel2};--text:${L.text};--muted:${L.muted};--accent:${L.accent};--line:${L.line};--lineS:${L.lineS};--danger:${L.danger};--warn:${L.warn};--ok:${L.ok};--fill:${L.fill};--mono:${L.mono};--ui:${L.ui};--accent-ink:${L['accent-ink']}}
@media (prefers-color-scheme:dark){:root{--bg:${D.bg};--panel:${D.panel};--panel2:${D.panel2};--text:${D.text};--muted:${D.muted};--accent:${D.accent};--line:${D.line};--lineS:${D.lineS};--danger:${D.danger};--warn:${D.warn};--ok:${D.ok};--fill:${D.fill};--accent-ink:${D['accent-ink']}}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 var(--ui)}
main{max-width:980px;margin:0 auto;padding:32px 16px 72px}
h1{font-size:40px;line-height:1.1;letter-spacing:-.02em;margin:24px 0 8px}h2{font-size:28px;letter-spacing:-.02em;margin:56px 0 6px}h3{font-size:18px;margin:28px 0 6px}h4{font-size:15px;margin:0 0 8px}
p{margin:8px 0;max-width:68ch}.mut{color:var(--muted)}code{font:13px var(--mono);background:var(--fill);padding:1px 6px;border-radius:6px}
.hero{display:flex;gap:24px;align-items:center;flex-wrap:wrap}.hero svg{height:96px;width:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.cell{border-radius:14px;padding:24px;display:grid;place-items:center;min-height:150px;box-shadow:0 0 0 1px var(--line)}.cell svg{max-width:100%;height:auto}.cell small{display:block;margin-top:10px;font-size:13px;opacity:.8;text-align:center}
.cl{background:#fff;color:#1c1c1e}.os{background:#141517;color:#f2f2f4}.ac{background:${L.accent};color:#fff}.mo{background:#e9e9ec;color:#1c1c1e}
.sw{display:inline-block;width:28px;height:28px;border-radius:8px;box-shadow:0 0 0 1px var(--line)}
table{width:100%;border-collapse:collapse;font-size:14px;background:var(--panel);border-radius:12px;overflow:hidden}th{font-size:13px;text-align:left;color:var(--muted);padding:8px 12px}td{padding:8px 12px;border-top:1px solid var(--line);vertical-align:middle}
.okc{color:var(--ok);font-weight:600}.malc{color:var(--danger);font-weight:700}
.tbls{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px}@media(max-width:480px){.tbls{grid-template-columns:1fr}}
.icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.icons figure{margin:0;background:var(--panel);border-radius:12px;padding:14px;display:flex;gap:12px;align-items:center}
.icons figcaption{display:grid;font-size:14px;line-height:1.25}.icons figcaption span{color:var(--muted);font-size:13px}
.i{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;flex:none;color:var(--accent)}
.constr{width:min(100%,420px);border-radius:14px;box-shadow:0 0 0 1px var(--line)}.app{width:160px;border-radius:14px}
.row{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
.ui{background:var(--panel);border-radius:14px;padding:16px;box-shadow:0 0 0 1px var(--line);display:grid;gap:12px;min-width:260px;flex:1 1 280px}
.btn{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border:0;border-radius:10px;background:var(--fill);color:var(--text);font:600 15px var(--ui)}.btn.p{background:var(--accent);color:var(--accent-ink)}.btn.d{color:var(--danger)}
.seg{display:flex;padding:2px;gap:2px;border-radius:9px;background:var(--fill)}.seg span{flex:1;text-align:center;padding:7px 4px;border-radius:7px;font-size:14px}.seg .on{background:var(--panel);font-weight:650;box-shadow:0 0 0 1px var(--line)}
.sw2{width:51px;height:31px;border-radius:16px;background:var(--accent);position:relative;flex:none}.sw2::after{content:"";position:absolute;top:3px;left:23px;width:25px;height:25px;border-radius:50%;background:#fff}
.lst{border-radius:12px;background:var(--panel2);overflow:hidden}.lst div{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;min-height:48px}.lst div+div{border-top:1px solid var(--line)}
.est{display:flex;gap:8px;align-items:center;font-weight:600;font-size:14px}.est.e{color:var(--danger)}.est.w{color:var(--warn)}.est.k{color:var(--ok)}
.dont{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.dont figure{margin:0}.dont .cell{min-height:120px;position:relative}.dont figcaption{font-size:14px;margin-top:6px;color:var(--muted)}
.x::after{content:"";position:absolute;inset:0;background:linear-gradient(to top right,transparent calc(50% - 1px),${L.danger} 50%,transparent calc(50% + 1px));border-radius:14px}
.clear{outline:1px dashed ${L.accent};outline-offset:0;padding:21px;display:inline-block;background:#fff;border-radius:2px}
.clear svg{display:block;height:46px;width:auto;outline:1px solid rgba(10,117,128,.35)}
.type{background:var(--panel);border-radius:14px;padding:20px;box-shadow:0 0 0 1px var(--line)}.type .ui-s{font:700 34px/1.15 var(--ui);letter-spacing:-.02em}.type pre{margin:10px 0 0;font:15px/1.5 var(--mono);white-space:pre-wrap}
</style></head><body>
${sprite}
<main>
<div class="hero">${inline('simbolo.svg', '', 'style="height:88px"')}<div><h1>Identidad de Editor C</h1><p class="mut">Logo, color, tipografía y íconos del editor. Todo se dibujó a mano en SVG, sin bibliotecas ni fuentes descargadas; esta página funciona sin conexión.</p></div></div>

<h2>La idea</h2>
<p><b>Una C y el cursor de texto.</b> El símbolo es la letra C del nombre con la barra del cursor al lado: lo que el alumno <i>tipea</i>, que es el método del editor (nada se escribe solo). Tiene una segunda lectura, sutil, para la electrónica: la C curva y la barra recta son las dos placas del capacitor en un esquema (C también es la sigla de la capacidad), con el espacio libre entre ellas.</p>
<p>Se probaron cuatro ideas (hoja de abajo). Se descartaron la C hecha con las barras de un diagrama Nassi-Shneiderman (solo la entiende quien ya conoce el método y no escala bien a 16 px), el capacitor solo (pierde la C y parece un esquema de circuito) y la C con guion bajo (lo mismo que un cursor, pero más débil y sin vínculo con la materia).</p>
<img src="${img('exploracion.svg')}" alt="Cuatro ideas de logo: C con cursor (elegida), C de diagrama N-S, placas de capacitor y C con guion bajo" style="width:100%;max-width:820px;border-radius:14px">

<h2>Construcción</h2>
<div class="row"><div>${grilla}</div><div style="flex:1 1 280px">
<p>Grilla de 64 × 64 con una unidad base <b>u = 7</b> (el ancho del trazo). Todo sale de ahí:</p>
<ul><li>La <b>C</b> es un arco de centro (29, 32) y radio de eje 19,5; el radio exterior es 23 (≈ 3,3 u). Se corta a ±45° con extremos redondos.</li>
<li>El <b>cursor</b> es una barra del mismo trazo a x = 54, tan alta como la distancia entre los extremos de la C (18,2 → 45,8): los extremos redondos quedan alineados y la barra cierra la boca sin tocarla (hueco de ≈ 0,5 u).</li>
<li>El <b>nombre</b> usa la misma pluma (trazo 7, extremos redondos): alto de mayúscula 46 (= el diámetro de la C), altura de x 32. La «C» del nombre es el propio símbolo.</li></ul>
<p class="mut">La geometría vive en <code>tools/identidad/marca.js</code>; <code>node tools/generar-identidad.js</code> regenera todos los SVG.</p></div></div>

<h2>Variantes</h2>
<div class="grid">
<div class="cell cl">${inline('simbolo.svg', '', 'style="height:72px"')}<small>Símbolo, a color</small></div>
<div class="cell os">${inline('simbolo-oscuro.svg', '', 'style="height:72px"')}<small>Símbolo, para fondo oscuro</small></div>
<div class="cell mo">${inline('simbolo-mono.svg', '', 'style="height:72px"')}<small>Monocromo (usa el color del texto)</small></div>
<div class="cell ac">${inline('simbolo-mono-blanco.svg', '', 'style="height:72px"')}<small>Monocromo blanco sobre el color de acento</small></div>
</div>
<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-top:12px">
<div class="cell cl">${inline('nombre-horizontal.svg', '', 'style="width:100%;max-width:300px"')}<small>Nombre horizontal</small></div>
<div class="cell os">${inline('nombre-horizontal-oscuro.svg', '', 'style="width:100%;max-width:300px"')}<small>Nombre horizontal, fondo oscuro</small></div>
<div class="cell mo">${inline('nombre-horizontal-mono.svg', '', 'style="width:100%;max-width:300px"')}<small>Nombre horizontal, monocromo</small></div>
<div class="cell cl">${inline('nombre-apilado.svg', '', 'style="height:150px"')}<small>Nombre apilado</small></div>
<div class="cell os">${inline('nombre-apilado-oscuro.svg', '', 'style="height:150px"')}<small>Nombre apilado, fondo oscuro</small></div>
<div class="cell mo">${inline('nombre-apilado-mono.svg', '', 'style="height:150px"')}<small>Nombre apilado, monocromo</small></div>
</div>
<p class="mut">Archivos: <code>simbolo*.svg</code>, <code>nombre-horizontal*.svg</code>, <code>nombre-apilado*.svg</code> en esta misma carpeta.</p>

<h2>Ícono de la app y favicon</h2>
<div class="row">
<div><img class="app" src="${img('app-icono.svg')}" alt="Ícono de la app"><p class="mut">Ícono «any» (192 y 512 px)</p></div>
<div>${seguro}<p class="mut">«Maskable»: el símbolo queda dentro del círculo seguro (radio 40 %)</p></div>
<div><img src="${png('apple-touch-icon.png')}" width="90" height="90" alt="apple-touch-icon" style="border-radius:20px;display:block"><p class="mut">apple-touch-icon 180 px</p></div>
<div style="background:#fff;padding:16px;border-radius:14px;box-shadow:0 0 0 1px var(--line)"><img src="${png('favicon-16.png')}" width="16" height="16" alt=""> <img src="${png('favicon-32.png')}" width="32" height="32" alt=""> <img src="${png('favicon-48.png')}" width="48" height="48" alt=""><p style="color:#66666d;font-size:13px;margin:6px 0 0">favicon 16, 32 y 48 px (el SVG cambia de color en pestañas oscuras)</p></div>
<div><img src="${png('splash-claro.png')}" height="170" alt="Pantalla de inicio" style="border-radius:12px;box-shadow:0 0 0 1px var(--line)"> <img src="${png('splash-oscuro.png')}" height="170" alt="Pantalla de inicio oscura" style="border-radius:12px;box-shadow:0 0 0 1px var(--line)"><p class="mut">Pantalla de inicio de iPhone (claro y oscuro). En Android la arma el sistema con el ícono y <code>background_color</code>.</p></div>
</div>
<p>El fondo del ícono es el grafito <code>${FONDO_APP}</code>, la C va en <code>${COL.oscuro.tinta}</code> y el cursor en <code>${COL.oscuro.acento}</code>. El manifest declara <code>background_color: ${FONDO_APP}</code> (igual al ícono, para que no haya salto al abrir) y <code>theme_color: #141517</code>; en la página hay dos <code>&lt;meta name="theme-color"&gt;</code>, una para cada modo.</p>

<h2>Color</h2>
<p>Neutros grises y un solo color de acento, el del cursor del logo: un verde azulado (turquesa petróleo) que no se parece a ningún estado. Rojo, ámbar y verde se reservan para error, aviso y correcto, y nunca van solos: siempre llevan un ícono de forma distinta (círculo con cruz, triángulo, círculo con tilde) y un texto.</p>
<div class="tbls">${tabla(L, 'Claro')}${tabla(D, 'Oscuro')}</div>
<p class="mut">Contrastes calculados con la fórmula de WCAG 2.1. Mínimo 4,5 : 1 para texto y 3 : 1 para bordes de campos; <code>node tools/ui-smoke.js</code> los vuelve a verificar en los tres temas.</p>

<h2>Tipografía</h2>
<div class="type"><div class="ui-s">Escribí, ejecutá, probá</div><p class="mut" style="margin-top:6px">Interfaz: <code>${L.ui.replace(/"/g, '&quot;')}</code></p>
<pre>#include &lt;stdio.h&gt;
int main() { printf("Hola\\n"); return 0; }</pre><p class="mut" style="margin-top:6px">Código y consola: <code>${L.mono.replace(/"/g, '&quot;')}</code></p></div>
<p>Solo fuentes del sistema (San Francisco en iPhone y Mac, Segoe UI en Windows, Roboto en Android): no se descarga nada. Escala: 13 (notas y rótulos de grupo), 15–16 (cuerpo y controles), 18 (título de barra), 26–28 (título de hoja). Pesos 400, 500, 600 y 700. El nombre «Editor C» del logo no es una fuente: son trazos propios.</p>

<h2>Íconos de la interfaz</h2>
<p>Grilla de 24 px, zona viva de 18 px, trazo de 1,75 px, extremos y uniones redondos, esquinas de radio 2,5. Rellenos solo en ejecutar, detener y el primer escalón de «pista». Sprite en <code>iconos.svg</code>.</p>
<div class="icons">${iconos}</div>

<h2>Ejemplos de uso</h2>
<div class="row">
<div class="ui"><h4>Botones</h4><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="btn p"><svg class="i" style="color:inherit"><use href="#i-ejecutar"/></svg>Ejecutar</span><span class="btn"><svg class="i"><use href="#i-captura"/></svg>Captura</span><span class="btn d"><svg class="i" style="color:inherit"><use href="#i-detener"/></svg>Detener</span></div>
<h4>Selector segmentado</h4><div class="seg"><span>Automático</span><span class="on">Claro</span><span>Oscuro</span></div>
<h4>Estados</h4><div class="est e"><svg class="i" style="color:inherit"><use href="#i-error"/></svg>Error · línea 3</div><div class="est w"><svg class="i" style="color:inherit"><use href="#i-aviso"/></svg>Aviso · línea 7</div><div class="est k"><svg class="i" style="color:inherit"><use href="#i-ok"/></svg>Terminó (código 0)</div></div>
<div class="ui"><h4>Lista agrupada</h4><div class="lst"><div><span>Mostrar espacios</span><span class="sw2" style="background:var(--fill);box-shadow:inset 0 0 0 1px var(--lineS)"><i style="position:absolute;top:3px;left:3px;width:25px;height:25px;border-radius:50%;background:var(--lineS)"></i></span></div><div><span>Cerrar solo llaves y comillas</span><span class="sw2"></span></div><div><span>Programas</span><svg class="i" style="color:var(--muted)"><use href="#i-derecha"/></svg></div></div></div>
</div>

<h2>Guía de uso</h2>
<h3>Margen mínimo</h3>
<p>Alrededor del logo queda libre, como mínimo, <b>3 u</b> (el triple del ancho del trazo; en el símbolo de 46 px de alto son 21 px). Nada de texto, bordes ni imágenes dentro de ese margen.</p>
<div class="clear">${inline('simbolo.svg', '')}</div>
<h3>Tamaños mínimos</h3>
<ul><li>Símbolo: <b>16 px</b> de alto en pantalla (usar <code>favicon.svg</code>, con el trazo más grueso, por debajo de 24 px) y <b>6 mm</b> impreso.</li>
<li>Nombre horizontal: <b>72 px</b> de ancho en pantalla y <b>20 mm</b> impreso. Por debajo de eso, usar solo el símbolo.</li>
<li>Nombre apilado: <b>64 px</b> de ancho.</li></ul>
<h3>Qué no hacer</h3>
<div class="dont">
<figure><div class="cell cl x">${inline('simbolo.svg', '', 'style="height:64px;transform:scaleX(1.5)"')}<small></small></div><figcaption>No estirar ni deformar.</figcaption></figure>
<figure><div class="cell cl x"><svg viewBox="${M.BBOX.x0} ${M.BBOX.y0} ${M.BBOX.x1 - M.BBOX.x0} ${M.BBOX.y1 - M.BBOX.y0}" style="height:64px" fill="none" stroke-width="7" stroke-linecap="round"><path d="${M.ARCO}" stroke="#c2261b"/><path d="${M.BARRA}" stroke="#2c7339"/></svg></div><figcaption>No cambiar los colores (el cursor es el acento; la C, la tinta).</figcaption></figure>
<figure><div class="cell ac x">${inline('simbolo.svg', '', 'style="height:64px"')}</div><figcaption>No poner el logo a color sobre el acento: usar el monocromo blanco.</figcaption></figure>
<figure><div class="cell cl x"><svg viewBox="${M.BBOX.x0} ${M.BBOX.y0} ${M.BBOX.x1 - M.BBOX.x0} ${M.BBOX.y1 - M.BBOX.y0}" style="height:64px" fill="none" stroke-width="7" stroke-linecap="round"><path d="${M.ARCO}" stroke="#1c1c1e"/><path d="M54 ${M.f(M.CY - 8)}V${M.f(M.CY + 8)}" stroke="#0a7580"/></svg></div><figcaption>No cambiar las proporciones (largo del cursor, boca de la C).</figcaption></figure>
<figure><div class="cell cl x"><span style="font:700 40px var(--ui);color:#1c1c1e">Editor C</span></div><figcaption>No reemplazar el nombre por una fuente: usar los SVG.</figcaption></figure>
<figure><div class="cell cl x" style="background:linear-gradient(135deg,#7c5cff,#2fb7ff)">${inline('simbolo-mono-blanco.svg', '', 'style="height:64px"')}</div><figcaption>Sin degradados, sombras, brillos ni efectos; ni sobre fondos con degradado o fotos.</figcaption></figure>
</div>
<h3>Qué no entra en la interfaz</h3>
<p>Sin emoji, sin íconos de chispa, estrella o varita, sin tarjetas iguales en grilla con ícono, título y descripción, sin degradados ni cristal esmerilado, sin ilustraciones genéricas, sin textos grises diminutos (el mínimo es 13 px y 4,5 : 1). Los controles se reconocen por su forma y su texto, no solo por el color.</p>
</main></body></html>`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
};

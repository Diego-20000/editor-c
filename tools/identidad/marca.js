// Geometría de la marca «Editor C». Un solo lugar para las medidas: de acá salen todos los SVG (tools/generar-identidad.js)
// y el dibujo del logo sobre el canvas de la captura de entrega (src/app.js lleva una copia chica de estas constantes).
//
// Construcción del símbolo (grilla de 64 × 64; el símbolo ocupa x 6 → 57,5 e y 9 → 55):
//   · u  = 7        ancho del trazo; es la unidad de todo (márgenes, tamaño mínimo, separación entre letras).
//   · C  = arco de centro (29, 32) y radio de eje 19,5 → radio exterior 23 (= 3,3 u), cortado a ±45° con extremos redondos.
//   · |  = barra vertical (el cursor de texto) a x = 54, del alto de los extremos de la C (de y 18,2 a 45,8), mismo trazo.
//   Los extremos redondos de la C y los de la barra quedan alineados en horizontal: la barra «cierra» la boca de la C sin tocarla
//   (hueco libre de 3,6 → ≈ 0,5 u).
const U = 7, R = 19.5, CX = 29, CY = 32, CORTE = Math.PI / 4, CARET_X = 54;
const f = (n) => String(+n.toFixed(2));
const tx = CX + R * Math.cos(CORTE), ty0 = CY - R * Math.sin(CORTE), ty1 = CY + R * Math.sin(CORTE);
const ARCO = `M${f(tx)} ${f(ty0)}A${R} ${R} 0 1 0 ${f(tx)} ${f(ty1)}`;
const BARRA = `M${CARET_X} ${f(ty0)}V${f(ty1)}`;
const BBOX = { x0: CX - R - U / 2, x1: CARET_X + U / 2, y0: CY - R - U / 2, y1: CY + R + U / 2 };

// Letras del nombre, dibujadas con la misma pluma (trazo U, extremos y uniones redondos). Alto de mayúscula = 46 (= diámetro de la C),
// altura de x = 32. Cada letra: ancho, trazo (path), círculos de trazo (bowl) y puntos rellenos; su borde izquierdo va en x = 0.
const H = U / 2, yB = 55 - H, yX = 23 + H, yC = 9 + H, ROx = 12.5, yO = (yX + yB) / 2;
const LETRAS = {
  E: { ancho: 26.5, d: `M${H + 19.5} ${yC}H${H}V${yB}H${H + 19.5}M${H} 32H${H + 17}` },
  d: { ancho: 32, d: `M${16 + ROx} ${yC}V${yB}`, rings: [[16, yO, ROx]] },
  i: { ancho: 7, d: `M${H} ${yX}V${yB}`, dots: [[H, 12.9, 3.9]] },
  t: { ancho: 25.5, d: `M${H} ${yX}H${H + 18.5}M10 17.5V44a7.5 7.5 0 0 0 7.5 7.5H19.5` },
  o: { ancho: 32, rings: [[16, yO, ROx]] },
  r: { ancho: 21, d: `M${H} ${yX}V${yB}M${H} ${yO}A${ROx} ${ROx} 0 0 1 ${H + ROx} ${yX}H${H + 14}` },
  C: { ancho: 40.3, d: `M${f(tx - 6)} ${f(ty0)}A${R} ${R} 0 1 0 ${f(tx - 6)} ${f(ty1)}` }   // la C suelta, sin cursor (nombre apilado)
};
// separaciones entre letras (borde exterior con borde exterior): rectas 8, redondas 4–6; cuenta a mano, mirada a ojo en 16, 24 y 96 px
const SEP = { Ed: 6, di: 8, it: 6, to: 4, or: 6 };
// devuelve el SVG (sin color: hereda stroke/fill) de la palabra con su borde izquierdo en x0 y el x donde termina
function palabra(txt, x0, color) {
  let x = x0, out = '', prev = null;
  for (const ch of txt) {
    if (prev) x += SEP[prev + ch] !== undefined ? SEP[prev + ch] : 6;
    const l = LETRAS[ch];
    out += `<g transform="translate(${f(x)} 0)">` + (l.d ? `<path d="${l.d}"/>` : '') + (l.rings || []).map(([cx, cy, r]) => `<circle cx="${cx}" cy="${f(cy)}" r="${r}"/>`).join('') +
      (l.dots || []).map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color || 'currentColor'}" stroke="none"/>`).join('') + '</g>';
    x += l.ancho; prev = ch;
  }
  return { svg: out, fin: x };
}
module.exports = { U, R, CX, CY, CARET_X, ARCO, BARRA, BBOX, palabra, f };

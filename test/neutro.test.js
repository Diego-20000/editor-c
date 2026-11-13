// Español neutro: en lo que lee el alumno no debe quedar voseo («usá», «tenés», «vos», «fijate»…) ni términos fuera de la materia.
// uso: node test/neutro.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SALTAR = new Set(['codigo_mal', 'codigo_bien', 'ejemplo', 'como_se_usa', 'codigo_editor_actual', 'entrada', 'resultado', 'buscar', 'errores_ids', 'elemento', 'id', 'categoria', 'rol', 'que_dice_gcc']);
function* textos(o) {
  if (Array.isArray(o)) { for (const v of o) yield* textos(v); }
  else if (o && typeof o === 'object') { for (const k of Object.keys(o)) if (!SALTAR.has(k)) yield* textos(o[k]); }
  else if (typeof o === 'string') yield o;
}
const L = 'A-Za-zÁÉÍÓÚáéíóúñÑ';
const IMPERATIVO = new RegExp('(?<![' + L + '])[' + L + ']{2,}[áéí](?![' + L + '])|(?<![' + L + '])[' + L + ']{2,}[áéí]s(?![' + L + '])', 'g');
const OK = new Set('está ahí allá acá aquí así allí qué sí cómo más también además después demás menú café papá mamá todavía día días tampoco país cuál quién dónde cuándo estás entonces jamás atrás detrás quizás través mientras paréntesis revés inglés japonés francés interés cortés compás mes anís esté dé mí corté conté probé recibirá interpretará leerá quizá será podrá hará verá dará irá habrá tendrá sabrá saldrá vendrá aparecerá mostrará dependerá recorrerá cambiará ejecutará devolverá aceptará seguirá funcionará servirá quedará pasará imprimirá producirá estará caché encontré'.split(' '));
const ENCLITICOS = /(?<![A-Za-zÁÉÍÓÚáéíóúñÑ])(escribilo|probalo|pasale|asignale|sacalo|comparalo|declarala|ponelo|guardalo|inicializalo|copialo|usala|hacelo|dejalo|borralo|mandalo|mandale|cambiale|agregale|ejecutalo|reemplazalo|fijate|decime|asegurate|preguntate|vos)(?![A-Za-zÁÉÍÓÚáéíóúñÑ])/gi;
const PROHIBIDOS = /(?<![A-Za-zÁÉÍÓÚáéíóúñÑ])(sólo|tipea\w*|tipear\w*|pisarlo|se queja|advertencias?)(?![A-Za-zÁÉÍÓÚáéíóúñÑ])/gi;
let total = 0, fallas = 0;
function revisar(nombre, texto) {
  total++;
  const malos = [];
  for (const m of texto.matchAll(IMPERATIVO)) if (!OK.has(m[0].toLowerCase())) malos.push(m[0]);
  for (const m of texto.matchAll(ENCLITICOS)) malos.push(m[0]);
  for (const m of texto.matchAll(PROHIBIDOS)) malos.push(m[0]);
  if (malos.length) { fallas++; console.log('FALLA  ' + nombre + ': ' + Array.from(new Set(malos)).slice(0, 8).join(', ') + (malos.length > 8 ? ' …' : '')); }
}
for (const f of fs.readdirSync(path.join(ROOT, 'kb', 'errores')).filter((x) => x.endsWith('.json'))) revisar('kb/errores/' + f, Array.from(textos(JSON.parse(fs.readFileSync(path.join(ROOT, 'kb', 'errores', f), 'utf8')))).join('\n'));
for (const f of ['lecciones.json', 'ayuda.json']) revisar('kb/' + f, Array.from(textos(JSON.parse(fs.readFileSync(path.join(ROOT, 'kb', f), 'utf8')))).join('\n'));
for (const f of ['NOMBRES', 'PUNTUACION', 'LITERALES', 'OPERADORES', 'BIBLIOTECA']) revisar('kb/nuevo/' + f + '.json', Array.from(textos(JSON.parse(fs.readFileSync(path.join(ROOT, 'kb', 'nuevo', f + '.json'), 'utf8')))).join('\n'));
// en el código solo se miran los textos entre comillas (los comentarios y nombres internos no los lee el alumno)
const LIT = /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;
for (const f of ['app.js', 'compiler.js', 'kb.js', 'runtime.js', 'compartir.js', 'nombres.js', 'examples.js']) revisar('src/' + f, (fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').match(LIT) || []).join('\n'));
revisar('src/template.html', fs.readFileSync(path.join(ROOT, 'src', 'template.html'), 'utf8'));
for (const f of ['README.md', 'docs/PARA_DOCENTES.md']) revisar(f, fs.readFileSync(path.join(ROOT, f), 'utf8'));
console.log((total - fallas) + '/' + total + ' archivos sin voseo');
process.exit(fallas ? 1 : 0);

/* Editor C: aviso de navegador no compatible. Va PRIMERO y está escrito con JavaScript antiguo (sin const, flechas ni plantillas) para que
   pueda ejecutarse hasta en un navegador que no entienda el resto del editor. Si el navegador cumple lo que el editor necesita, no hace nada.
   Necesita: BigInt (Chrome 67, Edge 79, Firefox 68, Safari 14) y la etiqueta <dialog> con showModal (Chrome 37, Edge 79, Firefox 98, Safari 15.4). */
(function () {
  'use strict';
  var faltan = [];
  if (typeof BigInt !== 'function') faltan.push('BigInt');
  if (typeof HTMLDialogElement === 'undefined' || typeof HTMLDialogElement.prototype.showModal !== 'function') faltan.push('ventanas');
  if (typeof Promise === 'undefined') faltan.push('Promise');
  if (!faltan.length) return;

  function poner() {
    if (!document.body || document.getElementById('compat')) return;
    var capa = document.createElement('div');
    capa.id = 'compat';
    capa.setAttribute('role', 'alert');
    var s = capa.style;
    s.position = 'fixed'; s.left = '0'; s.top = '0'; s.right = '0'; s.bottom = '0'; s.zIndex = '2147483647';
    s.background = '#17181b'; s.color = '#f2f2f4'; s.overflow = 'auto'; s.padding = '24px 16px'; s.boxSizing = 'border-box';
    s.fontFamily = 'Arial, Helvetica, sans-serif'; s.fontSize = '16px'; s.lineHeight = '1.5';
    var caja = document.createElement('div');
    caja.style.maxWidth = '560px'; caja.style.margin = '0 auto';
    var h = document.createElement('h1');
    h.textContent = 'Tu navegador es muy viejo para Editor C';
    h.style.fontSize = '22px'; h.style.margin = '0 0 12px';
    var p = document.createElement('p');
    p.textContent = 'El editor necesita un navegador más nuevo. Con el que estás usando no puede ejecutar tus programas. Los programas que guardaste en este navegador siguen ahí: los verás cuando lo actualices.';
    p.style.margin = '0 0 12px';
    var l = document.createElement('ul');
    l.style.paddingLeft = '20px'; l.style.margin = '0 0 12px';
    var items = [
      'Microsoft Edge o Google Chrome: ábrelos y busca «Acerca de» en el menú (o escribe edge://settings/help o chrome://settings/help) para que se actualicen solos.',
      'Firefox: necesita la versión 98 o más nueva.',
      'Si la computadora no se puede actualizar, abre el editor desde tu celular.'
    ];
    for (var i = 0; i < items.length; i++) { var li = document.createElement('li'); li.textContent = items[i]; li.style.marginBottom = '6px'; l.appendChild(li); }
    var f = document.createElement('p');
    f.textContent = 'Detalle técnico: falta ' + faltan.join(', ') + '.';
    f.style.fontSize = '13px'; f.style.opacity = '0.7'; f.style.margin = '0';
    caja.appendChild(h); caja.appendChild(p); caja.appendChild(l); caja.appendChild(f);
    capa.appendChild(caja);
    document.body.appendChild(capa);
  }
  if (document.body) poner();
  else if (document.addEventListener) document.addEventListener('DOMContentLoaded', poner);
})();

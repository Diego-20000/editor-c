/* Configuración del editor. WHATSAPP_NUMERO: número de Diego con código de país y sin + ni espacios
   (por ejemplo '5491112345678'). Vacío = el botón abre WhatsApp sin destinatario. */
(function (root) {
  'use strict';
  var CONFIG = { WHATSAPP_NUMERO: '', VERSION: 'ef28cd46b4d7' };
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
  else root.CONFIG = CONFIG;
})(typeof self !== 'undefined' ? self : this);

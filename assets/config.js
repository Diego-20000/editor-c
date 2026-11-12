/* Editor C, de Diego Segurotti (ArtPrograms Studio). Uso libre dentro de este sitio, sin fines comerciales. Prohibido copiar, redistribuir o vender sin permiso. PolyForm Strict License 1.0.0. */
/* Configuración del editor. WHATSAPP_NUMERO: número de Diego con código de país y sin + ni espacios
   (por ejemplo '5491112345678'). Vacío = el botón abre WhatsApp sin destinatario. */
(function (root) {
  'use strict';
  var CONFIG = { WHATSAPP_NUMERO: '5491137781528', VERSION: 'bad8bc9f41e5' };
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
  else root.CONFIG = CONFIG;
})(typeof self !== 'undefined' ? self : this);

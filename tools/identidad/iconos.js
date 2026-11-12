// Íconos de la interfaz: grilla de 24 px, zona viva de 18 px (3 → 21), trazo de 1,75 px, extremos y uniones redondos,
// esquinas de rectángulos con radio 2,5 (1 en las piezas chicas), sin relleno salvo ejecutar, detener y los escalones de «pista».
// Un punto se dibuja como un trazo de largo 0,1 con extremos redondos (queda del diámetro del trazo).
// Se dibujaron uno por uno; ninguno viene de una biblioteca. Cada entrada: [id, nombre en pantalla, dónde se usa, contenido SVG].
const F = 'fill="currentColor"';
module.exports = [
  ['ejecutar', 'Ejecutar', 'botón primario de la barra', `<path d="M8 5.6v12.8L19 12z" ${F}/>`],
  ['detener', 'Detener', 'detiene el programa', `<rect x="6.5" y="6.5" width="11" height="11" rx="2.2" ${F}/>`],
  ['programas', 'Programas', 'lista de programas guardados', `<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.6 8.5h6.8M8.6 12h6.8M8.6 15.5h4"/>`],
  ['ayuda', 'Ayuda', 'buscador de dudas', `<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1.9-1.1 1.8"/><path d="M12 16.7v.1"/>`],
  ['ajustes', 'Ajustes', 'tema, ayuda, escritura', `<path d="M4 8h8.5M17.5 8H20M4 16h2.5M11.5 16H20"/><circle cx="15" cy="8" r="2.5"/><circle cx="9" cy="16" r="2.5"/>`],
  ['buscar', 'Buscar', 'buscar y reemplazar', `<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.4 15.4L20 20"/>`],
  ['lectura', 'Modo lectura', 'solo el código, sin distracciones', `<path d="M12 6.8C10.2 5.4 7.6 4.8 4.5 5.2v12.6c3.1-.4 5.7.2 7.5 1.6 1.8-1.4 4.4-2 7.5-1.6V5.2c-3.1-.4-5.7.2-7.5 1.6zM12 6.8v12.6"/>`],
  ['compartir', 'Compartir', 'enviar la captura', `<path d="M12 14.5V4M8.2 7.7L12 3.9l3.8 3.8"/><path d="M8.5 10H7a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2h-1.5"/>`],
  ['copiar', 'Copiar', 'copiar la salida', `<rect x="8.5" y="8.5" width="11" height="12" rx="2.5"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>`],
  ['borrar', 'Borrar', 'borrar un programa o un caso', `<path d="M4.5 7h15M9.5 7V5.2c0-.9.7-1.7 1.7-1.7h1.6c1 0 1.7.8 1.7 1.7V7M6.5 7l.8 11.2c.1 1 .9 1.8 2 1.8h5.4c1.1 0 1.9-.8 2-1.8L17.5 7M10 11v5M14 11v5"/>`],
  ['cerrar', 'Cerrar', 'cierra hojas y avisos', `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`],
  ['pista', 'Pista', 'pistas de menos a más', `<rect x="4.5" y="14.5" width="4" height="5.5" rx="1" ${F}/><rect x="10" y="9.5" width="4" height="10.5" rx="1"/><rect x="15.5" y="4" width="4" height="16" rx="1"/>`],
  ['aviso', 'Aviso', 'advertencia (no impide ejecutar)', `<path d="M10.6 4.8L3.5 17.2c-.7 1.2.2 2.8 1.6 2.8h13.8c1.4 0 2.3-1.6 1.6-2.8L13.4 4.8c-.7-1.2-2.1-1.2-2.8 0z"/><path d="M12 9.8v3.9"/><path d="M12 16.9v.1"/>`],
  ['error', 'Error', 'error de compilación', `<circle cx="12" cy="12" r="9"/><path d="M9.1 9.1l5.8 5.8M14.9 9.1l-5.8 5.8"/>`],
  ['info', 'Información', 'datos y notas', `<circle cx="12" cy="12" r="9"/><path d="M12 11v5.2"/><path d="M12 7.8v.1"/>`],
  ['ok', 'Correcto', 'terminó bien', `<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.7 2.7 5.5-5.5"/>`],
  ['captura', 'Captura', 'imagen para entregar', `<path d="M4 8.5v-2a2 2 0 0 1 2-2h2M16 4.5h2a2 2 0 0 1 2 2v2M20 15.5v2a2 2 0 0 1-2 2h-2M8 19.5H6a2 2 0 0 1-2-2v-2"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.5"/>`],
  ['descargar', 'Descargar', 'guardar un archivo', `<path d="M12 4v10.5M7.8 10.7l4.2 4.2 4.2-4.2"/><path d="M5 19.5h14"/>`],
  ['subir', 'Importar', 'traer un archivo', `<path d="M12 15.5V5M7.8 9.2L12 5l4.2 4.2"/><path d="M5 19.5h14"/>`],
  ['mas', 'Nuevo', 'nuevo programa', `<path d="M12 5v14M5 12h14"/>`],
  ['mas-menu', 'Más', 'más opciones', `<circle cx="12" cy="12" r="9"/><path d="M8 12v.1M12 12v.1M16 12v.1"/>`],
  ['abajo', 'Abajo', 'desplegar, siguiente coincidencia', `<path d="M6 9.5l6 6 6-6"/>`],
  ['arriba', 'Arriba', 'anterior coincidencia', `<path d="M6 14.5l6-6 6 6"/>`],
  ['derecha', 'Derecha', 'entrar a un ítem', `<path d="M9.5 6l6 6-6 6"/>`],
  ['editar', 'Cambiar nombre', 'renombrar', `<path d="M5 19l.9-3.8L16.4 4.7a1.9 1.9 0 0 1 2.7 0l.2.2a1.9 1.9 0 0 1 0 2.7L8.8 18.1z"/><path d="M14.4 6.8l2.8 2.8"/>`],
  ['entrada', 'Entrada', 'datos para scanf', `<path d="M9 4.5h6M9 19.5h6M12 4.5v15"/>`],
  ['limpiar', 'Limpiar', 'vaciar la consola', `<path d="M4.5 15.2L12.7 7c.7-.7 1.8-.7 2.5 0l3.3 3.3c.7.7.7 1.8 0 2.5L12.4 19H8.2z"/><path d="M9.6 10.1l5.3 5.3M13 19h7"/>`],
  ['quees', '¿Qué es esto?', 'explica una palabra del código', `<path d="M6.2 4.6l11.6 5.2-4.9 1.7-1.7 4.9z"/><path d="M14.4 14.4l4.4 4.4"/>`],
  ['avisar', 'Avisar a Diego', 'mandar un caso por WhatsApp', `<path d="M6.5 4h11A2.5 2.5 0 0 1 20 6.5v6a2.5 2.5 0 0 1-2.5 2.5h-6L7.5 19v-4h-1A2.5 2.5 0 0 1 4 12.5v-6A2.5 2.5 0 0 1 6.5 4z"/><path d="M8.6 8.2h6.8M8.6 11.4h4"/>`],
  ['dispositivo', 'Otro dispositivo', 'pasar el programa a otro dispositivo', `<path d="M3.5 12h7M8 9.2l2.8 2.8L8 14.8"/><rect x="13.5" y="5.5" width="7" height="13" rx="2"/><path d="M17 15.6v.1"/>`],
  ['abrir', 'Abrir', 'abrir un archivo .c', `<path d="M3.5 7.5a2 2 0 0 1 2-2h3.7l2 2.2h7.3a2 2 0 0 1 2 2v7.3a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>`],
  ['check', 'Listo', 'marca de selección', `<path d="M5.5 12.5l4.2 4.2 8.8-8.9"/>`]
];

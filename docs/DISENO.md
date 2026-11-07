# Dirección de diseño: «hoja de cuaderno»

Se eligió **una sola** dirección y se lleva hasta el final: el editor es una hoja de cuaderno de carpeta.
Es lo que ya hace el alumno en la materia (algoritmo y diagrama en papel, lapicera azul para lo propio, roja para lo que se corrige).
No hay decoración: cada elemento de «cuaderno» cumple una función al estudiar.

## La idea en tres líneas

1. **Papel y tinta.** Fondo de hoja (crema muy clara de día, grafito de noche), texto en tinta casi negra, una sola tinta de acento (azul lapicera) y una sola tinta de corrección (roja). Nada más compite por la atención.
2. **Renglones y margen.** El código se escribe sobre renglones tenues, alineados con cada línea, y con la raya roja de margen junto a los números. Sirve para seguir la línea con la vista; no es adorno.
3. **Lo tipeado se distingue.** Azul = lo que puso el alumno (datos de entrada); negro = lo que imprime el programa; rojo = lo que hay que corregir. Esa regla vale en el editor, en la consola, en los diálogos y en la captura que se entrega.

Por qué no un osciloscopio o un «terminal hacker»: quedan vistosos pero cansan, y la consigna es leer bien y dar calma. Por qué no la plantilla azul-violeta: no tiene que ver con nada de la materia.

## Paleta

Todas las parejas texto/fondo se verificaron con la fórmula WCAG 2.1 (luminancia relativa). Mínimo exigido: 4,5:1 para texto; 3:1 para bordes de controles de texto.

### Claro («papel»)

| Uso | Valor | Sobre hoja `#fbf9f2` | Sobre escritorio `#ece8dc` |
|---|---|---|---|
| Hoja (paneles) `--panel` | `#fbf9f2` | | |
| Escritorio (fondo de página) `--bg` | `#ece8dc` | | |
| Hoja 2 (barras, consola) `--panel2` | `#f2efe4` | | |
| Texto `--text` (tinta) | `#1c2230` | 15,1:1 | 13,0:1 |
| Texto secundario `--muted` | `#565b6b` | 6,4:1 | 5,5:1 |
| Acento `--accent` (azul lapicera) | `#1f4a8c` | 8,3:1 | 7,1:1 |
| Error `--danger` (lapicera roja) | `#b3261e` | 6,2:1 | 5,3:1 |
| Aviso `--warn` (ocre) | `#85500a` | 6,3:1 | 5,4:1 |
| Lo tipeado `--input` | `#1b4f9c` | 7,5:1 | 6,5:1 |
| Correcto `--ok` | `#1d6b43` | 6,2:1 | 5,3:1 |
| Números de línea `--gut` | `#686b73` | 5,1:1 | 4,4:1 (no se usan sobre escritorio) |
| Borde fuerte `--lineS` (campos de texto) | `#8a8573` | 3,5:1 | |

Sintaxis (sobre la hoja): tipos `#1f4a8c` 8,3 · palabras de control `#9a3412` 6,9 · cadenas `#2c6a3b` 6,2 · números `#0f6068` 6,9 · funciones `#5b3f8c` 7,9 · `#include` `#7a5a1e` 6,0 · comentarios `#656770` 5,3 (cursiva).

### Oscuro («grafito»)

| Uso | Valor | Sobre hoja `#181b21` | Sobre escritorio `#101216` |
|---|---|---|---|
| Texto (tiza) | `#e8e6df` | 13,8:1 | 15,0:1 |
| Secundario | `#a4a8b0` | 7,2:1 | 7,9:1 |
| Acento | `#8db4f0` | 8,2:1 | 8,9:1 |
| Error | `#ff8f85` | 7,8:1 | 8,5:1 |
| Aviso | `#e6b45a` | 9,1:1 | 9,9:1 |
| Lo tipeado | `#9cc0ff` | 9,4:1 | 10,2:1 |
| Correcto | `#7fd0a0` | 9,4:1 | 10,2:1 |
| Números de línea | `#8b9099` | 5,4:1 | 5,8:1 |
| Borde fuerte | `#6b7280` | 3,6:1 | |

Sintaxis: tipos `#8db4f0` 8,2 · control `#eba07a` 8,1 · cadenas `#9cc9a0` 9,3 · números `#6fc4c8` 8,6 · funciones `#c6aaea` 8,5 · `#include` `#c9b27a` 8,3 · comentarios `#8f949c` 5,7.

Regla de color: **nunca el color solo**. Los errores llevan además ondulado, marca en el margen y el texto «error»; lo tipeado lleva subrayado punteado; el estado «ejecutando» lleva un cartel con texto. En la captura impresa en blanco y negro la diferencia se sostiene por peso (negrita), subrayado y renglón.

Los valores exactos están como variables CSS en `src/app.css` (`:root`). El tema automático usa `prefers-color-scheme`; los temas «claro» y «oscuro» se eligen en Ajustes.

## Tipografía (solo fuentes del sistema; no se carga nada de la red)

- Interfaz: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- Código y consola: `ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`.
- Escala (px): 11 (etiquetas en mayúscula, `kbd`), 12 (ayuda secundaria, contadores), 13 (cuerpo de paneles), 14 (cuerpo de diálogos y botones), 16 (campos de texto en celular: evita el zoom de iOS), 18 (títulos de diálogo), 20 (nombre en la captura). Código: 15 px por defecto (ajustable 11 a 26), interlineado 1,5 para que los renglones coincidan con los del fondo.
- Pesos: 400 y 600 (700 solo en etiquetas chicas en mayúscula). Sin cursivas decorativas: la cursiva es solo de los comentarios.
- **Fuente propia: pendiente.** Una monoespaciada con licencia libre (SIL OFL) embebida en el repo mejoraría la identidad, pero hay que descargarla y revisar su licencia, y eso lo decide Diego. Mientras tanto se usa la del sistema.

## Espaciado, radios, bordes, sombras

- Espaciado: múltiplos de 4 (4, 8, 12, 16, 24). Margen lateral mínimo 16 px en celular.
- Radios: **2 px** en botones, campos y chips; 0 en las hojas (paneles); 3 px en diálogos y burbuja. Nada de tarjetas redondeadas.
- Bordes: 1 px `--line`. Campos de texto: `--lineS` (3:1). Foco: contorno de 2 px en `--accent` con 2 px de separación, siempre visible.
- Sombras: **ninguna** salvo el menú desplegable y la burbuja, que usan un borde fuerte y un desplazamiento duro de 2 px (como una hoja apoyada), sin difuminado.
- Objetivos táctiles: 44 px en pantallas táctiles.

## Íconos

SVG propios en una grilla de 24 px, trazo de 1,75 px, extremos y uniones redondeados, sin relleno (salvo ▶ y ■ que van rellenos). Los trazos no son los de ninguna biblioteca: son geométricos y simples (play, stop, ayuda, programas, cámara, ajustes, lupa, libro, flecha, cerrar). Cero emoji. La marca es una «C» de lapicera dentro de un cuadrado de 2 px de radio.

## Movimiento

Casi nada: transición de 120 ms en el color de bordes y del divisor. El cartel «ejecutando» es estático (rayado fijo, sin animación). Con `prefers-reduced-motion: reduce` se anula toda transición.

## Detalles de estudio (no ayudan a escribir)

Línea actual resaltada · pareja de llave/paréntesis del cursor (y aviso si no tiene pareja) · guías de sangría tenues · mostrar espacios (opcional) · tamaño de sangría 2/3/4/8 · renglones de cuaderno (opcional) · cartel «Ejecutando…» / «Esperando datos» · modo lectura sin distracciones (tecla R no se usa: botón y Esc para salir) · contador «Lín / Col» legible · hoja de atajos. Nada de autocompletado ni cierre automático (sigue apagado por defecto).

## Qué NO se va a hacer

- Degradados, glassmorphism, sombras difusas, tarjetas redondeadas, bordes izquierdos de color como énfasis (la raya roja es el margen del cuaderno y está solo en el editor y la captura).
- Paleta azul-violeta de plantilla, neones, «modo hacker».
- Emoji como íconos, ilustraciones de relleno, mascotas, confeti.
- Fuentes de la red, CDN, imágenes remotas, analítica.
- Animaciones que distraigan (rebotes, parpadeos, brillos); el cursor del texto es el del navegador.
- Ocultar información para «verse limpio»: la ayuda por niveles sigue siendo mensaje primero, pistas a pedido.
- Cambiar textos funcionales o el comportamiento del editor (autocierre apagado, pistas, WhatsApp, etc.).

## La captura de entrega

Tiene que parecer una hoja de carpeta: cabecera con apellido y nombre, curso, materia, ciclo, nombre del programa y fecha; filete doble bajo la cabecera; secciones «Código», «Datos de entrada» y «Salida» con título subrayado; código sobre renglones con raya de margen; datos tipeados en negrita y subrayados (así se distinguen impresos en blanco y negro); línea de proceso al pie. Fondo blanco, tinta oscura, nada de gris claro que se pierda en una impresora.

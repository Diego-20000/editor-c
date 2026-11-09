# Dirección de diseño: neutro, tipo iPhone

Reemplaza a la dirección anterior («hoja de cuaderno»), que Diego rechazó: no la pidió y se notaba hecha por una máquina.
El pedido: estilo **neutro pero lindo, tipo iPhone**; que funcione en **claro, oscuro y automático**; que **no parezca hecho con IA**; y una **identidad propia** (logo y todo lo que lo acompaña). La página `docs/identidad/index.html` lo muestra armado (logo, paleta, íconos, ejemplos y guía).

## Idea en tres líneas

1. **Lenguaje de iOS, con criterio.** Tipografía del sistema, títulos grandes con aire, listas agrupadas con filetes finos (no tarjetas con sombra), controles nativos reinterpretados (interruptores, selectores segmentados, botón primario relleno, botones de texto en el color de acento), hojas que suben desde abajo en el celular y diálogos centrados en escritorio.
2. **Un solo acento, nacido del logo.** Grises neutros y un turquesa petróleo: el del cursor de la marca. Rojo, ámbar y verde solo para error, aviso y correcto, siempre con un ícono de forma distinta y un texto.
3. **Cada cosa tiene su razón.** Una unidad (u = 7 en el logo; múltiplos de 4 en la interfaz), un trazo (1,75 px en los íconos), un radio por tipo de objeto. Sin decoración: sin degradados, sin cristal, sin ilustraciones, sin emoji, sin sombras salvo en lo que flota (menús, avisos, hojas).

## Logo

**Idea: una C y el cursor de texto.** La C del nombre con la barra del cursor al lado: lo que el alumno tipea, que es el método del editor. Segunda lectura, sutil: la C curva y la barra recta son las placas de un capacitor en un esquema (C también es la sigla de la capacidad). No hay circuitos decorativos, engranajes, bombillas ni chispas.

Construcción (grilla de 64, unidad u = 7 = ancho del trazo): arco de centro (29, 32), radio de eje 19,5 (exterior 23), cortado a ±45° con extremos redondos; barra de cursor a x = 54, del mismo trazo, del alto entre los extremos de la C (18,2 a 45,8), con un hueco de ≈ 0,5 u. El nombre usa la misma pluma (mayúscula 46 = diámetro de la C, altura de x 32). La geometría está en `tools/identidad/marca.js`; `node tools/generar-identidad.js` regenera los SVG y la página, y `node tools/generar-iconos.js` los PNG.

Ideas probadas (`docs/identidad/exploracion.svg`): A C con cursor (**elegida**); B C hecha con barras de diagrama Nassi-Shneiderman (solo la entiende quien ya conoce el método y no escala a 16 px); C placas de capacitor solas (pierde la C); D C con guion bajo (cursor más débil, sin vínculo con la materia).

Archivos en `docs/identidad/`: `simbolo.svg`, `simbolo-oscuro.svg`, `simbolo-mono.svg`, `simbolo-mono-blanco.svg`; `nombre-horizontal*.svg` y `nombre-apilado*.svg` (a color, oscuro, mono); `app-icono.svg`, `app-icono-maskable.svg`; `favicon.svg`; `pantalla-inicio*.svg`; `iconos.svg`; y en `app/`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180), `favicon-16/32/48.png`, `favicon.ico`, `splash-claro.png`, `splash-oscuro.png`. `build.js` los copia a `assets/`; el sprite de íconos va incrustado en la página (también en `dist/editor-c.html`, que lleva el favicon como `data:`).

Márgenes y tamaños: margen libre mínimo 3 u; símbolo mínimo 16 px (por debajo de 24 px se usa `favicon.svg`, con trazo más grueso); nombre horizontal mínimo 72 px. Qué no hacer: estirar, cambiar colores o proporciones, poner el logo a color sobre el acento, reemplazar el nombre por una fuente, agregar efectos.

PWA: `manifest.webmanifest` con `background_color #17181b` (igual al fondo del ícono, sin salto al abrir) y `theme_color #141517`; dos `<meta name="theme-color">` (`#f2f2f4` claro, `#141517` oscuro) y, si el usuario elige un tema a mano, `app.js` ajusta ambas. Pantalla de inicio: PNG para iPhone de 390 × 844 (claro y oscuro) con `apple-touch-startup-image`; en Android la arma el sistema con el ícono y el color de fondo.

## Paleta

Los valores están como variables en `src/app.css` (`:root` es el claro; el oscuro está en `:root[data-theme="dark"]` y repetido bajo `prefers-color-scheme: dark` para el modo automático; una prueba verifica que sean idénticos). Contrastes con la fórmula de WCAG 2.1 sobre la superficie (`--panel`). Mínimo: 4,5:1 en texto, 3:1 en bordes de campos.

Superficies claro: página `#f2f2f4`, hojas `#ffffff`, secundaria `#f7f7f8`. Oscuro (grafito, no negro): página `#141517`, hojas `#1c1d20`, secundaria `#232428`.

### Claro

| Uso | Valor | Contraste |
|---|---|---|
| Texto `--text` | `#1c1c1e` | 17,0:1 |
| Texto secundario `--muted` | `#66666d` | 5,7:1 |
| Acento `--accent` | `#0a7580` | 5,4:1 |
| Error `--danger` | `#c2261b` | 5,9:1 |
| Aviso `--warn` | `#8a5200` | 6,4:1 |
| Correcto `--ok` | `#1c7a3a` | 5,4:1 |
| Código: control `--kw` | `#a8390c` | 6,5:1 |
| Código: tipos `--ty` | `#0a6e78` | 6,0:1 |
| Código: cadenas `--st` | `#2c7339` | 5,8:1 |
| Código: números `--nu` | `#8a5200` | 6,4:1 |
| Código: funciones `--fn` | `#2a5fa3` | 6,4:1 |
| Código: #include `--pp` | `#7a6420` | 5,7:1 |
| Código: comentarios `--co` | `#6a6c74` | 5,2:1 |
| Números de línea `--gut` | `#6c6d74` | 5,2:1 |
| Borde de campos `--lineS` | `#8a8a91` | 3,4:1 (mínimo 3) |
| Texto del botón primario sobre `--accent` | `#ffffff` | 5,4:1 |

### Oscuro

| Uso | Valor | Contraste |
|---|---|---|
| Texto `--text` | `#f2f2f4` | 15,1:1 |
| Texto secundario `--muted` | `#a3a4ab` | 6,8:1 |
| Acento `--accent` | `#3cc4cd` | 8,0:1 |
| Error `--danger` | `#ff8b80` | 7,4:1 |
| Aviso `--warn` | `#f0b556` | 9,2:1 |
| Correcto `--ok` | `#70d08c` | 8,9:1 |
| Código: control `--kw` | `#f09a6c` | 7,7:1 |
| Código: tipos `--ty` | `#4fd0d8` | 9,1:1 |
| Código: cadenas `--st` | `#8fd19a` | 9,4:1 |
| Código: números `--nu` | `#e8b86a` | 9,2:1 |
| Código: funciones `--fn` | `#8fb4ee` | 8,0:1 |
| Código: #include `--pp` | `#c9b36f` | 8,2:1 |
| Código: comentarios `--co` | `#8e9099` | 5,3:1 |
| Números de línea `--gut` | `#85868e` | 4,7:1 |
| Borde de campos `--lineS` | `#6f7077` | 3,4:1 (mínimo 3) |
| Texto del botón primario sobre `--accent` | `#06191b` | 8,6:1 |

Regla de color: **nunca el color solo**. Error = círculo con cruz + texto «Error»; aviso = triángulo + «Aviso»; correcto = círculo con tilde; en el margen del editor el error es un punto redondo y el aviso un triángulo. Lo que el alumno tipea en la consola se distingue de lo que imprime el programa por el **matiz y el peso** (turquesa y negrita), no por una «lapicera».

## Tipografía (solo del sistema; no se carga nada)

- Interfaz: `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, sans-serif`.
- Código y consola: `ui-monospace, "SF Mono", Menlo, Consolas, monospace`.
- Escala (px): 13 (notas y rótulos de grupo), 15–16 (cuerpo y controles; 16 en campos para que iOS no haga zoom), 18 (barra), 26–28 (título de hoja). Código 15 por defecto (11 a 26). Pesos 400, 500, 600, 700.
- **Fuente propia: pendiente.** Una monoespaciada libre (SIL OFL) embebida daría más identidad, pero hay que descargarla y revisar la licencia: lo decide Diego.

## Espaciado, radios, bordes

- Espaciado en múltiplos de 4 (8, 12, 16, 20); margen lateral 16 en la barra, 12 entre hojas.
- Radios: 8 en botones chicos, 10 en botones y campos, 12 en listas agrupadas, 14 en hojas, diálogos y menús, 16 arriba en las hojas del celular. Cápsulas solo en estados.
- Filetes de 1 px (`--line`) en vez de tarjetas; foco de 2 px en `--accent`, siempre visible. Objetivos táctiles de 44 px en pantallas táctiles.
- Sombras: solo en lo que flota (menú, aviso, burbuja, diálogo), muy suaves; ninguna en las hojas.

## Componentes

Barra superior sobria (sin desenfoque: no hay nada que pase por debajo); botón primario relleno (Ejecutar) y el resto de texto con ícono en el acento; selector segmentado para Editor/Consola (celular), tema y nivel de ayuda; interruptores para el resto de los ajustes, en listas agrupadas; hojas modales con asa en celular y centradas en escritorio; menú «Más» como lista con filetes; avisos oscuros tipo iOS.

## Íconos

Conjunto propio de 30 íconos en `docs/identidad/iconos.svg` (generado por `tools/identidad/iconos.js`): grilla de 24, zona viva de 18, trazo 1,75, extremos y uniones redondos, esquinas de radio 2,5, rellenos solo en ejecutar, detener y el primer escalón de «pista». Se usan con `<use href="#i-nombre">` desde un sprite incrustado: funciona por `file://` y sin red.

## Ayudas de lectura del editor (se conservan)

Línea actual resaltada · pareja de llave/paréntesis del cursor (y aviso si no tiene pareja) · guías de sangría · mostrar espacios (opcional) · tamaño de sangría configurable · modo lectura · cartel «ejecutando» (sin rayas ni animación). Se quitaron los renglones de fondo, el margen rojo, la hoja crema y los subrayados punteados.

## Imagen de la captura de entrega

PNG (2×) con fondo blanco: cabecera con nombre, curso, materia y ciclo a la izquierda y programa y fecha a la derecha, filete fino, secciones CÓDIGO / DATOS DE ENTRADA / SALIDA en mayúscula, código con números de línea en un recuadro de radio 10, salida sobre gris muy claro, línea de evidencia de proceso (si el alumno la activó) y, al pie, la marca discreta (C y cursor, mismo trazo) con «Editor C». Se lee impresa en blanco y negro: texto casi negro, lo tipeado y los tipos en negrita, nada depende solo del color.

## Movimiento

Mínimo: 120–260 ms en fondos, interruptores y entrada de hojas. Con `prefers-reduced-motion: reduce` se anula todo.

## Qué no se hace

Degradados, cristal esmerilado, sombras difusas en las hojas, tarjetas iguales en grilla con ícono + título + descripción, emoji, íconos de chispa/estrella/varita, ilustraciones genéricas, paleta violeta-azul de plantilla, textos grises de menos de 13 px o con menos de 4,5:1, color como única señal.

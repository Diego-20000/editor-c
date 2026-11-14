# Editor C para docentes

Editor de C que corre en el navegador del alumno, en español, sin cuentas, sin anuncios y sin servidor. Pensado para que el alumno **piense y escriba**. Gratis para usar con tus alumnos dentro del sitio (licencia PolyForm Strict, ver `LICENSE`).

**Enlace:** https://diego-20000.github.io/editor-c/ (pásalo siempre **con la barra final**: sin conexión, la dirección sin barra no abre, porque queda fuera del alcance de la copia que guarda el navegador).

## Antes de la clase
- **No hace falta nada instalado ni una cuenta.** Se abre desde el celular o la compu.
- **Funciona sin internet** después de la primera visita (se puede «agregar a la pantalla de inicio» para tenerlo como app). Si la red de la escuela bloquea el sitio, se puede bajar un archivo único (`dist/editor-c.html`, en el repositorio) y abrirlo con doble clic.
- Los programas quedan guardados en **el dispositivo del alumno**, en el navegador. Si borra los datos del navegador, se pierden: puede usar «Guardar .c» o «Exportar todo».

## Cómo elegir la ayuda que reciben (con el enlace que les pasas)
| Enlace | Qué pasa cuando el programa no compila o falla |
|---|---|
| `…/editor-c/` (o `?ayuda=1`) | **Ayuda apagada.** Solo dice que no compiló o falló y de qué tipo general. El alumno tiene que encontrar el error mirando el código. |
| `…/editor-c/?ayuda=2` | **Indica la línea** del problema y nada más. Sin explicaciones ni pistas. |

El alumno también puede cambiar la ayuda en Ajustes, y queda guardado en su dispositivo. El enlace decide el punto de partida.

## Pruebas de funcionamiento
En el menú «Más» → **«Pruebas»** el alumno guarda varias entradas con su programa (por ejemplo «el 6 justo», «todo en cero»), las ejecuta todas juntas y baja **una sola captura** con el código y todas las pruebas. Es lo que pide la Unidad 4 (4.3 Pruebas). Las pruebas se guardan en su dispositivo, junto con el programa.

## Ordenar código
En «Más» → **«Ordenar»** el editor acomoda la sangría y los espacios del programa, sin cambiar lo que hace (no toca nombres, números, textos ni comentarios). Es opcional: el alumno lo elige y lo puede deshacer con Ctrl+Z. Sirve para entregar capturas prolijas y para ver qué llave quedó sin cerrar.

## Qué entrega el alumno
El botón **Captura** arma una imagen PNG con su nombre, curso y materia (los carga una vez en Ajustes), el código, los datos de entrada y la salida. La sube a Classroom o la manda por donde prefieras. Se puede elegir la disposición (código y salida lado a lado o uno abajo del otro).

## Pasar un programa a los alumnos
En el menú «Más» → **«Pasar a otro dispositivo»** se arma un enlace con el programa adentro. Lo envías por WhatsApp o Classroom y al abrirlo, el alumno ve una vista previa y decide si lo abre como programa nuevo. El programa viaja dentro del enlace: no se sube a ningún servidor. Sirve para dar un código inicial para completar.

## Qué compila y qué no
Pensado para el C de la materia: `char`, `int`, `float`, `double`, `long`, `unsigned`, `printf`/`scanf` con sus formatos, `if`, `switch`, `for`, `while`, funciones con prototipos, arreglos, textos y `math.h`. Los resultados se comparan contra gcc 13 en más de 200 programas.
**No soporta todavía:** punteros en general, `struct`, `enum`, `typedef`, archivos, `long double`, `sscanf`, `strchr`/`strstr`/`strtok`. Si el programa usa algo así, el editor lo dice con claridad. Qué se promete y qué no: `docs/COMPATIBILIDAD.md`.

## Privacidad
En Ajustes → **«Privacidad»** el alumno encuentra, en lenguaje simple, qué se guarda en su dispositivo, qué sale solo si él lo elige y qué no hace nunca el editor. La captura avisa que lleva los datos cargados en Ajustes.


- El código del alumno **no sale de su dispositivo**. No hay cuentas ni analítica.
- La única salida de datos es **el botón «Avisar a Diego»**: el alumno escribe qué pasó, ve la vista previa de todo lo que se enviaría (sin nombre ni datos personales) y recién ahí lo manda por WhatsApp. Nunca se envía solo.

## Problemas o ideas
Escríbele al autor, Diego Segurotti (ArtPrograms Studio), con «Avisar a Diego» desde el editor o por el repositorio: https://github.com/Diego-20000/editor-c

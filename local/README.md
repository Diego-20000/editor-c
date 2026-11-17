# Versión local de Editor C (con gcc real)

Un lanzador en Go (`main.go`, un solo `.exe` de ~8 MB) que:
1. sirve el editor ya construido (`index.html` + `assets/`, embebidos) en `http://127.0.0.1:8137/` (puerto fijo a propósito: el navegador guarda los programas por dirección);
2. si hay un gcc en `gcc/bin/` junto al programa (o `EDITORC_GCC`), habilita `/api/info` y `/api/gcc`, y el editor muestra el botón «gcc real» (compila con `-std=gnu99 -Wall -Wextra` y ejecuta con la «Entrada», 5 s de tope).

Seguridad: solo escucha en 127.0.0.1; la API exige el `Host` propio, mismo origen (`Sec-Fetch-Site`) y un token por ejecución; se rechaza otro nombre de host. Con ayuda nivel 1 no se muestran los mensajes de gcc (que dirían dónde está el error). El sitio publicado y `file://` no hacen ningún pedido: el botón solo se busca si el editor se abrió desde 127.0.0.1/localhost.

## Armar
- Linux (pruebas): `node build.js && bash local/build.sh linux`, luego `node tools/ui-local.js`.
- Windows: `bash local/build.sh windows` → `local/EditorC.exe`.
- El paquete para alumnos (`EditorC-local/`: `EditorC.exe`, `gcc/` recortado, `LEEME.txt`, `PROBAR.bat`) se armó con un script aparte desde el zip de WinLibs (gcc 13.3.0 UCRT, ~67 MB, ~28 MB en zip). Los binarios no se suben al repositorio.

## Pendiente de probar en Windows 10 real
Que `gcc\bin\gcc` compile y ejecute (usar `PROBAR.bat`), que corra desde un pendrive, qué dice el antivirus/SmartScreen (el `.exe` no está firmado), y las diferencias MinGW vs Linux (`long` de 4 bytes, `rand`, formatos).

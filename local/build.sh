#!/bin/bash
# Arma local/site con el sitio ya generado (node build.js) y compila el lanzador.
#   bash local/build.sh linux     -> local/editorc-local        (para pruebas)
#   bash local/build.sh windows   -> local/EditorC.exe          (para los alumnos)
set -e
cd "$(dirname "$0")"
rm -rf site && mkdir -p site/assets
cp ../index.html ../manifest.webmanifest site/ 2>/dev/null || cp ../index.html site/
cp ../assets/* site/assets/
case "${1:-linux}" in
  windows) GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o EditorC.exe . && echo "local/EditorC.exe" ;;
  *) CGO_ENABLED=0 go build -trimpath -o editorc-local . && echo "local/editorc-local" ;;
esac

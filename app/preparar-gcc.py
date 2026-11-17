#!/usr/bin/env python3
"""Arma app/gcc: la parte mínima de gcc 13.3 (WinLibs, UCRT, 64 bits) que hace falta para compilar C.
Baja el zip de WinLibs, verifica su suma SHA-256 y extrae solo los archivos de gcc-archivos.txt.
Lo usa el armado de la app en GitHub Actions; se puede correr a mano en Windows o Linux."""
import hashlib, os, shutil, sys, urllib.request, zipfile

URL = 'https://github.com/brechtsanders/winlibs_mingw/releases/download/13.3.0posix-11.0.1-ucrt-r1/winlibs-x86_64-posix-seh-gcc-13.3.0-mingw-w64ucrt-11.0.1-r1.zip'
SHA256 = '6c90485da4d9966683a83a1e5f3a0b1084d2a5ba2e57e8b27c0634afe3983776'
AQUI = os.path.dirname(os.path.abspath(__file__))
DESTINO = os.path.join(AQUI, 'gcc')
ZIP = os.path.join(AQUI, 'winlibs.zip')

if not os.path.exists(ZIP):
    print('Bajando WinLibs (unos 227 MB)...')
    urllib.request.urlretrieve(URL, ZIP)
h = hashlib.sha256()
with open(ZIP, 'rb') as f:
    for bloque in iter(lambda: f.read(1 << 20), b''):
        h.update(bloque)
if h.hexdigest() != SHA256:
    sys.exit('La suma SHA-256 no coincide: ' + h.hexdigest())
lista = [l.strip() for l in open(os.path.join(AQUI, 'gcc-archivos.txt'), encoding='utf-8') if l.strip()]
shutil.rmtree(DESTINO, ignore_errors=True)
with zipfile.ZipFile(ZIP) as z:
    for rel in lista:
        dst = os.path.join(DESTINO, *rel.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with z.open('mingw64/' + rel) as a, open(dst, 'wb') as b:
            shutil.copyfileobj(a, b)
os.remove(ZIP)
print('gcc listo:', len(lista), 'archivos en', DESTINO)

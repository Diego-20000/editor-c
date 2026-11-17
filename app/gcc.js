'use strict';
// gcc real (opcional, apagado por defecto en la interfaz): compila el programa del alumno y lo ejecuta con su entrada.
// El programa corre como un programa común de la computadora (con los permisos del usuario): por eso hay límites de
// tiempo y de salida, y se corta todo el árbol de procesos si se pasa.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX_MENSAJES = 64 << 10, MAX_SALIDA = 1 << 20, T_COMPILAR = 25000, T_EJECUTAR = 5000;
const WIN = process.platform === 'win32';

function entorno(gccRuta) {
  const bin = path.dirname(gccRuta);
  const env = Object.assign({}, process.env);
  const k = Object.keys(env).find((x) => x.toUpperCase() === 'PATH') || 'PATH';
  env[k] = bin + path.delimiter + (env[k] || '');
  return env;
}

function matar(hijo) {
  try {
    if (WIN) spawnSync('taskkill', ['/pid', String(hijo.pid), '/T', '/F'], { windowsHide: true });
    else process.kill(-hijo.pid, 'SIGKILL');
  } catch (e) { try { hijo.kill('SIGKILL'); } catch (x) { /* ya terminó */ } }
}

// corre un programa y junta lo que escribe (stdout y stderr juntos) hasta un tope
function correr(cmd, args, { cwd, env, entrada, tiempo, max }) {
  return new Promise((resolve) => {
    let salida = '', cortada = false, vencio = false, listo = false;
    const hijo = spawn(cmd, args, { cwd, env, windowsHide: true, detached: !WIN, stdio: ['pipe', 'pipe', 'pipe'] });
    const juntar = (d) => { if (salida.length < max) { salida += d.toString('utf8'); if (salida.length > max) { salida = salida.slice(0, max); cortada = true; } } else cortada = true; };
    hijo.stdout.on('data', juntar); hijo.stderr.on('data', juntar);
    hijo.stdin.on('error', () => {});
    try { hijo.stdin.end(entrada || ''); } catch (e) { /* el programa no leyó */ }
    const t = setTimeout(() => { vencio = true; matar(hijo); }, tiempo);
    const fin = (codigo) => { if (listo) return; listo = true; clearTimeout(t); resolve({ salida: salida.replace(/\r\n/g, '\n'), codigo: codigo === null || codigo === undefined ? -1 : codigo, vencio, cortada }); };
    hijo.on('error', () => fin(-1));
    hijo.on('close', (c) => fin(c));
  });
}

async function compilarYEjecutar(gccRuta, { code, input }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'editorc-'));
  try {
    const fuente = path.join(dir, 'programa.c'), exe = path.join(dir, WIN ? 'programa.exe' : 'programa');
    fs.writeFileSync(fuente, String(code || ''), { mode: 0o600 });
    const env = entorno(gccRuta);
    const c = await correr(gccRuta, ['-std=gnu99', '-Wall', '-Wextra', '-o', exe, fuente, '-lm'], { cwd: dir, env, entrada: '', tiempo: T_COMPILAR, max: MAX_MENSAJES });
    const res = { compiled: false, messages: c.salida + (c.vencio ? '\n(la compilación tardó demasiado)' : ''), output: '', exit: 0, timeout: false, truncated: false };
    if (c.codigo !== 0 || c.vencio) return res;
    res.compiled = true;
    const e = await correr(exe, [], { cwd: dir, env, entrada: String(input || ''), tiempo: T_EJECUTAR, max: MAX_SALIDA });
    res.output = e.salida; res.truncated = e.cortada; res.timeout = e.vencio; res.exit = e.vencio ? -1 : e.codigo;
    return res;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function versionGcc(gccRuta) {
  try { const r = spawnSync(gccRuta, ['-dumpfullversion'], { env: entorno(gccRuta), windowsHide: true, timeout: 10000 }); return r.status === 0 ? r.stdout.toString().trim() : ''; } catch (e) { return ''; }
}

module.exports = { compilarYEjecutar, versionGcc };

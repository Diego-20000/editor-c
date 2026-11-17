// Editor C (versión local): sirve el editor en 127.0.0.1 y, si hay un gcc junto al programa,
// permite compilar y ejecutar con gcc real desde el botón «gcc real». Solo escucha en la propia
// computadora; el código del alumno no sale de ella.
package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

//go:embed all:site
var sitioFS embed.FS

const (
	puertoBase   = 8137 // fijo a propósito: el navegador guarda los programas por dirección (puerto incluido)
	maxCuerpo    = 1 << 20
	maxSalida    = 1 << 20
	tiempoCompil = 25 * time.Second
	tiempoEjec   = 5 * time.Second
)

var (
	token   string
	gccRuta string
	puerto  int
)

func buscarGcc() string {
	if v := os.Getenv("EDITORC_GCC"); v != "" {
		return v
	}
	exe, err := os.Executable()
	if err != nil {
		return ""
	}
	dir := filepath.Dir(exe)
	nombre := "gcc"
	if runtime.GOOS == "windows" {
		nombre = "gcc.exe"
	}
	for _, c := range []string{filepath.Join(dir, "gcc", "bin", nombre), filepath.Join(dir, "gcc", "mingw64", "bin", nombre)} {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return ""
}

// entorno del gcc: su carpeta bin primero en el PATH (ahí están sus bibliotecas .dll)
func entornoGcc() []string {
	env := os.Environ()
	if gccRuta == "" {
		return env
	}
	bin := filepath.Dir(gccRuta)
	sep := string(os.PathListSeparator)
	out := make([]string, 0, len(env)+1)
	hecho := false
	for _, e := range env {
		if strings.HasPrefix(strings.ToUpper(e), "PATH=") {
			out = append(out, e[:5]+bin+sep+e[5:])
			hecho = true
		} else {
			out = append(out, e)
		}
	}
	if !hecho {
		out = append(out, "PATH="+bin)
	}
	return out
}

func versionGcc() string {
	if gccRuta == "" {
		return ""
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, gccRuta, "-dumpfullversion")
	cmd.Env = entornoGcc()
	ocultar(cmd)
	b, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(b))
}

type tope struct {
	buf bytes.Buffer
	max int
	cor bool
}

func (t *tope) Write(p []byte) (int, error) {
	if t.buf.Len()+len(p) > t.max {
		t.cor = true
		p = p[:max(0, t.max-t.buf.Len())]
	}
	t.buf.Write(p)
	return len(p), nil // siempre se consume, para que el programa no se trabe
}

func normalizar(s string) string { return strings.ReplaceAll(s, "\r\n", "\n") }

// solo el propio navegador, en esta dirección, puede usar la API (contra otras páginas y contra DNS rebinding)
func origenValido(r *http.Request) bool {
	host := r.Host
	esperado := []string{fmt.Sprintf("127.0.0.1:%d", puerto), fmt.Sprintf("localhost:%d", puerto)}
	ok := false
	for _, e := range esperado {
		if host == e {
			ok = true
		}
	}
	if !ok {
		return false
	}
	// escribir la dirección en el navegador manda «none»; los pedidos de la API tienen que ser del mismo origen
	if s := r.Header.Get("Sec-Fetch-Site"); s != "" && s != "same-origin" && s != "none" {
		return false
	}
	if strings.HasPrefix(r.URL.Path, "/api/") && r.Header.Get("Sec-Fetch-Site") == "none" {
		return false
	}
	if o := r.Header.Get("Origin"); o != "" && o != "http://"+host {
		return false
	}
	return true
}

func json_(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func apiInfo(w http.ResponseWriter, r *http.Request) {
	if !origenValido(r) || gccRuta == "" {
		http.NotFound(w, r)
		return
	}
	json_(w, 200, map[string]any{"gcc": true, "version": versionGcc(), "so": runtime.GOOS, "token": token})
}

type pedido struct {
	Codigo  string `json:"code"`
	Entrada string `json:"input"`
}

type respuesta struct {
	Compila  bool   `json:"compiled"`
	Mensajes string `json:"messages"`
	Salida   string `json:"output"`
	Codigo   int    `json:"exit"`
	Tiempo   bool   `json:"timeout"`
	Cortada  bool   `json:"truncated"`
}

func apiGcc(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || !origenValido(r) || gccRuta == "" || r.Header.Get("X-Token") != token {
		http.NotFound(w, r)
		return
	}
	var p pedido
	if err := json.NewDecoder(io.LimitReader(r.Body, maxCuerpo)).Decode(&p); err != nil {
		json_(w, 400, map[string]string{"error": "pedido inválido"})
		return
	}
	dir, err := os.MkdirTemp("", "editorc-")
	if err != nil {
		json_(w, 500, map[string]string{"error": "sin carpeta temporal"})
		return
	}
	defer os.RemoveAll(dir)
	fuente := filepath.Join(dir, "programa.c")
	exe := filepath.Join(dir, "programa")
	if runtime.GOOS == "windows" {
		exe += ".exe"
	}
	if err := os.WriteFile(fuente, []byte(p.Codigo), 0o600); err != nil {
		json_(w, 500, map[string]string{"error": "no se pudo escribir"})
		return
	}
	res := respuesta{}

	ctx, cancel := context.WithTimeout(r.Context(), tiempoCompil)
	defer cancel()
	cc := exec.CommandContext(ctx, gccRuta, "-std=gnu99", "-Wall", "-Wextra", "-o", exe, fuente, "-lm")
	cc.Dir = dir
	cc.Env = entornoGcc()
	ocultar(cc)
	var msg tope
	msg.max = 64 << 10
	cc.Stdout, cc.Stderr = &msg, &msg
	errC := cc.Run()
	res.Mensajes = normalizar(msg.buf.String())
	if errC != nil {
		if ctx.Err() != nil {
			res.Mensajes += "\n(la compilación tardó demasiado)"
		}
		json_(w, 200, res)
		return
	}
	res.Compila = true

	ctx2, cancel2 := context.WithTimeout(r.Context(), tiempoEjec)
	defer cancel2()
	run := exec.CommandContext(ctx2, exe)
	run.Dir = dir
	run.Env = entornoGcc()
	ocultar(run)
	run.Stdin = strings.NewReader(p.Entrada)
	var out tope
	out.max = maxSalida
	run.Stdout, run.Stderr = &out, &out
	errR := run.Run()
	res.Salida = normalizar(out.buf.String())
	res.Cortada = out.cor
	if ctx2.Err() != nil {
		res.Tiempo = true
		res.Codigo = -1
	} else if errR != nil {
		if ee, ok := errR.(*exec.ExitError); ok {
			res.Codigo = ee.ExitCode()
		} else {
			res.Codigo = -1
		}
	}
	json_(w, 200, res)
}

func abrirNavegador(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	ocultar(cmd)
	_ = cmd.Start()
}

func main() {
	gccRuta = buscarGcc()
	b := make([]byte, 16)
	rand.Read(b)
	token = hex.EncodeToString(b)

	sub, err := fs.Sub(sitioFS, "site")
	if err != nil {
		fmt.Println("error interno:", err)
		os.Exit(1)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/info", apiInfo)
	mux.HandleFunc("/api/gcc", apiGcc)
	estatico := http.FileServer(http.FS(sub))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if !origenValido(r) {
			http.Error(w, "dirección no permitida", http.StatusForbidden)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		estatico.ServeHTTP(w, r)
	})

	var ln net.Listener
	for i := 0; i < 10; i++ {
		puerto = puertoBase + i
		ln, err = net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", puerto))
		if err == nil {
			break
		}
	}
	if ln == nil {
		fmt.Println("No se pudo abrir ningún puerto local:", err)
		fmt.Println("Presiona Enter para salir.")
		fmt.Scanln()
		os.Exit(1)
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/", puerto)
	fmt.Println("Editor C (versión local)")
	if gccRuta != "" {
		fmt.Println("gcc encontrado:", versionGcc())
	} else {
		fmt.Println("No se encontró gcc: el editor funciona igual, sin el botón «gcc real».")
	}
	fmt.Println("Abierto en", url)
	fmt.Println("Deja esta ventana abierta mientras uses el editor. Ciérrala para terminar.")
	if os.Getenv("EDITORC_NO_ABRIR") == "" {
		abrirNavegador(url)
	}
	srv := &http.Server{Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	if err := srv.Serve(ln); err != nil {
		fmt.Println(err)
	}
}

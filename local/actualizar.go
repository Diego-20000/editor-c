package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// Actualización automática del editor: al abrir el programa, si hay internet, se compara la versión publicada
// (la misma que usa el sitio: el hash que hay en sw.js) con la de la carpeta «editor». Si es más nueva, se bajan
// los archivos del editor (solo archivos públicos, nada del alumno). Sin internet o ante cualquier falla se sigue
// con lo que ya hay. Solo se reemplaza la carpeta «editor»: el .exe y gcc no se tocan.
const urlPublicada = "https://diego-20000.github.io/editor-c/"

var (
	reVersion = regexp.MustCompile(`const VERSION = '([0-9a-f]{12})'`)
	reFiles   = regexp.MustCompile(`const FILES = (\[[^\]]*\])`)
	reNombre  = regexp.MustCompile(`^[A-Za-z0-9_][A-Za-z0-9_./-]{0,120}$`)
)

func baseActualizacion() string {
	if v := os.Getenv("EDITORC_ACTUALIZAR_URL"); v != "" { // para pruebas con un servidor local
		return strings.TrimRight(v, "/") + "/"
	}
	return urlPublicada
}

func leerLimitado(c *http.Client, url string, max int64) ([]byte, error) {
	resp, err := c.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("http %d", resp.StatusCode)
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, max+1))
	if err != nil {
		return nil, err
	}
	if int64(len(b)) > max {
		return nil, fmt.Errorf("archivo demasiado grande")
	}
	return b, nil
}

// devuelve la versión instalada en la carpeta editor (o "" si no hay)
func versionLocal(dirEditor string) string {
	b, err := os.ReadFile(filepath.Join(dirEditor, "VERSION"))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(b))
}

// actualizar devuelve (nuevaVersion, true) si dejó una versión nueva en dirEditor
func actualizar(dirEditor, versionEmbebida string) (string, bool, error) {
	cli := &http.Client{Timeout: 20 * time.Second}
	base := baseActualizacion()
	if !strings.HasPrefix(base, "https://") && !strings.HasPrefix(base, "http://127.0.0.1") {
		return "", false, fmt.Errorf("dirección no permitida")
	}
	sw, err := leerLimitado(cli, base+"sw.js", 1<<20)
	if err != nil {
		return "", false, err
	}
	m := reVersion.FindSubmatch(sw)
	f := reFiles.FindSubmatch(sw)
	if m == nil || f == nil {
		return "", false, fmt.Errorf("sw.js sin versión")
	}
	nueva := string(m[1])
	actual := versionLocal(dirEditor)
	if actual == "" {
		actual = versionEmbebida
	}
	if nueva == actual {
		return nueva, false, nil
	}
	var nombres []string
	for _, x := range regexp.MustCompile(`"([^"]*)"`).FindAllSubmatch(f[1], -1) {
		n := string(x[1])
		if n == "./" || n == "sw.js" {
			continue
		}
		if !reNombre.MatchString(n) || strings.Contains(n, "..") {
			return "", false, fmt.Errorf("nombre de archivo no permitido: %q", n)
		}
		nombres = append(nombres, n)
	}
	if len(nombres) == 0 || len(nombres) > 200 {
		return "", false, fmt.Errorf("lista de archivos inválida")
	}
	tmp := dirEditor + ".nuevo"
	os.RemoveAll(tmp)
	if err := os.MkdirAll(tmp, 0o755); err != nil {
		return "", false, err
	}
	var total int64
	tieneIndex := false
	for _, n := range nombres {
		b, err := leerLimitado(cli, base+n, 8<<20)
		if err != nil {
			os.RemoveAll(tmp)
			return "", false, fmt.Errorf("%s: %v", n, err)
		}
		total += int64(len(b))
		if total > 40<<20 {
			os.RemoveAll(tmp)
			return "", false, fmt.Errorf("actualización demasiado grande")
		}
		dst := filepath.Join(tmp, filepath.FromSlash(n))
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			os.RemoveAll(tmp)
			return "", false, err
		}
		if err := os.WriteFile(dst, b, 0o644); err != nil {
			os.RemoveAll(tmp)
			return "", false, err
		}
		if n == "index.html" {
			tieneIndex = true
		}
	}
	if !tieneIndex {
		os.RemoveAll(tmp)
		return "", false, fmt.Errorf("falta index.html")
	}
	if err := os.WriteFile(filepath.Join(tmp, "VERSION"), []byte(nueva+"\n"), 0o644); err != nil {
		os.RemoveAll(tmp)
		return "", false, err
	}
	viejo := dirEditor + ".viejo"
	os.RemoveAll(viejo)
	if _, err := os.Stat(dirEditor); err == nil {
		if err := os.Rename(dirEditor, viejo); err != nil {
			os.RemoveAll(tmp)
			return "", false, err
		}
	}
	if err := os.Rename(tmp, dirEditor); err != nil {
		os.Rename(viejo, dirEditor) // se vuelve a lo anterior
		return "", false, err
	}
	os.RemoveAll(viejo)
	return nueva, true, nil
}

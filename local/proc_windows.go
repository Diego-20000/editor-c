//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// sin ventanitas negras al llamar a gcc ni al programa del alumno
func ocultar(c *exec.Cmd) {
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
}

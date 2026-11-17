//go:build !windows

package main

import "os/exec"

func ocultar(c *exec.Cmd) {}

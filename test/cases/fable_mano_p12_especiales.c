#include <stdio.h>
#include <math.h>
int main() { double I = INFINITY, N = NAN; printf("[%f][%F][%e][%g][%8.2f][%-8f][%08f][%+f]\n", I, I, I, I, I, I, I, I); printf("[%f][%5.1f][%-6f][%06f][% f]\n", -I, -I, -I, -I, I); printf("[%f][%F][%g][%8f]\n", N, N, N, N); printf("%f %f %g\n", -0.0, 0.0, -0.0); return 0; }

#include <stdio.h>
#define A 2
#define B (A + 3)
#define C B * B
#define SUMA(x, y) \
    ((x) + \
     (y))
#define TRES(f) f(1) + f(2) + f(3)
#define ID(x) x
#define LARGO 4
int main() { int V[LARGO] = {A, B, C, SUMA(A, B)}; printf("%d %d %d %d %d\n", V[0], V[1], V[2], V[3], 10 / C); printf("%d %d\n", TRES(ID), SUMA(SUMA(1, 2), SUMA(3, 4))); return 0; }

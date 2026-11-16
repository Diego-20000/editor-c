#include <stdio.h>
#define PI 3.14159
#define CUAD(x) ((x) * (x))
#define MALO(x) x * x
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define N 5
#define DOBLE_N (N * 2)
#define SALUDO "hola"
#define IMPRIME(v) printf("%d\n", v)
#define VACIA
int main() { int I = 3, V[DOBLE_N]; printf("%.2f %d %d %d %d\n", PI * CUAD(2), CUAD(I + 1), MALO(I + 1), MAX(I, 7), MAX(CUAD(2), N)); IMPRIME(N + 1); IMPRIME(sizeof(V) / sizeof(V[0])); printf(SALUDO " %s\n", SALUDO); VACIA printf("%d\n", -CUAD(-I)); return 0; }

#include <stdio.h>
#define MAXN 100
int TABLA[MAXN]; int CANT = 0; char NOMBRE[20] = "sin nombre"; float SUMA;
void agregar(int X) { TABLA[CANT] = X; CANT++; SUMA += X; }
int main() { int I; for (I = 0; I < 10; I++) agregar(I * 3); printf("%d %d %.1f %s %d\n", CANT, TABLA[9], SUMA, NOMBRE, TABLA[50]); return 0; }

// espera: limpio
#include <stdio.h>
int main() {
  int V, S, C;
  float PROM, A;
  /* Opción A: valor inicial forzado */
  V = 1; S = 0; C = 0;
  while (V != 0) {
    scanf("%d", &V);
    if (V != 0) { S = S + V; C++; }
  }
  printf("Suma: %d Cantidad: %d\n", S, C);
  /* Opción B: lectura adelantada */
  S = 0; C = 0; A = 0;
  scanf("%d", &V);
  while (V != 0) {
    S = S + V;
    A = A + V;
    C++;
    scanf("%d", &V);
  }
  if (C > 0) { PROM = A / C; printf("Promedio: %.2f\n", PROM); }
  else { printf("No hubo datos\n"); }
  return 0;
}

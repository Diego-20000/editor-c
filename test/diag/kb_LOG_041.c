// espera: W-centinela-procesado
// kb: LOG-041
#include <stdio.h>
int main() {
  int C, V;
  float S, PROM;
  S = 0; C = 0; V = 1;
  while (V != 0) {
    scanf("%d", &V);
    S = S + V;
    C++;
  }
  PROM = S / C;
  printf("Promedio: %.2f\n", PROM);
  return 0;
}

// espera: W-promedio-con-total
// kb: LOG-028
#include <stdio.h>
int main() {
  int N, E, C, i;
  float AE, PROM;
  N = 4;
  AE = 0;
  C = 0;
  for (i = 0; i < N; i++) { scanf("%d", &E); if (E >= 18) { AE = AE + E; C++; } }
  PROM = AE / N;
  printf("Edad promedio de mayores: %.2f\n", PROM);
  return 0;
}

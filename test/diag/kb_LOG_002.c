// espera: W-promedio-sin-parentesis
// kb: LOG-002
#include <stdio.h>
int main() {
  float N1, N2, PROM;
  scanf("%f %f", &N1, &N2);
  PROM = N1 + N2 / 2;
  printf("Promedio: %.2f\n", PROM);
  return 0;
}

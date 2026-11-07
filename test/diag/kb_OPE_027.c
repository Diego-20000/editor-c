// espera: W-asignacion-encadenada
// kb: OPE-027
#include <stdio.h>
int main() {
  int A;
  float B;
  A = B = 2.5;
  printf("%d %.1f\n", A, B);
  return 0;
}

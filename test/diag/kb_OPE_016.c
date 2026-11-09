// espera: W-asignacion-invertida
// kb: OPE-016
#include <stdio.h>
int main() {
  int SUMA = 0, I;
  for (I = 1; I <= 3; I++) {
    SUMA =+ I;
  }
  printf("%d\n", SUMA);
  return 0;
}

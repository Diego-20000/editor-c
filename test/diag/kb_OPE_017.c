// espera: W-doble-modificacion
// kb: OPE-017
#include <stdio.h>
int main() {
  int A = 5;
  A = A++;
  printf("%d\n", A);
  return 0;
}

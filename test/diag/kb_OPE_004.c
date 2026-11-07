// espera: W-and-de-bits
// kb: OPE-004
#include <stdio.h>
int main() {
  int A = 1, B = 2;
  if (A & B) printf("ambos distintos de cero\n");
  else printf("alguno es cero\n");
  return 0;
}

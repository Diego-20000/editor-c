// espera: W-comparacion-encadenada
// kb: OPE-009
#include <stdio.h>
int main() {
  int A = 2, B = 2, C = 2;
  if (A == B == C) printf("los tres iguales\n");
  else printf("hay alguno distinto\n");
  return 0;
}

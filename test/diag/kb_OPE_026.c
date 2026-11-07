// espera: W-coma-en-condicion
// kb: OPE-026
#include <stdio.h>
int main() {
  int A = 1, B = 9;
  if (A > 5, B > 5) printf("ambos mayores a 5\n");
  else printf("alguno no es mayor\n");
  return 0;
}

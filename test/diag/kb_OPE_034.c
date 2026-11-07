// espera: W-condicion-imposible
// kb: OPE-034
#include <stdio.h>
int main() {
  int X = 15;
  if (X < 0 && X > 10) printf("fuera de rango\n");
  else printf("en rango\n");
  return 0;
}

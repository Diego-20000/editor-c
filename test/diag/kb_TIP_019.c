// espera: W-truncamiento-centavos
// kb: TIP-019
#include <stdio.h>
int main() {
  double IMPORTE = 0.29;
  int CENT;
  CENT = IMPORTE * 100;
  printf("%d\n", CENT);
  return 0;
}

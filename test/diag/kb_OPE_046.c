// espera: W-decremento-en-condicion
// kb: OPE-046
#include <stdio.h>
int main() {
  int N = 3;
  while (N--) {
    printf("%d ", N);
  }
  printf("\n");
  return 0;
}

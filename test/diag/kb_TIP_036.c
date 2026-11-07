// espera: W-constante-desborda
// kb: TIP-036
#include <stdio.h>
int main() {
  int B;
  B = 100000 * 100000;
  printf("%d\n", B);
  return 0;
}

// espera: W-for-una-vuelta-mas
// kb: LOG-049
#include <stdio.h>
int main() {
  int VE1, VE2, A, i;
  scanf("%d %d", &VE1, &VE2);
  A = 0;
  for (i = 0; i <= VE2; i++) { A = A + VE1; }
  printf("Producto: %d\n", A);
  return 0;
}

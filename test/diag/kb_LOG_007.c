// espera: W-condicion-invertida
// kb: LOG-007
#include <stdio.h>
int main() {
  int A, B, MAYOR;
  scanf("%d %d", &A, &B);
  if (A < B) { MAYOR = A; }
  else { MAYOR = B; }
  printf("Mayor: %d\n", MAYOR);
  return 0;
}

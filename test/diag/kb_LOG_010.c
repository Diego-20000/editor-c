// espera: W-else-colgante
// kb: LOG-010
#include <stdio.h>
int main() {
  int A, B;
  scanf("%d %d", &A, &B);
  if (A > 0)
    if (B > 0) printf("Ambos positivos\n");
  else printf("A no es positivo\n");
  return 0;
}

// espera: W-calcular-antes-de-leer
// kb: LOG-006
#include <stdio.h>
int main() {
  int A, B, S;
  A = 0;
  B = 0;
  S = A + B;
  scanf("%d %d", &A, &B);
  printf("Suma: %d\n", S);
  return 0;
}

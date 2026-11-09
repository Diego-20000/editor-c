// espera: W-acumulador-reiniciado
// kb: LOG-024
#include <stdio.h>
int main() {
  int N, V, A, i;
  scanf("%d", &N);
  for (i = 0; i < N; i++) {
    A = 0;
    scanf("%d", &V);
    A = A + V;
  }
  printf("Suma: %d\n", A);
  return 0;
}

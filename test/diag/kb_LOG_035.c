// espera: W-contador-como-dato
// kb: LOG-035
#include <stdio.h>
int main() {
  int N, V, A, i;
  scanf("%d", &N);
  A = 0;
  for (i = 0; i < N; i++) {
    scanf("%d", &V);
    A = A + i;
  }
  printf("Suma: %d\n", A);
  return 0;
}

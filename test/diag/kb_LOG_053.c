// espera: W-for-variable-modificada
// kb: LOG-053
#include <stdio.h>
int main() {
  int N, V, S, i;
  scanf("%d", &N);
  S = 0;
  for (i = 0; i < N; i++) {
    scanf("%d", &V);
    S = S + V;
    i++;
  }
  printf("Suma: %d\n", S);
  return 0;
}

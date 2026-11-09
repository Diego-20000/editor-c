// espera: W-for-una-vuelta-menos
// kb: LOG-022
#include <stdio.h>
int main() {
  int N, V, S, i;
  scanf("%d", &N);
  S = 0;
  for (i = 1; i < N; i++) { scanf("%d", &V); S = S + V; }
  printf("Suma: %d\n", S);
  return 0;
}

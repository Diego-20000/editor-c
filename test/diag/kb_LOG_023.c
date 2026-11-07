// espera: W-for-una-vuelta-mas
// kb: LOG-023
#include <stdio.h>
int main() {
  int N, V, S, i;
  scanf("%d", &N);
  S = 0;
  for (i = 0; i <= N; i++) { scanf("%d", &V); S = S + V; }
  printf("Suma: %d\n", S);
  return 0;
}

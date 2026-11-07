// espera: W-contador-suma-dato
// kb: LOG-036
#include <stdio.h>
int main() {
  int N, V, CP, i;
  scanf("%d", &N);
  CP = 0;
  for (i = 0; i < N; i++) {
    scanf("%d", &V);
    if (V > 0) { CP = CP + V; }
  }
  printf("Positivos: %d\n", CP);
  return 0;
}

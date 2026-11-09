// espera: W-contador-en-uno
// kb: LOG-025
#include <stdio.h>
int main() {
  int N, V, CP, i;
  scanf("%d", &N);
  CP = 1;
  for (i = 0; i < N; i++) { scanf("%d", &V); if (V > 0) { CP++; } }
  printf("Positivos: %d\n", CP);
  return 0;
}

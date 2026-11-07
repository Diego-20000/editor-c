// espera: W-minimo-en-cero
// kb: LOG-029
#include <stdio.h>
int main() {
  int N, V, MENOR, i;
  MENOR = 0;
  N = 5;
  for (i = 0; i < N; i++) { scanf("%d", &V); if (V < MENOR) { MENOR = V; } }
  printf("Menor: %d\n", MENOR);
  return 0;
}

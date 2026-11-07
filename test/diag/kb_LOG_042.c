// espera: W-lectura-adelantada
// kb: LOG-042
#include <stdio.h>
int main() {
  int V, S;
  S = 0;
  scanf("%d", &V);
  while (V != 0) {
    scanf("%d", &V);
    S = S + V;
  }
  printf("Suma: %d\n", S);
  return 0;
}

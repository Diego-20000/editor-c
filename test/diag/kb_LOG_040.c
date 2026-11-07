// espera: W-lazo-no-entra
// kb: LOG-040
#include <stdio.h>
int main() {
  int V, S;
  S = 0;
  V = 0;
  while (V != 0) {
    scanf("%d", &V);
    if (V != 0) { S = S + V; }
  }
  printf("Suma: %d\n", S);
  return 0;
}

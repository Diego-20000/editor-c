// espera: W-cuenta-sin-mas-uno
// kb: LOG-019
#include <stdio.h>
int main() {
  int LI, LS, N;
  scanf("%d %d", &LI, &LS);
  N = LS - LI;
  printf("Cantidad con ambos extremos incluidos: %d\n", N);
  return 0;
}

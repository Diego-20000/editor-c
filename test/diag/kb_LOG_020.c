// espera: W-cuenta-con-mas-uno
// kb: LOG-020
#include <stdio.h>
int main() {
  int LI, LS, N;
  scanf("%d %d", &LI, &LS);
  N = LS - LI + 1;
  printf("Cantidad sin contar los extremos: %d\n", N);
  return 0;
}

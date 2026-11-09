// espera: W-mayor-de-tres
// kb: LOG-050
#include <stdio.h>
int main() {
  int A, B, C, MAYOR;
  scanf("%d %d %d", &A, &B, &C);
  if (A > B && A > C) { MAYOR = A; }
  else { MAYOR = B; }
  printf("Mayor: %d\n", MAYOR);
  return 0;
}

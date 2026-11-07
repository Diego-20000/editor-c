// espera: W-division-entera-formula
// kb: LOG-052
#include <stdio.h>
int main() {
  int A, B;
  float PORC;
  scanf("%d %d", &A, &B);
  PORC = A / B * 100;
  printf("Porcentaje: %.2f\n", PORC);
  return 0;
}

// espera: W-orden-lectura
// kb: LOG-001
#include <stdio.h>
int main() {
  int A, B, R;
  printf("Ingrese el minuendo (A) y el sustraendo (B): ");
  scanf("%d %d", &B, &A);
  R = A - B;
  printf("Resta: %d\n", R);
  return 0;
}

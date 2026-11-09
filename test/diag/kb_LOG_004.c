// espera: W-intercambio-sin-auxiliar
// kb: LOG-004
#include <stdio.h>
int main() {
  int A, B;
  scanf("%d %d", &A, &B);
  A = B;
  B = A;
  printf("A=%d B=%d\n", A, B);
  return 0;
}

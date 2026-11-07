// espera: W-cast-despues-de-dividir
// kb: TIP-003
#include <stdio.h>
int main() {
  int A = 7, B = 2;
  float R;
  R = (float)(A / B);
  printf("%f\n", R);
  return 0;
}

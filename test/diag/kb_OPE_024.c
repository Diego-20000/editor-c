// espera: W-division-decimal-cero
// kb: OPE-024
#include <stdio.h>
int main() {
  float R;
  R = 5.0 / 0;
  printf("%f\n", R);
  return 0;
}

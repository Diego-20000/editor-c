// espera: W-unsigned-nunca-negativo
// kb: TIP-022
#include <stdio.h>
int main() {
  unsigned int A = 3, B = 5;
  if (A - B < 0) {
    printf("B es mayor\n");
  } else {
    printf("A es mayor o igual\n");
  }
  return 0;
}

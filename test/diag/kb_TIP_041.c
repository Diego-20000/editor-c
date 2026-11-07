// espera: W-int-con-unsigned
// kb: TIP-041
#include <stdio.h>
int main() {
  int A = -1;
  unsigned int B = 1;
  if (A < B) {
    printf("A es menor\n");
  } else {
    printf("A no es menor\n");
  }
  return 0;
}

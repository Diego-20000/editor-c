// espera: E-no-declarada
// kb: DEC-008
#include <stdio.h>
int main() {
  int S = 0;
  for (int I = 1; I <= 3; I++) { S = S + I; }
  printf("%d %d\n", S, I);
  return 0;
}

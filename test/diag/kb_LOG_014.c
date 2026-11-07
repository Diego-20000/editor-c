// espera: W-resto-con-division
// kb: LOG-014
#include <stdio.h>
int main() {
  int N, R;
  scanf("%d", &N);
  R = N / 3;
  if (R == 0) { printf("Es múltiplo de 3\n"); }
  else { printf("No es múltiplo de 3\n"); }
  return 0;
}

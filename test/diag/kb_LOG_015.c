// espera: W-resto-sin-comparar
// kb: LOG-015
#include <stdio.h>
int main() {
  int N, R;
  scanf("%d", &N);
  R = N % 3;
  if (R) { printf("Es múltiplo de 3\n"); }
  else { printf("No es múltiplo de 3\n"); }
  return 0;
}

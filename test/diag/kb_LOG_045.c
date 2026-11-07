// espera: W-resto-igual-divisor
// kb: LOG-045
#include <stdio.h>
int main() {
  int NUM, DEN, C, R;
  scanf("%d %d", &NUM, &DEN);
  C = 0;
  R = NUM;
  while (R > DEN) {
    R = R - DEN;
    C++;
  }
  printf("Cociente: %d  Resto: %d\n", C, R);
  return 0;
}

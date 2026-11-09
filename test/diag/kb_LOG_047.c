// espera: W-dividendo-pisado
// kb: LOG-047
#include <stdio.h>
int main() {
  int NUM, DEN, C;
  scanf("%d %d", &NUM, &DEN);
  C = 0;
  while (NUM >= DEN) {
    NUM = NUM - DEN;
    C++;
  }
  printf("%d / %d = %d\n", NUM, DEN, C);
  return 0;
}

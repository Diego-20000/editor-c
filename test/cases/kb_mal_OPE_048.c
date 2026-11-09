#include <stdio.h>
int main() {
  int I, C = 0;
  for (I = 0; I < 5; I + 1) {
    C++;
    if (C > 8) break;
  }
  printf("%d\n", C);
  return 0;
}
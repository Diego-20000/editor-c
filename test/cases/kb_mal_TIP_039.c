#include <stdio.h>
int main() {
  char I;
  int C = 0;
  for (I = 0; I < 200; I++) {
    C++;
    if (C > 300) break;
  }
  printf("%d\n", C);
  return 0;
}
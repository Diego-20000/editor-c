#include <stdio.h>
int main() {
  unsigned int U;
  int C = 0;
  for (U = 3; U >= 0; U--) {
    C++;
    if (C > 6) break;
  }
  printf("%d\n", C);
  return 0;
}
#include <stdio.h>
int main() {
  int C, N = 0;
  while ((C = getchar()) != EOF) { putchar(C); N++; }
  printf("bytes=%d\n", N);
  return 0;
}

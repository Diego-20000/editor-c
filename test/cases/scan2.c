#include <stdio.h>
int main() {
  int v, s = 0, c = 0;
  while (scanf("%d", &v) == 1) { s += v; c++; }
  printf("%d valores, suma %d, prom %.2f\n", c, s, (float)s / c);
  return 0;
}

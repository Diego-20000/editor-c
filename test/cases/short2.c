#include <stdio.h>
int main() {
  short a = 30000, b = 30000; unsigned short u = 65535;
  short c = a + b;
  u++; a++;
  printf("%d %d %d %d\n", c, u, a, (int)sizeof(a));
  short v[3] = {1, 2, 40000};
  printf("%d %d\n", v[2], (short)70000);
  unsigned short w; scanf("%hu", &w); printf("%u\n", w);
  return 0;
}

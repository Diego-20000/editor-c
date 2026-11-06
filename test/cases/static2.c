#include <stdio.h>
int cuenta() { static int n; n++; return n; }
int acumula(int x) { static int s = 10; s += x; return s; }
int main() {
  int i;
  for (i = 0; i < 3; i++) printf("%d %d\n", cuenta(), acumula(i));
  return 0;
}

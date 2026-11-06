#include <stdio.h>
int suma(int v[], int n) { int i, s = 0; for (i = 0; i < n; i++) s += v[i]; return s; }
int tr(int m[][3]) { return m[1][2]; }
int main() {
  int v[4] = {1,2,3,4}; int m[2][3] = {{1,2,3},{4,5,6}}; unsigned char c = 200;
  int i = 0, x = 9, mayor = 0;
  printf("%d %d %d\n", suma(v, 4), tr(m), (int)(sizeof(v) / sizeof(v[0])));
  printf("%d %d %d\n", c, (int)sizeof(m), (int)sizeof(m[0]));
  c = c + 100; printf("%d\n", c);
  if (i == 0 || x > mayor) mayor = x;
  printf("%d\n", mayor);
  return 0; }

#include <stdio.h>
int main() {
  int a, b, n; float x; double y; char c;
  n = scanf("%d %d", &a, &b);
  printf("n=%d a=%d b=%d\n", n, a, b);
  n = scanf("%f", &x); printf("n=%d x=%.3f\n", n, x);
  n = scanf("%lf", &y); printf("n=%d y=%.6f\n", n, y);
  n = scanf("%d,%d", &a, &b); printf("n=%d a=%d b=%d\n", n, a, b);
  n = scanf(" %c", &c); printf("n=%d c=%c\n", n, c);
  n = scanf("%c", &c); printf("n=%d c=%d\n", n, c);
  n = scanf("%d", &a); printf("n=%d a=%d\n", n, a);
  n = scanf("%d", &a); printf("n=%d a=%d\n", n, a);
  n = scanf("%d", &a); printf("n=%d a=%d\n", n, a);
  return 0;
}

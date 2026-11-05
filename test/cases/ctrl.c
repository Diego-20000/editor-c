#include <stdio.h>
int main() {
  int i, j, s = 0;
  for (i = 0; i < 5; i++) { if (i == 3) continue; s += i; }
  printf("%d\n", s);
  for (i = 0, j = 10; i < j; i += 3, j--) printf("%d,%d ", i, j);
  printf("\n");
  i = 0; while (1) { i++; if (i > 7) break; }
  printf("%d\n", i);
  i = 10; do { printf("%d ", i); i -= 4; } while (i > 0);
  printf("\n");
  for (i = 1; i <= 3; i++) for (j = 1; j <= 3; j++) { if (j == 2) break; printf("(%d,%d)", i, j); }
  printf("\n");
  switch (3) { case 1: printf("uno\n"); case 3: printf("tres\n"); case 4: printf("cuatro\n"); break; default: printf("def\n"); }
  switch ('b') { case 'a': printf("A\n"); break; case 'b': printf("B\n"); break; default: printf("?\n"); }
  switch (9) { case 1: printf("x\n"); break; default: printf("default\n"); }
  if (0) printf("no\n"); else if (1) printf("si\n"); else printf("no2\n");
  { int i = 99; printf("%d\n", i); }
  printf("%d\n", i);
  for (int k = 0; k < 3; k++) printf("%d", k);
  printf("\n");
  return 0;
}

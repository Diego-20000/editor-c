#include <stdio.h>
int main() {
  char A, B, C;
  int N, R;
  scanf("%c%c%c", &A, &B, &C);
  printf("%d %d %d\n", A, B, C);
  R = scanf("N°%d", &N);
  printf("%d %d\n", R, N);
  return 0;
}

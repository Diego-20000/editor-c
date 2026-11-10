#include <stdio.h>
#include <string.h>
int main() {
  char B[4], L[40];
  int I;
  fgets(B, 4, stdin);
  printf("[%s] largo=%d\n", B, (int)strlen(B));
  fgets(L, 40, stdin);
  printf("[%s]", L);
  for (I = 0; L[I] != '\0'; I++) printf(" %d", L[I]);
  printf("\n");
  return 0;
}

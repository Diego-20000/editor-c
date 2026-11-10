#include <stdio.h>
#include <string.h>
int main() {
  char N[20]; int i, L;
  scanf("%s", N);
  L = strlen(N);
  printf("[%s] largo=%d\n", N, L);
  for (i = 0; i < L; i++) printf("%c", N[i]);
  printf("\n");
  for (i = 0; i < L; i++) putchar(N[i]);
  printf("\n[%-8s][%8s][%.3s]\n", N, N, N);
  return 0;
}

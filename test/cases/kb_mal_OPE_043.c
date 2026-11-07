#include <stdio.h>
int main() {
  int A = 1, B = 0;
  if (A == 1 || A == 2 && B == 3) printf("valido\n");
  else printf("invalido\n");
  return 0;
}
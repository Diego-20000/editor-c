#include <stdio.h>
int main() {
  int NUM, DEN, C, R, VE1, VE2, N, A, i, P;
  scanf("%d %d", &NUM, &DEN);
  C = 0;
  R = NUM;
  while (R >= DEN) {
    R = R - DEN;
    C++;
  }
  printf("%d / %d = %d resto %d\n", NUM, DEN, C, R);
  scanf("%d %d", &VE1, &VE2);
  A = 0;
  for (i = 1; i <= VE2; i++) { A = A + VE1; }
  printf("Producto: %d\n", A);
  P = 1;
  for (i = 1; i <= 5; i++) { P = P * i; }
  for (i = 0; i <= 9; i++) { printf("%d ", i); }
  for (i = 1; i <= 9; i++) { printf("%d ", i); }
  printf("%d\n", P);
  return 0;
}

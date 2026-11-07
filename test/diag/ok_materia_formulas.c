// espera: limpio
#include <stdio.h>
int main() {
  int A, B, N, PARTE, TOTAL;
  float N1, N2, PROM, F, AREA, PORC, S;
  scanf("%f %f", &N1, &N2);
  PROM = (N1 + N2) / 2;
  scanf("%d %d", &A, &B);
  PROM = (A + B) / 2.0;
  PROM = (float)(A + B) / 2;
  F = A * 9.0 / 5 + 32;
  F = 9.0 / 5 * N1 + 32;
  AREA = A * B / 2.0;
  AREA = (A * B) / 2.0;
  AREA = 0.5 * A * B;
  PARTE = 3; TOTAL = 4;
  PORC = (float)PARTE / TOTAL * 100;
  PORC = PARTE * 100.0 / TOTAL;
  S = 0;
  for (N = 1; N <= 3; N++) { S = S + 1.0 / N; }
  printf("%.2f %.2f %.2f %.2f %.2f\n", PROM, F, AREA, PORC, S);
  A = B / 2;
  A = (int)N1;
  A = N1 + 0.5;
  printf("%d\n", A * 100 / B);
  return 0;
}

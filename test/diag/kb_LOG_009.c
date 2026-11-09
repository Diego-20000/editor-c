// espera: W-ifs-sueltos
// kb: LOG-009
#include <stdio.h>
int main() {
  int N;
  scanf("%d", &N);
  if (N > 0) { printf("Positivo\n"); }
  if (N < 0) { printf("Negativo\n"); }
  else { printf("Cero\n"); }
  return 0;
}

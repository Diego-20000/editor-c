// espera: W-if-sin-llaves
// kb: LOG-032
#include <stdio.h>
int main() {
  int N, V, CN, i;
  scanf("%d", &N);
  CN = 0;
  for (i = 0; i < N; i++) {
    scanf("%d", &V);
    if (V < 0) printf("Negativo\n"); CN++;
  }
  printf("Cantidad de negativos: %d\n", CN);
  return 0;
}

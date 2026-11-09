// espera: W-for-sin-llaves
// kb: LOG-034
#include <stdio.h>
int main() {
  int N, V, CN, i;
  scanf("%d", &N);
  CN = 0;
  for (i = 0; i < N; i++)
    scanf("%d", &V);
  if (V < 0) { CN++; }
  printf("Negativos: %d\n", CN);
  return 0;
}

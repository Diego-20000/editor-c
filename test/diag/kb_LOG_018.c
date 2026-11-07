// espera: W-condicion-imposible
// kb: LOG-018
#include <stdio.h>
int main() {
  int N;
  scanf("%d", &N);
  if (N < 0 && N > 10) { printf("Fuera de rango\n"); }
  else { printf("Dentro del rango\n"); }
  return 0;
}

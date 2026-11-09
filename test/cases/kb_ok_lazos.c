#include <stdio.h>
int main() {
  int N, V, S, i, CP, CN, MAYOR, MENOR, VE;
  float AP, PROMP;
  printf("Cantidad de datos: ");
  scanf("%d", &N);
  S = 0;
  for (i = 0; i < N; i++) {
    scanf("%d", &V);
    S = S + V;
  }
  printf("Suma: %d\n", S);
  CP = 0; CN = 0; AP = 0;
  for (i = 1; i <= N; i++) {
    scanf("%d", &V);
    if (V > 0) { CP++; AP = AP + V; }
    else if (V < 0) { CN++; }
  }
  if (CP > 0) { PROMP = AP / CP; printf("Prom +: %.2f\n", PROMP); }
  printf("Positivos: %d Negativos: %d\n", CP, CN);
  /* mayor y menor con el primer dato */
  scanf("%d", &VE);
  MAYOR = VE; MENOR = VE;
  for (i = 1; i < N; i++) {
    scanf("%d", &VE);
    if (VE > MAYOR) { MAYOR = VE; }
    if (VE < MENOR) { MENOR = VE; }
  }
  printf("Mayor %d Menor %d\n", MAYOR, MENOR);
  return 0;
}

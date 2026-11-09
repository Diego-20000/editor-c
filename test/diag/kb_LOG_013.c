// espera: W-condicion-imposible
// kb: LOG-013
#include <stdio.h>
int main() {
  int ANIO, R4, R100, R400;
  scanf("%d", &ANIO);
  R4 = ANIO % 4;
  R100 = ANIO % 100;
  R400 = ANIO % 400;
  if ((R4 == 0) && (R100 != 0) && (R400 == 0)) { printf("Es bisiesto\n"); }
  else { printf("No es bisiesto\n"); }
  return 0;
}

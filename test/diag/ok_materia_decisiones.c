// espera: limpio
#include <stdio.h>
int main() {
  int A, B, C, MAYOR, N, NOTA, ANIO, AUX, R;
  scanf("%d %d %d", &A, &B, &C);
  if (A > B && A > C) { MAYOR = A; }
  else if (B > C) { MAYOR = B; }
  else { MAYOR = C; }
  printf("Mayor: %d\n", MAYOR);
  if (A > B) { MAYOR = A; } else { MAYOR = B; }
  AUX = A; A = B; B = AUX;
  scanf("%d", &N);
  if (N > 0) { printf("Positivo\n"); }
  else if (N < 0) { printf("Negativo\n"); }
  else { printf("Cero\n"); }
  if (N < 0 || N > 10) { printf("Fuera de rango\n"); }
  if (N >= 0 && N <= 10) { printf("Dentro del rango\n"); }
  scanf("%d", &NOTA);
  if (NOTA >= 7) { printf("Promociona\n"); }
  else if (NOTA >= 4) { printf("Regular\n"); }
  else { printf("Libre\n"); }
  if (NOTA < 4) { printf("Libre\n"); }
  else if (NOTA < 7) { printf("Regular\n"); }
  else { printf("Promociona\n"); }
  scanf("%d", &ANIO);
  if ((ANIO % 4 == 0 && ANIO % 100 != 0) || ANIO % 400 == 0) { printf("Bisiesto\n"); }
  else { printf("No bisiesto\n"); }
  R = N % 3;
  if (R == 0) { printf("Es múltiplo de 3\n"); }
  else { printf("No es múltiplo de 3\n"); }
  if (N % 2 == 0) { printf("par\n"); } else { printf("impar\n"); }
  if (N % 2) { printf("impar\n"); } else { printf("par\n"); }
  if (!(N % 2)) printf("par\n");
  return 0;
}

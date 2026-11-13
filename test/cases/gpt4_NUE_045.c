#include <stdio.h>
int main() {
 int TOTAL = 100;
 int CAJAS = 0;
 if (CAJAS != 0) {
 int RESULTADO = TOTAL / CAJAS;
 printf("Resultado: %d\n", RESULTADO);
 } else {
 printf("No se puede dividir por cero\n");
 }
}

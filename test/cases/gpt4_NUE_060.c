#include <stdio.h>
#define RETENCION (1.0 / 100.0)
int main() {
 float IMPORTE = 500.0;
 float DESCUENTO = IMPORTE * RETENCION;
 printf("Descuento: %.2f\n", DESCUENTO);
}

#include <stdio.h>

int main() {
    double IMPORTE;
    double PORCENTAJE;
    double DESCUENTO;
    double TOTAL;

    IMPORTE = 0.0;
    PORCENTAJE = 0.0;
    DESCUENTO = 0.0;
    TOTAL = 0.0;

    printf("Importe de la compra: ");
    scanf("%lf", &IMPORTE);

    if (IMPORTE < 0.0) {
        printf("El importe no puede ser negativo.\n");
    } else {
        if (IMPORTE < 1000.0) {
            PORCENTAJE = 0.0;
        } else if (IMPORTE < 3000.0) {
            PORCENTAJE = 5.0;
        } else if (IMPORTE < 6000.0) {
            PORCENTAJE = 10.0;
        } else {
            PORCENTAJE = 15.0;
        }
        DESCUENTO = IMPORTE * PORCENTAJE / 100.0;
        TOTAL = IMPORTE - DESCUENTO;
        printf("Descuento aplicado: %.0f %%\n", PORCENTAJE);
        printf("Importe descontado: $%.2f\n", DESCUENTO);
        printf("Total a pagar: $%.2f\n", TOTAL);
    }
}

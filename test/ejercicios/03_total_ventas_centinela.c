#include <stdio.h>

int main(void) {
    float VENTA, TOTAL = 0.0f;
    int CANTIDAD = 0;

    scanf("%f", &VENTA);
    while (VENTA != -1.0f) {
        TOTAL += VENTA;
        CANTIDAD++;
        scanf("%f", &VENTA);
    }

    printf("Ventas: %d\nTotal: %5.2f\n", CANTIDAD, TOTAL);
    return 0;
}

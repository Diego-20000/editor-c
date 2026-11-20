#include <stdio.h>

int main() {
    int CANTIDAD;
    double PRECIO;
    double SUBTOTAL;
    double DESCUENTO;
    double TOTAL;

    CANTIDAD = 0;
    PRECIO = 0.0;
    SUBTOTAL = 0.0;
    DESCUENTO = 0.0;
    TOTAL = 0.0;

    printf("Cantidad de unidades: ");
    scanf("%d", &CANTIDAD);
    printf("Precio por unidad: ");
    scanf("%lf", &PRECIO);

    SUBTOTAL = CANTIDAD * PRECIO;
    if (SUBTOTAL > 5000.0) {
        DESCUENTO = SUBTOTAL * 0.05;
    }
    TOTAL = SUBTOTAL - DESCUENTO;

    printf("Subtotal: $%.2f\n", SUBTOTAL);
    printf("Descuento: $%.2f\n", DESCUENTO);
    printf("Total: $%.2f\n", TOTAL);
}

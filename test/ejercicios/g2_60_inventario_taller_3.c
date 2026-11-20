#include <stdio.h>

int main() {
    int i;
    int CANTIDADES[5];
    double PRECIOS[5];
    double SUBTOTALES[5];
    double TOTAL;
    int MAYOR_CANTIDAD;
    int POS_MAYOR;

    TOTAL = 0.0;
    MAYOR_CANTIDAD = 0;
    POS_MAYOR = 0;

    for (i = 0; i < 5; i++) {
        printf("Material %d - cantidad: ", i + 1);
        scanf("%d", &CANTIDADES[i]);
        printf("Material %d - precio unitario: ", i + 1);
        scanf("%lf", &PRECIOS[i]);
        SUBTOTALES[i] = CANTIDADES[i] * PRECIOS[i];
        TOTAL = TOTAL + SUBTOTALES[i];
        if (i == 0 || CANTIDADES[i] > MAYOR_CANTIDAD) {
            MAYOR_CANTIDAD = CANTIDADES[i];
            POS_MAYOR = i;
        }
    }

    printf("\nDETALLE DEL INVENTARIO\n");
    for (i = 0; i < 5; i++) {
        printf("Material %d: %d unidades, subtotal $%.2f\n",
               i + 1, CANTIDADES[i], SUBTOTALES[i]);
    }
    printf("Valor total: $%.2f\n", TOTAL);
    printf("Mayor cantidad: material %d con %d unidades.\n",
           POS_MAYOR + 1, MAYOR_CANTIDAD);
}

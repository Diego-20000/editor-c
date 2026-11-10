#include <stdio.h>

int main(void) {
    int STOCK, MOVIMIENTO, OPERACIONES = 0;

    scanf("%d", &STOCK);
    if (STOCK < 0 || STOCK > 100000) {
        printf("Stock inicial invalido\n");
        return 0;
    }

    scanf("%d", &MOVIMIENTO);
    while (MOVIMIENTO != 0) {
        if (STOCK + MOVIMIENTO < 0 || STOCK + MOVIMIENTO > 100000) {
            printf("Movimiento no permitido\n");
            return 0;
        }
        STOCK += MOVIMIENTO;
        OPERACIONES++;
        scanf("%d", &MOVIMIENTO);
    }

    printf("Stock final: %d\nOperaciones: %d\n", STOCK, OPERACIONES);
    return 0;
}

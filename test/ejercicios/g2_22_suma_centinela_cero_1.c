#include <stdio.h>

int main() {
    int NUMERO;
    double SUMA;
    int CANTIDAD;

    NUMERO = 0;
    SUMA = 0;
    CANTIDAD = 0;

    printf("Numero (0 para terminar): ");
    while (CANTIDAD < 100000 && scanf("%d", &NUMERO) == 1 && NUMERO != 0) {
        SUMA = SUMA + NUMERO;
        CANTIDAD = CANTIDAD + 1;
        printf("Otro numero (0 para terminar): ");
    }

    printf("Cantidad ingresada: %d\n", CANTIDAD);
    printf("Suma total: %.0f\n", SUMA);
}

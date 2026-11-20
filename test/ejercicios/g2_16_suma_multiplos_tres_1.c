#include <stdio.h>

int main() {
    int i;
    int LIMITE;
    int SUMA;
    int CANTIDAD;

    LIMITE = 0;
    SUMA = 0;
    CANTIDAD = 0;

    printf("Limite superior: ");
    scanf("%d", &LIMITE);

    if (LIMITE < 1 || LIMITE > 10000) {
        printf("El limite debe estar entre 1 y 10000.\n");
    } else {
        for (i = 1; i <= LIMITE; i++) {
            if (i % 3 == 0) {
                SUMA = SUMA + i;
                CANTIDAD = CANTIDAD + 1;
            }
        }
        printf("Cantidad: %d\n", CANTIDAD);
        printf("Suma: %d\n", SUMA);
    }
}

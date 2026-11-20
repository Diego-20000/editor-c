#include <stdio.h>

int main() {
    int i;
    int N;
    int CANTIDAD;

    N = 0;
    CANTIDAD = 0;

    printf("Numero positivo (hasta 100000): ");
    scanf("%d", &N);

    if (N < 1 || N > 100000) {
        printf("El numero no esta en el rango permitido.\n");
    } else {
        printf("Divisores de %d: ", N);
        for (i = 1; i <= N; i++) {
            if (N % i == 0) {
                printf("%d ", i);
                CANTIDAD = CANTIDAD + 1;
            }
        }
        printf("\nCantidad de divisores: %d\n", CANTIDAD);
    }
}

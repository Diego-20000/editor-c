#include <stdio.h>

int main() {
    int i;
    int j;
    int INICIO;
    int FIN;
    int ES_PRIMO;
    int CANTIDAD;

    INICIO = 0;
    FIN = 0;
    ES_PRIMO = 1;
    CANTIDAD = 0;

    printf("Extremo inicial: ");
    scanf("%d", &INICIO);
    printf("Extremo final (hasta 10000): ");
    scanf("%d", &FIN);

    if (FIN < INICIO || FIN > 10000) {
        printf("El intervalo no es valido.\n");
    } else {
        for (i = INICIO; i <= FIN; i++) {
            ES_PRIMO = 1;
            if (i < 2) {
                ES_PRIMO = 0;
            } else {
                for (j = 2; j * j <= i && ES_PRIMO == 1; j++) {
                    if (i % j == 0) {
                        ES_PRIMO = 0;
                    }
                }
            }
            if (ES_PRIMO == 1) {
                printf("%d ", i);
                CANTIDAD = CANTIDAD + 1;
            }
        }
        printf("\nCantidad de primos: %d\n", CANTIDAD);
    }
}

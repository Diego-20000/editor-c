#include <stdio.h>

int main(void) {
    int NUMERO, I;
    int POSITIVOS = 0, NEGATIVOS = 0, CEROS = 0;

    for (I = 0; I < 8; I++) {
        scanf("%d", &NUMERO);
        if (NUMERO > 0) {
            POSITIVOS++;
        } else if (NUMERO < 0) {
            NEGATIVOS++;
        } else {
            CEROS++;
        }
    }

    printf("Positivos: %d\nNegativos: %d\nCeros: %d\n", POSITIVOS, NEGATIVOS, CEROS);
    return 0;
}

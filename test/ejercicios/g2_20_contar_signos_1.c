#include <stdio.h>

int main() {
    int i;
    int NUMERO;
    int POSITIVOS;
    int NEGATIVOS;
    int CEROS;

    NUMERO = 0;
    POSITIVOS = 0;
    NEGATIVOS = 0;
    CEROS = 0;

    for (i = 1; i <= 8; i++) {
        printf("Numero %d: ", i);
        scanf("%d", &NUMERO);
        if (NUMERO > 0) {
            POSITIVOS = POSITIVOS + 1;
        } else if (NUMERO < 0) {
            NEGATIVOS = NEGATIVOS + 1;
        } else {
            CEROS = CEROS + 1;
        }
    }

    printf("Positivos: %d\n", POSITIVOS);
    printf("Negativos: %d\n", NEGATIVOS);
    printf("Ceros: %d\n", CEROS);
}

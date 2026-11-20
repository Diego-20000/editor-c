#include <stdio.h>

int main() {
    int i;
    int VALORES[10];
    int NEGATIVOS;
    int CEROS;
    int POSITIVOS_CHICOS;
    int POSITIVOS_GRANDES;

    NEGATIVOS = 0;
    CEROS = 0;
    POSITIVOS_CHICOS = 0;
    POSITIVOS_GRANDES = 0;

    for (i = 0; i < 10; i++) {
        printf("Valor %d: ", i + 1);
        scanf("%d", &VALORES[i]);
    }

    for (i = 0; i < 10; i++) {
        if (VALORES[i] < 0) {
            NEGATIVOS = NEGATIVOS + 1;
        } else if (VALORES[i] == 0) {
            CEROS = CEROS + 1;
        } else if (VALORES[i] < 100) {
            POSITIVOS_CHICOS = POSITIVOS_CHICOS + 1;
        } else {
            POSITIVOS_GRANDES = POSITIVOS_GRANDES + 1;
        }
    }

    printf("Negativos: %d\n", NEGATIVOS);
    printf("Ceros: %d\n", CEROS);
    printf("Positivos menores que 100: %d\n", POSITIVOS_CHICOS);
    printf("Positivos de 100 o mas: %d\n", POSITIVOS_GRANDES);
}

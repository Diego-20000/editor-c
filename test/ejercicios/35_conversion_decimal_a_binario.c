#include <stdio.h>

int main(void) {
    int NUMERO, BITS[16], CANTIDAD = 0, I;

    scanf("%d", &NUMERO);
    if (NUMERO < 1 || NUMERO > 65535) {
        printf("Numero fuera de rango\n");
        return 0;
    }

    while (NUMERO > 0) {
        BITS[CANTIDAD] = NUMERO % 2;
        CANTIDAD++;
        NUMERO /= 2;
    }

    printf("Binario: ");
    for (I = CANTIDAD - 1; I >= 0; I--) {
        printf("%d", BITS[I]);
    }
    printf("\n");
    return 0;
}

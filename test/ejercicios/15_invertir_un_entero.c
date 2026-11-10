#include <stdio.h>

int main(void) {
    int NUMERO, DIGITO, INVERTIDO = 0;

    scanf("%d", &NUMERO);
    if (NUMERO < 0 || NUMERO > 999999999) {
        printf("Numero fuera de rango\n");
        return 0;
    }

    while (NUMERO > 0) {
        DIGITO = NUMERO % 10;
        INVERTIDO = INVERTIDO * 10 + DIGITO;
        NUMERO /= 10;
    }

    printf("Invertido: %d\n", INVERTIDO);
    return 0;
}

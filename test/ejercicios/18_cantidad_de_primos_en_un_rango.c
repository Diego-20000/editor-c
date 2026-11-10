#include <stdio.h>

int ES_PRIMO(int NUMERO);

int main(void) {
    int INICIO, FIN, NUMERO, CANTIDAD = 0;

    scanf("%d", &INICIO);
    scanf("%d", &FIN);
    if (INICIO < 2 || FIN > 100 || INICIO > FIN) {
        printf("Rango invalido\n");
        return 0;
    }

    for (NUMERO = INICIO; NUMERO <= FIN; NUMERO++) {
        if (ES_PRIMO(NUMERO)) CANTIDAD++;
    }

    printf("Primos encontrados: %d\n", CANTIDAD);
    return 0;
}

int ES_PRIMO(int NUMERO) {
    int DIVISOR;

    for (DIVISOR = 2; DIVISOR * DIVISOR <= NUMERO; DIVISOR++) {
        if (NUMERO % DIVISOR == 0) return 0;
    }
    return 1;
}

#include <stdio.h>

int ES_PRIMO(int NUMERO);

int main(void) {
    int NUMERO;

    scanf("%d", &NUMERO);
    if (NUMERO < 2 || NUMERO > 10000) {
        printf("Numero fuera de rango\n");
    } else if (ES_PRIMO(NUMERO)) {
        printf("Es primo\n");
    } else {
        printf("No es primo\n");
    }

    return 0;
}

int ES_PRIMO(int NUMERO) {
    int DIVISOR;

    if (NUMERO < 2) return 0;
    for (DIVISOR = 2; DIVISOR * DIVISOR <= NUMERO; DIVISOR++) {
        if (NUMERO % DIVISOR == 0) return 0;
    }
    return 1;
}

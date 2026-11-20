#include <stdio.h>

int esPrimo(int NUMERO);

int main() {
    int i;
    int NUMERO;
    int RESULTADO;

    NUMERO = 0;
    RESULTADO = 0;

    for (i = 1; i <= 5; i++) {
        printf("Numero %d: ", i);
        scanf("%d", &NUMERO);
        RESULTADO = esPrimo(NUMERO);
        if (RESULTADO == 1) {
            printf("Es primo.\n");
        } else {
            printf("No es primo.\n");
        }
    }
}

int esPrimo(int NUMERO) {
    int i;
    int ES_PRIMO;

    ES_PRIMO = 1;
    if (NUMERO < 2) {
        ES_PRIMO = 0;
    } else {
        for (i = 2; i <= NUMERO / i && ES_PRIMO == 1; i++) {
            if (NUMERO % i == 0) {
                ES_PRIMO = 0;
            }
        }
    }
    return ES_PRIMO;
}

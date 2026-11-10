#include <stdio.h>

int main(void) {
    int LIMITE, NUMERO, SUMA = 0;

    scanf("%d", &LIMITE);
    if (LIMITE < 1 || LIMITE > 1000) {
        printf("Limite invalido\n");
        return 0;
    }

    for (NUMERO = 1; NUMERO <= LIMITE; NUMERO++) {
        SUMA += NUMERO * NUMERO;
    }

    printf("Suma de cuadrados: %d\n", SUMA);
    return 0;
}

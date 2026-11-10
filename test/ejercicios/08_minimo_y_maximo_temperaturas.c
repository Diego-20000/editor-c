#include <stdio.h>

int main(void) {
    int CANTIDAD, I, TEMPERATURA, MINIMA = 0, MAXIMA = 0;

    scanf("%d", &CANTIDAD);
    if (CANTIDAD < 1 || CANTIDAD > 7) {
        printf("Cantidad invalida\n");
        return 0;
    }

    for (I = 0; I < CANTIDAD; I++) {
        scanf("%d", &TEMPERATURA);
        if (I == 0) {
            MINIMA = TEMPERATURA;
            MAXIMA = TEMPERATURA;
        } else {
            if (TEMPERATURA < MINIMA) MINIMA = TEMPERATURA;
            if (TEMPERATURA > MAXIMA) MAXIMA = TEMPERATURA;
        }
    }

    printf("Minima: %d\nMaxima: %d\n", MINIMA, MAXIMA);
    return 0;
}

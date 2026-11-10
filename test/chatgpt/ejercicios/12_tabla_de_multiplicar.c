#include <stdio.h>

int main(void) {
    int NUMERO, MULTIPLICADOR;

    scanf("%d", &NUMERO);
    for (MULTIPLICADOR = 1; MULTIPLICADOR <= 10; MULTIPLICADOR++) {
        printf("%d x %d = %d\n", NUMERO, MULTIPLICADOR, NUMERO * MULTIPLICADOR);
    }

    return 0;
}

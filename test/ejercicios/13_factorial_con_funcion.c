#include <stdio.h>

int FACTORIAL(int NUMERO);

int main(void) {
    int NUMERO;

    scanf("%d", &NUMERO);
    if (NUMERO < 0 || NUMERO > 10) {
        printf("Numero fuera de rango\n");
    } else {
        printf("Factorial: %d\n", FACTORIAL(NUMERO));
    }

    return 0;
}

int FACTORIAL(int NUMERO) {
    int I, RESULTADO = 1;

    for (I = 2; I <= NUMERO; I++) {
        RESULTADO *= I;
    }
    return RESULTADO;
}

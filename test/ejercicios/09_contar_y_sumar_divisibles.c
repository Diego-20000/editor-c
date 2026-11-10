#include <stdio.h>

int main(void) {
    int LIMITE, DIVISOR, NUMERO;
    int CANTIDAD = 0, SUMA = 0;

    scanf("%d", &LIMITE);
    scanf("%d", &DIVISOR);
    if (LIMITE < 1 || LIMITE > 1000 || DIVISOR < 1 || DIVISOR > LIMITE) {
        printf("Datos invalidos\n");
        return 0;
    }

    for (NUMERO = 1; NUMERO <= LIMITE; NUMERO++) {
        if (NUMERO % DIVISOR == 0) {
            CANTIDAD++;
            SUMA += NUMERO;
        }
    }

    printf("Cantidad: %d\nSuma: %d\n", CANTIDAD, SUMA);
    return 0;
}

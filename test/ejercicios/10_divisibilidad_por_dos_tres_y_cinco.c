#include <stdio.h>

int main(void) {
    int NUMERO;

    scanf("%d", &NUMERO);
    if (NUMERO % 2 == 0) printf("Es divisible por 2\n");
    if (NUMERO % 3 == 0) printf("Es divisible por 3\n");
    if (NUMERO % 5 == 0) printf("Es divisible por 5\n");
    if (NUMERO % 2 != 0 && NUMERO % 3 != 0 && NUMERO % 5 != 0) {
        printf("No es divisible por 2, 3 ni 5\n");
    }

    return 0;
}

#include <stdio.h>

int SIGNO(int NUMERO);

int main(void) {
    int NUMERO, RESULTADO;

    scanf("%d", &NUMERO);
    RESULTADO = SIGNO(NUMERO);
    if (RESULTADO > 0) {
        printf("Positivo\n");
    } else if (RESULTADO < 0) {
        printf("Negativo\n");
    } else {
        printf("Cero\n");
    }

    return 0;
}

int SIGNO(int NUMERO) {
    if (NUMERO > 0) return 1;
    if (NUMERO < 0) return -1;
    return 0;
}

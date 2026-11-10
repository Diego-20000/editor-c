#include <stdio.h>

int main(void) {
    int NUMERO;
    float VALOR;
    char LETRA;

    scanf("%d", &NUMERO);
    scanf("%f", &VALOR);
    scanf(" %c", &LETRA);

    printf("Entero: %d\n", NUMERO);
    printf("Real: %f\n", VALOR);
    printf("Caracter: %c\n", LETRA);
    printf("Campo decimal: %5.2f\n", VALOR);
    return 0;
}

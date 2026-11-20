#include <stdio.h>
#include <string.h>

int main() {
    char TEXTO_A[100];
    char TEXTO_B[100];
    int RESULTADO;

    TEXTO_A[0] = '\0';
    TEXTO_B[0] = '\0';
    RESULTADO = 0;

    printf("Primera linea: ");
    fgets(TEXTO_A, 100, stdin);
    TEXTO_A[strcspn(TEXTO_A, "\n")] = '\0';

    printf("Segunda linea: ");
    fgets(TEXTO_B, 100, stdin);
    TEXTO_B[strcspn(TEXTO_B, "\n")] = '\0';

    RESULTADO = strcmp(TEXTO_A, TEXTO_B);
    if (RESULTADO == 0) {
        printf("Las dos lineas son iguales.\n");
    } else {
        printf("Las lineas son diferentes.\n");
    }
    printf("Primera: [%s]\n", TEXTO_A);
    printf("Segunda: [%s]\n", TEXTO_B);
}

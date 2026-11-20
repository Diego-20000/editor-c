#include <stdio.h>
#include <string.h>

int main() {
    char PALABRA_A[40];
    char PALABRA_B[40];
    int COMPARACION;

    PALABRA_A[0] = '\0';
    PALABRA_B[0] = '\0';
    COMPARACION = 0;

    printf("Primera palabra: ");
    scanf("%39s", PALABRA_A);
    printf("Segunda palabra: ");
    scanf("%39s", PALABRA_B);

    COMPARACION = strcmp(PALABRA_A, PALABRA_B);
    if (COMPARACION == 0) {
        printf("Las palabras son iguales.\n");
    } else if (COMPARACION < 0) {
        printf("La primera palabra aparece antes.\n");
    } else {
        printf("La segunda palabra aparece antes.\n");
    }
}

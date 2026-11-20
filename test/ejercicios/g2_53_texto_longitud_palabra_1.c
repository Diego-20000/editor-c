#include <stdio.h>
#include <string.h>

int main() {
    char PALABRA[40];
    int LONGITUD;

    PALABRA[0] = '\0';
    LONGITUD = 0;

    printf("Ingrese una palabra: ");
    if (scanf("%39s", PALABRA) == 1) {
        LONGITUD = strlen(PALABRA);
        printf("Palabra: %s\n", PALABRA);
        printf("Longitud: %d\n", LONGITUD);
        printf("Primer caracter: %c\n", PALABRA[0]);
    } else {
        printf("No se recibio ninguna palabra.\n");
    }
}

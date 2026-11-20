#include <stdio.h>
#include <string.h>

int main() {
    int i;
    char PALABRA[50];
    int LONGITUD;

    PALABRA[0] = '\0';
    LONGITUD = 0;

    printf("Ingrese una palabra: ");
    if (scanf("%49s", PALABRA) == 1) {
        LONGITUD = strlen(PALABRA);
        printf("Palabra original: %s\n", PALABRA);
        printf("Palabra invertida: ");
        for (i = LONGITUD - 1; i >= 0; i--) {
            printf("%c", PALABRA[i]);
        }
        printf("\n");
    } else {
        printf("No se recibio una palabra.\n");
    }
}

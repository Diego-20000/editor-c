#include <stdio.h>
#include <string.h>

int main() {
    int i;
    char TEXTO[120];
    int LETRAS;
    int DIGITOS;
    int ESPACIOS;
    int OTROS;

    TEXTO[0] = '\0';
    LETRAS = 0;
    DIGITOS = 0;
    ESPACIOS = 0;
    OTROS = 0;

    printf("Escriba una linea: ");
    fgets(TEXTO, 120, stdin);
    TEXTO[strcspn(TEXTO, "\n")] = '\0';

    for (i = 0; TEXTO[i] != '\0'; i++) {
        if ((TEXTO[i] >= 'a' && TEXTO[i] <= 'z') || (TEXTO[i] >= 'A' && TEXTO[i] <= 'Z')) {
            LETRAS = LETRAS + 1;
        } else if (TEXTO[i] >= '0' && TEXTO[i] <= '9') {
            DIGITOS = DIGITOS + 1;
        } else if (TEXTO[i] == ' ') {
            ESPACIOS = ESPACIOS + 1;
        } else {
            OTROS = OTROS + 1;
        }
    }

    printf("Letras: %d\n", LETRAS);
    printf("Digitos: %d\n", DIGITOS);
    printf("Espacios: %d\n", ESPACIOS);
    printf("Otros caracteres: %d\n", OTROS);
}

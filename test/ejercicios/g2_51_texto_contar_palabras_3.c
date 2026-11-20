#include <stdio.h>
#include <string.h>

int main() {
    int i;
    char FRASE[160];
    int PALABRAS;
    int EN_PALABRA;

    FRASE[0] = '\0';
    PALABRAS = 0;
    EN_PALABRA = 0;

    printf("Ingrese una frase: ");
    fgets(FRASE, 160, stdin);
    FRASE[strcspn(FRASE, "\n")] = '\0';

    for (i = 0; FRASE[i] != '\0'; i++) {
        if (FRASE[i] == ' ' || FRASE[i] == '\t') {
            EN_PALABRA = 0;
        } else {
            if (EN_PALABRA == 0) {
                PALABRAS = PALABRAS + 1;
                EN_PALABRA = 1;
            }
        }
    }

    printf("Cantidad de palabras: %d\n", PALABRAS);
}

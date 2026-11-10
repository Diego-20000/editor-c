#include <stdio.h>

int main(void) {
    char CARACTER;
    int LETRAS = 0, DIGITOS = 0;

    scanf(" %c", &CARACTER);
    while (CARACTER != '.') {
        if ((CARACTER >= 'a' && CARACTER <= 'z') || (CARACTER >= 'A' && CARACTER <= 'Z')) {
            LETRAS++;
        } else if (CARACTER >= '0' && CARACTER <= '9') {
            DIGITOS++;
        }
        scanf(" %c", &CARACTER);
    }

    printf("Letras: %d\nDigitos: %d\n", LETRAS, DIGITOS);
    return 0;
}

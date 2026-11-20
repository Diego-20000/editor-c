#include <stdio.h>

int main() {
    char CARACTER;

    CARACTER = '?';

    printf("Ingrese un caracter: ");
    scanf(" %c", &CARACTER);

    if (CARACTER >= 'A' && CARACTER <= 'Z') {
        printf("Es una letra mayuscula.\n");
    } else if (CARACTER >= 'a' && CARACTER <= 'z') {
        printf("Es una letra minuscula.\n");
    } else if (CARACTER >= '0' && CARACTER <= '9') {
        printf("Es un digito.\n");
    } else {
        printf("Es otro tipo de caracter.\n");
    }
}

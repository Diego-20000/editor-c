#include <stdio.h>

int main(void) {
    char LETRA;
    int I, VOCALES = 0;

    for (I = 0; I < 8; I++) {
        scanf(" %c", &LETRA);
        if (LETRA == 'a' || LETRA == 'e' || LETRA == 'i' || LETRA == 'o' || LETRA == 'u' ||
            LETRA == 'A' || LETRA == 'E' || LETRA == 'I' || LETRA == 'O' || LETRA == 'U') {
            VOCALES++;
        }
    }

    printf("Vocales: %d\n", VOCALES);
    return 0;
}

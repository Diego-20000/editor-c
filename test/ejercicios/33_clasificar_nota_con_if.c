#include <stdio.h>

int main(void) {
    float NOTA;

    scanf("%f", &NOTA);
    if (NOTA < 0.0f || NOTA > 10.0f) {
        printf("Nota invalida\n");
    } else if (NOTA >= 9.0f) {
        printf("Sobresaliente\n");
    } else if (NOTA >= 7.0f) {
        printf("Bueno\n");
    } else if (NOTA >= 4.0f) {
        printf("Aprobado\n");
    } else {
        printf("Desaprobado\n");
    }

    return 0;
}

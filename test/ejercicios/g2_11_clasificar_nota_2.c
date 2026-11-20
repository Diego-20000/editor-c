#include <stdio.h>

int main() {
    float NOTA;

    NOTA = 0.0f;

    printf("Calificacion: ");
    scanf("%f", &NOTA);

    if (NOTA < 0.0f || NOTA > 10.0f) {
        printf("La calificacion esta fuera del rango.\n");
    } else if (NOTA < 6.0f) {
        printf("Desaprobado.\n");
    } else if (NOTA < 7.0f) {
        printf("Aprobado.\n");
    } else if (NOTA < 8.0f) {
        printf("Bueno.\n");
    } else if (NOTA < 9.0f) {
        printf("Muy bueno.\n");
    } else {
        printf("Excelente.\n");
    }
}

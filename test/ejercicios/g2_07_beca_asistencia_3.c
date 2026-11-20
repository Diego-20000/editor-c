#include <stdio.h>

int main() {
    float PROMEDIO;
    int INASISTENCIAS;

    PROMEDIO = 0.0f;
    INASISTENCIAS = 0;

    printf("Promedio: ");
    scanf("%f", &PROMEDIO);
    printf("Inasistencias: ");
    scanf("%d", &INASISTENCIAS);

    if (PROMEDIO < 0.0f || PROMEDIO > 10.0f || INASISTENCIAS < 0) {
        printf("Los datos ingresados no son validos.\n");
    } else {
        if (PROMEDIO >= 8.0f) {
            if (INASISTENCIAS <= 8) {
                printf("Cumple las condiciones para la beca.\n");
            } else {
                printf("No cumple por inasistencias.\n");
            }
        } else {
            if (INASISTENCIAS <= 8) {
                printf("No cumple por promedio.\n");
            } else {
                printf("No cumple por promedio ni asistencia.\n");
            }
        }
    }
}

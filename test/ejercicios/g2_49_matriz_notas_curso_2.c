#include <stdio.h>

int main() {
    int i;
    int j;
    float NOTAS[4][3];
    double SUMA_ESTUDIANTE;
    double SUMA_CURSO;
    double PROMEDIO;

    SUMA_ESTUDIANTE = 0.0;
    SUMA_CURSO = 0.0;
    PROMEDIO = 0.0;

    for (i = 0; i < 4; i++) {
        printf("Estudiante %d\n", i + 1);
        for (j = 0; j < 3; j++) {
            printf("  Evaluacion %d: ", j + 1);
            scanf("%f", &NOTAS[i][j]);
        }
    }

    printf("Promedios individuales:\n");
    for (i = 0; i < 4; i++) {
        SUMA_ESTUDIANTE = 0.0;
        for (j = 0; j < 3; j++) {
            SUMA_ESTUDIANTE = SUMA_ESTUDIANTE + NOTAS[i][j];
            SUMA_CURSO = SUMA_CURSO + NOTAS[i][j];
        }
        PROMEDIO = SUMA_ESTUDIANTE / 3;
        printf("Estudiante %d: %.2f\n", i + 1, PROMEDIO);
    }

    PROMEDIO = SUMA_CURSO / 12;
    printf("Promedio general: %.2f\n", PROMEDIO);
}

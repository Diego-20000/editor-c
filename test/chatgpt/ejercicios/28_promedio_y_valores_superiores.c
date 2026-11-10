#include <stdio.h>

int main(void) {
    float NOTAS[10], SUMA = 0.0f, PROMEDIO;
    int N, I, SUPERIORES = 0;

    scanf("%d", &N);
    if (N < 1 || N > 10) {
        printf("Cantidad invalida\n");
        return 0;
    }
    for (I = 0; I < N; I++) {
        scanf("%f", &NOTAS[I]);
        SUMA += NOTAS[I];
    }

    PROMEDIO = SUMA / N;
    for (I = 0; I < N; I++) {
        if (NOTAS[I] > PROMEDIO) SUPERIORES++;
    }

    printf("Promedio: %5.2f\nSuperiores al promedio: %d\n", PROMEDIO, SUPERIORES);
    return 0;
}

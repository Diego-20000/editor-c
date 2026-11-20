#include <stdio.h>

int main() {
    int i;
    int N;
    int APROBADAS;
    float NOTA;
    double SUMA;
    double PROMEDIO;

    N = 0;
    APROBADAS = 0;
    NOTA = 0.0f;
    SUMA = 0.0;
    PROMEDIO = 0.0;

    printf("Cantidad de notas (1 a 10): ");
    scanf("%d", &N);

    if (N < 1 || N > 10) {
        printf("La cantidad no es valida.\n");
    } else {
        for (i = 1; i <= N; i++) {
            printf("Nota %d: ", i);
            scanf("%f", &NOTA);
            SUMA = SUMA + NOTA;
            if (NOTA >= 6.0f) {
                APROBADAS = APROBADAS + 1;
            }
        }
        PROMEDIO = SUMA / N;
        printf("Suma: %.2f\n", SUMA);
        printf("Promedio: %.2f\n", PROMEDIO);
        printf("Notas aprobadas: %d\n", APROBADAS);
    }
}

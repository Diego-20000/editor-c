#include <stdio.h>

int main() {
    int i;
    int N;
    double SUMA;

    N = 0;
    SUMA = 0.0;

    printf("Cantidad de terminos (0 a 100): ");
    scanf("%d", &N);

    if (N < 0 || N > 100) {
        printf("La cantidad no es valida.\n");
    } else {
        for (i = 1; i <= N; i++) {
            SUMA = SUMA + 1.0 / i;
            printf("Termino %d: %.6f\n", i, 1.0 / i);
        }
        printf("Resultado de la serie: %.6f\n", SUMA);
    }
}

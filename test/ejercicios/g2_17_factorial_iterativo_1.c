#include <stdio.h>

int main() {
    int i;
    int N;
    int FACTORIAL;

    N = 0;
    FACTORIAL = 1;

    printf("Numero entre 0 y 12: ");
    scanf("%d", &N);

    if (N < 0 || N > 12) {
        printf("El numero esta fuera del rango permitido.\n");
    } else {
        for (i = 1; i <= N; i++) {
            FACTORIAL = FACTORIAL * i;
        }
        printf("Factorial de %d: %d\n", N, FACTORIAL);
    }
}

#include <stdio.h>

int main() {
    int i;
    int N;
    int SUMA;

    N = 0;
    SUMA = 0;

    printf("Limite (0 a 100): ");
    scanf("%d", &N);

    if (N < 0 || N > 100) {
        printf("El limite no es valido.\n");
    } else {
        for (i = 1; i <= N; i++) {
            SUMA = SUMA + i * i;
            printf("%d^2 = %d\n", i, i * i);
        }
        printf("Suma de cuadrados: %d\n", SUMA);
    }
}

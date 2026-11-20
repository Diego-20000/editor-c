#include <stdio.h>

int main() {
    int i;
    int N;
    int SUMA;

    N = 0;
    SUMA = 0;

    printf("Numero positivo (hasta 100000): ");
    scanf("%d", &N);

    if (N < 1 || N > 100000) {
        printf("El numero no esta en el rango permitido.\n");
    } else {
        for (i = 1; i < N; i++) {
            if (N % i == 0) {
                SUMA = SUMA + i;
            }
        }
        printf("Suma de divisores propios: %d\n", SUMA);
        if (SUMA == N) {
            printf("Es un numero perfecto.\n");
        } else {
            printf("No es un numero perfecto.\n");
        }
    }
}

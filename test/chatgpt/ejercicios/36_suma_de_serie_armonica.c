#include <stdio.h>

int main(void) {
    int N, I;
    double SUMA = 0.0;

    scanf("%d", &N);
    if (N < 1 || N > 100) {
        printf("Cantidad invalida\n");
        return 0;
    }

    for (I = 1; I <= N; I++) {
        SUMA += 1.0 / I;
    }

    printf("Suma armonica: %5.2f\n", SUMA);
    return 0;
}

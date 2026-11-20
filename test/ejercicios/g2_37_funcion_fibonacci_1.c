#include <stdio.h>

int fibonacci(int POSICION);

int main() {
    int i;
    int N;

    N = 0;

    printf("Cantidad de terminos (0 a 45): ");
    scanf("%d", &N);

    if (N < 0 || N > 45) {
        printf("La cantidad no es valida.\n");
    } else {
        for (i = 0; i < N; i++) {
            printf("%d ", fibonacci(i));
        }
        printf("\n");
    }
}

int fibonacci(int POSICION) {
    int i;
    int ANTERIOR;
    int ACTUAL;
    int SIGUIENTE;

    ANTERIOR = 0;
    ACTUAL = 1;
    SIGUIENTE = 0;

    if (POSICION == 0) {
        return 0;
    }
    if (POSICION == 1) {
        return 1;
    }

    for (i = 2; i <= POSICION; i++) {
        SIGUIENTE = ANTERIOR + ACTUAL;
        ANTERIOR = ACTUAL;
        ACTUAL = SIGUIENTE;
    }
    return ACTUAL;
}

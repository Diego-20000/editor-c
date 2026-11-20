#include <stdio.h>

int mayorDeTres(int A, int B, int C);

int main() {
    int A;
    int B;
    int C;
    int MAYOR;

    A = 0;
    B = 0;
    C = 0;
    MAYOR = 0;

    printf("Ingrese tres enteros: ");
    scanf("%d %d %d", &A, &B, &C);

    MAYOR = mayorDeTres(A, B, C);
    printf("El mayor es: %d\n", MAYOR);
}

int mayorDeTres(int A, int B, int C) {
    int MAYOR;

    MAYOR = A;
    if (B > MAYOR) {
        MAYOR = B;
    }
    if (C > MAYOR) {
        MAYOR = C;
    }
    return MAYOR;
}

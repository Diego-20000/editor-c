#include <stdio.h>

int main(void) {
    int OPCION, A, B;
    float AREA;

    scanf("%d", &OPCION);
    scanf("%d", &A);
    scanf("%d", &B);
    if (A < 0 || A > 1000 || B < 0 || B > 1000) {
        printf("Medidas invalidas\n");
        return 0;
    }

    switch (OPCION) {
        case 1:
            AREA = A * A;
            printf("Area del cuadrado: %5.2f\n", AREA);
            break;
        case 2:
            AREA = A * B;
            printf("Area del rectangulo: %5.2f\n", AREA);
            break;
        case 3:
            AREA = A * B / 2.0f;
            printf("Area del triangulo: %5.2f\n", AREA);
            break;
        default:
            printf("Opcion invalida\n");
    }

    return 0;
}

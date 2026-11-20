#include <stdio.h>

int main() {
    int A;
    int B;
    int RESTO;
    int ORIGINAL_A;
    int ORIGINAL_B;

    A = 0;
    B = 0;
    RESTO = 0;
    ORIGINAL_A = 0;
    ORIGINAL_B = 0;

    printf("Primer entero (0 a 1000000): ");
    scanf("%d", &A);
    printf("Segundo entero (0 a 1000000): ");
    scanf("%d", &B);

    if (A < 0 || B < 0 || A > 1000000 || B > 1000000 || (A == 0 && B == 0)) {
        printf("Los valores no son validos para este calculo.\n");
    } else {
        ORIGINAL_A = A;
        ORIGINAL_B = B;
        while (B != 0) {
            RESTO = A % B;
            A = B;
            B = RESTO;
        }
        printf("MCD de %d y %d: %d\n", ORIGINAL_A, ORIGINAL_B, A);
    }
}

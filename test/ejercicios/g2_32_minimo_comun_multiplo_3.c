#include <stdio.h>

int main() {
    int A;
    int B;
    int MAYOR;
    int MCM;

    A = 0;
    B = 0;
    MAYOR = 0;
    MCM = 0;

    printf("Primer entero (1 a 30000): ");
    scanf("%d", &A);
    printf("Segundo entero (1 a 30000): ");
    scanf("%d", &B);

    if (A < 1 || B < 1 || A > 30000 || B > 30000) {
        printf("Los valores no estan en el rango permitido.\n");
    } else {
        if (A > B) {
            MAYOR = A;
        } else {
            MAYOR = B;
        }
        MCM = MAYOR;
        while (MCM % A != 0 || MCM % B != 0) {
            MCM = MCM + MAYOR;
        }
        printf("Minimo comun multiplo: %d\n", MCM);
    }
}

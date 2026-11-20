#include <stdio.h>

int main() {
    int i;
    double BASE;
    double POTENCIA;
    int CANTIDAD;

    BASE = 0.0;
    POTENCIA = 1.0;
    CANTIDAD = 0;

    printf("Base: ");
    scanf("%lf", &BASE);
    printf("Cantidad de potencias (0 a 10): ");
    scanf("%d", &CANTIDAD);

    if (CANTIDAD < 0 || CANTIDAD > 10) {
        printf("La cantidad no es valida.\n");
    } else {
        for (i = 1; i <= CANTIDAD; i++) {
            POTENCIA = POTENCIA * BASE;
            printf("Exponente %d: %.4f\n", i, POTENCIA);
        }
    }
}

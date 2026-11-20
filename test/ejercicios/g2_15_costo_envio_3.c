#include <stdio.h>

int main() {
    double PESO;
    double DISTANCIA;
    double COSTO_PESO;
    double COSTO_DISTANCIA;
    double TOTAL;

    PESO = 0.0;
    DISTANCIA = 0.0;
    COSTO_PESO = 0.0;
    COSTO_DISTANCIA = 0.0;
    TOTAL = 0.0;

    printf("Peso en kg: ");
    scanf("%lf", &PESO);
    printf("Distancia en km: ");
    scanf("%lf", &DISTANCIA);

    if (PESO <= 0.0 || DISTANCIA < 0.0) {
        printf("Los datos del envio no son validos.\n");
    } else {
        if (PESO <= 2.0) {
            COSTO_PESO = 1200.0;
        } else if (PESO <= 5.0) {
            COSTO_PESO = 2200.0;
        } else {
            COSTO_PESO = 3500.0;
        }
        if (DISTANCIA <= 10.0) {
            COSTO_DISTANCIA = 0.0;
        } else {
            COSTO_DISTANCIA = (DISTANCIA - 10.0) * 35.0;
        }
        TOTAL = COSTO_PESO + COSTO_DISTANCIA;
        printf("Costo por peso: $%.2f\n", COSTO_PESO);
        printf("Costo por distancia: $%.2f\n", COSTO_DISTANCIA);
        printf("Costo total: $%.2f\n", TOTAL);
    }
}

#include <stdio.h>

int main(void) {
    float CONSUMO, TOTAL = 0.0f, PROMEDIO;
    int DIA;

    for (DIA = 1; DIA <= 4; DIA++) {
        scanf("%f", &CONSUMO);
        if (CONSUMO < 0.0f || CONSUMO > 1000.0f) {
            printf("Consumo invalido\n");
            return 0;
        }
        TOTAL += CONSUMO;
    }

    PROMEDIO = TOTAL / 4.0f;
    printf("Consumo total: %5.2f\nPromedio diario: %5.2f\n", TOTAL, PROMEDIO);
    return 0;
}

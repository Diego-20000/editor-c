#include <stdio.h>

int main(void) {
    float PARCIAL1, PARCIAL2, TRABAJO;
    float PROMEDIO;

    scanf("%f", &PARCIAL1);
    scanf("%f", &PARCIAL2);
    scanf("%f", &TRABAJO);

    PROMEDIO = (PARCIAL1 * 2.0f + PARCIAL2 * 3.0f + TRABAJO * 5.0f) / 10.0f;
    printf("Promedio ponderado: %5.2f\n", PROMEDIO);
    return 0;
}

#include <stdio.h>

int main(void) {
    float NOTA1, NOTA2, NOTA3, NOTA4, NOTA5;
    float PROMEDIO;

    scanf("%f", &NOTA1);
    scanf("%f", &NOTA2);
    scanf("%f", &NOTA3);
    scanf("%f", &NOTA4);
    scanf("%f", &NOTA5);

    PROMEDIO = (NOTA1 + NOTA2 + NOTA3 + NOTA4 + NOTA5) / 5.0f;
    printf("Promedio: %5.2f\n", PROMEDIO);
    return 0;
}

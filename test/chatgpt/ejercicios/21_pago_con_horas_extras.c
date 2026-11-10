#include <stdio.h>

float CALCULAR_PAGO(int HORAS, float VALOR_HORA);

int main(void) {
    int HORAS;
    float VALOR_HORA;

    scanf("%d", &HORAS);
    scanf("%f", &VALOR_HORA);
    if (HORAS < 0 || HORAS > 60 || VALOR_HORA < 0.0f || VALOR_HORA > 10000.0f) {
        printf("Datos invalidos\n");
    } else {
        printf("Pago: %5.2f\n", CALCULAR_PAGO(HORAS, VALOR_HORA));
    }

    return 0;
}

float CALCULAR_PAGO(int HORAS, float VALOR_HORA) {
    if (HORAS <= 40) return HORAS * VALOR_HORA;
    return 40.0f * VALOR_HORA + (HORAS - 40) * VALOR_HORA * 1.5f;
}

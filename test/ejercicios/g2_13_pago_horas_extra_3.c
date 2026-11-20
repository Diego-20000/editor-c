#include <stdio.h>

int main() {
    double HORAS;
    double VALOR_HORA;
    double HORAS_NORMALES;
    double HORAS_EXTRA;
    double PAGO;

    HORAS = 0.0;
    VALOR_HORA = 0.0;
    HORAS_NORMALES = 0.0;
    HORAS_EXTRA = 0.0;
    PAGO = 0.0;

    printf("Horas trabajadas: ");
    scanf("%lf", &HORAS);
    printf("Valor de la hora: ");
    scanf("%lf", &VALOR_HORA);

    if (HORAS < 0.0 || VALOR_HORA < 0.0) {
        printf("Los valores no pueden ser negativos.\n");
    } else {
        if (HORAS > 40.0) {
            HORAS_NORMALES = 40.0;
            HORAS_EXTRA = HORAS - 40.0;
        } else {
            HORAS_NORMALES = HORAS;
            HORAS_EXTRA = 0.0;
        }
        PAGO = HORAS_NORMALES * VALOR_HORA + HORAS_EXTRA * VALOR_HORA * 1.5;
        printf("Horas normales: %.2f\n", HORAS_NORMALES);
        printf("Horas extra: %.2f\n", HORAS_EXTRA);
        printf("Pago total: $%.2f\n", PAGO);
    }
}

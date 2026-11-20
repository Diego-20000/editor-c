#include <stdio.h>

int main() {
    int MINUTOS;
    int HORAS;
    int ADICIONALES;
    int TOTAL;

    MINUTOS = 0;
    HORAS = 0;
    ADICIONALES = 0;
    TOTAL = 0;

    printf("Minutos de estacionamiento: ");
    scanf("%d", &MINUTOS);

    if (MINUTOS < 0 || MINUTOS > 10000000) {
        printf("La cantidad de minutos no es valida.\n");
    } else if (MINUTOS == 0) {
        printf("Total a pagar: $0\n");
    } else {
        HORAS = MINUTOS / 60;
        if (MINUTOS % 60 != 0) {
            HORAS = HORAS + 1;
        }
        ADICIONALES = HORAS - 1;
        TOTAL = 800 + ADICIONALES * 500;
        printf("Horas cobradas: %d\n", HORAS);
        printf("Total a pagar: $%d\n", TOTAL);
    }
}

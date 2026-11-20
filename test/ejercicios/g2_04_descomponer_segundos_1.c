#include <stdio.h>

int main() {
    int TOTAL;
    int HORAS;
    int MINUTOS;
    int SEGUNDOS;
    int RESTO;

    TOTAL = 0;
    HORAS = 0;
    MINUTOS = 0;
    SEGUNDOS = 0;
    RESTO = 0;

    printf("Cantidad total de segundos: ");
    scanf("%d", &TOTAL);

    if (TOTAL >= 0) {
        HORAS = TOTAL / 3600;
        RESTO = TOTAL % 3600;
        MINUTOS = RESTO / 60;
        SEGUNDOS = RESTO % 60;
        printf("Horas: %d\n", HORAS);
        printf("Minutos: %d\n", MINUTOS);
        printf("Segundos: %d\n", SEGUNDOS);
    } else {
        printf("La cantidad no puede ser negativa.\n");
    }
}

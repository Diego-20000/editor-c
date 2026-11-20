#include <stdio.h>

int main() {
    int i;
    int VALORES[7];
    int MAYOR;
    int MENOR;
    int POS_MAYOR;
    int POS_MENOR;

    MAYOR = 0;
    MENOR = 0;
    POS_MAYOR = 0;
    POS_MENOR = 0;

    for (i = 0; i < 7; i++) {
        printf("Valor %d: ", i + 1);
        scanf("%d", &VALORES[i]);
        if (i == 0) {
            MAYOR = VALORES[i];
            MENOR = VALORES[i];
        } else {
            if (VALORES[i] > MAYOR) {
                MAYOR = VALORES[i];
                POS_MAYOR = i;
            }
            if (VALORES[i] < MENOR) {
                MENOR = VALORES[i];
                POS_MENOR = i;
            }
        }
    }

    printf("Mayor: %d, posicion: %d\n", MAYOR, POS_MAYOR + 1);
    printf("Menor: %d, posicion: %d\n", MENOR, POS_MENOR + 1);
}

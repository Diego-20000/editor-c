#include <stdio.h>

int main(void) {
    int MAYOR, DATO, I;

    scanf("%d", &MAYOR);
    for (I = 1; I < 4; I++) {
        scanf("%d", &DATO);
        if (DATO > MAYOR) {
            MAYOR = DATO;
        }
    }

    printf("Mayor: %d\n", MAYOR);
    return 0;
}

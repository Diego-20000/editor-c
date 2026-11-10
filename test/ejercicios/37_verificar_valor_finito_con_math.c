#include <stdio.h>
#include <math.h>

int main(void) {
    float VALOR;

    scanf("%f", &VALOR);
    if (isfinite(VALOR)) {
        printf("Valor finito: %5.2f\n", VALOR);
    } else {
        printf("El valor no es finito\n");
    }

    return 0;
}

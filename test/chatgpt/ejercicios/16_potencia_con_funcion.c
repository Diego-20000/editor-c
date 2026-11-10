#include <stdio.h>

int POTENCIA(int BASE, int EXPONENTE);

int main(void) {
    int BASE, EXPONENTE;

    scanf("%d", &BASE);
    scanf("%d", &EXPONENTE);
    if (BASE < -10 || BASE > 10 || EXPONENTE < 0 || EXPONENTE > 8) {
        printf("Datos fuera de rango\n");
    } else {
        printf("Potencia: %d\n", POTENCIA(BASE, EXPONENTE));
    }

    return 0;
}

int POTENCIA(int BASE, int EXPONENTE) {
    int I, RESULTADO = 1;

    for (I = 0; I < EXPONENTE; I++) {
        RESULTADO *= BASE;
    }
    return RESULTADO;
}

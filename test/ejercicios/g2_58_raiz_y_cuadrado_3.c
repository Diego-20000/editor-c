#include <stdio.h>
#include <math.h>

double raizCuadrada(double NUMERO);

int main() {
    double NUMERO;
    double CUADRADO;
    double RAIZ;
    double DIFERENCIA;

    NUMERO = 0.0;
    CUADRADO = 0.0;
    RAIZ = 0.0;
    DIFERENCIA = 0.0;

    printf("Numero no negativo: ");
    scanf("%lf", &NUMERO);

    if (NUMERO < 0.0) {
        printf("No se calcula la raiz real de un numero negativo.\n");
    } else {
        CUADRADO = NUMERO * NUMERO;
        RAIZ = raizCuadrada(NUMERO);
        DIFERENCIA = fabs(RAIZ * RAIZ - NUMERO);
        printf("Cuadrado: %.3f\n", CUADRADO);
        printf("Raiz aproximada: %.3f\n", RAIZ);
        printf("Error absoluto de la aproximacion: %.6f\n", DIFERENCIA);
    }
}

double raizCuadrada(double NUMERO) {
    double APROXIMACION;
    int i;

    APROXIMACION = NUMERO;
    if (NUMERO == 0.0) {
        return 0.0;
    }
    for (i = 1; i <= 20; i++) {
        APROXIMACION = (APROXIMACION + NUMERO / APROXIMACION) / 2.0;
    }
    return APROXIMACION;
}

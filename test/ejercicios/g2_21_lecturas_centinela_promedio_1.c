#include <stdio.h>

int main() {
    double LECTURA;
    double SUMA;
    double PROMEDIO;
    int CANTIDAD;

    LECTURA = 0.0;
    SUMA = 0.0;
    PROMEDIO = 0.0;
    CANTIDAD = 0;

    printf("Ingrese una lectura (-999 para terminar): ");
    while (scanf("%lf", &LECTURA) == 1 && LECTURA != -999.0) {
        SUMA = SUMA + LECTURA;
        CANTIDAD = CANTIDAD + 1;
        printf("Ingrese otra lectura (-999 para terminar): ");
    }

    if (CANTIDAD > 0) {
        PROMEDIO = SUMA / CANTIDAD;
        printf("Lecturas procesadas: %d\n", CANTIDAD);
        printf("Promedio: %.2f\n", PROMEDIO);
    } else {
        printf("No se ingresaron lecturas.\n");
    }
}

#include <stdio.h>

int main() {
    int OPCION;
    double METROS;
    double RESULTADO;

    OPCION = 0;
    METROS = 0.0;
    RESULTADO = 0.0;

    printf("Medida en metros: ");
    scanf("%lf", &METROS);
    printf("1. Centimetros\n");
    printf("2. Milimetros\n");
    printf("3. Kilometros\n");
    printf("Conversion elegida: ");
    scanf("%d", &OPCION);

    switch (OPCION) {
        case 1:
            RESULTADO = METROS * 100.0;
            printf("Centimetros: %.3f\n", RESULTADO);
            break;
        case 2:
            RESULTADO = METROS * 1000.0;
            printf("Milimetros: %.3f\n", RESULTADO);
            break;
        case 3:
            RESULTADO = METROS / 1000.0;
            printf("Kilometros: %.3f\n", RESULTADO);
            break;
        default:
            printf("La opcion no es valida.\n");
    }
}

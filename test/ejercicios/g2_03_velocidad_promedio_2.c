#include <stdio.h>

int main() {
    double DISTANCIA;
    double HORAS;
    double VELOCIDAD;

    DISTANCIA = 0.0;
    HORAS = 0.0;
    VELOCIDAD = 0.0;

    printf("Distancia en kilometros: ");
    scanf("%lf", &DISTANCIA);
    printf("Tiempo en horas: ");
    scanf("%lf", &HORAS);

    if (HORAS > 0.0 && DISTANCIA >= 0.0) {
        VELOCIDAD = DISTANCIA / HORAS;
        printf("Velocidad promedio: %.2f km/h\n", VELOCIDAD);
    } else {
        printf("Los datos no permiten calcular la velocidad.\n");
    }
}

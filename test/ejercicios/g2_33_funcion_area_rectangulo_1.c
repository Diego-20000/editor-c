#include <stdio.h>

double areaRectangulo(double BASE, double ALTURA);

int main() {
    double BASE;
    double ALTURA;
    double AREA;

    BASE = 0.0;
    ALTURA = 0.0;
    AREA = 0.0;

    printf("Base: ");
    scanf("%lf", &BASE);
    printf("Altura: ");
    scanf("%lf", &ALTURA);

    if (BASE > 0.0 && ALTURA > 0.0) {
        AREA = areaRectangulo(BASE, ALTURA);
        printf("Area del rectangulo: %.2f\n", AREA);
    } else {
        printf("Las medidas deben ser positivas.\n");
    }
}

double areaRectangulo(double BASE, double ALTURA) {
    double RESULTADO;

    RESULTADO = BASE * ALTURA;
    return RESULTADO;
}

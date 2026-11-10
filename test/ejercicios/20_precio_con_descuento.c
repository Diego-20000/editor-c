#include <stdio.h>

float PRECIO_FINAL(float PRECIO, float DESCUENTO);

int main(void) {
    float PRECIO, DESCUENTO;

    scanf("%f", &PRECIO);
    scanf("%f", &DESCUENTO);
    if (PRECIO < 0.0f || PRECIO > 100000.0f || DESCUENTO < 0.0f || DESCUENTO > 90.0f) {
        printf("Datos invalidos\n");
    } else {
        printf("Precio final: %5.2f\n", PRECIO_FINAL(PRECIO, DESCUENTO));
    }

    return 0;
}

float PRECIO_FINAL(float PRECIO, float DESCUENTO) {
    return PRECIO - PRECIO * DESCUENTO / 100.0f;
}

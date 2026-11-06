//Diego Segurotti, Julían Ostoich.
//Nicolas Meana, Nahuel Canoura
//5°2
//Ciclo 2026
//Lenguaje Tecnológico V

#include <stdio.h>

int main() {
float A, VENTA;
printf("\nEjemplo 9 - LC\n");
A = 0;
printf("\nIngrese venta (0 detiene): ");
scanf("%f", &VENTA);
while (VENTA != 0) {
    A = A + VENTA;
    printf("\nIngrese venta (0 stop): ");
    scanf("%f", &VENTA); }
printf("\nEl total de ventas es: %.2f\n", A);
printf("\nFin\n");
}

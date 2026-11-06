//Diego Segurotti, Julían Ostoich.
//Nicolas Meana, Nahuel Canoura
//5°2
//Ciclo 2026
//Lenguaje Tecnológico V

#include <stdio.h>

int main() {
int i, N;
float A, NOTA, PROM;
printf("\nEjemplo 6 - LR\n");
A = 0; N = 22;
for (i = 0; i < N; i++) {
    printf("\nIngrese nota escolar: ");
    scanf("%f", &NOTA);
    A = A + NOTA; }
PROM = A / N;
printf("\nEl promedio es: %.2f\n", PROM);
printf("\nFin\n");
}

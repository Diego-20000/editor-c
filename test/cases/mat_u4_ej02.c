//Diego Segurotti, Julían Ostoich.
//Nicolas Meana, Nahuel Canoura
//5°2
//Ciclo 2026
//Lenguaje Tecnológico V

#include <stdio.h>

int main() {
float PROM, NOTA1, NOTA2;
printf("\nEjemplo 2 de SS\n");
printf("\nIngrese una nota escolar: ");
scanf("%f", &NOTA1);
printf("\nIngrese otra nota escolar: ");
scanf("%f", &NOTA2);
PROM = (NOTA1 + NOTA2) / 2;
printf("\nEl promedio es: %.2f\n", PROM);
printf("\nFin\n");
}

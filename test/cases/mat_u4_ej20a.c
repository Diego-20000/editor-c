//Diego Segurotti, Julían Ostoich.
//Nicolas Meana, Nahuel Canoura
//Santino Puca
//5°2
//Ciclo 2026
//Lenguaje Tecnológico V

#include <stdio.h>

int main() {
int CP, CN;
float AP, AN, VNN, PROMP, PROMN;
printf("\nEjercicio 20 a\n");
AP = 0; CP = 0; AN = 0; CN = 0;
printf("\nIngrese valor no nulo (0 detiene): ");
scanf("%f", &VNN);
while (VNN != 0) {
    if (VNN > 0) { AP = AP + VNN; CP++; }
    else { AN = AN + VNN; CN++; }
    printf("\nIngrese valor no nulo (0 stop): ");
    scanf("%f", &VNN); }
PROMP = AP / CP; PROMN = AN / CN;
printf("\nEl prom. de positivos es: %.2f\n", PROMP);
printf("\nEl prom. de negativos es: %.2f\n", PROMN);
printf("\nFin\n");
}
